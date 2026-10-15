import Link from "next/link";
import Image from "next/image";
import { Photo, photos } from "@/components/ui";
import { getEvents, getPublicPosts, getSeason, isUpcoming } from "@/lib/queries";
import { formatDay } from "@/lib/format";

export default async function HomePage() {
  const [season, posts, events] = await Promise.all([getSeason(), getPublicPosts(), getEvents()]);
  const publicPosts = posts.filter((post) => !post.audience_role).slice(0, 3);
  const upcoming = events.filter((event) => !event.audience_role && event.published !== false && isUpcoming(event.starts_at)).slice(0, 3);

  return (
    <>
      <section className="hero">
        <Image src={photos.poolDeck.src} alt={photos.poolDeck.alt} fill priority sizes="100vw" />
        <div className="wrap">
          <p className="eyebrow">Burton Valley · Lafayette · since 1958</p>
          <h1>LT is the best place to be, all summer long.</h1>
          <p>
            Las Trampas Pool is a member-owned swim club in the Burton Valley neighborhood of Lafayette, right on the Lafayette/Moraga Regional
            Trail. Dues, lap lanes, socials, volunteer shifts, and club updates all live here, behind one login.
          </p>
          <p style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <Link className="btn" href="/login">
              Member sign in
            </Link>
            <Link className="btn secondary" href="/membership">
              Membership & fees
            </Link>
          </p>
          <p style={{ fontSize: "0.95rem" }}>
            {season ? `${season.name} · open ${formatDay(new Date(`${season.opens_on}T12:00:00`))} through ${formatDay(new Date(`${season.closes_on}T12:00:00`))}` : "Open to members and their guests from May through October."}
          </p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">The club</p>
            <h2>Everything a summer needs</h2>
            <p>Founded by local residents in 1958, Las Trampas has stayed a family-friendly place where lifelong friendships are formed.</p>
          </div>
          <ul className="facts">
            <li>
              <strong>6 lanes</strong>
              <span>25-yard lap pool</span>
            </li>
            <li>
              <strong>Diving well</strong>
              <span>With a diving board</span>
            </li>
            <li>
              <strong>Baby pool</strong>
              <span>For children 5 and under</span>
            </li>
            <li>
              <strong>Big lawn</strong>
              <span>Two barbecues, shade trees, lounge chairs</span>
            </li>
            <li>
              <strong>May–Oct</strong>
              <span>Open to members and guests</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="band band-sand">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">At the club</p>
            <h2>Lap swim, socials, and the Seahorses</h2>
            <p>Lap lanes, pool-wide socials, and the Las Trampas Seahorses swim team for ages 5–18.</p>
          </div>
          <div className="grid-3">
            <article className="card">
              <Photo {...photos.lapLanes} ratio="card" />
              <h3>Lap swim</h3>
              <p>Sign the season waiver, book a lane, and see the gate code only on the day your buddy is confirmed.</p>
              <Link href="/programs">How lap swim works</Link>
            </article>
            <article className="card">
              <Photo {...photos.historyCrowd} ratio="card" caption="Opening day, August 17, 1958: 523 people came" />
              <h3>Socials</h3>
              <p>RSVP, buy a ticket, and take a volunteer shift without leaving the event page.</p>
              <Link href="/calendar">See the calendar</Link>
            </article>
            <article className="card">
              <Photo {...photos.seahorses} ratio="card" />
              <h3>Swim team</h3>
              <p>
                The Las Trampas Seahorses still publish at <a href="https://ltst.org">ltst.org</a>. Team families get the schedule and jobs here
                once they are registered.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Around the pool</p>
            <h2>Map, snacks, records, and lost things</h2>
          </div>
          <div className="grid-2">
            <Link className="card feature-link" href="/pool-map">
              <h3>Pool map</h3>
              <p>A painted guide map of the deck, pools, lawn, and parking.</p>
            </Link>
            <Link className="card feature-link" href="/snack-shack">
              <h3>Snack Shack</h3>
              <p>Menu, prices, and hours, kept current by the board.</p>
            </Link>
            <Link className="card feature-link" href="/records">
              <h3>Seahorses team records</h3>
              <p>The fastest swims in team history, by age group and event.</p>
            </Link>
            <Link className="card feature-link" href="/lost-found">
              <h3>Lost & Found</h3>
              <p>Photos of what turned up on the deck. Members only.</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap grid-2">
          <div>
            <div className="section-head">
              <p className="eyebrow">Latest</p>
              <h2>Updates from the board</h2>
            </div>
            {publicPosts.length === 0 ? (
              <p className="card">No updates are published yet. Board news and the monthly update will appear here.</p>
            ) : (
              <ul>
                {publicPosts.map((post) => (
                  <li key={String(post.id)}>
                    <Link href={`/updates/${post.slug}`}>{String(post.title)}</Link>
                    <span> · {formatDay(String(post.publish_at))}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/updates">All updates</Link>
          </div>
          <div>
            <div className="section-head">
              <p className="eyebrow">Coming up</p>
              <h2>Public calendar</h2>
            </div>
            {upcoming.length === 0 ? (
              <p className="card">No public events are on the calendar right now. Member-only events appear after you sign in.</p>
            ) : (
              <ul>
                {upcoming.map((event) => (
                  <li key={String(event.id)}>
                    {formatDay(String(event.starts_at))} · {String(event.title)}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/calendar">Open the calendar</Link>
          </div>
        </div>
      </section>
    </>
  );
}
