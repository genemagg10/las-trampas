import Link from "next/link";
import { formatDay } from "@/lib/format";
import { getLostItems } from "@/lib/features";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Lost & Found" };

export default async function LostFoundPage() {
  const viewer = await getViewer();
  const head = (
    <div className="section-head">
      <p className="eyebrow">Lost & Found</p>
      <h2>Left something at the pool?</h2>
      <p>Staff photograph what turns up on the deck. Spot yours, then pick it up at the pool or contact the board.</p>
    </div>
  );
  if (!viewer.userId) {
    return (
      <section className="band">
        <div className="wrap">
          {head}
          <p className="card">
            The gallery is for members. <Link href="/login?next=/lost-found">Sign in</Link> to see found items.
          </p>
        </div>
      </section>
    );
  }
  const { items, migrated } = await getLostItems();
  const open = items.filter((i) => !i.claimed);
  const claimed = items.filter((i) => i.claimed);
  return (
    <section className="band">
      <div className="wrap">
        {head}
        {!migrated || items.length === 0 ? (
          <p className="card">Nothing in Lost & Found right now. New items appear here as staff add them.</p>
        ) : null}
        <div className="lf-grid">
          {[...open, ...claimed].map((item) => (
            <article key={item.id} className={`lf-card ${item.claimed ? "claimed" : ""}`}>
              {item.url ? <img src={item.url} alt={item.description} /> : <div className="noimg">No photo</div>}
              <div className="body">
                <b>{item.description}</b>
                <br />
                <small>
                  Found {formatDay(new Date(`${item.found_on}T12:00:00`))}
                  {item.location ? ` · ${item.location}` : ""}
                </small>
                {item.claimed ? <p className="tbc-tag" style={{ marginLeft: 0 }}>Claimed</p> : null}
              </div>
            </article>
          ))}
        </div>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/contact">Contact the board</Link> about an item.
        </p>
      </div>
    </section>
  );
}
