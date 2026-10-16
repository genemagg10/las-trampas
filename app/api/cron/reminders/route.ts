import { NextResponse } from "next/server";
import { reminderEmail, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { formatWhen } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "email_disabled" }, { status: 503 });

  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(7, 0, 0, 0);
  const end = new Date(start);
  end.setUTCHours(31, 0, 0, 0);

  const bookings = await admin
    .from("lap_bookings")
    .select("id, people(email, notification_prefs(topic, email_enabled)), lap_slots(starts_at)")
    .eq("status", "booked");
  const rsvps = await admin.from("rsvps").select("id, households(id), events(title, starts_at)").eq("status", "going");

  let sent = 0;
  for (const row of bookings.data ?? []) {
    const slot = (Array.isArray(row.lap_slots) ? row.lap_slots[0] : row.lap_slots) as { starts_at?: string } | null;
    const person = (Array.isArray(row.people) ? row.people[0] : row.people) as {
      email?: string;
      notification_prefs?: { topic: string; email_enabled: boolean }[];
    } | null;
    if (!slot?.starts_at || !person?.email) continue;
    const when = new Date(slot.starts_at);
    if (when < start || when >= end) continue;
    const pref = person.notification_prefs?.find((item) => item.topic === "reminders");
    if (pref && !pref.email_enabled) continue;
    const mail = reminderEmail({ title: "Lap swim", when: formatWhen(slot.starts_at), href: `${siteUrl()}/schedule` });
    const result = await sendEmail({ to: person.email, subject: mail.subject, html: mail.html });
    if (result.sent) sent += 1;
  }

  for (const row of rsvps.data ?? []) {
    const event = (Array.isArray(row.events) ? row.events[0] : row.events) as { title?: string; starts_at?: string } | null;
    if (!event?.starts_at || !event.title) continue;
    const when = new Date(event.starts_at);
    if (when < start || when >= end) continue;
    const household = (Array.isArray(row.households) ? row.households[0] : row.households) as { id?: string } | null;
    if (!household?.id) continue;
    const people = await admin.from("people").select("email, notification_prefs(topic, email_enabled)").eq("household_id", household.id);
    for (const person of people.data ?? []) {
      if (!person.email) continue;
      const prefs = (person.notification_prefs as { topic: string; email_enabled: boolean }[]) ?? [];
      const pref = prefs.find((item) => item.topic === "reminders");
      if (pref && !pref.email_enabled) continue;
      const mail = reminderEmail({ title: event.title, when: formatWhen(event.starts_at), href: `${siteUrl()}/schedule` });
      const result = await sendEmail({ to: person.email, subject: mail.subject, html: mail.html });
      if (result.sent) sent += 1;
    }
  }

  // Morning list: tell each lap swimmer today who else is in their half hour (in-app; email is queued by the database).
  let morning = 0;
  const dayStart = new Date();
  const dayEnd = new Date(dayStart.getTime() + 18 * 60 * 60 * 1000);
  const today = await admin
    .from("lap_bookings")
    .select("person_id, slot_id, people!lap_bookings_person_id_fkey(first_name), lap_slots!inner(starts_at)")
    .eq("status", "booked")
    .gte("lap_slots.starts_at", dayStart.toISOString())
    .lt("lap_slots.starts_at", dayEnd.toISOString());
  const rows = (today.data ?? []) as unknown as { person_id: string; slot_id: string; people: { first_name: string } | null; lap_slots: { starts_at: string } }[];
  for (const row of rows) {
    const others = rows.filter((r) => r.slot_id === row.slot_id && r.person_id !== row.person_id).map((r) => r.people?.first_name || "A member");
    const when = formatWhen(row.lap_slots.starts_at);
    const insert = await admin.from("lap_notifications").insert({
      person_id: row.person_id,
      slot_id: row.slot_id,
      kind: "morning_list",
      title: `Today at ${when}: ${others.length ? others.join(", ") : "nobody else yet"}`,
      body: others.length ? `You are swimming with ${others.join(", ")}.` : "You are alone so far. Look for a covered time on the lap swim page.",
      urgent: others.length === 0,
    });
    if (!insert.error) morning += 1;
  }

  return NextResponse.json({ ok: true, sent, morning });
}
