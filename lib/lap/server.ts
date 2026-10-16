import { createAdminClient } from "@/lib/supabase/admin";
import { laDate, type SlotLite } from "@/lib/lap/rules";

export type BoardSlot = SlotLite & {
  day: string;
  others: string[];
  mineBookingId: string | null;
};

type Row = { id: string; slot_id: string; person_id: string; status: string; people: { first_name: string } | { first_name: string }[] | null };

export async function loadBoard(personId: string | null, days = 7): Promise<BoardSlot[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const from = new Date();
  const to = new Date(from.getTime() + days * 86400000);
  const slots = await admin
    .from("lap_slots")
    .select("id, starts_at, ends_at, capacity, blocked_reason")
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .order("starts_at");
  const ids = (slots.data ?? []).map((s) => s.id as string);
  const bookings: Row[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const part = await admin
      .from("lap_bookings")
      .select("id, slot_id, person_id, status, people!lap_bookings_person_id_fkey(first_name)")
      .in("slot_id", ids.slice(i, i + 150))
      .eq("status", "booked");
    bookings.push(...((part.data ?? []) as unknown as Row[]));
  }
  return (slots.data ?? []).map((s) => {
    const here = bookings.filter((b) => b.slot_id === s.id);
    const mine = here.find((b) => b.person_id === personId);
    return {
      id: s.id as string,
      starts_at: s.starts_at as string,
      ends_at: s.ends_at as string,
      capacity: s.capacity as number,
      blocked: Boolean(s.blocked_reason),
      booked: here.length,
      day: laDate(s.starts_at as string),
      mineBookingId: mine?.id ?? null,
      others: here
        .filter((b) => b.person_id !== personId)
        .map((b) => {
          const p = Array.isArray(b.people) ? b.people[0] : b.people;
          return p?.first_name || "A member";
        }),
    };
  });
}

export async function myUpcoming(personId: string) {
  const admin = createAdminClient();
  if (!admin) return [];
  const res = await admin
    .from("lap_bookings")
    .select("id, slot_id, status, lap_slots!inner(starts_at, ends_at)")
    .eq("person_id", personId)
    .eq("status", "booked")
    .gte("lap_slots.starts_at", new Date().toISOString());
  return ((res.data ?? []) as unknown as { id: string; slot_id: string; lap_slots: { starts_at: string; ends_at: string } }[])
    .map((r) => ({ id: r.id, slot_id: r.slot_id, starts_at: r.lap_slots.starts_at, ends_at: r.lap_slots.ends_at }))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export async function myNotifications(personId: string) {
  const admin = createAdminClient();
  if (!admin) return { ready: false, rows: [] as Notification[] };
  const res = await admin
    .from("lap_notifications")
    .select("id, kind, title, body, urgent, read_at, created_at")
    .eq("person_id", personId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (res.error) return { ready: false, rows: [] as Notification[] };
  return { ready: true, rows: (res.data ?? []) as Notification[] };
}

export type Notification = { id: string; kind: string; title: string; body: string | null; urgent: boolean; read_at: string | null; created_at: string };
