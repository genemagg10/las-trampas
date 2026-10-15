import Link from "next/link";

export default function NotFound() {
  return (
    <section className="band">
      <div className="wrap">
        <p className="eyebrow">Missing page</p>
        <h1>That page is not on the site.</h1>
        <p>
          <Link href="/">Back to the pool</Link>
        </p>
      </div>
    </section>
  );
}
