import { Notice } from "@/components/ui";
import { savePost } from "@/lib/actions/admin";
import { readFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";
import { can, getViewer } from "@/lib/viewer";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!can(viewer, "communications")) return <p className="alert error">Communications access is required.</p>;
  const supabase = await createClient();
  const posts = supabase ? await supabase.from("posts").select("id, title, kind, publish_at, emailed_at").order("created_at", { ascending: false }).limit(20) : { data: [] };

  return (
    <>
      <Notice {...flash} />
      <form className="form card" action={savePost}>
        <h3>Update</h3>
        <label>
          Kind
          <select name="kind">
            <option value="announcement">Announcement</option>
            <option value="monthly_update">Monthly update</option>
          </select>
        </label>
        <label>
          Title
          <input name="title" required />
        </label>
        <label>
          Slug
          <input name="slug" placeholder="optional" />
        </label>
        <label>
          Body
          <textarea name="body_md" required />
        </label>
        <label>
          Audience role (blank = public)
          <input name="audience_role" />
        </label>
        <label className="check">
          <input type="checkbox" name="publish" defaultChecked /> Publish on the site
        </label>
        <label className="check">
          <input type="checkbox" name="email" /> Email members who opted in
        </label>
        <button className="btn" type="submit">
          Save
        </button>
      </form>
      <ul>
        {(posts.data ?? []).map((post) => (
          <li key={String(post.id)}>
            {String(post.title)} · {post.publish_at ? "published" : "draft"} {post.emailed_at ? "· emailed" : ""}
          </li>
        ))}
      </ul>
    </>
  );
}
