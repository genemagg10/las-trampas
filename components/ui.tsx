import Image from "next/image";
import Link from "next/link";
import { serviceStatus } from "@/lib/env";

export const photos = {
  poolDeck: { src: "/photos/pool-deck.jpg", alt: "The Las Trampas lap pool on a sunny day, with lane lines, lounge chairs, umbrellas and the lifeguard chair" },
  poolDeckCard: { src: "/photos/pool-deck-card.jpg", alt: "Lounge chairs and lane lines along the Las Trampas pool deck" },
  lapLanes: { src: "/photos/lap-lanes.jpg", alt: "Six lap lanes with lane lines at Las Trampas Pool" },
  history1958: { src: "/photos/history-1958-swimmers.jpg", alt: "Swimmers in the pool on opening day, August 17, 1958" },
  historyCrowd: { src: "/photos/history-opening-day-crowd.jpg", alt: "The opening-day crowd on the pool deck in 1958" },
  historyDeck: { src: "/photos/history-pool-deck.jpg", alt: "The new pool and bathhouse in the club's early years" },
  historyWading: { src: "/photos/history-wading-pool.jpg", alt: "The wading pool and main pool in the club's early years" },
  seahorses: { src: "/photos/seahorses-mural.jpg", alt: "Las Trampas Seahorses coaches in front of the Seahorses mural" },
} as const;

export function Photo({
  src,
  alt,
  ratio = "video",
  caption,
  priority = false,
}: {
  src: string;
  alt: string;
  ratio?: "video" | "card" | "square" | "wide";
  caption?: string;
  priority?: boolean;
}) {
  return (
    <figure className={`photo ratio-${ratio}`}>
      <Image src={src} alt={alt} fill priority={priority} sizes="(max-width: 760px) 100vw, 50vw" />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

export function PhotoSlot({
  label,
  ratio = "video",
  photo,
}: {
  label: string;
  ratio?: "video" | "card" | "square";
  photo?: { src: string; alt: string };
}) {
  if (photo) return <Photo src={photo.src} alt={photo.alt} ratio={ratio} />;
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
      <Image className="mark" src="/brand/lt-seahorse-sm.png" alt="Las Trampas seahorse logo" width={34} height={44} priority />
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
