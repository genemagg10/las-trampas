# Scope: Las Trampas Pool v2

*Status: draft for board review · October 2026 · MVP target: live before the May 2027 opening*

> **Guiding rule:** if a member has to leave lastrampaspool.com or use a second login to finish a task, that's a bug in the scope.

---

## 1. Goals

1. **One login, one place** for every member task: payments, signups, communication, schedules, photos, monthly updates.
2. **Access by role**, computed automatically (dues paid, waiver signed, swim team registration, board position), expiring each season.
3. **Less volunteer work** for the board: no manual gate-code emails, no copying SignUpGenius lists, no chasing deposits.
4. **A modern, photo-led site** using real Las Trampas photos and official Seahorse marks.
5. **Low maintenance**: managed services, no servers, routine tasks doable without code.

---

## 2. In-scope modules

Each module lists its **MVP** scope (before May 2027) and what comes **later** in the season.

### 2.1 Auth & households

| | |
|---|---|
| **MVP** | Email login via magic link or password (Supabase Auth). One account per person. Households with adults and teens (teens get their own login if 13+; under-13 are profile-only). Household admin (1–2 adults) invites/removes members. Profile, contact info, notification preferences. Account recovery by email. |
| **Later** | Passkeys. SMS login codes. Household merge/split tools for admins. |
| **Rules** | No shared logins. Email is unique per person. Removing a person from a household revokes household-derived entitlements immediately. |

### 2.2 Roles & entitlements

| | |
|---|---|
| **MVP** | Roles: `guest`, `member`, `lap_swimmer`, `swim_team_family`, `volunteer`, `board` (scoped by position), `admin`. Entitlements are rows with `season`, `granted_by`, `source` (payment, waiver, admin, import) and `expires_at`. Granted automatically by system events (Stripe payment succeeded → `member`; waiver signed → `lap_swimmer`). Admin can grant/revoke with a reason (audited). |
| **Later** | Delegated sub-admins per event. Time-boxed guest passes. |
| **Rules** | Enforced by Postgres RLS. UI hides what RLS denies, never the other way around. Every grant/revoke is logged. |

### 2.3 Waivers (e-sign, season expiry)

| | |
|---|---|
| **MVP** | Versioned waiver documents (text approved by legal review). Signer reads the rules, checks each acknowledgement, types full name, signs (typed + drawn signature). System stores: waiver version, signer, timestamp, IP/user agent, a hash of the rendered text, and a **generated PDF** in private storage. Adults sign for themselves; teen 15–17 waivers require a parent co-signature (pending board policy). Waiver expires at season end. Admin roster: signed / pending / expired / revoked. |
| **Later** | Other waivers (guest, party host, facility use). Reminder campaign before opening day. |
| **Rules** | Signed PDFs are immutable. A new waiver version doesn't invalidate existing signatures unless admin flags it as "re-sign required". |

### 2.4 Lap swim lane booking

| | |
|---|---|
| **MVP** | Admin-defined weekly **slot templates** (lanes × times × days), generated for the season. **Blocks** for swim team, lessons, maintenance, closures. Grid view showing: Open · 1 booked (needs buddy) · Buddy confirmed · Blocked · Mine. **Booking limits** (e.g., N slots/week, max advance days) and **cancellation cutoff**, all board-configurable. **Buddy rule**: a booking is "confirmed" only when at least two cleared swimmers are booked for the slot (same-lane vs same-slot is a board decision). Invite a buddy from opted-in cleared swimmers. Notifications when your buddy cancels. **Gate code reveal**: shown only on the day, for a confirmed booking, to a swimmer with a valid waiver; every reveal is logged. |
| **Later** | Check-in (one tap or QR at the gate) as the safety log. No-show tracking and penalties. Waitlist per slot. Weather closures with bulk notice. |
| **Rules** | Booking requires active `member` + `lap_swimmer`. Gate code never appears in email, notifications or the page source unless all conditions hold. |

### 2.5 Social events, RSVP, tickets & volunteer shifts

| | |
|---|---|
| **MVP** | Events with hero photo, description, date/time, location, capacity. RSVP with adult/kid counts and waitlist. Paid tickets via Stripe (in-site). Volunteer **shifts** per event (setup, grill, cleanup) with capacity and shift lead. **$50 volunteer deposit credit**: each household's deposit status (paid → earned back / pending / forfeited), driven by completed shifts per board rules. Treasurer refund/credit report. Clone last season's events. |
| **Later** | Guest add-ons, dietary fields, check-in at the event, sponsor slots, recurring maintenance days. |
| **Rules** | A shift counts toward credit only when marked complete by its lead or an admin. |

### 2.6 Swim team schedule & volunteer jobs (Las Trampas Seahorses)

| | |
|---|---|
| **MVP** | `swim_team_family` role. Team calendar (practices, meets, team socials) visible to team families and merged into My Schedule. Team volunteer jobs (timers, stroke & turn, concessions, setup) using the same shift engine. Pool blocks for practice auto-applied to the lap grid. |
| **Open question** | **Integrate with or replace ltst.org.** Options: (a) link + import team calendar ICS, (b) host team schedule/jobs here while ltst.org keeps registration and meet results, (c) full replacement. The swim team board owns that decision. See [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md). |
| **Later** | Swimmer registration and team fees, if the team opts in. Lessons sign-up. |

