import { Notice } from "@/components/ui";
import { completeShift, decideParty, saveEvent, savePartySlot, saveShift } from "@/lib/actions/admin";
import { readFlash } from "@/lib/flash";
import { formatWhen } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { can, getViewer } from "@/lib/viewer";

export const metadata = { title: "Admin events" };

export default async function AdminEvents({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!can(viewer, "social") && !can(viewer, "team")) return <p className="alert error">Social or team access is required.</p>;
  const supabase = await createClient();
  const events = supabase ? await supabase.from("events").select("id, title, starts_at, published, kind").order("starts_at", { ascending: false }).limit(30) : { data: [] };
  const parties = supabase ? await supabase.from("party_reservations").select("id, status, notes, party_slots(starts_at, area)").order("created_at", { ascending: false }).limit(20) : { data: [] };
  const signups = supabase ? await supabase.from("shift_signups").select("id, status, volunteer_shifts(title)").limit(20) : { data: [] };
  const season = supabase ? await supabase.from("seasons").select("year").eq("is_current", true).maybeSingle() : { data: null };

  return (
    <>
      <Notice {...flash} />
      <form className="form card" action={saveEvent}>
        <h3>Event</h3>
        <label>
          Title
          <input name="title" required />
        </label>
        <label>
          Kind
          <select name="kind">
            <option value="social">Social</option>
            <option value="club">Club</option>
            <option value="maintenance">Maintenance</option>
            <option value="swim_team">Swim team</option>
          </select>
        </label>
        <label>
          Starts
          <input name="starts_at" type="datetime-local" required />
        </label>
        <label>
          Ends
          <input name="ends_at" type="datetime-local" />
        </label>
        <label>
          Summary
          <input name="summary" />
        </label>
        <label>
          Description
          <textarea name="description" />
        </label>
        <label>
          Capacity
          <input name="capacity" type="number" />
        </label>
        <label>
          Ticket price in cents
          <input name="price_cents" type="number" defaultValue={0} />
        </label>
        <label>
          Audience role (blank = public)
          <input name="audience_role" placeholder="member or swim_team_family" />
        </label>
        <label>
          Season
          <input name="season" type="number" defaultValue={season.data?.year || 2027} />
        </label>
        <label className="check">
          <input type="checkbox" name="published" defaultChecked /> Published
        </label>
        <button className="btn" type="submit">
          Save event
        </button>
      </form>
      <ul>
        {(events.data ?? []).map((event) => (
          <li key={String(event.id)}>
            {String(event.title)} · {formatWhen(String(event.starts_at))} · {event.published ? "published" : "draft"} · {String(event.id)}
          </li>
        ))}
      </ul>
      <form className="form card" action={saveShift}>
        <h3>Volunteer shift</h3>
        <label>
          Event id
          <input name="event_id" required />
        </label>
        <label>
          Title
          <input name="title" required />
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
          Capacity
          <input name="capacity" type="number" defaultValue={2} />
        </label>
        <label>
          Audience
          <select name="audience">
            <option value="member">Members</option>
            <option value="swim_team">Swim team</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" name="counts_for_deposit" defaultChecked /> Counts toward the volunteer deposit
        </label>
        <button className="btn" type="submit">
          Add shift
        </button>
      </form>
      <h3>Mark a shift complete</h3>
      {(signups.data ?? []).map((row) => {
        const shift = (Array.isArray(row.volunteer_shifts) ? row.volunteer_shifts[0] : row.volunteer_shifts) as { title?: string } | null;
        return (
          <form key={String(row.id)} action={completeShift} className="slot">
            <div>
              {shift?.title} · {String(row.status)}
            </div>
            <input type="hidden" name="signup_id" value={String(row.id)} />
            <input type="hidden" name="status" value="completed" />
            <button className="btn secondary" type="submit">
              Complete
            </button>
          </form>
        );
      })}
      <form className="form card" action={savePartySlot}>
        <h3>Party time</h3>
        <input type="hidden" name="season" value={String(season.data?.year || 2027)} />
        <label>
          Starts
          <input name="starts_at" type="datetime-local" required />
        </label>
        <label>
          Ends
          <input name="ends_at" type="datetime-local" required />
        </label>
        <label>
          Area
          <input name="area" defaultValue="lawn" />
        </label>
        <label>
          Fee in cents
          <input name="fee_cents" type="number" defaultValue={10000} />
        </label>
        <button className="btn" type="submit">
          Add party time
        </button>
      </form>
      <h3>Party requests</h3>
      {(parties.data ?? []).map((row) => {
        const slot = (Array.isArray(row.party_slots) ? row.party_slots[0] : row.party_slots) as { starts_at?: string; area?: string } | null;
        return (
          <form key={String(row.id)} action={decideParty} className="slot">
            <div>
              {slot?.area} {slot?.starts_at ? formatWhen(slot.starts_at) : ""} · {String(row.status)}
            </div>
            <input type="hidden" name="reservation_id" value={String(row.id)} />
            <button className="btn" name="status" value="approved" type="submit">
              Approve
            </button>
            <button className="btn secondary" name="status" value="declined" type="submit">
              Decline
            </button>
          </form>
        );
      })}
    </>
  );
}
