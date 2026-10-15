import Link from "next/link";
import { PhotoSlot } from "@/components/ui";
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
              <PhotoSlot label={`Photo for ${event.title}`} ratio="card" />
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
        {events.length === 0 ? <p>No events are published yet.</p> : null}
      </div>
    </section>
  );
}
