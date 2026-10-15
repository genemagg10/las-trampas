import Image from "next/image";
import Link from "next/link";
import { MenuToggle } from "@/components/menu";
import { Wordmark, memberNav, publicNav } from "@/components/ui";
import { getViewer } from "@/lib/viewer";

export async function SiteHeader() {
  const viewer = await getViewer();
  const signedIn = Boolean(viewer.userId);
  return (
    <header className="site-header">
      <div className="wrap header-row">
        <Wordmark />
        <MenuToggle>
          {publicNav.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
          {signedIn
            ? memberNav.slice(0, 4).map(([href, label]) => (
                <Link key={href} href={href}>
                  {label}
                </Link>
              ))
            : null}
          {viewer.isBoard ? <Link href="/admin">Admin</Link> : null}
          {signedIn ? (
            <form action="/auth/signout" method="post">
              <button className="btn secondary" type="submit">
                Sign out
              </button>
            </form>
          ) : (
            <Link className="btn" href="/login">
              Member sign in
            </Link>
          )}
        </MenuToggle>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap grid-3">
        <div className="footer-brand">
          <Image src="/brand/lt-seahorse-sm.png" alt="Las Trampas seahorse logo" width={46} height={60} />
          <div>
            <h4>Las Trampas Pool</h4>
            <p>
              Member-owned swim club in Burton Valley, Lafayette, California. Open to members and their guests May through October.
            </p>
          </div>
        </div>
        <div>
          <h4>Visit & mail</h4>
          <p>
            640 St. Mary’s Road
            <br />
            Lafayette, CA 94549
            <br />
            <a href="https://maps.google.com/?q=640+St+Marys+Road+Lafayette+CA+94549">Map & directions</a>
          </p>
          <p>
            Mail: PO Box 742, Lafayette, CA 94549
          </p>
        </div>
        <div>
          <h4>Contact</h4>
          <p>
            <a href="tel:+19253104313">925-310-4313</a> (not monitored at all times)
            <br />
            Instagram: <a href="https://www.instagram.com/lastrampaspool/">@lastrampaspool</a>
            <br />
            Swim team: <a href="https://ltst.org">Las Trampas Seahorses</a>
            <br />
            <Link href="/contact">Contact the board</Link>
          </p>
        </div>
      </div>
      <div className="wrap legal">
        <Link href="/membership">Membership</Link> · <Link href="/programs">Programs</Link> · <Link href="/calendar">Calendar</Link> ·{" "}
        <Link href="/updates">Updates</Link> · <Link href="/about/history">History</Link> · © Las Trampas Pool, est. 1958
      </div>
    </footer>
  );
}
