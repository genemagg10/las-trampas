/**
 * Fictional demo data only. Refuses to run unless SEED_DEMO=yes.
 * Requires the Supabase URL and secret key. Never put real member exports here.
 */
import { createClient } from "@supabase/supabase-js";

if (process.env.SEED_DEMO !== "yes") {
  console.error("Refusing to seed. Run: SEED_DEMO=yes npm run seed:demo");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY first.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const people = [
  { email: "sam.rivera@example.com", first_name: "Sam", last_name: "Rivera", household_name: "Rivera household", role: "member" },
  { email: "ben.okafor@example.com", first_name: "Ben", last_name: "Okafor", household_name: "Okafor household", role: "member" },
  { email: "cara.nguyen@example.com", first_name: "Cara", last_name: "Nguyen", household_name: "Nguyen household", role: "board" },
];

for (const person of people) {
  const created = await admin.auth.admin.createUser({
    email: person.email,
    password: "Demo-only-2027!",
    email_confirm: true,
    user_metadata: {
      first_name: person.first_name,
      last_name: person.last_name,
      household_name: person.household_name,
    },
  });
  if (created.error && !created.error.message.toLowerCase().includes("already")) {
    console.error(person.email, created.error.message);
    process.exit(1);
  }
  const { data: row, error } = await admin.from("people").select("id, household_id").ilike("email", person.email).maybeSingle();
  if (error || !row) {
    console.error("No profile for", person.email, error?.message);
    process.exit(1);
  }
  await admin.from("households").update({ membership_type: "full", status: "active" }).eq("id", row.household_id);
  await admin.from("entitlements").insert({
    household_id: row.household_id,
    role_key: "member",
    season: 2027,
    source: "admin",
  });
  if (person.role === "board") {
    await admin.from("entitlements").insert({
      person_id: row.id,
      role_key: "board",
      scope: "president",
      source: "admin",
    });
  }
  if (person.email.startsWith("sam.")) {
    await admin.from("entitlements").insert({
      person_id: row.id,
      role_key: "lap_swimmer",
      season: 2027,
      source: "admin",
    });
  }
  console.log("Seeded", person.email);
}

const starts = new Date("2027-06-12T18:00:00-07:00").toISOString();
await admin.from("events").upsert(
  {
    title: "Opening social (demo)",
    slug: "opening-social-demo",
    kind: "social",
    summary: "Fictional demo event. Not a real club date.",
    description: "This event exists only so a new install can click through RSVP. Delete it before launch.",
    location: "Las Trampas Pool",
    starts_at: starts,
    ends_at: new Date("2027-06-12T20:00:00-07:00").toISOString(),
    price_cents: 0,
    published: true,
    season: 2027,
  },
  { onConflict: "slug" },
);

await admin.from("posts").upsert(
  {
    kind: "monthly_update",
    title: "June update (demo)",
    slug: "june-update-demo",
    body_md: "This is fictional demo copy. Replace it with the board's real monthly update.",
    publish_at: new Date().toISOString(),
  },
  { onConflict: "slug" },
);

const slots = await admin.rpc("generate_lap_slots", {
  p_season: 2027,
  p_from: "2027-06-01",
  p_to: "2027-06-14",
});
if (slots.error) console.error("Lane generation:", slots.error.message);
else console.log("Lane times generated:", slots.data);

console.log("Demo password for the three example.com accounts: Demo-only-2027!");
console.log("Delete these accounts before any real member uses the site.");
