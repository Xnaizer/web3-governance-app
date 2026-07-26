import { env } from "../config/env";
import path from "node:path";
import ejs from "ejs";

interface IEmail {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const SEND_TIMEOUT_MS = 10_000;

function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^\s*(.*?)\s*<(.+)>\s*$/);
  if (match?.[2]) {
    return { name: match[1] || "GovernanceFund", email: match[2].trim() };
  }
  return { name: "GovernanceFund", email: from.trim() };
}

async function renderTemplate(
  templateName: string,
  data: Record<string, unknown>,
): Promise<string> {
  const templatePath = path.join(
    __dirname,
    "..",
    "templates",
    "emails",
    `${templateName}.ejs`,
  );
  return ejs.renderFile(templatePath, data);
}

export async function sendTemplateEmail(params: IEmail): Promise<void> {
  const html = await renderTemplate(params.template, params.data);

  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: parseSender(env.EMAIL_FROM),
      to: [{ email: params.to }],
      subject: params.subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo send failed (${res.status}): ${detail}`);
  }
}

export async function verifyMailer(): Promise<void> {
  const { email } = parseSender(env.EMAIL_FROM);
  console.log(`[MAILER] Brevo HTTP API ready (sender: ${email})`);
}
