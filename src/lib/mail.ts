import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;

  // 465 = implicit TLS; 587 = STARTTLS (the cPanel/Yegara default).
  const port = Number(SMTP_PORT ?? 587);

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    // Shared hosting sometimes firewalls outbound SMTP. Without explicit
    // timeouts a blocked port hangs for the OS-level TCP timeout (minutes),
    // holding the newsletter request open the whole time. Fail fast instead
    // so the caller gets an error it can surface.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string, text: string) {
  const t = getTransporter();
  const from = process.env.SMTP_FROM ?? "ACLIC <no-reply@aclic.org>";

  if (!t) {
    // No SMTP configured (e.g. local dev) — log instead of failing the request.
    console.warn(`[mail] SMTP not configured — would send to ${to}: ${subject}`);
    return;
  }

  await t.sendMail({ from, to, subject, html, text });
}
