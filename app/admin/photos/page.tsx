import { Notice } from "@/components/ui";
import { moderatePhoto, saveAlbum, uploadPhoto } from "@/lib/actions/admin";
import { readFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";
import { can, getViewer } from "@/lib/viewer";

export const metadata = { title: "Admin photos" };

export default async function AdminPhotos({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!can(viewer, "photos") && !can(viewer, "communications")) return <p className="alert error">Photo access is required.</p>;
  const supabase = await createClient();
  const albums = supabase ? await supabase.from("albums").select("id, title, visibility") : { data: [] };
  const photos = supabase ? await supabase.from("photos").select("id, alt_text, status, public_ok, has_minors").order("created_at", { ascending: false }).limit(30) : { data: [] };

  return (
    <>
      <Notice {...flash} />
      <form className="form card" action={saveAlbum}>
        <h3>Album</h3>
        <label>
          Title
          <input name="title" required />
        </label>
        <label>
          Visibility
          <select name="visibility">
            <option value="members">Members</option>
            <option value="public">Public</option>
          </select>
        </label>
        <label>
          Season
          <input name="season" type="number" defaultValue={2027} />
        </label>
        <label>
          Description
          <textarea name="description" />
        </label>
        <button className="btn" type="submit">
          Create album
        </button>
      </form>
      <form className="form card" action={uploadPhoto}>
        <h3>Upload a real club photo</h3>
        <label>
          Album
          <select name="album_id" required>
            {(albums.data ?? []).map((album) => (
              <option key={String(album.id)} value={String(album.id)}>
                {String(album.title)}
              </option>
            ))}
          </select>
        </label>
        <label>
          File
          <input name="file" type="file" accept="image/*" required />
        </label>
        <label>
          Alt text
          <input name="alt_text" required placeholder="What is in the photo" />
        </label>
        <label>
          Storage visibility
          <select name="visibility">
            <option value="members">Members bucket</option>
            <option value="public">Public bucket</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" name="has_minors" /> Includes minors
        </label>
        <label className="check">
          <input type="checkbox" name="public_ok" /> Consent allows a public album
        </label>
        <button className="btn" type="submit">
          Upload
        </button>
      </form>
      {(photos.data ?? []).map((photo) => (
        <form key={String(photo.id)} action={moderatePhoto} className="slot">
          <div>
            {String(photo.alt_text)} · {String(photo.status)}
          </div>
          <input type="hidden" name="photo_id" value={String(photo.id)} />
          <input type="hidden" name="alt_text" value={String(photo.alt_text)} />
          <select name="status" defaultValue={String(photo.status)}>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <label className="check">
            <input type="checkbox" name="public_ok" defaultChecked={Boolean(photo.public_ok)} /> Public OK
          </label>
          <label className="check">
            <input type="checkbox" name="has_minors" defaultChecked={Boolean(photo.has_minors)} /> Minors
          </label>
          <button className="btn secondary" type="submit">
            Update
          </button>
        </form>
      ))}
    </>
  );
}
