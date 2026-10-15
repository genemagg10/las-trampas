import Link from "next/link";
import { getDocuments } from "@/lib/queries";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const documents = await getDocuments();
  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Documents</p>
          <h2>Bylaws, handbook, and rules</h2>
          <p>Members see the handbook and bylaws. Everyone can read documents marked public. Placeholders stay until the secretary pastes the real text.</p>
        </div>
        <div className="grid-2">
          {documents.map((doc) => (
            <article key={String(doc.id)} className="card">
              <p className="eyebrow">{String(doc.kind)} · {String(doc.visibility || "public")}</p>
              <h3>
                <Link href={`/documents/${doc.id}`}>{String(doc.title)}</Link>
              </h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
