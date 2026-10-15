import Link from "next/link";
import { PhotoSlot, photos } from "@/components/ui";
import { formatWhen, money } from "@/lib/format";
import { getEvents } from "@/lib/queries";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const events = await getEvents();
  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Events</p>
          <h2>Socials, club dates, and team events you can see</h2>
        </div>
        <div className="grid-2">
          {events.filter((event) => event.published !== false).map((event) => (
            <article key={String(event.id)} className="card">
              <PhotoSlot label={`Photo for ${event.title}`} ratio="card" photo={photos.poolDeckCard} />
              <h3>
                <Link href={`/events/${event.id}`}>{String(event.title)}</Link>
              </h3>
              <p>
                {formatWhen(String(event.starts_at))}
                {Number(event.price_cents) > 0 ? ` · ${money(Number(event.price_cents))}` : ""}
              </p>
              <p>{String(event.summary || "")}</p>
            </article>
          ))}
        </div>
        {events.length === 0 ? <p className="card">No events are published yet. Pool-wide socials like the Opening Party, the June and July BBQs, and Las-Toberfest will appear here.</p> : null}
      </div>
    </section>
  );
}