### 2.7 Party reservations

| | |
|---|---|
| **MVP** | Members request a party slot from an admin-defined calendar. Pay the $100/slot fee in-site. Admin approves/declines (refund on decline). Shows in My Schedule and blocks the area on the club calendar. |
| **Later** | Host waiver, guest count rules, add-ons. |

### 2.8 Dues, renewals, new member fees, waitlist

| | |
|---|---|
| **MVP** | Season **renewal**: $1,075 + $50 volunteer deposit by the early deadline (Feb 16), $1,175 after (all amounts configurable per season). **New member** fee $675 + $75 refundable deposit (confirm). **Lap-swim-only** membership $525 (invite only). **Waitlist application** with $100 fee: public form → applicant account → waitlist position visible to admins → invitation to join → new-member checkout. Renewal reminders. Membership status drives the `member` entitlement. |
| **Later** | Payment plans (if board allows). Share transfers / equity handling if the bylaws require it. Late-fee automation. |

### 2.9 Payments & receipts

| | |
|---|---|
| **MVP** | Stripe Checkout / Payment Element embedded in-site. **ACH via `us_bank_account`** (Financial Connections) presented first; card second. Webhooks update orders and entitlements. Receipts in-site (and by email). Household payment history. Admin refunds with reason. Treasurer reconciliation export. |
| **Later** | Saved payment methods for one-tap payment. Account credit (e.g., deposit rolled to next season). |
| **Rules** | No card or bank data touches our servers (Stripe-hosted fields). The Stripe Customer Portal is not used externally; payment management stays in-site. |

### 2.10 My Schedule & calendar feeds

| | |
|---|---|
| **MVP** | One page listing the person's (and optionally household's) lap bookings with buddy status, RSVPs, volunteer shifts, party reservations, team events. Filters, "this week" default. Personal **ICS feed** (secret tokenized URL, rotatable). Day-before email reminders. |
| **Later** | Push notifications (PWA). Club-wide public calendar feed. |

### 2.11 Messaging, announcements, monthly updates, newsletter archive

| | |
|---|---|
| **MVP** | **Monthly update** editor (rich text + photo blocks), audience targeting by role, schedule send via Resend, automatic archive. Site-wide **announcements** (banner on member home, e.g., closures). Board role contact forms (messages routed to the right board inbox without exposing personal emails). Import the last ~2 seasons of newsletters into the archive. |
| **Later** | In-site inbox for board ↔ member threads. SMS for urgent closures. |

### 2.12 Photo galleries (with consent)

