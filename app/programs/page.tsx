import { PhotoSlot } from "@/components/ui";

export const metadata = { title: "Programs" };

export default function ProgramsPage() {
  return (
    <>
      <section className="band">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Programs</p>
            <h2>What the summer includes</h2>
            <p>Members stay on this site for every one of these. The swim league’s own results stay on the league site.</p>
          </div>
          <div className="grid-2">
            <article className="card">
              <PhotoSlot label="Six lap lanes" ratio="card" />
              <h3>Lap swim</h3>
              <p>
                Adult members sign the season waiver in the site. The draft text stays labeled until counsel and the insurer approve it. A signed
                waiver is what unlocks lane booking. The board sets how many lanes a week, how far ahead you can book, the cancellation cutoff, and
                whether the buddy has to be in the same lane or the same time.
              </p>
            </article>
            <article className="card">
              <PhotoSlot label="Club social" ratio="card" />
              <h3>Socials and volunteer shifts</h3>
              <p>
                Each event has an RSVP, an optional ticket, and the shifts that earn back the volunteer deposit. The treasurer sees who has earned
                the deposit back.
              </p>
            </article>
            <article className="card">
              <PhotoSlot label="Seahorses practice, when a team photo is added" ratio="card" />
              <h3>Las Trampas Seahorses</h3>
              <p>
                The team site remains <a href="https://ltst.org">ltst.org</a> until the Seahorses board decides otherwise. Families the team
                registers here see the team schedule and team volunteer jobs after they sign in.
              </p>
            </article>
            <article className="card">
              <PhotoSlot label="A reserved party on the lawn" ratio="card" />
              <h3>Parties</h3>
              <p>Members request an open party time. Social approves it. The fee is collected here when Stripe is connected.</p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
