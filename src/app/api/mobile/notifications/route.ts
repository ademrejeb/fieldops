import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { mobileSession } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

/** Per-technician notifications for the mobile app. */
export async function GET(request: Request) {
  const session = await mobileSession(request);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const items = await db.notification.findMany({
    where: { userId: session.userId, tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      kind: true,
      title: true,
      body: true,
      href: true,
      meta: true,
      readAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({
    items,
    unread: items.filter((item) => !item.readAt).length,
  });
}

/** Mark one, several or all notifications read. */
export async function POST(request: Request) {
  const session = await mobileSession(request);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((value): value is string => typeof value === "string").slice(0, 50)
    : [];
  await db.notification.updateMany({
    where: {
      userId: session.userId,
      readAt: null,
      ...(ids.length ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
