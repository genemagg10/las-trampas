import Link from "next/link";
import { Notice } from "@/components/ui";
import { readFlash } from "@/lib/flash";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Admin" };

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!viewer.userId) return <p><Link href="/login?next=/admin">Sign in</Link></p>;
  if (!viewer.isBoard && !viewer.isAdmin) return <p className="alert error">This console is for board and admin roles.</p>;
  return (
    <>
      <Notice {...flash} />
      <div className="grid-3">
        <article className="card">
          <h3>Members</h3>
          <p>Look up households, invite the waitlist, and grant swim-team access.</p>
          <Link href="/admin/members">Open</Link>
        </article>
        <article className="card">
          <h3>Money</h3>
          <p>Fees, payments, and refunds. Export a CSV for the treasurer.</p>
          <Link href="/admin/payments">Open</Link>
        </article>
        <article className="card">
          <h3>Summer ops</h3>
          <p>Events, lanes, waivers, updates, and photos.</p>
          <Link href="/admin/events">Events</Link>
        </article>
      </div>
      <p>
        Exports: <a href="/api/admin/export?kind=members">members</a> · <a href="/api/admin/export?kind=payments">payments</a> ·{" "}
        <a href="/api/admin/export?kind=bookings">bookings</a>
      </p>
    </>
  );
}
