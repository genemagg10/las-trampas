# ADR 0001: Build a custom platform instead of staying on Membership Toolkit

| | |
|---|---|
| **Status** | Accepted (by Gene Maggio, webmaster); **pending board ratification** |
| **Date** | 2026-10-14 |
| **Supersedes** | The 2027 recommendation in [docs/research/01_mt_research.md §1](../research/01_mt_research.md) and the "build inside MT" path in [docs/plan/02_v2_plan.md §6–7](../plan/02_v2_plan.md) |

---

## Context

The v2 research recommended staying on Membership Toolkit (MT) for 2027, dropping SignUpGenius, and deciding on a custom build for 2028. Since then the primary goal has been sharpened:

> **Nobody ever leaves the platform.** Payments, signups, communication, schedules, photos and monthly updates all happen in the site, with one login, and access gated by role.

Measured against that goal, MT falls short:

- **No public API.** A custom front end can't share MT's login or data, so any hybrid brings back two logins.
- **No reservation engine.** Lane booking would be a sign-up-form workaround: no per-member limits, no recurring slots, no automatic buddy rule, no swim-team blocks.
- **No automatic gate-code reveal** tied to a signed waiver and a confirmed booking.
- **No single "My Schedule"** combining lap swim, socials, shifts and team events.
- **No photo galleries**, and volunteer hours aren't linked to the $50 deposit.
- **Limited design control** for a modern, photo-led site.

Swim-club platforms (Member Splash ~$2,000–3,500/yr; PoolPulse, price unknown) cover lane booking but cost 2–4× MT, still require full migration, and don't clearly cover galleries, deposit credit, or the exact unified UX.

## Decision

Build Las Trampas Pool v2 as a **custom platform**: Next.js (App Router, TypeScript) + Tailwind/shadcn-style UI on **Vercel**, **Supabase** (Postgres, Auth, RLS, Storage), **Stripe** (in-site Payment Element, ACH via `us_bank_account`), and **Resend** for email. Target an MVP before the **May 2027** opening, with **2027 renewals collected in v2**. MT is retired after data is exported and renewals close.

## Why

1. It's the only option that meets "one login, never leave the platform" fully.
2. Exact fit for lap swim: waiver → booking limits → buddy rule → gate code.
3. Lowest payment fees: Stripe ACH is 0.8% capped at $5 (≈ $1.1k/yr across 216 renewals vs ≈ $3.6k on LumaPay ACH or ≈ $7.1k by card, per the research estimates).
4. Low running cost (~$540/yr hosting + email) on fully managed services; no servers to patch.
5. The club owns its data and design.

## Tradeoffs and consequences

### We take on responsibility for

| Area | Responsibility | Mitigation |
|---|---|---|
| **Payments** | Correct charges, refunds, reconciliation, failed ACH handling, Stripe account ownership | Stripe-hosted fields only (PCI SAQ A); Treasurer owns the Stripe account; webhook idempotency; reconciliation export |
| **Waivers** | Legally adequate e-signature records, retention, version control | Legal review of waiver text and e-sign flow; immutable PDFs + hashes; retention policy |
| **Member data (PII)** | Security, privacy, access control, breach response, deletion requests | RLS on every table; minimal data; MFA for admins; privacy policy; audit log; no PII in git |
| **Availability** | Lap swim at 6 am must work without anyone on call | Managed hosting; simple flows; admin fallback (printable roster) |
| **Maintenance & bus factor** | Code, dependencies, season rollover, board handoff | Second maintainer named; runbook; boring tech; accounts owned by club role addresses |
| **Support** | No vendor help desk | In-site help page; board FAQ; webmaster role address |

### Features we must rebuild that MT gave us

Membership records and expirations, renewal packets, directory, newsletter sending, calendar, mobile app (replaced by a PWA), orders and receipts.

### Migration

| From | What | How |
|---|---|---|
| **MT** | Households, people, membership type/status, directory, payment history, 2026 waivers, newsletters, calendar | Excel/CSV exports → cleaning script (run locally, never committed) → import; payment history and 2026 waivers archived, not imported; MT read-only until end of 2026 for receipts |
| **SignUpGenius** | Lap bookings, volunteer history | Export (if plan allows) or archive; cancel SUG once v2 lap swim is live |
| **Google Docs** | Bylaws, handbook | Move into in-site documents |

### Risks

- **Timeline:** renewals are due Feb 16, 2027, so the payments module must be live by early Feb. *Fallback:* run 2027 renewals in MT, import paid status, and launch the rest of v2 by May.
- **Single maintainer:** if Gene is unavailable, the site still must run. *Mitigation:* a second admin/maintainer before launch.
- **Board acceptance** of data and payment responsibility is required; this ADR is not final until ratified.

## Alternatives considered

| Option | Why not (for now) |
|---|---|
| Stay on MT, tidy up (prior recommendation) | Can't meet one-login/never-leave; lane booking is a workaround |
| MT + custom front end | No API → two logins |
| Member Splash / PoolPulse | 2–4× cost, full migration anyway, gaps in galleries/deposit credit/UX control |
| WildApricot / ClubExpress | No lane booking; dated UX; full migration |
