import Link from "next/link";
import { Seahorse } from "@/components/seahorse";

export default function NotFound() {
  return (
    <section className="band">
      <div className="wrap">
        <p className="eyebrow">Missing page</p>
        <h1>That page is not on the site.</h1>
        <p>
          Even the seahorse looked everywhere <Seahorse id="404" size={26} style={{ color: "var(--color-pool)", opacity: 0.45 }} />
        </p>
        <p>
          <Link href="/">Back to the pool</Link>
        </p>
      </div>
    </section>
  );
}
