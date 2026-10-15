# Brand & design direction

*Draft · October 2026 · final colors and marks depend on the official Seahorse assets*

---

## 1. Principles

| Do | Don't |
|---|---|
| **Real photography** of Las Trampas: the pool, the lawn, lap lanes at dawn, socials, swim meets, the history archive | Stock photos (except as clearly labeled placeholders during design) |
| **Official Las Trampas Seahorse marks** from files provided by the swim team, used as provided | Vector illustrations, clip art, cartoon icons, drawn waves, redrawn or "inspired-by" logos |
| **Prominent section headers** with strong visual separation | Long undifferentiated scrolling text |
| Simple functional UI icons (e.g., Lucide) for controls only | Decorative iconography standing in for photos |
| Mobile-first, thumb-friendly, readable in sun glare | Low-contrast text over busy photos |

> **Rule:** if something needs an image, it gets a real Las Trampas photo or nothing. If it needs a mark, it gets the official Seahorse/pool mark or a plain wordmark.

---

## 2. Photography

- **Hero images:** wide, bright, real moments (opening day, the lawn, the lap lanes at sunrise). One per page, not a carousel.
- **Event cards:** a photo from that event in past seasons.
- **People:** only with consent per the photo policy; no identifiable kids on public pages without opt-in.
- **Treatment:** natural color; a subtle dark gradient under any overlaid text for contrast; consistent aspect ratios (16:9 heroes, 4:3 cards, 1:1 avatars).
- **Alt text** on every image.
- The mockup in `design/mockup/` uses **stock placeholders** (see `PLACEHOLDER_PHOTO_CREDITS.md`). All must be replaced before launch.

---

## 3. Marks & logos

- Source: official files from the Las Trampas Seahorses (see [assets/brand/README.md](../assets/brand/README.md)). **Ownership and permission are open questions.**
- Use the supplied file unaltered: no recoloring, stretching, outlines or effects unless the usage guide allows it.
- Clear space ≥ the height of the mark's smallest element; minimum size 32 px tall on screen.
- If permission isn't granted, the pool site uses a **typographic wordmark** ("Las Trampas Pool") and the Seahorse mark appears only on swim team pages, linked to ltst.org.

---

## 4. Palette (suggested; align to official Seahorse colors when received)

| Token | Hex | Use |
|---|---|---|
| `--lt-navy` | `#0B2545` | Header bands, primary text on light |
| `--lt-pool` | `#0E7CB8` | Primary buttons, links |
| `--lt-water` | `#5BC0EB` | Highlights, focus rings |
| `--lt-sun` | `#F6B93B` | Accents, "needs buddy" status |
| `--lt-lawn` | `#3A9D5D` | Success, "buddy confirmed" |
| `--lt-coral` | `#E4572E` | Errors, destructive actions |
| `--lt-sand` | `#F7F3EA` | Section backgrounds |
| `--lt-ink` | `#1B1F24` | Body text |

All text/background pairs must meet WCAG AA (4.5:1 body, 3:1 large text). Status colors always pair with a label or icon, never color alone.

---

## 5. Typography

| Role | Suggestion | Notes |
|---|---|---|
| Display / section headers | **Fraunces** or **DM Serif Display** | Warm, classic club feel |
| UI & body | **Inter** | Highly legible on phones |
| Numbers (times, codes, prices) | Inter with tabular figures | Lane grid and gate code |

Scale (mobile → desktop): H1 36→56 px, H2 28→40 px, H3 20→24 px, body 16–18 px, line height 1.5.

---

## 6. Section header style

Gene prefers **prominent headers and clear separation**. The pattern:

```
┌──────────────────────────────────────────────────────────┐
│  ▌ LAP SWIM                         ← eyebrow, caps, pool │
│  ▌ Book a lane                      ← H2, display serif   │
│  ▌ Waiver signed for 2027 ✓         ← one-line summary    │
├──────────────────────────────────────────────────────────┤
│  content card(s)                                          │
└──────────────────────────────────────────────────────────┘
```

- Full-width **bands** alternate `--lt-sand` and white; major areas may use a navy band with white text.
- A 4–6 px `--lt-pool` accent bar left of the header (or under it on mobile).
- Eyebrow label (small caps), then the H2, then an optional one-line status.
- Generous spacing: 64–96 px between sections on desktop, 40–56 px on mobile.
- Content in rounded cards (12–16 px radius), soft shadow, 24 px padding.
- Docs follow the same idea: numbered H2 sections, horizontal rules between them, tables for structured info.

---

## 7. Components

shadcn-style primitives themed with the tokens above: Button, Card, Badge (status), Tabs, Dialog (waiver), Sheet (mobile nav), Table (admin), Calendar/Grid (lanes), Toast, Form fields. Status badges: **Open**, **Needs buddy** (sun), **Buddy confirmed** (lawn), **Blocked** (gray), **Mine** (pool).
