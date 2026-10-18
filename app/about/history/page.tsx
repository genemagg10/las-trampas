import Image from "next/image";
import { Photo, photos } from "@/components/ui";
import { Seahorse } from "@/components/seahorse";

export const metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <>
      <section className="page-hero">
        <Image src={photos.historyCrowd.src} alt="" fill priority sizes="100vw" />
        <div className="wrap">
          <p className="eyebrow">
            History <Seahorse id="history" size={14} />
          </p>
          <h1>Established 1958</h1>
          <p>After more than a year of planning and construction, Las Trampas Pool opened on August 17, 1958. 523 people came that first day.</p>
        </div>
      </section>
      <section className="band">
        <div className="wrap grid-2" style={{ alignItems: "center" }}>
          <div>
            <div className="section-head">
              <p className="eyebrow">Opening day</p>
              <h2>200 families, one pool</h2>
            </div>
            <p>
              There was a wading pool for the little folk, a diving area for the ambitious, a long in-between waterway for plenty of swimmers, and much
              green grass for sunbathers. A picnic area was added later.
            </p>
            <p>
              200 original families each contributed $270 toward building the pool, with a later assessment to finish the parking lot. Several charter
              members still keep their membership today.
            </p>
          </div>
          <Photo {...photos.history1958} ratio="card" caption="Opening day, August 17, 1958" />
        </div>
      </section>
      <section className="band band-sand">
        <div className="wrap grid-2" style={{ alignItems: "center" }}>
          <Photo {...photos.historyDeck} ratio="card" />
          <div>
            <div className="section-head">
              <p className="eyebrow">The land</p>
              <h2>Once part of a rancho</h2>
            </div>
            <p>
              The 1.2-acre site was bought from the Utah Construction Company for $15,000 and was once part of Rancho Laguna de los Palos Colorados.
            </p>
            <p>
              The pool, wading pool, heater, and filters cost close to $22,000. The concrete decking was $4,500 and the bathhouse about $16,000.
            </p>
          </div>
        </div>
      </section>
      <section className="band">
        <div className="wrap grid-2" style={{ alignItems: "center" }}>
          <div>
            <div className="section-head">
              <p className="eyebrow">Swim team</p>
              <h2>The Seahorses, since 1964</h2>
            </div>
            <p>The swim team came into existence in 1964, joined the Diablo Valley Swim League in 1965, and has had active participation ever since.</p>
          </div>
          <Photo {...photos.historyWading} ratio="card" />
        </div>
      </section>
    </>
  );
}
