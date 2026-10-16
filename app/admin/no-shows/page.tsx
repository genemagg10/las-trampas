import { Notice } from "@/components/ui";
import { clearStrike, markNoShow } from "@/lib/actions/lap";
import { strikeStatus } from "@/lib/lap/rules";
import { loadPolicy, loadStrikes } from "@/lib/lap/server";
import { readFlash } from "@/lib/flash";
import { formatWhen } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

type Row = { id: string; status: string; person_id: string; people: { first_name: string; last_name: string } | null; lap_slots: { starts_at: string } | null };

export default async function NoShowsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!can(viewer, "lap")) return <p>Only the Lap Swim VP or an admin can see this.</p>;
  const admin = createAdminClient();
  const nowDate = new Date();
  const since = new Date(nowDate.getTime() - 14 * 86400000).toISOString();
  const recent = admin
    ? (((await admin
        .from("lap_bookings")
        .select("id, status, person_id, people!lap_bookings_person_id_fkey(first_name, last_name), lap_slots!inner(starts_at)")
        .in("status", ["booked", "attended", "no_show"])
        .gte("lap_slots.starts_at", since)
        .lte("lap_slots.starts_at", nowDate.toISOString())).data ?? []) as unknown as Row[])
    : [];
  const policy = await loadPolicy();
  const strikes = await loadStrikes(null, policy);
  const people = new Map<string, { name: string; rows: typeof strikes.rows }>();
  for (const r of strikes.rows) {
    const p = people.get(r.person_id) ?? { name: r.name || "Member", rows: [] };
    p.rows.push(r);
    people.set(r.person_id, p);
  }
  recent.sort((a, b) => (b.lap_slots?.starts_at ?? "").localeCompare(a.lap_slots?.starts_at ?? ""));
  return (
    <div>
      <h3>Lap swim strikes</h3>
      <Notice {...flash} />
      <p className="muted">
        Draft policy, pending board approval: a cancel under {policy.late_cancel_hours} hours counts {policy.late_cancel_strikes}, a no-show counts {policy.no_show_strikes}.
        {" "}{policy.strike_limit} strikes within {policy.strike_window_days} days pauses booking for {policy.suspension_days} days. Booking caps are {policy.caps_enabled ? "on" : "off"}.
        {" "}These live in the club setting lap_policy.
      </p>
      <div className="card">
        <h4>Strikes by member</h4>
        {!strikes.ready ? <p className="muted">Strikes are worked out from bookings until the lap update is run in the database. Clearing turns on after that.</p> : null}
        {people.size === 0 ? <p>No strikes recorded.</p> : (
          <table>
            <tbody>
              {[...people.entries()].map(([id, p]) => {
                const st = strikeStatus(p.rows, policy, nowDate);
                return (
                  <tr key={id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{st.points} active{st.suspendedUntil ? `, paused until ${formatWhen(st.suspendedUntil)}` : ""}</td>
                    <td>
                      {p.rows.map((r) => (
                        <div key={r.id} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                          <span className={r.cleared_at ? "muted" : undefined}>
                            {r.reason === "late_cancel" ? "Late cancel" : r.reason === "no_show" ? "No-show" : "Strike"} {formatWhen(r.created_at)}{r.cleared_at ? " (cleared)" : ""}
                          </span>
                          {strikes.ready && !r.cleared_at ? (
                            <form action={clearStrike}>
                              <input type="hidden" name="strike_id" value={r.id} />
                              <button className="btn secondary" type="submit">Clear</button>
                            </form>
                          ) : null}
                        </div>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="card" style={{ marginTop: "1rem" }}>
        <h4>Past two weeks</h4>
        {recent.length === 0 ? <p>No past bookings in the last two weeks.</p> : (
          <table>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td>{r.lap_slots ? formatWhen(r.lap_slots.starts_at) : ""}</td>
                  <td>{r.people?.first_name} {r.people?.last_name}</td>
                  <td>{r.status}</td>
                  <td>
                    <form action={markNoShow}>
                      <input type="hidden" name="booking_id" value={r.id} />
                      {r.status === "no_show" ? <input type="hidden" name="undo" value="1" /> : null}
                      <button className="btn secondary" type="submit">{r.status === "no_show" ? "Undo" : "No-show"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
