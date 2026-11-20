import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/require-auth";
import { mailStatus, sendMail } from "@/lib/mailer";

export async function GET() {
  return NextResponse.json(mailStatus());
}

export async function POST(req: Request) {
  const s = await requireRole("MANAGER");
  if (!s) return NextResponse.json({ error: "Manager requis." }, { status: 403 });
  const { to } = z.object({ to: z.string().email() }).parse(await req.json());
  try {
    const r = await sendMail({
      to,
      subject: "[FieldOps] Email de test",
      text: "Si vous lisez ceci, les notifications mission fonctionnent.",
      html: "<p>Si vous lisez ceci, les <b>notifications mission</b> fonctionnent.</p>",
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: `SMTP injoignable: ${(e as Error).message}` }, { status: 502 });
  }
}