| | |
|---|---|
| **MVP** | Albums by event/season. Board uploads (bulk from phone). Member uploads into an approval queue. Members-only by default. Per-person **photo consent** setting (OK / members-only / don't post my kids) honored by moderators. Public "best of" album only from consented photos. Removal requests honored in-site. |
| **Later** | Face-blur tool, favorites, downloads. |

### 2.13 Directory with privacy controls

| | |
|---|---|
| **MVP** | Member directory (search by name). Per-field visibility (name, email, phone, address, children) set by each person; conservative defaults (name only). Visible only to `member`. No export for non-admins. |
| **Later** | Interests/"find a buddy" opt-in. |

### 2.14 Documents

| | |
|---|---|
| **MVP** | Bylaws, handbook, pool rules, lap rules, forms: hosted in-site, members-only (rules may be public). Versions with effective dates. |
| **Later** | Board minutes (board-only and member-visible versions). |

### 2.15 Admin / board console

| | |
|---|---|
| **MVP** | Scoped areas: **Membership** (households, status, waitlist), **Treasurer** (payments, refunds, deposits, exports), **Lap Swim VP** (templates, blocks, limits, waiver roster, gate code), **Social** (events, shifts, attendance), **Communications** (updates, announcements), **Photos** (queue, albums), **Webmaster** (roles, settings, audit log). Season rollover wizard (new season, new prices, new waiver version, expire entitlements). |
| **Later** | Board handoff checklist built into the console. |

### 2.16 Reporting & exports

| | |
|---|---|
| **MVP** | CSV exports: households/members, payments, deposit status, waiver roster, lap usage, event RSVPs/attendance, volunteer hours. Season summary for the annual meeting. |
| **Later** | Simple dashboards (membership trend, lap usage heatmap). |

---

## 3. Out of scope / later

| Item | Why / when |
|---|---|
| Native iOS/Android apps (Expo) | PWA first; revisit after season 1 |
| Swim team registration, meet entries, results | ltst.org / league systems own these unless the team opts in |
| Lessons scheduling | Later, with the swim team |
| Point-of-sale (snack bar, spiritwear) | Spiritwear stays with the vendor shop; snack bar TBD |
| Accounting / general ledger | Treasurer's tools; we export, we don't replace |
| Guest pass sales at the gate | Later |
| Public forums / social feed | Not needed; monthly update + announcements cover it |
| SMS | Later, for urgent closures only |
| Multi-club / white-label | Never |

---

## 4. Non-functional requirements

| Area | Requirement |
|---|---|
| **Accessibility** | WCAG 2.2 AA: keyboard navigation, focus states, contrast, alt text on every photo, form labels, reduced motion respected |
| **Mobile-first** | Designed for a phone on the pool deck first; fast on cellular; installable PWA |
| **Performance** | Public pages: LCP < 2.5s on 4G; images optimized via Next/Image |
| **Privacy** | Collect the minimum; directory opt-in; photo consent; no third-party trackers or ad pixels; privacy policy and terms published; data deletion on request; admins see only their area |
| **Security** | RLS on every table; service-role key server-only; MFA for admin/board accounts; audit log for role changes, gate code reveals, refunds, exports; dependency updates via Dependabot |
| **Payments / PCI** | Stripe-hosted fields only (SAQ A scope); no card/bank data stored; webhook signatures verified; idempotent order handling |
| **Waiver records** | Immutable signed PDFs in private storage; retained per legal advice (assume ≥ statute of limitations, e.g., 7 years) |
| **Backups** | Supabase daily backups (Pro) + point-in-time recovery if budget allows; weekly encrypted export of key tables + waiver PDFs to club-owned storage |
| **Reliability** | Managed services only; status alerts to the maintainer(s); lap swim works at 6 am without anyone on call |
| **Maintainability** | TypeScript, SQL migrations, seeded fictional data, one-page runbook for the board, at least two people with admin access |
| **Ownership** | All accounts owned by club role addresses, not personal emails |

---

## 5. Data migration plan

| # | Data | Source | Method | Notes |
|---|---|---|---|---|
| 1 | Households, people, membership type/status | Membership Toolkit | Excel/CSV export → cleaning script → import | 216 households; dedupe emails; map adults/teens; no data committed to git |
| 2 | 2027 dues status | New platform | Members renew in v2 | Avoids migrating MT balances |
| 3 | Payment history | MT reports | CSV export, archived (not imported) | Keep MT read-only through end of 2026 for receipts |
| 4 | Lap waivers (2026) | MT data forms | Export + archive PDFs | Everyone signs the 2027 waiver in v2 |
| 5 | Lap bookings | SignUpGenius | Export or archive | History only |
| 6 | Volunteer history | SignUpGenius / MT | Export | Only if needed for deposit decisions |
| 7 | Newsletters | MT email tool | Copy last ~2 seasons | Manual |
| 8 | Events calendar | MT calendar | Re-create 2027 events from templates | |
| 9 | Bylaws, handbook | Google Docs | Paste/convert to in-site docs | |
| 10 | Photos | Board drives, social media | Curated upload with consent | |

**Cutover:** invite all members by email (magic link) → claim household → renew. Run MT and v2 in parallel Jan–Mar 2027; MT turned off after renewals close and data is archived.

---

## 6. Phased roadmap

| Phase | When | Deliverables |
|---|---|---|
| **0. Approve & set up** | Oct–Dec 2026 | Board approval, budget, maintainer(s) named. Club-owned accounts (Vercel, Supabase, Stripe, Resend, GitHub org). Waiver legal review. Real photos + Seahorse marks collected. MT export. |
| **1. Foundation** | Dec 2026–Jan 2027 | Repo scaffold, auth, households, roles/entitlements, RLS, admin users, public site with real photos, documents. |
| **2. Money** | Jan–Feb 2027 | Dues/renewals, new member and waitlist flows, Stripe ACH + card, receipts. **Renewals open in v2 by early Feb** (Feb 16 deadline). Member import + invitations. |
| **3. Lap swim** | Feb–Mar 2027 | Waiver e-sign + PDFs, slot templates, blocks, booking grid, buddy rule, limits, gate code reveal, My Schedule, ICS. |
| **4. Socials & comms** | Mar–Apr 2027 | Events, RSVP, tickets, volunteer shifts, deposit credit, monthly update + archive, announcements, directory, photos v1, party reservations. |
| **5. Soft launch** | Apr 15, 2027 | Board + volunteer beta, fixes, runbook. |
| **6. Opening** | May 2027 | Live for all members. |
| **7. Season** | May–Sep 2027 | Check-in, attendance, photo queue tuning, swim team integration per decision, booking-limit tuning. |
| **8. Review** | Oct 2027 | Survey, metrics, handoff, 2028 backlog. |

---

## 7. Success metrics (2027 season)

| Metric | Target |
|---|---|
| Households with an active v2 account | ≥ 95% by opening day |
| Renewals paid in-site | 100% (no paper/off-platform exceptions) |
| Share of dues paid by ACH | ≥ 60% |
| Lap bookings via SignUpGenius / email | 0 |
| Manual gate-code emails by the Lap Swim VP | 0 |
| Volunteer deposit refunds computed from in-site data | 100% |
| Monthly updates published + archived | 1 per month, May–Oct |
| Member satisfaction (end-of-season survey) | ≥ 4 / 5 |
| Unplanned downtime during lap hours | < 1 hour per season |
| Board admin time per week (self-reported) | Lower than 2026 |
