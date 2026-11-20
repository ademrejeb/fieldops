import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { diagnose } from "@/lib/diagnostics-kb";

const query = z.object({ code: z.string().default(""), q: z.string().default("") });

/** GET /api/diagnostics?code=E30&q=porte bloquée → KB entry + field history */
export async function GET(req: Request) {
  const tenant = await getTenant();
  const { searchParams } = new URL(req.url);
  const parsed = query.parse({ code: searchParams.get("code") ?? "", q: searchParams.get("q") ?? "" });

  const result = diagnose(parsed.code, `${parsed.code} ${parsed.q}`);
  const history = parsed.code
    ? await db.ticket.count({ where: { tenantId: tenant.id, errorCode: parsed.code.toUpperCase() } })
    : 0;

  return NextResponse.json({
    ...result,
    historyNote: history > 0 ? `${history} ticket(s) avec ce code dans l'historique tenant` : "Premier cas avec ce code",
  });
}
