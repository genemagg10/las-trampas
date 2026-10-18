import { getSnackShack, money } from "@/lib/features";
import { Seahorse } from "@/components/seahorse";

export const metadata = { title: "Snack Shack" };

export default async function SnackShackPage() {
  const { items, hours } = await getSnackShack();
  const categories = [...new Set(items.filter((i) => i.available).map((i) => i.category))];
  return (
    <section className="band">
      <div className="wrap grid-2" style={{ alignItems: "start" }}>
        <div>
          <div className="section-head">
            <p className="eyebrow">Snack Shack</p>
            <h2>Menu & prices</h2>
            <p>The board updates this menu each season.</p>
          </div>
          {items.length === 0 ? (
            <p className="card">The menu for next season has not been posted yet. Check back when the pool opens in May.</p>
          ) : (
            categories.map((category) => (
              <div className="card" key={category} style={{ marginBottom: "1rem" }}>
                <h3>{category}</h3>
                <ul className="menu-list">
                  {items
                    .filter((i) => i.category === category && i.available)
                    .map((i) => (
                      <li key={i.name}>
                        <span>
                          <b>{i.name}</b>
                          {i.description ? (
                            <>
                              <br />
                              <small>{i.description}</small>
                            </>
                          ) : null}
                        </span>
                        <span className="price">{money(i.price_cents)}</span>
                      </li>
                    ))}
                </ul>
              </div>
            ))
          )}
          <p className="card">
            <Seahorse id="snack-shack" size={16} style={{ float: "right", color: "var(--color-sun)", opacity: 0.45 }} />
            <b>The full regular menu isn’t posted yet.</b> Past club events have offered pre-made burritos and chips with salsa at the Snack Shack
            (Opening Day Party, May 2026).
          </p>
        </div>
        <div>
          <div className="section-head">
            <p className="eyebrow">Hours</p>
            <h2>When it’s open</h2>
          </div>
          {hours.length === 0 ? (
            <p className="card">Snack Shack hours haven’t been posted yet. They will appear here once the board sets them for the season.</p>
          ) : (
            <div className="card">
              <ul className="menu-list">
                {hours.map((h) => (
                  <li key={h.label}>
                    <b>{h.label}</b>
                    <span>{h.hours}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
