import Link from "next/link";
import { notFound } from "next/navigation";
import { renderMarkdown } from "@/lib/markdown";
import { getDocument } from "@/lib/queries";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getDocument(id);
  if (!document && id !== "rules") notFound();
  const title = document ? String(document.title) : "Pool rules";
  const body = document
    ? String(document.body_md || "This document is a file in storage. Ask the secretary if you need the current PDF.")
    : "Las Trampas Pool is open to members from May through October.";
  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <p className="eyebrow">{document ? String(document.kind) : "rules"}</p>
        <h1>{title}</h1>
        <article className="card" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
        <p>
          <Link href="/documents">All documents</Link>
        </p>
      </div>
    </section>
  );
}
