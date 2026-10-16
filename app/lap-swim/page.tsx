import Link from "next/link";
import { Badge, Notice } from "@/components/ui";
import { bookLap } from "@/lib/actions/lap";
import { readFlash } from "@/lib/flash";
import { formatDay, formatTime } from "@/lib/format";
import { coverPullers, isSocial, laDate, nearestCovered } from "@/lib/lap/rules";
import { loadBoard, loadPolicy, type BoardSlot } from "@/lib/lap/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Lap swim" };
export const dynamic = "force-dynamic";

function Who({ slot }: { slot: BoardSlot }) {
  if (slot.others.length === 0) return <span className="muted">Nobody yet</span>;
  return <span>{slot.others.join(", ")}</span>;
}

export default async function LapSwimPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string; confirm?: string; minutes?: string; share?: string; day?: string }>;
}) {
  const params = await searchParams;
  const flash = await readFlash(Promise.resolve(params));
  const viewer = await getViewer();
  if (!viewer.person) {
    return (
      <section className="band">
        <div className="wrap">
          <h1>Lap swim</h1>
          <p>
            <Link className="btn" href="/login?next=/lap-swim">Sign in</Link> to see lap times.
          </p>
        </div>
      </section>
    );
  }
  if (!viewer.isMember) {
    return (
      <section className="band">
        <div className="wrap">
          <h1>Lap swim</h1>
          <p>Lap swim is for members with a signed lap waiver.</p>
        </div>
      </section>
    );
  }

  const board = await loadBoard(viewer.person.id, 8);
  const pullers = coverPullers(board);
  const days = [...new Set(board.map((s) => s.day))];
  const active = params.day && days.includes(params.day) ? params.day : days[0];
  const daySlots = board.filter((s) => s.day === active);
  const confirmSlot = params.confirm ? board.find((s) => s.id === params.confirm) : undefined;
  const suggestions = confirmSlot ? nearestCovered(confirmSlot, board) : [];
  const policy = await loadPolicy();

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Lap swim</p>
          <h2>Book a lap swim</h2>
          <p>
            Half-hour times, 6 swimmers each, one swimmer per lane (sharing is optional). Book 30, 60 or 90 minutes at a time.
            {policy.caps_enabled ? ` Current limits: ${policy.max_days_per_week} days a week, ${policy.max_minutes_per_day} minutes a day.` : ""}
            {" "}A buddy is anyone else in the same half hour. Please cancel at least {policy.late_cancel_hours} hours ahead: later cancels and no-shows count as strikes (draft policy, pending board approval).
          </p>
        </div>
        <Notice {...flash} />
        <p style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Link className="btn" href="/lap-swim/my">My swims</Link>
          <Link className="btn secondary" href="/lap-swim/waiver">{viewer.isLap ? "View waiver" : "Sign the waiver"}</Link>
        </p>
        {!viewer.isLap ? <p className="alert error">Sign the season lap waiver before booking.</p> : null}

        {confirmSlot ? (
          <div id="confirm" className="card alert" style={{ margin: "1rem 0" }}>
            <h3>You would be swimming alone</h3>
            <p>
              Nobody else is booked at {formatDay(confirmSlot.starts_at)} {formatTime(confirmSlot.starts_at)} yet.
              {suggestions.length > 0
                ? ` ${suggestions.map((s) => `${s.others[0]} is at ${formatTime(s.starts_at)}`).join("; ")}.`
                : " No one else is booked that day yet."}
            </p>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              {suggestions.map((s) => (
                <form key={s.id} action={bookLap}>
                  <input type="hidden" name="slot_id" value={s.id} />
                  <input type="hidden" name="minutes" value={params.minutes || "30"} />
                  <input type="hidden" name="share_ok" value={params.share || "1"} />
                  <button className="btn" type="submit">Book {formatTime(s.starts_at)} instead</button>
                </form>
              ))}
              <form action={bookLap}>
                <input type="hidden" name="slot_id" value={confirmSlot.id} />
                <input type="hidden" name="minutes" value={params.minutes || "30"} />
                <input type="hidden" name="share_ok" value={params.share || "1"} />
                <input type="hidden" name="confirm_alone" value="1" />
                <label style={{ display: "block", marginBottom: "0.4rem" }}>
                  <input type="checkbox" name="alert_on_join" value="1" defaultChecked /> Tell me when someone joins
                </label>
                <button className="btn secondary" type="submit">Book anyway</button>
              </form>
              <Link className="btn secondary" href={`/lap-swim?day=${laDate(confirmSlot.starts_at)}`}>Back</Link>
            </div>
          </div>
        ) : null}

        <nav className="nav" style={{ margin: "1rem 0", flexWrap: "wrap" }}>
          {days.map((day) => (
            <Link key={day} href={`/lap-swim?day=${day}`} aria-current={day === active ? "page" : undefined} style={day === active ? { fontWeight: 700, textDecoration: "underline" } : undefined}>
              {formatDay(`${day}T12:00:00-07:00`)}
            </Link>
          ))}
        </nav>

        {board.length === 0 ? <p className="card">No lap times in the next week yet.</p> : null}
        <div className="lane-grid">
          {daySlots.map((slot) => {
            const full = slot.booked >= slot.capacity;
            const covered = slot.booked >= 2;
            return (
              <article key={slot.id} className="slot" style={pullers.has(slot.id) ? { borderLeft: "5px solid var(--sun, #f2b632)" } : undefined}>
                <div>
                  <strong>
                    {formatTime(slot.starts_at)} to {formatTime(slot.ends_at)}
                  </strong>
                  <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", margin: "0.25rem 0" }}>
                    {pullers.has(slot.id) ? <Badge tone="sun">Pulls the covers</Badge> : null}
                    {isSocial(slot) ? <Badge tone="lawn">Sunday Social, shared lanes, coffee</Badge> : null}
                    {slot.blocked ? <Badge tone="muted">Blocked</Badge> : <Badge tone={covered ? "lawn" : "sun"}>{slot.booked}/{slot.capacity} spots{covered ? ", buddy covered" : slot.booked === 1 ? ", needs a buddy" : ""}</Badge>}
                  </div>
                  <div style={{ fontSize: "0.9rem" }}>
                    <Who slot={slot} />
                  </div>
                </div>
                {slot.mineBookingId ? (
                  <Link className="btn secondary" href="/lap-swim/my">You are in</Link>
                ) : (
                  <form action={bookLap} style={{ display: "grid", gap: "0.3rem" }}>
                    <input type="hidden" name="slot_id" value={slot.id} />
                    {isSocial(slot) ? (
                      <input type="hidden" name="minutes" value="90" />
                    ) : (
                      <select name="minutes" defaultValue="30" aria-label="Length">
                        <option value="30">30 min</option>
                        <option value="60">60 min</option>
                        <option value="90">90 min</option>
                      </select>
                    )}
                    <label style={{ fontSize: "0.8rem" }}>
                      <input type="checkbox" name="share_ok" value="1" defaultChecked /> OK to share a lane
                    </label>
                    <input type="hidden" name="share_ok" value="0" />
                    <button className="btn" type="submit" disabled={slot.blocked || full || !viewer.isLap}>
                      {full ? "Full" : "Book"}
                    </button>
                  </form>
                )}
              </article>
            );
          })}
        </div>
        <p className="muted" style={{ marginTop: "1rem" }}>
          Teens 15 to 17 need the teen waiver and swim in a parent&apos;s lane. A parent adds them from My swims. The gate code shows only on days your time is buddy covered.
        </p>
      </div>
    </section>
  );
}
