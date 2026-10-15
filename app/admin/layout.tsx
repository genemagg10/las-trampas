import Link from "next/link";
import { getViewer } from "@/lib/viewer";

const links = [
  ["/admin", "Overview"],
  ["/admin/members", "Members"],
  ["/admin/roles", "Roles"],
  ["/admin/seasons", "Seasons & fees"],
  ["/admin/events", "Events"],
  ["/admin/slots", "Lanes"],
  ["/admin/waivers", "Waivers"],
  ["/admin/payments", "Payments"],
  ["/admin/announcements", "Updates"],
  ["/admin/photos", "Photos"],
  ["/admin/import", "Import"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Admin</p>
          <h2>Club console</h2>
          <p>
            {viewer.isAdmin
              ? "You have full admin access."
              : viewer.isBoard
                ? `Board scopes: ${viewer.scopes.join(", ") || "none yet"}.`
                : "Board and admin roles use this console."}
          </p>
        </div>
        <nav className="nav" style={{ marginBottom: "1.2rem" }}>
          {links.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </section>
  );
}
