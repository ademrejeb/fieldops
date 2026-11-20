import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { buildDispatchContext } from "@/lib/agent-dispatch";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  ticketId: z.string().min(1),
  tenantId: z.string().min(1),
});

function authorized(request: Request): boolean {
  const expected = process.env.AGENT_CONTEXT_SECRET ?? "";
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return false;
  const provided = header.slice(7).trim();
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Server-to-server context for the AI dispatcher.
 * No browser session is involved; the agent authenticates with a shared secret.
 */
export async function POST(request: Request) {
  if (!process.env.AGENT_CONTEXT_SECRET) {
    return NextResponse.json(
      { error: "Dispatch context is not configured." },
      { status: 503 },
    );
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "ticketId and tenantId are required." }, { status: 400 });
  }
  const context = await buildDispatchContext(parsed.data.tenantId, parsed.data.ticketId);
  if (!context) {
    return NextResponse.json({ error: "Ticket not found for this tenant." }, { status: 404 });
  }
  return NextResponse.json(context, {
    headers: { "cache-control": "no-store" },
  });
}
