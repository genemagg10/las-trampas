"use client";

import { useState } from "react";

// Hidden seahorses (see docs/easter-eggs.md). Low-contrast, decorative, never in the way.
export const SEAHORSE_SPOTS = ["footer", "swimmer", "pool-map", "home-photo", "404", "records", "snack-shack", "history"] as const;
const KEY = "lt-seahorses-found";

export function foundSeahorse(id: string) {
  try {
    const found = new Set<string>(JSON.parse(localStorage.getItem(KEY) || "[]"));
    found.add(id);
    localStorage.setItem(KEY, JSON.stringify([...found]));
    return found.size;
  } catch {
    return 0;
  }
}

export function Seahorse({
  id,
  size = 18,
  className = "",
  style,
}: {
  id: (typeof SEAHORSE_SPOTS)[number];
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span
      className={`seahorse-egg ${className}`}
      data-egg={id}
      style={{ width: size * 0.674, height: size, ...style }}
      title="A Las Trampas seahorse"
      onClick={() => {
        const n = foundSeahorse(id);
        setMsg(n ? `Seahorse found: ${n} of ${SEAHORSE_SPOTS.length}` : "You found a seahorse!");
        window.setTimeout(() => setMsg(null), 2200);
      }}
    >
      <span className="seahorse-shape" aria-hidden="true" />
      {msg ? (
        <span className="seahorse-msg" role="status">
          {msg}
        </span>
      ) : null}
    </span>
  );
}
