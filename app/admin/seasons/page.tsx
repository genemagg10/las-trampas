import { Notice } from "@/components/ui";
import { savePrice, saveSeason } from "@/lib/actions/admin";
import { readFlash } from "@/lib/flash";
import { money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { can, getViewer } from "@/lib/viewer";

export const metadata = { title: "Seasons" };

export default async function SeasonsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  const supabase = await createClient();
  const seasons = supabase ? await supabase.from("seasons").select("*").order("year", { ascending: false }) : { data: [] };
  const prices = supabase ? await supabase.from("price_list").select("*").order("season", { ascending: false }) : { data: [] };
  return (
    <>
      <Notice {...flash} />
      {can(viewer, "membership") ? (
        <form className="form card" action={saveSeason}>
          <h3>Season</h3>
          <label>
            Year
            <input name="year" type="number" required defaultValue={2028} />
          </label>
          <label>
            Name
            <input name="name" placeholder="2028 season" />
          </label>
          <label>
            Opens
            <input name="opens_on" type="date" required />
          </label>
          <label>
            Closes
            <input name="closes_on" type="date" required />
          </label>
          <label>
            Renewal deadline
            <input name="renewal_deadline" type="date" required />
          </label>
          <label>
            Late after
            <input name="late_after" type="date" />
          </label>
          <label className="check">
            <input type="checkbox" name="is_current" /> Make this the current season
          </label>
          <label className="check">
            <input type="checkbox" name="copy_prices" /> Copy fees from year
          </label>
          <input name="copy_from" type="number" placeholder="2027" />
          <button className="btn" type="submit">
            Save season
          </button>
        </form>
      ) : null}
      <ul>
        {(seasons.data ?? []).map((season) => (
          <li key={String(season.year)}>
            {String(season.year)} {season.is_current ? "(current)" : ""} · {String(season.opens_on)} to {String(season.closes_on)}
          </li>
        ))}
      </ul>
      {can(viewer, "treasurer") ? (
        <form className="form card" action={savePrice}>
          <h3>Update a fee</h3>
          <label>
            Season
            <input name="season" type="number" required defaultValue={2027} />
          </label>
          <label>
            Item key
            <input name="item" required placeholder="renewal" />
          </label>
          <label>
            Label
            <input name="label" required />
          </label>
          <label>
            Amount in cents
            <input name="amount_cents" type="number" required />
          </label>
          <label>
            Notes
            <input name="notes" />
          </label>
          <button className="btn" type="submit">
            Save fee
          </button>
        </form>
      ) : (
        <p>The treasurer edits fees.</p>
      )}
      <table>
        <thead>
          <tr>
            <th>Season</th>
            <th>Item</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {(prices.data ?? []).map((price) => (
            <tr key={String(price.id)}>
              <td>{String(price.season)}</td>
              <td>{String(price.label)}</td>
              <td>{money(Number(price.amount_cents))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
