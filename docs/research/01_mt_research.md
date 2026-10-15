# Las Trampas Pool v2: Membership Toolkit research & platform recommendation

*Prepared for Gene Maggio · October 14, 2026 · Sources were checked on that date. A price the vendor doesn't publish is marked **unknown**.*

> **Status note (added Oct 2026):** The recommendation in section 1 (stay on MT for 2027) is **superseded** by [ADR 0001: Custom platform](../decisions/0001-custom-platform.md). The research findings, pricing and fee math remain the reference for that decision.

---

## 1. Bottom line

**Recommendation: for the 2027 season, stay on Membership Toolkit (MT), drop SignUpGenius, and switch on the MT features the club already pays for. Treat a custom build (Next.js + Supabase + Stripe on Vercel) as a decision for 2028, and make it only if the 2027 MT setup can't deliver the unified experience and a second volunteer can share maintenance.**

Why:

1. **MT already covers more of the v2 goals than the club uses today.** It has native volunteer and sign-up forms with per-slot capacity, shift and calendar layouts, and automatic reminders. It also has a "signups calendar" ICS feed that puts each member's own commitments on their personal calendar, plus volunteer-hours tracking, a newsletter archive page, and pages and sign-ups restricted to specific groups. Social RSVPs, volunteer shifts with deposit credit, a newsletter archive, and a lane booking form for waiver-cleared members can all be configured **without writing code** before May 2027.
2. **MT has no public API.** A custom site therefore can't share MT's login or data. "One login for everything" means either everything stays in MT, or MT gets replaced entirely, with membership, dues, directory, newsletters and the app all rebuilt and migrated. A half-custom setup would bring back the two-login problem that SignUpGenius causes today.
3. **The real risk with a custom build is upkeep, not hosting cost.** Hosting is cheap (about $540/yr). But a custom system holds payments, member personal data, and signed liability waivers. For one volunteer, that's a lot of ongoing responsibility (security, board handoff, and on-call support at 7 am on a lap-swim morning).
4. **What MT can't do natively:** a single "My Schedule" dashboard, a real reservation engine (per-member booking limits, recurring slots, an automatic buddy rule), photo galleries, and showing the gate code automatically once the waiver is signed. These gaps define the 2028 decision. Either confirm workarounds with MT support, or move to a swim-club platform (Member Splash, PoolPulse) or a custom build.

---

## 2. Membership Toolkit: pricing

| Plan | Price | Notable inclusions |
|---|---|---|
| Essential | **$550/yr** | Pre-designed site (10 content pages), contact database, directory, calendars, volunteer scheduling, newsletter/email, online sales, mobile app. Contact upload costs $75 extra. **No packets, no custom domain, no promo codes, no volunteer check-in/kiosk** |
| Premium | **$850/yr** | Adds a fully custom site design, **blog**, **packets**, **own domain**, unlimited pages, comments, Communities, accounting, volunteer check-in/kiosk, CSS/HTML access |
| Concierge | **$1,150/yr** | Adds priority/chat support, an annual web conference, and 3 professional services |
| Text messaging (any plan) | $2.50/mo + $0.02/text | 250 free texts/yr (Essential) or 500 (Premium/Concierge) |
| Add-ons | $150/yr each | Self-serve ads, Inventory module. Accounting costs $150 on Essential |

Sources: https://www.membershiptoolkit.com/pricing · https://membershiptoolkit.com/pricing-detailed/

> **Which plan Las Trampas is on: unknown.** The club uses **packets** and a **custom domain** (lastrampaspool.com), and both require Premium or higher, so it pays at least **$850/yr**. The treasurer can confirm.

### MT payment processing

