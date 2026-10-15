import Link from "next/link";
import { supabaseUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Photos" };

export default async function PhotosPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const albums = supabase ? await supabase.from("albums").select("id, title, visibility, description, season").order("created_at", { ascending: false }) : { data: [] };
  const photos = supabase
    ? await supabase.from("photos").select("id, album_id, storage_path, alt_text, status, public_ok, has_minors").eq("status", "approved").limit(24)
    : { data: [] };

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Photos</p>
          <h2>Albums</h2>
          <p>Admins upload real club photos. Public albums hide pictures of minors and anything without a public-consent flag.</p>
        </div>
        {!viewer.userId ? <p>Member albums appear after you sign in. Public albums are listed for everyone.</p> : null}
        <div className="grid-2">
          {(albums.data ?? []).map((album) => (
            <article key={String(album.id)} className="card">
              <p className="eyebrow">{String(album.visibility)}</p>
              <h3>
                <Link href={`/photos/${album.id}`}>{String(album.title)}</Link>
              </h3>
              <p>{String(album.description || "")}</p>
            </article>
          ))}
        </div>
        {(albums.data ?? []).length === 0 ? <p>No albums yet. The photo slot on the public pages stays empty until real pictures are added.</p> : null}
        <div className="grid-3" style={{ marginTop: "1rem" }}>
          {(photos.data ?? []).map((photo) => {
            const album = (albums.data ?? []).find((item) => item.id === photo.album_id);
            const isPublic = album?.visibility === "public" && photo.public_ok && !photo.has_minors;
            const src = isPublic ? `${supabaseUrl()}/storage/v1/object/public/photos-public/${photo.storage_path}` : "";
            return src ? (
              // Real uploaded club photos only. No stock is committed.
              // eslint-disable-next-line @next/next/no-img-element
              <img key={String(photo.id)} src={src} alt={String(photo.alt_text || "Las Trampas Pool")} style={{ width: "100%", borderRadius: 16 }} />
            ) : (
              <div key={String(photo.id)} className="photo-slot ratio-card">
                <span>{String(photo.alt_text || "Member photo")}</span>
                <small>Open the album while signed in to view it.</small>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
