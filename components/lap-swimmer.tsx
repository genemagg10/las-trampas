"use client";

import { useEffect, useRef, useState } from "react";

// A tiny freestyle swimmer along the bottom of the page. Decorative only: pointer-events none,
// hidden for reduced motion and print. Tapping where the swimmer is (clicks still pass through) makes a splash.
export function LapSwimmer() {
  const ref = useRef<HTMLDivElement>(null);
  const [splash, setSplash] = useState(0);

  useEffect(() => {
    function onDown(e: PointerEvent) {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left - 8 && e.clientX <= r.right + 8 && e.clientY >= r.top - 8 && e.clientY <= r.bottom + 8) {
        setSplash((n) => n + 1);
      }
    }
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  useEffect(() => {
    if (!splash) return;
    const t = window.setTimeout(() => setSplash(0), 1200);
    return () => window.clearTimeout(t);
  }, [splash]);

  return (
    <div className="swim-lane" aria-hidden="true">
      <div className="swim-rope" />
      <div className="swim-x">
        <div className="swim-face">
          <div className={`swim-turn ${splash ? "is-splashing" : ""}`} ref={ref}>
            <svg className="swimmer" viewBox="0 0 48 22" width="48" height="22">
              <g className="swim-kick">
                <circle cx="5" cy="13" r="1.6" />
                <circle cx="2.5" cy="11" r="1.1" />
                <circle cx="7" cy="10.5" r="0.9" />
              </g>
              <path className="swim-body" d="M8 13.5c6-2.2 15-2.6 24-1.4l1 2.4c-8 1.4-17 1.2-25 .2z" />
              <g className="swim-arm swim-arm-back">
                <path d="M30 12.5c-3-4-6-6.5-10-7.5" />
              </g>
              <circle className="swim-head" cx="35.5" cy="12" r="3.6" />
              <path className="swim-cap" d="M32 11.2a3.7 3.7 0 0 1 7.2-.4c-2.3-.5-4.8-.4-7.2.4z" />
              <circle className="swim-goggle" cx="38.3" cy="11.9" r="0.8" />
              <g className="swim-arm swim-arm-front">
                <path d="M33 13c3.5-3.5 7.5-5 12-4.5" />
              </g>
              <path className="swim-water" d="M0 15.2c4 1.2 8-1.2 12 0s8 1.2 12 0 8-1.2 12 0 8 1.2 12 0V22H0z" />
            </svg>
            <span className="swim-bubbles">
              <i />
              <i />
              <i />
              <span className="swim-seahorse" data-egg="swimmer" />
            </span>
            {splash ? (
              <span className="swim-splash" key={splash}>
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
