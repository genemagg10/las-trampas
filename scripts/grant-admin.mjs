/**
 * Grant the admin role to someone who already has a login.
 * Usage: npm run grant-admin -- you@example.com
 */
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !email.includes("@")) {
  console.error("Usage: npm run grant-admin -- you@lastrampaspool.com");
  process.exit(1);
}
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in the environment.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: person, error } = await admin.from("people").select("id, first_name, last_name").ilike("email", email).maybeSingle();
if (error || !person) {
  console.error(error?.message || `No person with email ${email}. They need to create a login first.`);
  process.exit(1);
}

const { error: grantError } = await admin.from("entitlements").insert({
  person_id: person.id,
  role_key: "admin",
  source: "admin",
});
if (grantError) {
  console.error(grantError.message);
  process.exit(1);
}

console.log(`Granted admin to ${person.first_name} ${person.last_name} (${email}).`);
