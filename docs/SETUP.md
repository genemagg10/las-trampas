# Set up Las Trampas Pool

This is the path from an empty laptop to a live site on **lastrampaspool.com**. You do not need to write code. You do need the logins for four new club accounts: Supabase, Stripe, Resend, and Vercel. Create them with a club address such as `webmaster@lastrampaspool.com`, not a personal inbox.

The site runs before those accounts exist. Missing keys turn a feature off and show a banner. They do not crash the public pages.

Working figures (renewal $1,075, and the rest) are already in the database migration. The board can change them later in Admin → Seasons & fees.

## 1. What you need first

- A GitHub account that can see this repository.
- A computer with [Node.js 22](https://nodejs.org) if you will run the site on your own machine. Vercel can build it without that.
- The domain **lastrampaspool.com**. Whoever holds the registrar login has to add DNS records in the last step.
- About an hour the first time.

Keep a password manager note for each account. The club, not one person, should own them.

## 2. Supabase (database, logins, files)

1. Go to [supabase.com](https://supabase.com) and create an organization named **Las Trampas Pool**.
2. Create a project. Name it `las-trampas-pool`. Pick a region close to California. Save the database password in the password manager.
3. Wait until the project status is healthy.
4. Open **Project Settings → API**.
5. Copy these three values into a note:
   - **Project URL** → this becomes `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** (or the legacy **anon** key) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Secret key** (or the legacy **service_role** key) → `SUPABASE_SECRET_KEY`
6. The secret key can read every member record. Never put it in a public page, a screenshot, or git.

### Apply the database

The SQL files in `supabase/migrations` create the tables, the security rules, the roles, and the 2027 season. They do not contain member names.

**On the Supabase website**

1. Open **SQL Editor → New query**.
2. Paste the contents of these files, in this order, and run each one before the next:
   1. `supabase/migrations/20261015052000_schema.sql`
   2. `supabase/migrations/20261015052100_functions.sql`
   3. `supabase/migrations/20261015052200_rls.sql`
   4. `supabase/migrations/20261015052300_reference_seed.sql`
3. Do **not** run anything in `supabase/tests`. Those files are for automated checks on a disposable database.

**Or from a terminal**, if the [Supabase CLI](https://supabase.com/docs/guides/cli) is installed and the project is linked:

```bash
supabase db push
```

### Confirm it worked

In the SQL editor, run:

```sql
select year, name from public.seasons;
select key from public.roles order by key;
```

You should see season **2027** and the roles `admin`, `board`, `lap_swimmer`, `member`, `swim_team_family`, and `volunteer`.

## 3. Stripe (dues, tickets, parties)

1. Go to [dashboard.stripe.com/register](https://dashboard.stripe.com/register). The treasurer should be the account owner. Stripe will ask for the club’s legal name, EIN, and bank account before live charges. You can build with **test mode** before that paperwork is done.
2. Stay in **Test mode** (the switch at the top of the dashboard) until the board is ready to charge real dues.
3. Open **Developers → API keys**.
4. Copy the secret key (`sk_test_…`) to `STRIPE_SECRET_KEY`.
5. Copy the publishable key (`pk_test_…`) to `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
6. Card and bank debit (ACH) are both offered at checkout. ACH payments can show as “processing” for a few days. The site treats a processing ACH payment as membership until Stripe says it failed. The treasurer can turn that off later in `club_settings` (`ach_grants_provisional`).

The webhook secret is added in step 6, after the site has a URL.

## 4. Resend (email)

1. Go to [resend.com](https://resend.com) and create an account for the club.
2. Open **Domains → Add domain** and enter `lastrampaspool.com`.
3. Resend shows DNS records (usually three). The person with the registrar login adds them. Status should become **Verified**. This can take an hour.
4. Open **API Keys → Create API key**. Copy it to `RESEND_API_KEY`.
5. Set `EMAIL_FROM` to the address you verified, for example:

```text
Las Trampas Pool <updates@lastrampaspool.com>
```

Until the domain is verified, announcement email and reminders stay off. The posts themselves still appear on the site.

## 5. Run it on your computer (optional)

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` and paste the values from the steps above. Use:

```text
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then:

```bash
npm run dev
```

Open http://localhost:3000. The public pages should load. Sign-up works once the Supabase URL and publishable key are set.

## 6. Vercel (the live site)

1. Go to [vercel.com](https://vercel.com) and create a team named **Las Trampas Pool** with the club email.
2. **Add New → Project** and import this GitHub repository.
3. Framework preset: **Next.js**. Leave the build command as `npm run build`.
4. Open **Settings → Environment Variables** and add every name from `.env.example` except the comments. For production, set:

```text
NEXT_PUBLIC_SITE_URL=https://lastrampaspool.com
```

5. Generate a long random string for `CRON_SECRET` (a password manager can do this). Vercel sends it when the daily reminder job runs. The schedule is already in `vercel.json` (15:00 UTC, about 8:00am Pacific).
6. Deploy. Vercel gives you a URL like `las-trampas-pool.vercel.app`. Open it and confirm the home page loads.
7. Back in Stripe, still in test mode: **Developers → Webhooks → Add endpoint**.
   - URL: `https://YOUR-VERCEL-URL/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded`
8. Copy the signing secret (`whsec_…`) into Vercel as `STRIPE_WEBHOOK_SECRET`, then redeploy.

## 7. Point the domain

1. In Vercel, open the project → **Settings → Domains → Add** `lastrampaspool.com` and `www.lastrampaspool.com`.
2. Vercel shows the DNS records to add at the registrar (usually an A record and a CNAME for `www`).
3. Remove the old Membership Toolkit DNS records only after the new site loads on the domain and the board has a fallback plan. Write down the old records first.
4. When the domain is verified, change the Stripe webhook URL to `https://lastrampaspool.com/api/stripe/webhook` if you used the Vercel URL earlier.
5. In Supabase **Authentication → URL configuration**:
   - Site URL: `https://lastrampaspool.com`
   - Redirect URLs: `https://lastrampaspool.com/auth/confirm` and `http://localhost:3000/auth/confirm`

## 8. Create the first admin

1. Open the live site → **Member sign in** → **Create an account** with the webmaster’s club email.
2. Confirm the email Supabase sends.
3. On a computer with the repo and `.env.local` filled in (the secret key must be the production key):

```bash
npm run grant-admin -- webmaster@lastrampaspool.com
```

4. Sign out and sign in again. **Admin** appears in the menu.
5. Grant board offices under **Admin → Roles**. A board role needs an office (President, Treasurer, and so on) or it will not open the matching screens.

## 9. Before members arrive

Do these in the admin console. None of them require a developer.

1. **Seasons & fees.** Confirm 2027 dates and amounts with the board. Edit any fee that changed.
2. **Waivers.** The adult lap waiver is a draft. Replace the text after legal review, then publish it. The teen waiver stays unpublished until the board decides.
3. **Lanes.** Set the buddy rule, weekly limit, and cancellation cutoff. Generate lane times for the dates you want open. Store the gate code. It is not emailed and it is not on the page until a swimmer’s booking day, and only if the buddy rule is met.
4. **Updates.** Post the first monthly update. Email goes out only if Resend is verified and you check “Email members”.
5. **Photos.** Create an album and upload real Las Trampas photos. Mark any photo with minors, and only check “public OK” when consent allows it.
6. **Documents.** Replace the bylaws and handbook placeholders. Members can read them after they sign in.
7. **Import.** When Membership Toolkit or SignUpGenius exports are in hand, use **Admin → Import**. A fictional sample header is `fixtures/members.sample.csv`. Do not commit a real export. The Supabase secret key has to be set or the import cannot create other households.

## 10. Optional demo people

Only on a test project:

```bash
SEED_DEMO=yes npm run seed:demo
```

This creates three fictional `@example.com` accounts. The password is printed by the script. Delete them before real members use the project.

## 11. What “healthy” looks like

- `https://lastrampaspool.com/api/health` returns `"ok": true`. `supabase`, `stripe`, and `resend` are `true` when those keys are set.
- A test checkout in Stripe test mode uses card `4242 4242 4242 4242` or a test bank account. The payment shows under **Account → Payments** after the webhook runs.
- A member without a signed waiver cannot book a lane. That rule is in the database, not only on the screen.

## 12. If something fails

| What you see | What to check |
|---|---|
| Banner says the database is not connected | `NEXT_PUBLIC_SUPABASE_URL` and the publishable key in Vercel, then redeploy |
| Sign-in email never arrives | Supabase Auth URL configuration, and the redirect URL in step 7 |
| Payment succeeds in Stripe but membership stays unpaid | Webhook URL, `STRIPE_WEBHOOK_SECRET`, and the event list in step 6 |
| Email button does nothing visible | Resend domain verified, `RESEND_API_KEY`, and `EMAIL_FROM` |
| Import says it cannot add people | `SUPABASE_SECRET_KEY` on the server that ran the import |
| Admin pages say the area is not open | The person has a board office, or the admin role, and they signed in again after it was granted |
