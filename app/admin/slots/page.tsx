import { Notice } from "@/components/ui";
import { generateSlots, saveBlock, saveLapSettings, setGateCode } from "@/lib/actions/admin";
import { readFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";
import { can, getViewer } from "@/lib/viewer";

export const metadata = { title: "Lanes" };

export default async function SlotsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!can(viewer, "lap")) return <p className="alert error">Lap swim access is required.</p>;
  const supabase = await createClient();
  const settings = supabase ? await supabase.from("lap_settings").select("*").order("season", { ascending: false }).limit(1).maybeSingle() : { data: null };
  const lanes = supabase ? await supabase.from("lanes").select("id, number").order("number") : { data: [] };
  const current = (settings.data ?? {}) as Record<string, unknown>;

  return (
    <>
      <Notice {...flash} />
      <form className="form card" action={saveLapSettings}>
        <h3>Booking rules</h3>
        <label>
          Season
          <input name="season" type="number" required defaultValue={Number(current.season || 2027)} />
        </label>
        <label>
          Max bookings per week
          <input name="max_per_week" type="number" defaultValue={Number(current.max_per_week || 3)} />
        </label>
        <label>
          Days ahead
          <input name="max_advance_days" type="number" defaultValue={Number(current.max_advance_days || 7)} />
        </label>
        <label>
          Cancel cutoff in hours
          <input name="cancel_hours" type="number" defaultValue={12} />
        </label>
        <label>
          Buddy rule
          <select name="buddy_mode" defaultValue={String(current.buddy_mode || "same_slot")}>
            <option value="same_slot">Same time, any lane</option>
            <option value="same_lane">Same lane</option>
          </select>
        </label>
        <label>
          Minimum buddies
          <input name="min_buddies" type="number" defaultValue={Number(current.min_buddies || 2)} />
        </label>
        <button className="btn" type="submit">
          Save rules
        </button>
      </form>
      <form className="form card" action={generateSlots}>
        <h3>Generate lane times</h3>
        <label>
          Season
          <input name="season" type="number" defaultValue={2027} />
        </label>
        <label>
          From
          <input name="from" type="date" required />
        </label>
        <label>
          To
          <input name="to" type="date" required />
        </label>
        <button className="btn" type="submit">
          Generate
        </button>
      </form>
      <form className="form card" action={saveBlock}>
        <h3>Block the pool</h3>
        <input type="hidden" name="season" value={String(current.season || 2027)} />
        <label>
          Lane (blank = all)
          <select name="lane_id" defaultValue="">
            <option value="">All lanes</option>
            {(lanes.data ?? []).map((lane) => (
              <option key={String(lane.id)} value={String(lane.id)}>
                Lane {String(lane.number)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Starts
          <input name="starts_at" type="datetime-local" required />
        </label>
        <label>
          Ends
          <input name="ends_at" type="datetime-local" required />
        </label>
        <label>
          Reason
          <input name="reason" required placeholder="Swim team practice" />
        </label>
        <button className="btn secondary" type="submit">
          Save block
        </button>
      </form>
      <form className="form card" action={setGateCode}>
        <h3>Gate code</h3>
        <p>Stored privately. Swimmers see it only on the day of a confirmed booking.</p>
        <label>
          Code
          <input name="code" required autoComplete="off" />
        </label>
        <label>
          Valid from
          <input name="valid_from" type="date" required />
        </label>
        <label>
          Valid to
          <input name="valid_to" type="date" required />
        </label>
        <button className="btn" type="submit">
          Store code
        </button>
      </form>
    </>
  );
}
