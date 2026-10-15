# Las Trampas Pool v2

**The member platform for [Las Trampas Pool](https://lastrampaspool.com): one login, one place, the whole summer.**

Las Trampas is a member-owned swim club in Burton Valley, Lafayette, CA, founded in 1958. It has 216 member households and is open May through October. It is home to the [Las Trampas Seahorses](https://ltst.org) swim team.

> **Status: the member platform is in this repo.** Next.js, Supabase, Stripe, and Resend. It runs with environment variables and shows a banner when a service is not connected yet. Follow [docs/SETUP.md](docs/SETUP.md) to create the club accounts, apply the database, and appoint the first admin. The target is an MVP live before the **May 2027** opening. Working fees and the lap rules are provisional until the board confirms them ([open questions](docs/OPEN_QUESTIONS.md)).

---

## 1. Vision

A member opens lastrampaspool.com and sees **their summer** at a glance:

- the lap lanes they've booked, and who their buddy is
- the socials they've RSVP'd to and the volunteer shifts they've taken
- what they owe, and whether their volunteer deposit is earned back
- this month's update and the latest photos from the deck

The public sees a warm, **photo-led** site that sells the club to prospective families and the waitlist.

---

## 2. The core principle: nobody ever leaves the platform

> **Every member task happens inside lastrampaspool.com, with one login.**

| Today (Membership Toolkit + outside tools) | v2 |
|---|---|
| Lap swim waiver in MT, then a separate SignUpGenius login for lanes | Waiver and lane booking in the same member area |
| Gate code emailed manually by the Lap Swim VP | Gate code shown automatically for a confirmed, buddy-matched booking |
| Bylaws and handbook on Google Docs | Hosted in-site, members-only |
| Newsletters sent by email, no archive | Monthly updates posted, emailed **and** archived in-site |
| Photos scattered on Facebook / Instagram / personal drives | Photo albums in-site, with consent controls |
| No RSVP or volunteer sign-up for socials | RSVP, tickets and volunteer shifts on each event |

What this means in practice:

- **Payments, signups, communication, schedules, photos and monthly updates** all live in the site.
- **Stripe** handles card/ACH entry through embedded components, so members never land on a third-party portal to pay.
- **Email** is a notification that links *back into* the site; it is never the only place information lives.
- Outside links are limited to things the club doesn't own (e.g., the swim league's meet results).

---

## 3. Features by area

### 🔐 Accounts & households
- One login per person (magic link or password), linked to a household
- Adults and teens in a household; household admins manage their family
- Notification preferences (email now; push later)

### 🏊 Lap swim
- Season waiver, e-signed in-site, stored as a PDF, expires each season
- Lane booking grid (lanes × time slots) with blocks for swim team, lessons and maintenance
- **Buddy rule** enforced and visible; booking limits and cancellation cutoff set by the board
- **Gate code reveal** only on the day of a valid, buddy-matched booking
- Optional one-tap check-in (safety log)

### 🎉 Socials & volunteering
- Event pages with real photos, RSVP (adults/kids), capacity, waitlist, paid tickets
- Volunteer shifts on the same event card
- **$50 volunteer-deposit credit** tracked automatically; treasurer refund report

### 🏅 Swim team (Las Trampas Seahorses)
- Team schedule and volunteer jobs for swim-team families
- Integration vs. replacement of ltst.org is an [open question](docs/OPEN_QUESTIONS.md)

### 💳 Dues & payments
- Renewals, new-member fees, lap-swim-only membership, waitlist application and fee, party reservations
- ACH (`us_bank_account`) encouraged to cut fees; card as backup
- Receipts and household payment history

### 📅 My Schedule
- One date-ordered list: lap bookings, RSVPs, volunteer shifts, party reservations, team events
- Personal ICS calendar feed (Google/Apple), reminders

### 📣 Communication
- Announcements, the **monthly update**, and a searchable newsletter archive
- Role-based board contact addresses

### 📸 Photos
- Albums by event and season; member uploads with board approval
- Members-only by default; public "best of" only with consent

### 📒 Directory & documents
- Member directory with per-person privacy controls
- Bylaws, handbook, rules, forms (members-only)

### 🛠️ Board & admin console
- Scoped admin roles (Social chair, Lap Swim VP, Treasurer, Membership, Webmaster…)
- Events and slots, waiver roster, attendance, volunteer credit, updates, photos, households, reports and CSV exports

Full detail: **[docs/SCOPE.md](docs/SCOPE.md)**

---

## 4. Roles & access matrix

Access is computed from **roles and entitlements** held by a person, most of which **expire per season**. Enforcement is in the database (Postgres Row Level Security), not just the UI.

| Capability | Public | Member | Lap swimmer | Swim team family | Volunteer | Board | Admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Public pages, join / waitlist application | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Member home, My Schedule, monthly updates archive | | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Social RSVP, tickets, volunteer shifts | | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dues, payments, receipts | | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Photos, directory, bylaws & handbook | | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Party reservations | | ✅¹ | ✅¹ | ✅ | ✅ | ✅ | ✅ |
| Lap swim booking, buddy view, **gate code** | | | ✅ | | | ✅² | ✅² |
| Swim team schedule & team volunteer jobs | | | | ✅ | | ✅ | ✅ |
| Shift lead tools (mark shifts complete) | | | | | ✅³ | ✅ | ✅ |
| Admin console for their area | | | | | | ✅⁴ | ✅ |
| User/role management, all data, exports | | | | | | | ✅ |

¹ Not for lap-swim-only memberships (board to confirm). ² Board/admin see lap swim admin views; *booking* still requires their own waiver. ³ Only for shifts they lead. ⁴ Scoped by board position.

**Role definitions**

| Role | Granted when | Expires |
|---|---|---|
| `guest` / public | Anyone, no login | — |
| `member` | Household dues paid for the season | End of season |
| `lap_swimmer` | Member signs the current-season lap waiver (adult; teen 15–17 rules TBD) | End of season, or revoked |
| `swim_team_family` | Household has a registered Seahorse swimmer | End of season |
| `volunteer` | Signed up for / leading a shift | End of season |
| `board` | Elected or appointed board position (scoped) | End of term |
| `admin` | Granted by an existing admin (webmaster) | Until removed |

---

## 5. Stack and why

> **Decision:** custom build. See [ADR 0001](docs/decisions/0001-custom-platform.md). Membership Toolkit has no API, so "one login, never leave the platform" can't be met by extending it.

| Layer | Choice | Why (low maintenance first) |
|---|---|---|
| App | **Next.js** (App Router, TypeScript) | One codebase for public site, member area and admin; server components keep secrets server-side |
| UI | **Tailwind CSS** + shadcn-style components | Accessible primitives, no design-system upkeep, easy to theme |
| Database | **Supabase Postgres** | Managed Postgres, backups, SQL migrations |
| Auth | **Supabase Auth** (magic link + password) | No password resets to handle by hand; one login |
| Access control | **Row Level Security** | Role gating enforced in the database, so a UI bug can't leak data |
| Files | **Supabase Storage** | Photos (public/private buckets) and signed waiver PDFs (private) |
| Payments | **Stripe** (Checkout / Payment Element, ACH via `us_bank_account`) | PCI handled by Stripe; ACH at 0.8% capped at $5 vs ~2.9% card; embedded in-site |
| Email | **Resend** | Transactional email and the monthly newsletter, with React email templates |
| Hosting | **Vercel** | Git push to deploy, preview deployments, no servers |
| Mobile | PWA first; **Expo** app later (optional) | Avoid app-store upkeep until there's a clear need |

Rough running cost: about **$540/yr** (Vercel Pro + Supabase Pro) plus Resend and Stripe fees. Details: [docs/research](docs/research/01_mt_research.md).

---

## 6. Repo layout

```
las-trampas/
├── README.md                 ← you are here
├── LICENSE                   ← all rights reserved (placeholder)
├── docs/
│   ├── SCOPE.md              ← detailed scope, roadmap, success metrics
│   ├── ARCHITECTURE.md       ← architecture, data model, RLS, diagrams
│   ├── OPEN_QUESTIONS.md     ← what's still needed to finish
│   ├── decisions/
│   │   └── 0001-custom-platform.md
│   ├── current-site/         ← map of today's MT site (png/pdf/svg)
│   ├── research/             ← Membership Toolkit research (md/pdf)
│   └── plan/                 ← v2 plan (md/pdf)
├── design/
│   ├── BRAND.md              ← photography, Seahorse marks, palette, type
│   └── mockup/               ← clickable member-home mockup + screenshots
└── assets/
    ├── photos/README.md      ← real Las Trampas photos needed
    └── brand/README.md       ← official Seahorse logo files needed
```

Application code (`app/`, `supabase/`, etc.) will be added once the board approves and accounts exist.

---

## 7. Documents

| Doc | What |
|---|---|
| [docs/SCOPE.md](docs/SCOPE.md) | In-scope modules, out of scope, non-functional requirements, migration, roadmap, metrics |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagram, data model, RLS approach, key flows |
| [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) | Decisions, accounts, assets and approvals still needed |
| [docs/decisions/0001-custom-platform.md](docs/decisions/0001-custom-platform.md) | Why custom instead of Membership Toolkit |
| [design/BRAND.md](design/BRAND.md) | Visual direction |
| [docs/plan/02_v2_plan.md](docs/plan/02_v2_plan.md) | Original v2 plan (journeys, admin, migration) |
| [docs/research/01_mt_research.md](docs/research/01_mt_research.md) | MT pricing / feature research and alternatives |
| [docs/current-site/](docs/current-site/) | Map of the current site and its gaps |
| [design/mockup/](design/mockup/) | Clickable member-home mockup (fictional data, stock placeholder photos) |

---

## 8. Contributing (later)

Not open yet. When the build starts:

- **Branches & PRs:** work on a branch, open a PR to `main`; every PR gets a Vercel preview.
- **Database changes** only through SQL migrations in `supabase/migrations/`, with RLS policies and tests in the same PR.
- **No member personal data** in the repo, issues, screenshots or seed files. Seed data must be fictional.
- **Secrets** live in Vercel / Supabase environment settings, never in git.
- **Photos:** only real Las Trampas photos with consent, and only official Seahorse marks. No stock art, no vector illustrations.
- Questions: contact the webmaster (Gene Maggio).

---

*© Las Trampas Pool. All rights reserved. See [LICENSE](LICENSE).*
