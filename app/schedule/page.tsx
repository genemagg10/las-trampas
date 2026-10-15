import Link from "next/link";
import { GateCodeButton } from "@/components/gate-code";
import { Notice } from "@/components/ui";
import { checkIn, rotateFeed } from "@/lib/actions/member";
import { siteUrl } from "@/lib/env";
import { readFlash } from "@/lib/flash";
import { formatWhen } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "My schedule" };

type Item = { id: string; when: string; title: string; kind: string; bookingId?: string };

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!viewer.person) {
    return (
      <section className="band">
        <div className="wrap">
          <Link href="/login?next=/schedule">Sign in</Link>
        </div>
      </section>
    );
  }
  const supabase = await createClient();
  const items: Item[] = [];
  let token = "";
  if (supabase) {
    const [bookings, rsvps, shifts, parties, feed, teamEvents] = await Promise.all([
      supabase.from("lap_bookings").select("id, status, lap_slots(starts_at, lanes(number))").eq("person_id", viewer.person.id).in("status", ["booked", "attended"]),
      supabase.from("rsvps").select("id, status, events(title, starts_at, location)").eq("household_id", viewer.person.household_id).in("status", ["going", "pending_payment"]),
      supabase.from("shift_signups").select("id, status, volunteer_shifts(title, starts_at)").eq("person_id", viewer.person.id).neq("status", "cancelled"),
      supabase.from("party_reservations").select("id, status, party_slots(starts_at, area)").eq("household_id", viewer.person.household_id).neq("status", "cancelled"),
      supabase.from("calendar_feeds").select("token").eq("person_id", viewer.person.id).maybeSingle(),
      viewer.isTeam
        ? supabase.from("events").select("id, title, starts_at").eq("kind", "swim_team").eq("published", true)
        : Promise.resolve({ data: [] }),
    ]);
    token = String(feed.data?.token || "");
    for (const row of bookings.data ?? []) {
      const slot = (Array.isArray(row.lap_slots) ? row.lap_slots[0] : row.lap_slots) as { starts_at?: string; lanes?: { number?: number } | { number?: number }[] } | null;
      const lane = slot && (Array.isArray(slot.lanes) ? slot.lanes[0] : slot.lanes);
      if (slot?.starts_at) items.push({ id: String(row.id), when: slot.starts_at, title: `Lane ${lane?.number ?? ""} lap swim`, kind: "Lap", bookingId: String(row.id) });
    }
    for (const row of rsvps.data ?? []) {
      const event = (Array.isArray(row.events) ? row.events[0] : row.events) as { title?: string; starts_at?: string } | null;
      if (event?.starts_at) items.push({ id: String(row.id), when: event.starts_at, title: `${event.title} (${row.status})`, kind: "Event" });
    }
    for (const row of shifts.data ?? []) {
      const shift = (Array.isArray(row.volunteer_shifts) ? row.volunteer_shifts[0] : row.volunteer_shifts) as { title?: string; starts_at?: string } | null;
      if (shift?.starts_at) items.push({ id: String(row.id), when: shift.starts_at, title: shift.title || "Shift", kind: "Volunteer" });
    }
    for (const row of parties.data ?? []) {
      const slot = (Array.isArray(row.party_slots) ? row.party_slots[0] : row.party_slots) as { starts_at?: string; area?: string } | null;
      if (slot?.starts_at) items.push({ id: String(row.id), when: slot.starts_at, title: `Party · ${slot.area} (${row.status})`, kind: "Party" });
    }
    for (const row of teamEvents.data ?? []) {
      items.push({ id: String(row.id), when: String(row.starts_at), title: String(row.title), kind: "Team" });
    }
  }
  items.sort((a, b) => a.when.localeCompare(b.when));

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Schedule</p>
          <h2>My schedule</h2>
          <p>Lanes, RSVPs, shifts, parties, and team events in one list. Subscribe from Google or Apple Calendar with your private link.</p>
        </div>
        <Notice {...flash} />
        <div className="card">
          {items.length === 0 ? <p>Nothing on your schedule yet.</p> : null}
          <ul>
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}`} style={{ marginBottom: "0.8rem" }}>
                <span className="badge">{item.kind}</span> {formatWhen(item.when)} · {item.title}
                {item.bookingId ? (
                  <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <GateCodeButton bookingId={item.bookingId} />
                    <form action={checkIn}>
                      <input type="hidden" name="booking_id" value={item.bookingId} />
                      <button className="btn secondary" type="submit">
                        Check in
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3>Calendar feed</h3>
          {token ? (
            <p>
              Private link: <code>{siteUrl()}/api/ics/{token}</code>
            </p>
          ) : (
            <p>Create a private link. Anyone with the link can see your schedule, so treat it like a password.</p>
          )}
          <form action={rotateFeed}>
            <button className="btn secondary" type="submit">
              {token ? "Replace calendar link" : "Create calendar link"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
