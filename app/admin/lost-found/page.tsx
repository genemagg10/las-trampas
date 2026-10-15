import { Notice } from "@/components/ui";
import { addLostItem, updateLostItem } from "@/lib/actions/features";
import { getLostItems } from "@/lib/features";
import { readFlash } from "@/lib/flash";
import { can, getViewer } from "@/lib/viewer";

export const metadata = { title: "Admin lost & found" };

export default async function AdminLostFound({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!can(viewer, "membership") && !can(viewer, "social")) return <p className="alert error">Membership or social access is required.</p>;
  const { items, migrated } = await getLostItems();
  return (
    <>
      <Notice {...flash} />
      {!migrated ? <p className="alert error">The lost &amp; found table is not set up yet. Run the pool features migration.</p> : null}
      <form className="form card" action={addLostItem}>
        <h3>Add a found item</h3>
        <label>
          Photo
          <input name="file" type="file" accept="image/*" />
        </label>
        <label>
          Description
          <input name="description" required placeholder="Blue towel with whales" />
        </label>
        <label>
          Where it was found
          <input name="location" placeholder="Pool deck, lawn…" />
        </label>
        <label>
          Date found
          <input name="found_on" type="date" />
        </label>
        <button className="btn" type="submit">
          Add item
        </button>
      </form>
      {items.map((item) => (
        <form key={item.id} action={updateLostItem} className="slot">
          <input type="hidden" name="id" value={item.id} />
          <div>
            {item.description} · {item.found_on}
          </div>
          <label className="check">
            <input type="checkbox" name="claimed" defaultChecked={item.claimed} /> Claimed
          </label>
          <button className="btn secondary" type="submit">
            Save
          </button>
          <button className="btn secondary" type="submit" name="do" value="delete">
            Remove
          </button>
        </form>
      ))}
    </>
  );
}
