import Link from "next/link";
import { Notice } from "@/components/ui";
import { updateProfile } from "@/lib/actions/member";
import { readFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Account" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!viewer.person) {
    return (
      <section className="band">
        <div className="wrap">
          <h1>Account</h1>
          <Notice {...flash} />
          <Link href="/login?next=/account">Sign in</Link>
        </div>
      </section>
    );
  }
  const supabase = await createClient();
  const prefs = supabase
    ? await supabase.from("notification_prefs").select("topic, email_enabled").eq("person_id", viewer.person.id)
    : { data: [] };
  const privacy = supabase
    ? await supabase.from("privacy_settings").select("*").eq("person_id", viewer.person.id).maybeSingle()
    : { data: null };
  const enabled = new Map((prefs.data ?? []).map((row) => [String(row.topic), Boolean(row.email_enabled)]));
  const settings = (privacy.data ?? {}) as Record<string, unknown>;

  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <div className="section-head">
          <p className="eyebrow">Account</p>
          <h2>{viewer.person.first_name} {viewer.person.last_name}</h2>
          <p>
            {viewer.household?.name}. <Link href="/account/household">Household</Link> · <Link href="/account/payments">Payments</Link>
          </p>
        </div>
        <Notice {...flash} />
        <form className="form card" action={updateProfile}>
          <label>
            First name
            <input name="first_name" defaultValue={viewer.person.first_name} required />
          </label>
          <label>
            Last name
            <input name="last_name" defaultValue={viewer.person.last_name} required />
          </label>
          <label>
            Phone
            <input name="phone" defaultValue={viewer.person.phone || ""} />
          </label>
          <label>
            Birth year
            <input name="birth_year" type="number" defaultValue={viewer.person.birth_year || ""} />
          </label>
          <fieldset>
            <legend>Email me about</legend>
            {["reminders", "announcements", "lap_buddy", "payments"].map((topic) => (
              <label className="check" key={topic}>
                <input type="checkbox" name={`pref_${topic}`} defaultChecked={enabled.get(topic) !== false} />
                {topic.replace("_", " ")}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Directory privacy</legend>
            <p>Unchecked fields stay hidden from other members. Your household can still see them.</p>
            {[
              ["show_name", "Show my name"],
              ["show_email", "Show my email"],
              ["show_phone", "Show my phone"],
              ["show_household", "Show my household name"],
              ["show_children", "Show children in the household"],
              ["lap_buddy_visible", "Show my name to lap-swim buddies in the same slot"],
            ].map(([name, label]) => (
              <label className="check" key={name}>
                <input type="checkbox" name={name} defaultChecked={Boolean(settings[name])} />
                {label}
              </label>
            ))}
            <label>
              Photo consent
              <select name="photo_consent" defaultValue={String(settings.photo_consent || "members_only")}>
                <option value="members_only">Members only</option>
                <option value="ok">OK including public albums</option>
                <option value="none">Do not use my photo</option>
              </select>
            </label>
          </fieldset>
          <button className="btn" type="submit">
            Save profile
          </button>
        </form>
      </div>
    </section>
  );
}
