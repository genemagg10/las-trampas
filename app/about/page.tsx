import Link from "next/link";
import { PhotoSlot } from "@/components/ui";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <section className="band">
      <div className="wrap grid-2" style={{ alignItems: "center" }}>
        <div>
          <div className="section-head">
            <p className="eyebrow">About</p>
            <h2>A member-owned pool in Burton Valley</h2>
            <p>
              Las Trampas Pool is in Lafayette, California. Members have run it since 1958. The season runs from May through October. About 216
              households belong.
            </p>
          </div>
          <p>The copy on this page is a short public introduction. The board can replace it with the club’s own history and description.</p>
          <p>
            <Link href="/about/history">History</Link> · <Link href="/about/leadership">Leadership</Link> · <Link href="/contact">Contact</Link>
          </p>
        </div>
        <PhotoSlot label="The pool from the deck" />
      </div>
    </section>
  );
}
