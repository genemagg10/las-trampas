import Image from "next/image";
import Link from "next/link";
import { Photo, photos } from "@/components/ui";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <Image src={photos.poolDeck.src} alt="" fill priority sizes="100vw" />
        <div className="wrap">
          <p className="eyebrow">About</p>
          <h1>A member-owned pool in Burton Valley</h1>
          <p>Founded by local residents in 1958, and run by its members ever since.</p>
        </div>
      </section>
      <section className="band">
        <div className="wrap grid-2" style={{ alignItems: "center" }}>
          <div>
            <div className="section-head">
              <p className="eyebrow">The club</p>
              <h2>Where lasting memories are made</h2>
            </div>
            <p>
              Las Trampas Pool is a member-owned swim club in the Burton Valley neighborhood of Lafayette, California. Through several generations it
              has kept a family-friendly feel. The pool is open to members and their guests from May through October.
            </p>
            <p>
              It sits right on the Lafayette/Moraga Regional Trail, a convenient walk or bike ride from most of Lafayette.
            </p>
          </div>
          <Photo {...photos.poolDeckCard} ratio="card" />
        </div>
      </section>
      <section className="band band-sand">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Facilities</p>
            <h2>What members enjoy</h2>
          </div>
          <ul className="facts">
            <li><strong>6 × 25 yd</strong><span>Lap pool</span></li>
            <li><strong>Diving well</strong><span>With a diving board</span></li>
            <li><strong>Baby pool</strong><span>Children 5 and under</span></li>
            <li><strong>Lawn & BBQs</strong><span>Two barbecues, great for member parties</span></li>
            <li><strong>Hoop & ball wall</strong><span>Fun outside the water</span></li>
          </ul>
        </div>
      </section>
      <section className="band">
        <div className="wrap grid-3">
          <article className="card">
            <Photo {...photos.history1958} ratio="card" />
            <h3>History</h3>
            <p>Opened August 17, 1958, by 200 founding families.</p>
            <Link href="/about/history">Read the history</Link>
          </article>
          <article className="card">
            <Photo {...photos.seahorses} ratio="card" />
            <h3>Las Trampas Seahorses</h3>
            <p>The club’s swim team, founded in 1964, for ages 5–18.</p>
            <Link href="/programs">Programs</Link>
          </article>
          <article className="card">
            <Photo {...photos.lapLanes} ratio="card" />
            <h3>Leadership & contact</h3>
            <p>The club is run by a volunteer board of members.</p>
            <Link href="/about/leadership">The board</Link> · <Link href="/contact">Contact</Link>
          </article>
        </div>
      </section>
    </>
  );
}
