import Link from "next/link";
import { Badge, Notice, PhotoSlot, photos } from "@/components/ui";
import { readFlash } from "@/lib/flash";
import { money, formatWhen } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "My summer" };

export default async function MemberHome({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!isSupabaseConfigured() || !viewer.userId || !viewer.person) {
    return (
      <section className="band">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Members</p>
            <h2>Your summer lives here</h2>
            <p>Sign in after the club database is connected. Until then, the public pages stay available.</p>
          </div>
          <Notice {...flash} />
          <Link className="btn" href="/login?next=/home">
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  const supabase = await createClient();
  const [bookings, rsvps, shifts, orders] = supabase
    ? await Promise.all([
        supabase
          .from("lap_bookings")
          .select("id, status, lap_slots(starts_at)")
          .eq("person_id", viewer.person.id)
          .eq("status", "booked")
          .limit(5),
        supabase.from("rsvps").select("id, status, events(title, starts_at)").eq("household_id", viewer.person.household_id).limit(5),
        supabase.from("shift_signups").select("id, status, volunteer_shifts(title, starts_at)").eq("person_id", viewer.person.id).neq("status", "cancelled").limit(5),
        supabase.from("orders").select("id, purpose, status, total_cents, created_at").eq("household_id", viewer.person.household_id).order("created_at", { ascending: false }).limit(3),
      ])
    : [];

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">My summer</p>
          <h2>Good to see you, {viewer.person.first_name}</h2>
          <p>
            {viewer.household?.name} · {viewer.household?.status || "no membership yet"} · {viewer.roles.join(", ") || "no roles yet"}
          </p>
        </div>
        <Notice {...flash} />
        <div className="grid-3">
          <article className="card">
            <PhotoSlot label="Your next lane" ratio="card" photo={photos.lapLanes} />
            <h3>Lap swim</h3>
            {viewer.isLap ? <Badge tone="lawn">Waiver on file</Badge> : <Badge tone="sun">Waiver needed</Badge>}
            <p>{(bookings?.data ?? []).length} upcoming booking{(bookings?.data ?? []).length === 1 ? "" : "s"}.</p>
            <Link href="/lap-swim">Open lap swim</Link>
          </article>
          <article className="card">
            <h3>Schedule</h3>
            <ul>
              {(shifts?.data ?? []).slice(0, 3).map((row) => {
                const shift = row.volunteer_shifts as { title?: string; starts_at?: string } | { title?: string; starts_at?: string }[] | null;
                const item = Array.isArray(shift) ? shift[0] : shift;
                return <li key={String(row.id)}>{item?.title} {item?.starts_at ? formatWhen(item.starts_at) : ""}</li>;
              })}
              {(rsvps?.data ?? []).slice(0, 3).map((row) => {
                const event = row.events as { title?: string; starts_at?: string } | { title?: string; starts_at?: string }[] | null;
                const item = Array.isArray(event) ? event[0] : event;
                return <li key={String(row.id)}>{item?.title} · {String(row.status)}</li>;
              })}
            </ul>
            <Link href="/schedule">My schedule</Link>
          </article>
          <article className="card">
            <h3>Dues</h3>
            {(orders?.data ?? []).length === 0 ? <p>No payments yet.</p> : null}
            <ul>
              {(orders?.data ?? []).map((order) => (
                <li key={String(order.id)}>
                  {String(order.purpose)} · {money(Number(order.total_cents))} · {String(order.status)}
                </li>
              ))}
            </ul>
            <Link href="/dues">Pay or renew</Link>
          </article>
        </div>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/account">Account</Link> · <Link href="/directory">Directory</Link> · <Link href="/photos">Photos</Link> · <Link href="/documents">Documents</Link>
          {viewer.isTeam ? <> · <Link href="/team">Swim team</Link></> : null}
          {viewer.isBoard ? <> · <Link href="/admin">Admin</Link></> : null}
        </p>
      </div>
    </section>
  );
}
