import Link from "next/link";
import { Notice } from "@/components/ui";
import { SignaturePad } from "@/components/signature-pad";
import { signWaiver } from "@/lib/actions/member";
import { isSupabaseAdminConfigured } from "@/lib/env";
import { readFlash } from "@/lib/flash";
import { renderMarkdown } from "@/lib/markdown";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Lap swim waiver" };

export default async function WaiverPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!viewer.person) {
    return (
      <section className="band">
        <div className="wrap">
          <Link href="/login?next=/lap-swim/waiver">Sign in</Link>
        </div>
      </section>
    );
  }
  const supabase = await createClient();
  const templates = supabase
    ? await supabase.from("waiver_templates").select("*").eq("key", "lap_adult").not("published_at", "is", null).order("version", { ascending: false }).limit(1)
    : { data: [] };
  const template = templates.data?.[0] as
    | { id: string; title: string; body_md: string; acknowledgements: string[] }
    | undefined;
  const signed = supabase
    ? await supabase.from("waiver_signatures").select("id, signed_at, revoked_at").eq("person_id", viewer.person.id).is("revoked_at", null)
    : { data: [] };

  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <div className="section-head">
          <p className="eyebrow">Waiver</p>
          <h2>Sign for this season</h2>
          <p>Your typed name, drawn signature, the time, and the IP address are stored with a PDF copy. Draft text is labeled until legal review.</p>
        </div>
        <Notice {...flash} />
        {(signed.data ?? []).length > 0 ? <p className="alert">You already have a signature on file.</p> : null}
        {!isSupabaseAdminConfigured() ? (
          <p className="alert error">The Supabase secret key is required before a signature can be stored with its PDF.</p>
        ) : null}
        {!template ? (
          <p>No published adult waiver yet. The Lap Swim VP publishes one from the admin console.</p>
        ) : (
          <form className="form card" action={signWaiver}>
            <h3>{template.title}</h3>
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(template.body_md) }} />
            <input type="hidden" name="template_id" value={template.id} />
            {(template.acknowledgements ?? []).map((ack, index) => (
              <label className="check" key={ack}>
                <input type="checkbox" name={`ack_${index}`} required />
                {ack}
              </label>
            ))}
            <label>
              Type your name ({viewer.person.first_name} {viewer.person.last_name})
              <input name="typed_name" required autoComplete="name" />
            </label>
            <SignaturePad />
            <button className="btn" type="submit">
              Sign waiver
            </button>
          </form>
        )}
        <p>
          <Link href="/lap-swim">Back to lanes</Link>
        </p>
      </div>
    </section>
  );
}
