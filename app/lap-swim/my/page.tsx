import Link from "next/link";
import { GateCodeButton } from "@/components/gate-code";
import { Badge, Notice } from "@/components/ui";
import { bookLap, cancelLap, markNotificationsRead } from "@/lib/actions/lap";
import { readFlash } from "@/lib/flash";
import { formatDay, formatTime, formatWhen } from "@/lib/format";
import { isLateCancel, laDate, strikeStatus } from "@/lib/lap/rules";
import { loadBoard, loadPolicy, loadStrikes, myNotifications } from "@/lib/lap/server";
import { cancelToken } from "@/lib/lap/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "My swims" };
export const dynamic = "force-dynamic";

export default async function MySwimsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string; late?: string }> }) {
  const params = await searchParams;
  const flash = await readFlash(Promise.resolve(params));
  const viewer = await getViewer();
  if (!viewer.person) {
    return (
      <section className="band">
        <div className="wrap">
          <h1>My swims</h1>
          <Link className="btn" href="/login?next=/lap-swim/my">Sign in</Link>
        </div>
      </section>
    );
  }
  const board = await loadBoard(viewer.person.id, 8);
  const mine = board.filter((s) => s.mineBookingId);
  const notes = await myNotifications(viewer.person.id);
  const today = laDate(new Date());
  const admin = createAdminClient();
  const teens = admin && viewer.person.household_id
    ? (((await admin.from("people").select("id, first_name, kind").eq("household_id", viewer.person.household_id).eq("kind", "teen")).data ?? []) as { id: string; first_name: string }[])
    : [];
  const unread = notes.rows.filter((n) => !n.read_at).length;
  const policy = await loadPolicy();
  const now = new Date();
  const strikes = strikeStatus((await loadStrikes(viewer.person.id, policy)).rows, policy, now);
  const lateSlot = params.late ? mine.find((s) => s.mineBookingId === params.late) : undefined;

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Lap swim</p>
          <h2>My swims</h2>
          <p>Your booked half hours for the next week. Each one has its own cancel link that works without signing in.</p>
        </div>
        <Notice {...flash} />
        <p>
          <Link className="btn secondary" href="/lap-swim">Book more</Link>
        </p>
        <div className={strikes.suspendedUntil ? "alert error" : "card"} style={{ margin: "0.8rem 0" }}>
          <strong>Strikes: {strikes.points} of {policy.strike_limit}</strong> in the last {policy.strike_window_days} days.
          {strikes.suspendedUntil
            ? ` Booking is paused until ${formatDay(strikes.suspendedUntil)}. Talk to the Lap Swim VP if this looks wrong.`
            : ` A cancel under ${policy.late_cancel_hours} hours before your swim or a no-show counts as a strike. ${policy.strike_limit} strikes pauses booking for ${policy.suspension_days} days.`}
          <div className="muted" style={{ fontSize: "0.8rem" }}>Draft policy, pending board approval.</div>
        </div>
        {lateSlot ? (
          <div id="late" className="alert error" style={{ margin: "0.8rem 0" }}>
            <p>
              <strong>This will count as a strike.</strong> Your swim at {formatDay(lateSlot.starts_at)} {formatTime(lateSlot.starts_at)} is less than {policy.late_cancel_hours} hours away. You can still cancel, and the others in the slot will be told.
            </p>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <form action={cancelLap}>
                <input type="hidden" name="booking_id" value={lateSlot.mineBookingId!} />
                <input type="hidden" name="confirm_late" value="1" />
                <button className="btn" type="submit">Cancel anyway</button>
              </form>
              <Link className="btn secondary" href="/lap-swim/my">Keep my swim</Link>
            </div>
          </div>
        ) : null}

        {mine.length === 0 ? <p className="card">No swims booked in the next week.</p> : null}
        <div className="lane-grid">
          {mine.map((slot) => {
            const alone = slot.others.length === 0;
            const link = `/lap-swim/cancel/${cancelToken(slot.mineBookingId!)}`;
            return (
              <article key={slot.id} className="slot">
                <div>
                  <strong>
                    {formatDay(slot.starts_at)}, {formatTime(slot.starts_at)} to {formatTime(slot.ends_at)}
                  </strong>
                  <div style={{ margin: "0.3rem 0" }}>
                    {alone ? <Badge tone="coral">You are alone so far. Waiting for a buddy.</Badge> : <Badge tone="lawn">With {slot.others.join(", ")}</Badge>}
                  </div>
                  {isLateCancel(now, slot.starts_at, policy) ? (
                    <div style={{ fontSize: "0.8rem" }} className="muted">Less than {policy.late_cancel_hours} hours away: cancelling now counts as a strike.</div>
                  ) : null}
                  <div style={{ fontSize: "0.85rem" }}>
                    One-tap cancel link: <Link href={link}>cancel this half hour</Link>
                  </div>
                  {teens.length > 0 ? (
                    <form action={bookLap} style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem", alignItems: "center" }}>
                      <input type="hidden" name="slot_id" value={slot.id} />
                      <input type="hidden" name="minutes" value="30" />
                      <input type="hidden" name="share_ok" value="1" />
                      <select name="for_person_id" aria-label="Teen">
                        {teens.map((t) => (
                          <option key={t.id} value={t.id}>{t.first_name}</option>
                        ))}
                      </select>
                      <button className="btn secondary" type="submit">Add my teen to my lane</button>
                    </form>
                  ) : null}
                  {slot.day === today && !alone ? (
                    <div style={{ marginTop: "0.4rem" }}>
                      <GateCodeButton bookingId={slot.mineBookingId!} />
                    </div>
                  ) : null}
                </div>
                <form action={cancelLap}>
                  <input type="hidden" name="booking_id" value={slot.mineBookingId!} />
                  <button className="btn secondary" type="submit">Cancel</button>
                </form>
              </article>
            );
          })}
        </div>

        <div className="card" style={{ marginTop: "1.2rem" }}>
          <h3>Notifications {unread ? <Badge tone="sun">{unread} new</Badge> : null}</h3>
          {!notes.ready ? (
            <p className="muted">Notifications turn on after the club runs the lap swim update.</p>
          ) : notes.rows.length === 0 ? (
            <p className="muted">Nothing yet. You will hear here when someone joins your time, when your last buddy cancels, and each morning with who is in your slot.</p>
          ) : (
            <ul>
              {notes.rows.map((n) => (
                <li key={n.id} style={{ fontWeight: n.read_at ? 400 : 700, color: n.urgent ? "var(--coral, #c0392b)" : undefined }}>
                  {n.title} <span className="muted">({formatWhen(n.created_at)})</span>
                  {n.body ? <div style={{ fontWeight: 400 }}>{n.body}</div> : null}
                </li>
              ))}
            </ul>
          )}
          {unread ? (
            <form action={markNotificationsRead}>
              <button className="btn secondary" type="submit">Mark all read</button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
