# Easter eggs

Small, low-contrast touches. None of them block clicks, and all motion is turned off for visitors who ask for reduced motion.

## Lap swimmer

A tiny freestyle swimmer goes back and forth along a lane-rope strip at the bottom of every page, with a flip turn at each wall.
It ignores the mouse (`pointer-events: none`), so it never blocks a link. Tapping right where it is makes a small splash and a
faster stroke for a second (the click still reaches whatever is underneath). Hidden for reduced motion and in print.
Code: `components/lap-swimmer.tsx`, styles under "Lap swimmer" in `app/globals.css`.

## Hidden seahorses (8)

The silhouette is cut from the Las Trampas seahorse mark (`public/brand/seahorse-silhouette.png`). Each one wiggles on hover.
Clicking one shows "Seahorse found: X of 8" (kept in the visitor's browser only; nothing is sent anywhere).

| # | Where | How to find it |
|---|-------|----------------|
| 1 | Footer wave, every page | Riding the scalloped wave on top of the navy footer, toward the right |
| 2 | Lap swimmer trail, every page | About every 23 seconds a tiny seahorse drifts up with the swimmer's bubbles (not clickable) |
| 3 | Pool map (`/pool-map`) | In the water at the lower-left corner of the lap pool |
| 4 | Home page photo | Bottom-right corner of the lap lanes photo |
| 5 | 404 page | "Even the seahorse looked everywhere" |
| 6 | Records (`/records`) | In the divider between the first and second event tables |
| 7 | Snack Shack (`/snack-shack`) | Top-right corner of the "full regular menu" note |
| 8 | History (`/about/history`) | Next to the "History" eyebrow above "Established 1958" |

To add or move one, use `<Seahorse id="..." />` from `components/seahorse.tsx` and add the id to `SEAHORSE_SPOTS` so the count stays right.
