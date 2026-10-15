import Link from "next/link";
import { Notice } from "@/components/ui";
import { addHouseholdPerson, removeHouseholdPerson } from "@/lib/actions/member";
import { readFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Household" };

export default async function HouseholdPage({
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
          <Link href="/login?next=/account/household">Sign in</Link>
        </div>
      </section>
    );
  }
  const supabase = await createClient();
  const people = supabase
    ? await supabase.from("people").select("id, first_name, last_name, email, kind, user_id").eq("household_id", viewer.person.household_id)
    : { data: [] };

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Household</p>
          <h2>{viewer.household?.name}</h2>
          <p>Add family members here. They claim the email when they create their own login.</p>
        </div>
        <Notice {...flash} />
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Kind</th>
                <th>Login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(people.data ?? []).map((person) => (
                <tr key={String(person.id)}>
                  <td>
                    {String(person.first_name)} {String(person.last_name)}
                    <br />
                    <small>{String(person.email || "")}</small>
                  </td>
                  <td>{String(person.kind)}</td>
                  <td>{person.user_id ? "Has a login" : "No login yet"}</td>
                  <td>
                    {person.id !== viewer.person?.id ? (
                      <form action={removeHouseholdPerson}>
                        <input type="hidden" name="person_id" value={String(person.id)} />
                        <button className="btn coral" type="submit">
                          Remove
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="form card" action={addHouseholdPerson} style={{ marginTop: "1rem" }}>
          <h3>Add a person</h3>
          <label>
            First name
            <input name="first_name" required />
          </label>
          <label>
            Last name
            <input name="last_name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" />
          </label>
          <label>
            Kind
            <select name="kind" defaultValue="child">
              <option value="adult">Adult</option>
              <option value="teen">Teen</option>
              <option value="child">Child</option>
            </select>
          </label>
          <label>
            Birth year
            <input name="birth_year" type="number" />
          </label>
          <button className="btn" type="submit">
            Add
          </button>
        </form>
      </div>
    </section>
  );
}