| Processor | Card | ACH / e-check | Other |
|---|---|---|---|
| **LumaPay** (MT's own processor, **powered by Stripe**) | **2.89% + $0.30** online; 2.89% + $0.50 in person | **1.5%, $0.50 minimum** | No setup, monthly or cancellation fees. Scheduled/recurring payment plans. Apple Pay/Google Pay. Payouts within about 2 days |
| PaySimple (MT partner option) | Interchange + 0.80% + $0.23 | $1.09 + 0.05% | $15/mo software fee, $5.95/mo PCI fee, $5/mo ACH fee, plus batch fees |

Sources: https://membershiptoolkit.com/blogs/post/introducing-lumapay-a-brighter-way-to-pay/ · https://membershiptoolkit.com/wp-content/uploads/2024/08/Lumapay_2024-Flyer.pdf · https://paysimple.com/partner/pricing/membership-toolkit-pricing-standard-wp/

> **Fees are worth a look regardless of platform.** A $1,125 renewal ($1,075 + $50 deposit) paid by card through LumaPay costs about **$32.81**. Paid by LumaPay ACH it costs **$16.88**. Paid by Stripe ACH directly, it costs **$5.00** (0.8%, capped at $5: https://stripe.com/pricing/local-payment-methods). Across 216 households, that's roughly $7.1k vs $3.6k vs $1.1k per year. Which processor the club uses, and whether members or the club pay the fee: **unknown**. Ask the treasurer. Even staying on MT, nudging members toward ACH saves money.

---

## 3. Membership Toolkit: feature fit for the v2 goals

**Legend:** ✅ native · 🟡 partial or workaround · ❌ not offered / not documented

| v2 need | MT | What the docs say | Source |
|---|---|---|---|
| **Event sign-ups / RSVP with capacity** | 🟡→✅ | No RSVP button on calendar events (the calendar is display-only). But **volunteer/sign-up forms** set a per-item maximum ("Max Vols"), can show open-slot counts and who signed up, and send confirmation and reminder emails. **Sales forms** have inventory controls for paid, capacity-limited tickets; the club already does this for party slots. An "RSVP" can be a free sign-up form; a paid BBQ ticket can be a sales form. | membershiptoolkit.com/features/volunteers/ · How-To guide PDF (link below) · pricing-detailed |
| **Volunteer shifts with capacity** | ✅ | Unlimited sign-ups in list, calendar, or "days and times for shifts" format. Automatic reminder ("tickler") and thank-you emails. Can be limited to one group. | membershiptoolkit.com/features/volunteers/ |
| **Volunteer credit (refund the $50 deposit)** | 🟡 | A **volunteer-hours** module lets volunteers or admins log hours, with reports. The club owns it but doesn't use it. Check-in kiosk requires Premium+. Automatically linking completed hours to a deposit refund is **not documented**; the treasurer would refund from a report. | features/volunteers/ · pricing-detailed |
| **Member's personal schedule** | 🟡 | Members who subscribe to the **"signups calendar"** see *their own* sign-up commitments on their personal (Google/Apple) calendar. My Account lists forms and orders. **No single in-site "My Schedule" page** combining lap swim and socials is documented. | features/volunteers/ · features/calendars/ |
| **Photo galleries** | ❌/🟡 | No gallery feature in any plan's feature list. The site editor supports photos and videos, and there's unlimited file storage. Workaround: an image-grid page, a blog post per event, or an embedded shared album. | features/custom-website/ · pricing-detailed |
| **Newsletter archive** | ✅ (unused) | The newsletter tool can "archive past newsletters and have them readily available on a website page". Premium also includes a **Blog/News** tool that suits monthly updates. | haggardpta.membershiptoolkit.com/email_newsletters (MT's standard customer-site text) · features/custom-website/ |
| **Waiver gating access** | 🟡 | Waivers can be required **data forms** in packets. Pages and calendars can be private to members **"or access to just certain groups"**, and a sign-up form can be shown to "just one group". **Not documented:** whether signing a form *automatically* adds the member to a group. Fallback: an admin adds signers to a "Lap-cleared 2027" group (minutes per week). **Ask MT support.** | features/custom-website/ · features/volunteers/ · features/membership/ |
| **Recurring time-slot booking (lap lanes)** | 🟡 | No reservation engine. Workaround: a sign-up form in "days and times" format with one item per lane per time slot (e.g., Lane 3, Tue 6:30–7:30) and Max = 2. Signed-up names are visible, which gives buddy visibility, and the form can be limited to the waiver group. **Not documented:** per-member booking limits, automatically generating recurring slots, or blocking slots for swim-team practice. MT also **links SignUpGenius forms** if the club keeps SUG. | features/volunteers/ |
| **Gate code shown to cleared swimmers** | 🟡 | Put the code on a private page limited to the waiver group, or in the sign-up confirmation email. No per-booking reveal. | features/custom-website/ |
| **Stripe / ACH payments** | ✅ | LumaPay runs on Stripe and supports cards, Apple/Google Pay, ACH and payment plans (fees above). There's **no direct Stripe-account integration**: money moves through MT's processor. | LumaPay links above |
| **API / data export** | ❌/🟡 | **No public API** is documented (third-party directories also report "API availability not provided"). Membership records export to Excel, and on-screen and downloadable reports exist. Contact upload is included on Premium (1 per year on Essential, with an extra upload for $75). Migrating out means CSV exports, not a sync. | features/membership/ · softwarefinder.com/nonprofit/membership-toolkit · pricing-detailed |
| Directory, membership expirations, mobile app | ✅ | Already in use. | features/membership/ |

Key URLs: https://membershiptoolkit.com/features/volunteers/ · https://membershiptoolkit.com/features/calendars/ · https://membershiptoolkit.com/features/custom-website/ · https://membershiptoolkit.com/features/email-newsletters/ · https://membershiptoolkit.com/features/membership/ · How-To guide (district PTA, 2021): https://cdnsm5-ss10.sharpschool.com/UserFiles/Servers/Server_19366028/File/MTK%20How%20To%20Guide%202021.pdf · https://membershiptoolkit.com/wp-content/uploads/2020/12/Membership-Toolkit-Idea-Book-for-Organizations.pdf

> **Caveat:** MT's help center is only open to logged-in admins, so this research comes from MT's public feature pages, pricing tables, and customer-published how-to guides. The four 🟡 questions (automatic group assignment after a waiver, per-member booking limits, recurring slot generation, galleries) should go to MT support as one ticket before the board decides.

---

## 4. Alternatives

| Option | Rough cost | Pros for a volunteer maintainer | Cons |
|---|---|---|---|
| **A. Stay on MT, integrate & tidy** (recommended for 2027) | ~$850–1,150/yr (current) + processing fees. Cancelling SignUpGenius saves its plan cost (club's plan: **unknown**; SUG paid plans are $107.89–$539.89/yr) | No code. Vendor support. Board handoff already works. Data stays put. Fastest to May 2027 | Several screens instead of one dashboard. Lane booking is a workaround. No galleries. Limited UX control |
| **B. Custom: Next.js + Supabase (Auth, Postgres, Storage) + Stripe on Vercel** | Vercel Pro $20/mo ($240/yr). Supabase Pro $25/mo ($300/yr; the free tier **pauses after 1 week idle**, which doesn't suit an off-season site). Stripe 2.9% + 30¢ card, ACH 0.8% capped at $5. Email-sending service: not priced here. **~$540/yr + fees + volunteer build time** | Exactly the UX Gene wants (mockup). One login with role tiers in the database. Real lane reservations with the buddy rule. Cheapest ACH. Full data ownership | Must rebuild membership, packets, directory, newsletters, notifications and the mobile app (a web app/PWA instead of native apps). Volunteer becomes responsible for security, PII and waiver records. Bus-factor risk. No vendor support desk |
| **C. Swim-club platform: Member Splash** | **Essentials $2,000/yr, Premium $3,500/yr**, unlimited members, "no per-transaction cuts" (card processor fees: **unknown**) | Built for swim & tennis clubs. Native **waivers, lap-lane reservations with booking limits**, events calendar, check-in, push notifications, app. Can integrate with an existing site | About 2–4× MT's cost. Full migration. Photo galleries and volunteer-credit tracking: **unknown** |
| **D. Swim-club platform: PoolPulse** | **Unknown** (demo-only pricing) | Native household records, waivers, lane reservations, waitlists, events, volunteer management, member portal | Pricing unknown. Newer vendor. Full migration |
| **E. WildApricot** | 250 contacts ≈ $82/mo (third-party 2026 figure, https://coveyhq.com/compare/wild-apricot-pricing/). Individual contacts for 216 households likely exceed 250, so the 500 tier ≈ $154/mo (same source) | Strong event registration (capacity, waitlists, guests, payments), members-only pages, API, Zapier | No lane reservation engine. Costs more than MT. Full migration |
| **F. ClubExpress** | 201–300 members: 38¢/primary member/mo + 18¢/secondary, $24/mo minimum (≈ $985/yr for 216 primaries before secondaries). Setup fee **unknown** | Broad club feature set, including member photo galleries | Dated UX. No lane booking known. Full migration |
| **G. TeamSnap / Jackrabbit** | TeamSnap club pricing is quote-only. Jackrabbit Class from $49/mo | Good for the **swim team / lessons** (already on ltst.org) | Built for teams and classes, not a member-owned club with dues, lap lanes and socials. **Not recommended** for the main site |

Sources: https://vercel.com/pricing · https://supabase.com/pricing · https://stripe.com/pricing · https://stripe.com/pricing/local-payment-methods · https://www.membersplash.com/pricing-comparison/ · https://www.membersplash.com/features/reservation-system/ · https://poolpulse.io/features · https://www.wildapricot.com/pricing · https://www.clubexpress.com/pricing · https://www.teamsnap.com/pricing · https://www.jackrabbitclass.com/pricing/ · https://www.signupgenius.com/pdfs/pricing-plans-printable.pdf

---

## 5. Suggested decision path

1. **Now to Dec 2026:** send the four 🟡 questions to MT support. Confirm the current MT plan, payment processor, and SignUpGenius plan with the treasurer. Request a Member Splash demo as a benchmark for lane booking.
2. **Jan to Apr 2027 (MVP on MT):** rebuild site navigation to the v2 sitemap. Turn on the newsletter archive and blog for monthly updates. Create a "Lap-cleared 2027" group fed by the waiver form. Rebuild lap lanes as an MT shift sign-up limited to that group. Put socials and volunteer shifts on MT sign-up forms and log hours to drive deposit refunds. Fix the broken /events link, empty pages, and email mismatches.
3. **Sept 2027 (post-season review):** if members still juggle multiple screens, or lane-booking workarounds cause friction, choose between **Member Splash** (if the vendor features fit) and **custom build B** (if Gene plus a backup maintainer commit and the board accepts responsibility for data and payments), ready for May 2028.
