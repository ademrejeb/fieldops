import { NextResponse } from "next/server";
import { z } from "zod";

import { buildDispatchContext } from "@/lib/agent-dispatch";
import { getTenant } from "@/lib/tenant";

const query = z.object({ ticketId: z.string().min(1) });

/** GET /api/dispatch/suggest?ticketId=… → the same ranking the AI dispatcher uses. */
export async function GET(req: Request) {
  const tenant = await getTenant();
  const { searchParams } = new URL(req.url);
  const parsed = query.safeParse({ ticketId: searchParams.get("ticketId") });
  if (!parsed.success) {
    return NextResponse.json({ error: "ticketId required" }, { status: 400 });
  }
  const context = await buildDispatchContext(tenant.id, parsed.data.ticketId);
  if (!context) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    ticketId: context.ticket.id,
    requiredSkills: context.requiredSkills,
    ranked: context.ranked.slice(0, 5),
  });
}
