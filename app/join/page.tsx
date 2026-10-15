import Link from "next/link";
import { Notice } from "@/components/ui";
import { submitWaitlist } from "@/lib/actions/member";
import { isStripeConfigured, isSupabaseConfigured } from "@/lib/env";
import { readFlash } from "@/lib/flash";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Join the waitlist" };

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div className="section-head">
          <p className="eyebrow">Waitlist</p>
          <h2>Apply for a future opening</h2>
          <p>Create an account first. The application fee is charged here when payments are connected.</p>
        </div>
        <Notice {...flash} />
        {!isSupabaseConfigured() ? <p className="alert">The application form needs the member database. See docs/SETUP.md.</p> : null}
        {!viewer.userId ? (
          <p>
            <Link className="btn" href="/login?next=/join">
              Sign in to apply
            </Link>
          </p>
        ) : (
          <form className="form card" action={submitWaitlist}>
            <label>
              Household name
              <input name="household_name" defaultValue={viewer.household?.name || ""} required />
            </label>
            <label>
              Phone
              <input name="phone" defaultValue={viewer.person?.phone || ""} />
            </label>
            <label>
              About your family
              <textarea name="about" required minLength={2} />
            </label>
            <button className="btn" type="submit">
              {isStripeConfigured() ? "Submit and pay the waitlist fee" : "Submit application"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
