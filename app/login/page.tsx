import Link from "next/link";
import { Notice } from "@/components/ui";
import { sendMagicLink, sendPasswordReset, signInWithPassword, signUpWithPassword } from "@/lib/actions/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string; next?: string }>;
}) {
  const query = await searchParams;
  const next = query.next && query.next.startsWith("/") ? query.next : "/home";
  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 640 }}>
        <div className="section-head">
          <p className="eyebrow">Members</p>
          <h2>Sign in</h2>
          <p>One login for your household. Use a magic link or a password.</p>
        </div>
        <Notice notice={query.notice} error={query.error} />
        {!isSupabaseConfigured() ? (
          <p className="alert">Auth is not connected yet. The rest of the public site still works. Follow docs/SETUP.md to create the Supabase project.</p>
        ) : null}
        <div className="grid-2">
          <form className="form card" action={signInWithPassword}>
            <h3>Password</h3>
            <input type="hidden" name="next" value={next} />
            <label>
              Email
              <input name="email" type="email" required autoComplete="username" />
            </label>
            <label>
              Password
              <input name="password" type="password" required autoComplete="current-password" minLength={8} />
            </label>
            <button className="btn" type="submit">
              Sign in
            </button>
          </form>
          <form className="form card" action={sendMagicLink}>
            <h3>Email link</h3>
            <input type="hidden" name="next" value={next} />
            <label>
              Email
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <button className="btn secondary" type="submit">
              Email me a link
            </button>
          </form>
        </div>
        <form className="form card" action={signUpWithPassword} style={{ marginTop: "1rem" }}>
          <h3>Create an account</h3>
          <p>If membership already imported your email, this login attaches to that person.</p>
          <label>
            First name
            <input name="first_name" required />
          </label>
          <label>
            Last name
            <input name="last_name" required />
          </label>
          <label>
            Household name
            <input name="household_name" placeholder="Rivera household" />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" required minLength={8} />
          </label>
          <button className="btn" type="submit">
            Create account
          </button>
        </form>
        <form className="form" action={sendPasswordReset}>
          <h3>Reset a password</h3>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <button className="btn secondary" type="submit">
            Send reset link
          </button>
        </form>
        <p>
          New to the club? <Link href="/join">Join the waitlist</Link> after you create an account.
        </p>
      </div>
    </section>
  );
}
