import { PoolMap } from "./map";
import { spots } from "./spots";

export const metadata = { title: "Pool map" };

export default function PoolMapPage() {
  return (
    <>
      <section className="band band-sand">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Pool map</p>
            <h2>Find your way around LT</h2>
            <p>Tap a number to see what is there. Spots marked with a ? exist, but their exact place on the map is still being confirmed.</p>
          </div>
          <PoolMap spots={spots} />
          <p style={{ fontSize: "0.85rem", marginTop: "1rem" }}>
            Map painted from USGS National Agriculture Imagery Program (NAIP) aerial imagery, courtesy of the U.S. Geological Survey (public
            domain). Facility details from lastrampaspool.com.
          </p>
        </div>
      </section>
    </>
  );
}
