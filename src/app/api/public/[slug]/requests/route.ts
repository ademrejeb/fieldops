import { NextResponse, after } from "next/server";

import { db } from "@/lib/db";
import { LIMITS, clientKey, rateLimit } from "@/lib/rate-limit";
import { getTenantBySlug, nextNumber } from "@/lib/tenant";
import { runTicketAgent } from "@/lib/ticket-agent";
import { publicRequestSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

function tooMany(retryAfterMs: number) {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return NextResponse.json(
    { error: "Trop de demandes. Réessayez plus tard." },
    { status: 429, headers: { "retry-after": String(seconds) } },
  );
}

/**
 * Public, no-account request intake.
 *
 * Tenant comes from the URL (`/t/{slug}/request`). The response is fast; the
 * agent runs after the response with the curated context, then the dispatcher
 * reviews its work.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    return NextResponse.json({ error: "Entreprise introuvable." }, { status: 404 });
  }

  const ipLimit = rateLimit(
    clientKey(request, `public-request:${tenant.slug}`),
    LIMITS.publicRequest.limit,
    LIMITS.publicRequest.windowMs,
  );
  if (!ipLimit.ok) return tooMany(ipLimit.retryAfterMs);

  const tenantLimit = rateLimit(
    `public-tenant:${tenant.id}`,
    LIMITS.publicRequestTenant.limit,
    LIMITS.publicRequestTenant.windowMs,
  );
  if (!tenantLimit.ok) return tooMany(tenantLimit.retryAfterMs);

  const body = await request.json().catch(() => null);
  const parsed = publicRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Vérifiez les champs du formulaire." },
      { status: 400 },
    );
  }
  const data = parsed.data;
  if (data.website.trim().length > 0) {
    return NextResponse.json({ error: "Requête refusée." }, { status: 400 });
  }
  if (data.startedAt && Date.now() - data.startedAt < 500) {
    return NextResponse.json({ error: "Requête refusée." }, { status: 400 });
  }

  const email = (data.email ?? "").toLowerCase().trim();
  const existing = await db.customer.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [...(email ? [{ email }] : []), { phone: data.phone }],
    },
  });
  const customer =
    existing ??
    (await db.customer.create({
      data: {
        tenantId: tenant.id,
        name: data.name,
        type: "B2C",
        email,
        phone: data.phone,
        address: data.address,
      },
    }));
  if (existing && !existing.address && data.address) {
    await db.customer.update({
      where: { id: existing.id },
      data: { address: data.address },
    });
  }

  const count = await db.ticket.count({ where: { tenantId: tenant.id } });
  const hours =
    data.priority === "P1_CRITICAL" ? 2 : data.priority === "P2_HIGH" ? 8 : 24;
  const ticket = await db.ticket.create({
    data: {
      tenantId: tenant.id,
      number: nextNumber("TK", count + 1),
      customerId: customer.id,
      channel: "PORTAL",
      priority: data.priority,
      title: data.title,
      description: data.description,
      errorCode: data.errorCode,
      slaDueAt: new Date(Date.now() + hours * 3600e3),
      reviewStatus: "PENDING",
      reviewSource: "PUBLIC",
      agentStatus: "PENDING",
      requesterName: data.name,
      requesterEmail: email,
      requesterPhone: data.phone,
      customFields: {
        assetCategory: data.assetCategory,
        city: data.city,
        source: "public",
      },
    },
  });
  await db.auditEvent.create({
    data: {
      ticketId: ticket.id,
      actor: "portal",
      action: "CREATED",
      detail: `Demande publique · ${data.city || tenant.name}`,
    },
  });

  after(async () => {
    try {
      await runTicketAgent(ticket.id);
    } catch (cause) {
      console.error("[khedma] public request agent failed", cause);
    }
  });

  return NextResponse.json(
    {
      ok: true,
      id: ticket.id,
      number: ticket.number,
      statusUrl: `/t/${tenant.slug}/status/${ticket.id}`,
    },
    { status: 201 },
  );
}
