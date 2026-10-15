import Link from "next/link";
import { serviceStatus } from "@/lib/env";

export function PhotoSlot({
  label,
  ratio = "video",
}: {
  label: string;
  ratio?: "video" | "card" | "square";
}) {
  return (
    <div className={`photo-slot ratio-${ratio}`} role="img" aria-label={`${label}. Real Las Trampas photo not added yet.`}>
      <span>{label}</span>
      <small>Photo slot — add a real Las Trampas picture before launch</small>
    </div>
  );
}

export function Section({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {summary ? <p>{summary}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

export function Badge({ tone = "pool", children }: { tone?: "pool" | "sun" | "lawn" | "muted" | "coral"; children: React.ReactNode }) {
  return <span className={`badge ${tone === "pool" ? "" : tone}`}>{children}</span>;
}

export function Notice({ notice, error }: { notice?: string; error?: string }) {
  if (!notice && !error) return null;
  return <p className={error ? "alert error" : "alert"}>{error || notice}</p>;
}

export function ServiceBanner() {
  const status = serviceStatus();
  const missing = [
    !status.supabase ? "member database" : null,
    !status.stripe ? "payments" : null,
    !status.resend ? "email" : null,
  ].filter(Boolean);
  if (missing.length === 0) return null;
  return (
    <div className="banner">
      <div className="wrap">
        <p>
          Setup still open: {missing.join(", ")} {missing.length === 1 ? "is" : "are"} not connected. The site stays usable, and those
          features show a notice instead of failing. See docs/SETUP.md.
        </p>
      </div>
    </div>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="wordmark">
      <span className="mark-slot" title="Official Seahorse mark slot">LT</span>
      <span>
        <strong>Las Trampas</strong>
        <em>Pool</em>
      </span>
    </Link>
  );
}

export const publicNav = [
  ["/membership", "Membership"],
  ["/programs", "Programs"],
  ["/calendar", "Calendar"],
  ["/updates", "Updates"],
  ["/about", "About"],
  ["/contact", "Contact"],
] as const;

export const memberNav = [
  ["/home", "My summer"],
  ["/schedule", "Schedule"],
  ["/lap-swim", "Lap swim"],
  ["/events", "Events"],
  ["/dues", "Dues"],
  ["/photos", "Photos"],
  ["/directory", "Directory"],
  ["/documents", "Documents"],
  ["/account", "Account"],
] as const;
