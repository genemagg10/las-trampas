import Link from "next/link";
import { Badge, Notice } from "@/components/ui";
import { bookLane, cancelLane, inviteBuddy } from "@/lib/actions/member";
import { readFlash } from "@/lib/flash";
import { formatWhen } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Lap swim" };

type Slot = {
  slot_id: string;
  lane_number: number;
  starts_at: string;
  ends_at: string;
  capacity: number;
  booked_count: number;
  blocked_reason: string | null;
  mine: boolean;
  buddy_count: number;
  buddy_met: boolean;
};

export default async function LapSwimPage({
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
          <h1>Lap swim</h1>
          <Link href="/login?next=/lap-swim">Sign in</Link>
        </div>
      </section>
    );
  }
  const supabase = await createClient();
  const from = new Date();
  const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
  const board = supabase ? await supabase.rpc("lap_slot_board", { p_from: from.toISOString(), p_to: to.toISOString() }) : { data: [], error: null };
  const mine = supabase
    ? await supabase.from("lap_bookings").select("id, slot_id, status").eq("person_id", viewer.person.id).eq("status", "booked")
    : { data: [] };
  const buddies = supabase ? await supabase.rpc("lap_slot_buddies", { p_slot_id: (mine.data?.[0]?.slot_id as string) || "00000000-0000-0000-0000-000000000000" }) : { data: [] };
  const slots = (board.data ?? []) as Slot[];
  const bookingBySlot = new Map((mine.data ?? []).map((row) => [String(row.slot_id), String(row.id)]));

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Lap swim</p>
          <h2>Book a lane</h2>
          <p>
            {viewer.isLap ? "Waiver signed for this season." : "Sign the season waiver before a lane can be booked."} The next seven days are shown.
            A booking is confirmed when the buddy count meets the board’s rule.
          </p>
        </div>
        <Notice {...flash} />
        {board.error ? <p className="alert error">{board.error.message}</p> : null}
        <p>
          <Link className="btn" href="/lap-swim/waiver">
            {viewer.isLap ? "View waiver" : "Sign the waiver"}
          </Link>
        </p>
        <div className="lane-grid">
          {slots.length === 0 ? <p className="card">No lane times in the next week. An admin generates them from the weekday template.</p> : null}
          {slots.map((slot) => (
            <article key={slot.slot_id} className="slot">
              <div>
                <strong>Lane {slot.lane_number}</strong>
                <div>{formatWhen(slot.starts_at)}</div>
                <div>
                  {slot.blocked_reason ? (
                    <Badge tone="muted">{slot.blocked_reason}</Badge>
                  ) : (
                    <Badge tone={slot.buddy_met ? "lawn" : "sun"}>
                      {slot.booked_count}/{slot.capacity} · buddies {slot.buddy_count}
                      {slot.buddy_met ? " · confirmed" : " · needs buddy"}
                    </Badge>
                  )}
                </div>
              </div>
              {slot.mine ? (
                <form action={cancelLane}>
                  <input type="hidden" name="booking_id" value={bookingBySlot.get(slot.slot_id) || ""} />
                  <button className="btn secondary" type="submit">
                    Cancel
                  </button>
                </form>
              ) : (
                <form action={bookLane}>
                  <input type="hidden" name="slot_id" value={slot.slot_id} />
                  <button className="btn" type="submit" disabled={Boolean(slot.blocked_reason)}>
                    Book
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
        <form className="form card" action={inviteBuddy} style={{ marginTop: "1rem" }}>
          <h3>Invite a buddy</h3>
          <p>Enter the other member’s person id from the directory, and the lane time id from your booking.</p>
          <label>
            Their person id
            <input name="to_person_id" required />
          </label>
          <label>
            Lane time
            <select name="slot_id" required>
              {(mine.data ?? []).map((row) => (
                <option key={String(row.slot_id)} value={String(row.slot_id)}>
                  {String(row.slot_id)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn secondary" type="submit">
            Send invite
          </button>
        </form>
        {(buddies.data ?? []).length > 0 ? (
          <p>
            Visible buddies on your first booking:{" "}
            {(buddies.data as { first_name: string; last_name: string }[]).map((person) => `${person.first_name} ${person.last_name}`).join(", ")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
