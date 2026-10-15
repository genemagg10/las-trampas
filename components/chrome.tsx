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
        <div>
          <strong>Las Trampas Pool</strong>
          <p>Member-owned swim club in Burton Valley, Lafayette, California. Open May through October.</p>
        </div>
        <div>
          <p>
            <Link href="/membership">Membership</Link>
            <br />
            <Link href="/programs">Programs</Link>
            <br />
            <Link href="/calendar">Calendar</Link>
            <br />
            <Link href="/contact">Contact the board</Link>
          </p>
        </div>
        <div>
          <p>
            Swim team: <a href="https://ltst.org">Las Trampas Seahorses</a>
            <br />
            The official Seahorse mark is reserved until the swim team grants permission to use the file.
          </p>
        </div>
      </div>
    </footer>
  );
}
