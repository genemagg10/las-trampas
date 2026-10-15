import { Notice } from "@/components/ui";
import { inviteWaitlist, saveTeamRegistration } from "@/lib/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { can, getViewer } from "@/lib/viewer";

export const metadata = { title: "Members" };

export default async function AdminMembers({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string; q?: string }>;
}) {
  const query = await searchParams;
  const viewer = await getViewer();
  if (!can(viewer, "membership") && !viewer.isAdmin) return <p className="alert error">Membership access is required.</p>;
  const supabase = await createClient();
  const term = (query.q || "").replace(/[%(),]/g, "").trim();
  let people = supabase?.from("people").select("id, first_name, last_name, email, kind, household_id, households(name, status, membership_type)").order("last_name").limit(100);
  if (people && term) people = people.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`);
  const rows = people ? await people : { data: [] };
  const waitlist = supabase ? await supabase.from("waitlist_applications").select("id, household_name, contact_email, status, position").order("created_at", { ascending: false }).limit(50) : { data: [] };
  const season = supabase ? await supabase.from("seasons").select("year").eq("is_current", true).maybeSingle() : { data: null };

  return (
    <>
      <Notice notice={query.notice} error={query.error} />
      <form className="form">
        <label>
          Search
          <input name="q" defaultValue={term} placeholder="Name or email" />
        </label>
        <button className="btn secondary" type="submit">
          Search
        </button>
      </form>
      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Household</th>
              <th>Ids</th>
            </tr>
          </thead>
          <tbody>
            {(rows.data ?? []).map((person) => {
              const household = (Array.isArray(person.households) ? person.households[0] : person.households) as { name?: string; status?: string; membership_type?: string } | null;
              return (
                <tr key={String(person.id)}>
                  <td>
                    {String(person.first_name)} {String(person.last_name)}
                    <br />
                    {String(person.email || "")} · {String(person.kind)}
                  </td>
                  <td>
                    {household?.name} · {household?.membership_type} · {household?.status}
                  </td>
                  <td>
                    <small>
                      person {String(person.id)}
                      <br />
                      household {String(person.household_id)}
                    </small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h3>Waitlist</h3>
      {(waitlist.data ?? []).map((row) => (
        <form key={String(row.id)} action={inviteWaitlist} className="slot">
          <div>
            {String(row.household_name)} · {String(row.status)} · position {String(row.position ?? "—")}
          </div>
          <input type="hidden" name="application_id" value={String(row.id)} />
          <button className="btn secondary" type="submit">
            Invite
          </button>
        </form>
      ))}
      <form className="form card" action={saveTeamRegistration}>
        <h3>Register a Seahorses swimmer</h3>
        <input type="hidden" name="season" value={String(season.data?.year || 2027)} />
        <label>
          Household id
          <input name="household_id" required />
        </label>
        <label>
          Swimmer person id
          <input name="swimmer_person_id" required />
        </label>
        <button className="btn" type="submit">
          Grant team access
        </button>
      </form>
    </>
  );
}
