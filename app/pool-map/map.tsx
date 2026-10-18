"use client";

import Image from "next/image";
import { useState } from "react";
import type { Spot } from "./spots";
import { Seahorse } from "@/components/seahorse";

export function PoolMap({ spots }: { spots: Spot[] }) {
  const [active, setActive] = useState<number>(1);
  const current = spots.find((s) => s.n === active) ?? spots[0];
  return (
    <div className="park-map">
      <div className="park-frame">
        <div className="park-art">
          <Image src="/photos/pool-map-painted.jpg" alt="Painted bird's-eye map of Las Trampas Pool, made from a USGS aerial photo" fill priority sizes="(max-width: 900px) 100vw, 70vw" />
          <div className="park-cartouche">
            <small>Welcome to</small>
            <strong>Las Trampas Pool</strong>
            <em>Guide map · est. 1958</em>
          </div>
          <span className="park-banner" style={{ left: "47%", top: "51%" }}>Pool Deck</span>
          <span className="park-banner green" style={{ left: "33%", top: "24%" }}>The Lawn</span>
          <span className="park-banner sun" style={{ left: "27%", top: "93%" }}>St. Mary&apos;s Road Parking</span>
          <Seahorse id="pool-map" size={16} className="egg-map" style={{ left: "37%", top: "48%" }} />
          {spots.map((s) => (
            <button
              key={s.n}
              type="button"
              className={`park-pin ${s.status} ${s.n === active ? "on" : ""}`}
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
              onClick={() => setActive(s.n)}
              aria-label={`${s.n}. ${s.name}${s.status === "tbc" ? " (location to be confirmed)" : ""}`}
            >
              {s.n}
              {s.status === "tbc" ? <i>?</i> : null}
            </button>
          ))}
          <div className="park-card">
            <b>
              {current.n}. {current.name}
            </b>
            {current.status === "tbc" ? <span className="tbc-tag">Location to be confirmed</span> : null}
            <p>{current.note}</p>
          </div>
        </div>
      </div>
      <aside className="park-legend">
        <h3>Map legend</h3>
        <ol>
          {spots.map((s) => (
            <li key={s.n}>
              <button type="button" onClick={() => setActive(s.n)} className={s.n === active ? "on" : ""}>
                <span className={`dot ${s.status}`}>{s.n}</span>
                {s.name}
                {s.status === "tbc" ? <em> · to be confirmed</em> : null}
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
