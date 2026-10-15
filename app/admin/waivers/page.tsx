import { Notice } from "@/components/ui";
import { publishWaiver, revokeWaiver } from "@/lib/actions/admin";
import { readFlash } from "@/lib/flash";
import { formatWhen } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { can, getViewer } from "@/lib/viewer";

export const metadata = { title: "Waivers" };

export default async function WaiversAdmin({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!can(viewer, "lap")) return <p className="alert error">Lap swim access is required.</p>;
  const supabase = await createClient();
  const templates = supabase ? await supabase.from("waiver_templates").select("id, title, key, published_at, body_md").order("version", { ascending: false }) : { data: [] };
  const signatures = supabase
    ? await supabase.from("waiver_signatures").select("id, typed_name, signed_at, revoked_at, person_id").order("signed_at", { ascending: false }).limit(40)
    : { data: [] };

  return (
    <>
      <Notice {...flash} />
      <p className="alert">The seeded adult waiver is a draft. Replace the text after legal review, then publish.</p>
      {(templates.data ?? []).map((template) => (
        <form key={String(template.id)} className="form card" action={publishWaiver}>
          <h3>
            {String(template.title)} {template.published_at ? "· published" : "· unpublished"}
          </h3>
          <input type="hidden" name="template_id" value={String(template.id)} />
          <textarea name="body_md" defaultValue={String(template.body_md || "")} />
          <button className="btn" type="submit">
            Publish this text
          </button>
        </form>
      ))}
      <h3>Signatures</h3>
      {(signatures.data ?? []).map((row) => (
        <form key={String(row.id)} action={revokeWaiver} className="slot">
          <div>
            {String(row.typed_name)} · {formatWhen(String(row.signed_at))} {row.revoked_at ? "· revoked" : ""}
          </div>
          <input type="hidden" name="signature_id" value={String(row.id)} />
          <input name="reason" placeholder="Reason" />
          <button className="btn coral" type="submit" disabled={Boolean(row.revoked_at)}>
            Revoke
          </button>
        </form>
      ))}
    </>
  );
}
