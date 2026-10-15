import { Resend } from "resend";
import { emailFrom, isResendConfigured, siteUrl } from "@/lib/env";

export function getResend() {
  if (!isResendConfigured()) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendEmail(input: { to: string | string[]; subject: string; html: string }) {
  const resend = getResend();
  if (!resend) return { sent: false as const, reason: "email_disabled" };
  const { error, data } = await resend.emails.send({
    from: emailFrom(),
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  if (error) return { sent: false as const, reason: error.message };
  return { sent: true as const, id: data?.id };
}

export function emailShell(title: string, body: string) {
  const home = siteUrl();
  return `<!doctype html><html><body style="margin:0;background:#f7f3ea;font-family:Georgia,serif;color:#1b1f24">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;padding:32px">
  <tr><td style="font-family:Inter,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#0e7cb8;font-size:12px">Las Trampas Pool</td></tr>
  <tr><td style="font-size:28px;padding:8px 0 16px">${title}</td></tr>
  <tr><td style="font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.5">${body}</td></tr>
  <tr><td style="padding-top:24px;font-family:Inter,Arial,sans-serif;font-size:14px"><a href="${home}" style="color:#0e7cb8">Open lastrampaspool.com</a></td></tr>
  </table></td></tr></table></body></html>`;
}

export function receiptEmail(input: { purpose: string; amount: string }) {
  return {
    subject: `Receipt: ${input.purpose}`,
    html: emailShell(
      "Payment received",
      `<p>We received your ${input.purpose} payment of ${input.amount}.</p><p>The receipt is saved in your account. This email is only a notice.</p>`,
    ),
  };
}

export function reminderEmail(input: { title: string; when: string; href: string }) {
  return {
    subject: `Tomorrow: ${input.title}`,
    html: emailShell("On your schedule tomorrow", `<p><strong>${input.title}</strong><br />${input.when}</p><p><a href="${input.href}">Open My Schedule</a></p>`),
  };
}
