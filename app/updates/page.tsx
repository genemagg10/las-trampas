import Link from "next/link";
import { formatDay } from "@/lib/format";
import { getPublicPosts } from "@/lib/queries";

export const metadata = { title: "Updates" };

export default async function UpdatesPage() {
  const posts = (await getPublicPosts()).filter((post) => !post.audience_role || true);
  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Updates</p>
          <h2>Latest updates and the monthly archive</h2>
          <p>Announcements and newsletters live here. Email is a notice that links back to the post.</p>
        </div>
        {posts.length === 0 ? (
          <p className="card">Nothing is published yet. The communications chair posts the first update from the admin console.</p>
        ) : (
          <div className="grid-2">
            {posts.map((post) => (
              <article key={String(post.id)} className="card">
                <p className="eyebrow">{post.kind === "monthly_update" ? "Monthly update" : "Announcement"}</p>
                <h3>
                  <Link href={`/updates/${post.slug}`}>{String(post.title)}</Link>
                </h3>
                <p>{post.publish_at ? formatDay(String(post.publish_at)) : "Draft"}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
