import { Notice } from "@/components/ui";
import { markNoShow } from "@/lib/actions/lap";
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
  const all = admin
    ? (((await admin.from("lap_bookings").select("person_id, people!lap_bookings_person_id_fkey(first_name, last_name)").eq("status", "no_show")).data ?? []) as unknown as Row[])
    : [];
  const counts = new Map<string, { name: string; n: number }>();
  for (const r of all) {
    const c = counts.get(r.person_id) ?? { name: `${r.people?.first_name ?? ""} ${r.people?.last_name ?? ""}`.trim(), n: 0 };
    c.n += 1;
    counts.set(r.person_id, c);
  }
  recent.sort((a, b) => (b.lap_slots?.starts_at ?? "").localeCompare(a.lap_slots?.starts_at ?? ""));
  return (
    <div>
      <h3>Lap swim no-shows</h3>
      <Notice {...flash} />
      <div className="card">
        <h4>No-show counts</h4>
        {counts.size === 0 ? <p>No no-shows recorded.</p> : (
          <ul>
            {[...counts.values()].sort((a, b) => b.n - a.n).map((c) => (
              <li key={c.name}>{c.name}: {c.n}</li>
            ))}
          </ul>
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
