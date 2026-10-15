# Open questions & what's still needed

*Everything required to go from plan to a live site before May 2027. Owner = who should answer/provide it. Status: all open.*

---

## 1. 🏛️ Governance & ownership

| # | Item | Owner | Needed by |
|---|---|---|---|
| G1 | **Board approval** of the custom build (ratify [ADR 0001](decisions/0001-custom-platform.md)) and acceptance of payment, waiver and member-data responsibility | Board | Nov 2026 |
| G2 | **Ownership:** the club owns the code, accounts and data (not an individual) | Board | Nov 2026 |
| G3 | **Maintainer(s):** Gene plus at least one backup with admin access; board handoff process each year | Board / Gene | Dec 2026 |
| G4 | **Budget:** ~$540/yr hosting + email + Stripe fees; who approves spend | Treasurer | Nov 2026 |
| G5 | **License** for this repo (currently "All rights reserved") | Board | Before any outside contributor |
| G6 | **GitHub org** owned by the club (vs personal account) | Gene | Dec 2026 |

## 2. 🔑 Accounts & infrastructure

| # | Item | Owner | Notes |
|---|---|---|---|
| A1 | **Stripe** account: legal entity, EIN, bank account, **account owner (Treasurer)**, who pays fees, ACH policy | Treasurer | Needs the club's legal details |
| A2 | **Vercel** (Pro) team owned by a club address | Gene | |
| A3 | **Supabase** (Pro; free tier pauses when idle) org owned by a club address | Gene | |
| A4 | **Resend** account + sending domain verification | Gene | Needs DNS |
| A5 | **Domain/DNS control** for lastrampaspool.com: registrar login, who holds it, current MT DNS records | Board / current webmaster | Blocks A4 and launch |
| A6 | Club role email addresses (webmaster@, treasurer@, lapswim@…) and where they deliver | Board | Accounts should use these, not personal emails |

## 3. 📦 Data & migration

| # | Item | Owner | Notes |
|---|---|---|---|
| D1 | **MT data export**: households, people, membership type/status, directory fields, payment history, 2026 waiver submissions, newsletters | Membership / Treasurer | Kept off git; handled under a data-handling agreement |
| D2 | **SignUpGenius data**: plan level, lap booking + volunteer history export | Lap Swim VP / Social | |
| D3 | Current MT plan, renewal date and cancellation terms; SignUpGenius plan cost | Treasurer | Plan MT shutdown date |
| D4 | Waitlist: current list, positions, how fees were collected | Membership | |
| D5 | Swim team registration source (to grant `swim_team_family`) | Seahorses board | |

## 4. ⚖️ Legal & policy

| # | Item | Owner |
|---|---|---|
| L1 | **Waiver legal review**: text, e-signature validity (ESIGN/UETA), teen 15–17 terms and guardian co-sign, retention period | Board + counsel / insurer |
| L2 | **Privacy policy** and **terms of use** | Board + counsel |
| L3 | **Photo consent policy**: default consent, kids on public pages, removal requests, who approves | Board |
| L4 | **Directory privacy defaults** | Board |
| L5 | Data retention and deletion policy (members who leave, waitlist applicants) | Board |
| L6 | Refund policy (dues, deposits, party slots, tickets) | Treasurer |

## 5. 🏊 Lap swim rules

| # | Question | Owner |
|---|---|---|
| S1 | **Buddy rule**: same lane or same slot? Can a non-swimming adult on deck count? | Lap Swim VP |
| S2 | **Teens 15–17**: allowed? With guardian co-sign? | Board |
| S3 | **Booking limits**: slots/week, advance window, cancellation cutoff, no-show policy | Lap Swim VP |
| S4 | **Lap hours and blocks** by day (swim team, lessons, maintenance) | Lap Swim VP + Seahorses |
| S5 | **Gate code process**: one seasonal code or rotating? Who changes the physical code and enters it in the system? When is it revealed? | Lap Swim VP / Facilities |
| S6 | Check-in required or optional? | Lap Swim VP |

## 6. 💳 Money rules

| # | Question | Owner |
|---|---|---|
| M1 | 2027 prices (renewal, late, deposit, new member, lap-only, waitlist, party slot) | Board |
| M2 | **Volunteer deposit**: how many shifts/hours earn back $50; which events count; refund vs credit | Board / Social |
| M3 | ACH-processing orders: grant membership immediately or after settlement? | Treasurer |
| M4 | Payment plans allowed? Late fees? | Treasurer |
| M5 | Who pays processing fees (club or member surcharge)? | Treasurer |

## 7. 🏅 Swim team (Las Trampas Seahorses)

| # | Question | Owner |
|---|---|---|
| T1 | **Integrate with or replace ltst.org?** (link + ICS import / host schedule & jobs here / full replacement) | Seahorses board |
| T2 | Who owns the **Seahorse logo and marks**, and may the pool use them? | Seahorses board |
| T3 | Team volunteer jobs: move from current tool into v2? | Seahorses volunteer coordinator |

## 8. 📸 Brand & content assets

| # | Item | Owner | Notes |
|---|---|---|---|
| C1 | **Real Las Trampas photos** (pool, lawn, lap lanes, socials, swim meets, history archive) with photographer permission and subject consent | Board / members | See [assets/photos/README.md](../assets/photos/README.md); all mockup photos are stock placeholders to replace |
| C2 | **Official Seahorse logo files** (vector master + PNGs), color values, usage guidelines, written permission | Seahorses board | See [assets/brand/README.md](../assets/brand/README.md) |
| C3 | Pool's own logo/wordmark (if any) | Board | |
| C4 | Copy: history (since 1958), about, membership FAQ, facilities, rules | Board | |
| C5 | Bylaws and handbook (current versions) | Secretary | |
| C6 | Last ~2 seasons of newsletters | Communications | |

## 9. ✅ Launch readiness

| # | Item |
|---|---|
| R1 | Beta testers (board + ~10 households) for the Apr 15, 2027 soft launch |
| R2 | Member communication plan for the switch (invite emails, help page, FAQ) |
| R3 | Admin runbook and season rollover checklist |
| R4 | Fallback plan if payments aren't ready by early Feb (renew in MT, import status) |
