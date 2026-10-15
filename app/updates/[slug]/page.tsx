import Link from "next/link";
import { notFound } from "next/navigation";
import { renderMarkdown } from "@/lib/markdown";
import { formatDay } from "@/lib/format";
import { getPost } from "@/lib/queries";

export default async function UpdatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || !post.publish_at) notFound();
  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <p className="eyebrow">{post.kind === "monthly_update" ? "Monthly update" : "Announcement"}</p>
        <h1>{String(post.title)}</h1>
        <p>{formatDay(String(post.publish_at))}</p>
        <article className="card" dangerouslySetInnerHTML={{ __html: renderMarkdown(String(post.body_md || "")) }} />
        <p>
          <Link href="/updates">All updates</Link>
        </p>
      </div>
    </section>
  );
}
