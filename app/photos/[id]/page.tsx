import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: album } = await supabase.from("albums").select("*").eq("id", id).maybeSingle();
  if (!album) notFound();
  const { data: photos } = await supabase.from("photos").select("*").eq("album_id", id).eq("status", "approved");
  const admin = createAdminClient();

  const rendered = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const isPublic = album.visibility === "public" && photo.public_ok && !photo.has_minors;
      if (isPublic) {
        return { id: photo.id, alt: photo.alt_text, src: `${supabaseUrl()}/storage/v1/object/public/photos-public/${photo.storage_path}` };
      }
      if (!admin) return { id: photo.id, alt: photo.alt_text, src: "" };
      const bucket = album.visibility === "public" ? "photos-public" : "photos-members";
      const signed = await admin.storage.from(bucket).createSignedUrl(String(photo.storage_path), 60 * 30);
      return { id: photo.id, alt: photo.alt_text, src: signed.data?.signedUrl || "" };
    }),
  );

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">{String(album.visibility)} album</p>
          <h2>{String(album.title)}</h2>
          <p>{String(album.description || "")}</p>
        </div>
        <div className="grid-3">
          {rendered.map((photo) =>
            photo.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={String(photo.id)} src={photo.src} alt={String(photo.alt || "Las Trampas Pool")} style={{ width: "100%", borderRadius: 16 }} />
            ) : (
              <div key={String(photo.id)} className="photo-slot ratio-card">
                <span>{String(photo.alt || "Photo")}</span>
                <small>The storage key is required to show member photos.</small>
              </div>
            ),
          )}
        </div>
        <p>
          <Link href="/photos">All albums</Link>
        </p>
      </div>
    </section>
  );
}
