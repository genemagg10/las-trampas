import { Notice } from "@/components/ui";
import { saveSnackHours, saveSnackItem } from "@/lib/actions/features";
import { getSnackShack } from "@/lib/features";
import { readFlash } from "@/lib/flash";
import { can, getViewer } from "@/lib/viewer";

export const metadata = { title: "Admin snack shack" };

export default async function AdminSnack({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!can(viewer, "social")) return <p className="alert error">Social access is required.</p>;
  const { items, hours, migrated } = await getSnackShack();
  return (
    <>
      <Notice {...flash} />
      {!migrated ? <p className="alert error">The snack shack tables are not set up yet. Run the pool features migration.</p> : null}
      <h3>Menu</h3>
      {[...items, { id: "", category: "Menu", name: "", description: "", price_cents: null, available: true, sort_order: 0 }].map((item, i) => (
        <form key={item.id || `new-${i}`} action={saveSnackItem} className="form card">
          <input type="hidden" name="id" value={item.id ?? ""} />
          <h4>{item.id ? item.name : "Add an item"}</h4>
          <label>
            Category
            <input name="category" defaultValue={item.category} />
          </label>
          <label>
            Name
            <input name="name" defaultValue={item.name} required />
          </label>
          <label>
            Description
            <input name="description" defaultValue={item.description ?? ""} />
          </label>
          <label>
            Price ($)
            <input name="price" defaultValue={item.price_cents === null ? "" : (item.price_cents / 100).toFixed(2)} />
          </label>
          <label>
            Sort order
            <input name="sort_order" type="number" defaultValue={item.sort_order ?? 0} />
          </label>
          <label className="check">
            <input type="checkbox" name="available" defaultChecked={item.available} /> Show on menu
          </label>
          <button className="btn" type="submit">
            Save
          </button>
          {item.id ? (
            <button className="btn secondary" type="submit" name="do" value="delete">
              Remove
            </button>
          ) : null}
        </form>
      ))}
      <h3>Hours</h3>
      {[...hours, { id: "", label: "", hours: "", sort_order: 0 }].map((h, i) => (
        <form key={h.id || `new-${i}`} action={saveSnackHours} className="form card">
          <input type="hidden" name="id" value={h.id ?? ""} />
          <label>
            Day(s)
            <input name="label" defaultValue={h.label} placeholder="Weekends" required />
          </label>
          <label>
            Hours
            <input name="hours" defaultValue={h.hours} placeholder="12–5 pm" required />
          </label>
          <label>
            Sort order
            <input name="sort_order" type="number" defaultValue={h.sort_order ?? 0} />
          </label>
          <button className="btn" type="submit">
            Save
          </button>
          {h.id ? (
            <button className="btn secondary" type="submit" name="do" value="delete">
              Remove
            </button>
          ) : null}
        </form>
      ))}
    </>
  );
}
