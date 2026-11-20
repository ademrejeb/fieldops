import nodemailer from "nodemailer";

const HOST = process.env.SMTP_HOST ?? "";
const PORT = Number(process.env.SMTP_PORT ?? 587);
const USER = process.env.SMTP_USER ?? "";
const PASS = process.env.SMTP_PASS ?? "";
export const MAIL_FROM = process.env.SMTP_FROM ?? "FieldOps <no-reply@fieldops.ma>";
export const APP_URL = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export function mailStatus() {
  return { configured: Boolean(HOST), host: HOST || null, from: MAIL_FROM };
}

let tx: nodemailer.Transporter | null = null;
function transport() {
  if (!tx) {
    tx = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: PORT === 465,
      auth: USER ? { user: USER, pass: PASS } : undefined,
    });
  }
  return tx;
}

export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }) {
  if (!opts.to) return { sent: false, reason: "no-recipient" as const };
  if (!HOST) {
    // Dev fallback: visible in server logs, never crashes the request
    console.log(`[mail:dev] to=${opts.to}\nsubject=${opts.subject}\n${opts.text.split("\n").slice(0, 6).join("\n")}`);
    return { sent: false, reason: "dev-log" as const };
  }
  await transport().sendMail({ from: MAIL_FROM, ...opts });
  return { sent: true, reason: "smtp" as const };
}

export function assignmentMail(wo: {
  number: string; ticketNumber: string; title: string; jobType: string;
  scheduledStart: Date | null; estimatedMin: number;
  customer: string; site: string; address: string; accessCode: string;
  ticketId: string;
}) {
  const when = wo.scheduledStart
    ? new Date(wo.scheduledStart).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "dès que possible";
  const subject = `[FieldOps] Mission ${wo.number} — ${wo.ticketNumber} (${wo.jobType})`;
  const text = [
    `Bonjour,`,
    ``,
    `Nouvelle mission assignée: ${wo.number} — ${wo.title}`,
    `Client: ${wo.customer}`,
    `Site: ${wo.site} — ${wo.address}${wo.accessCode ? ` (accès: ${wo.accessCode})` : ""}`,
    `Planifié: ${when} · durée estimée ${wo.estimatedMin} min`,
    ``,
    `Détails: ${APP_URL}/tickets/${wo.ticketId}`,
  ].join("\n");
  const html = `<div style="font-family:sans-serif;max-width:560px">
    <h2 style="margin:0 0 8px">Mission ${wo.number}</h2>
    <p style="color:#475569">${wo.title} · ${wo.jobType}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <tr><td style="padding:6px 8px;color:#64748b">Client</td><td style="padding:6px 8px"><b>${wo.customer}</b></td></tr>
      <tr><td style="padding:6px 8px;color:#64748b">Site</td><td style="padding:6px 8px">${wo.site} — ${wo.address}</td></tr>
      ${wo.accessCode ? `<tr><td style="padding:6px 8px;color:#64748b">Accès</td><td style="padding:6px 8px"><b>${wo.accessCode}</b></td></tr>` : ""}
      <tr><td style="padding:6px 8px;color:#64748b">Planifié</td><td style="padding:6px 8px">${when} · ${wo.estimatedMin} min</td></tr>
    </table>
    <p><a href="${APP_URL}/tickets/${wo.ticketId}">Ouvrir le ticket ${wo.ticketNumber}</a></p>
  </div>`;
  return { subject, text, html };
}
