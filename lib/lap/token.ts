import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.LAP_CANCEL_SECRET?.trim() || process.env.CRON_SECRET?.trim() || process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!value) throw new Error("No signing secret configured.");
  return value;
}

function sign(id: string) {
  return createHmac("sha256", secret()).update(`lap-cancel:${id}`).digest("base64url").slice(0, 32);
}

export function cancelToken(bookingId: string) {
  return `${bookingId}.${sign(bookingId)}`;
}

export function readCancelToken(token: string): string | null {
  const [id, mac] = token.split(".");
  if (!id || !mac) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}
