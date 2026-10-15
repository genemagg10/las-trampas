import Link from "next/link";
import { PhotoSlot } from "@/components/ui";
import { getEvents, getPublicPosts, getSeason } from "@/lib/queries";
import { formatDay } from "@/lib/format";

export default async function HomePage() {
  const [season, posts, events] = await Promise.all([getSeason(), getPublicPosts(), getEvents()]);
  const publicPosts = posts.filter((post) => !post.audience_role).slice(0, 3);
  const upcoming = events.filter((event) => !event.audience_role && event.published !== false).slice(0, 3);

  return (
    <>
      <section className="band">
        <div className="wrap grid-2" style={{ alignItems: "center" }}>
          <div>
            <p className="eyebrow">Burton Valley · Lafayette · since 1958</p>
            <h1 style={{ fontSize: "clamp(2.4rem, 6vw, 3.6rem)", color: "var(--color-navy)", margin: "0.2rem 0 0.8rem" }}>
              One login. The whole summer.
            </h1>
            <p>
              Las Trampas Pool is a member-owned swim club with 216 households. Dues, lap lanes, socials, volunteer shifts, and the monthly
              update all stay on this site.
            </p>
            <p style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
              <Link className="btn" href="/membership">
                Membership & fees
              </Link>
              <Link className="btn secondary" href="/login">
                Member sign in
              </Link>
            </p>
            <p>
              {season ? `${season.name} · open ${season.opens_on} through ${season.closes_on}` : "Season dates load once the club database is connected."}
            </p>
          </div>
          <PhotoSlot label="Opening day at Las Trampas" />
        </div>
      </section>

      <section className="band band-sand">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">At the club</p>
            <h2>Lap swim, socials, and the Seahorses</h2>
            <p>Every task a member used to do in a separate tool now starts here.</p>
          </div>
          <div className="grid-3">
            <article className="card">
              <PhotoSlot label="Lap lanes at dawn" ratio="card" />
              <h3>Lap swim</h3>
              <p>Sign the season waiver, book a lane, and see the gate code only on the day your buddy is confirmed.</p>
              <Link href="/programs">How lap swim works</Link>
            </article>
            <article className="card">
              <PhotoSlot label="A club social on the lawn" ratio="card" />
              <h3>Socials</h3>
              <p>RSVP, buy a ticket, and take a volunteer shift without leaving the event page.</p>
              <Link href="/calendar">See the calendar</Link>
            </article>
            <article className="card">
              <PhotoSlot label="Seahorses meet, when the team shares a photo" ratio="card" />
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
        <div className="wrap grid-2">
          <div>
            <div className="section-head">
              <p className="eyebrow">Latest</p>
              <h2>Updates from the board</h2>
            </div>
            {publicPosts.length === 0 ? (
              <p>The monthly update archive will appear here after communications publishes the first one.</p>
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
              <p>Published club events show up here. Member-only events stay behind sign-in.</p>
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
