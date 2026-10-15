import { Notice } from "@/components/ui";
import { importMembers } from "@/lib/actions/admin";
import { readFlash } from "@/lib/flash";
import { can, getViewer } from "@/lib/viewer";

export const metadata = { title: "Import members" };

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!can(viewer, "membership")) return <p className="alert error">Membership access is required.</p>;
  return (
    <>
      <Notice {...flash} />
      <div className="card">
        <h3>CSV import</h3>
        <p>
          Use an export from Membership Toolkit or SignUpGenius. Required columns: first name, last name. Optional: household, email, phone, kind
          (adult, teen, child), birth year, membership type, status. Existing emails are skipped. This never runs from a file committed to git.
        </p>
        <p>
          A sample header file for practice is in <code>fixtures/members.sample.csv</code>. It is fictional.
        </p>
        <form className="form" action={importMembers}>
          <label>
            Season for membership grants
            <input name="season" type="number" defaultValue={2027} />
          </label>
          <label>
            CSV file
            <input name="file" type="file" accept=".csv,text/csv" required />
          </label>
          <button className="btn" type="submit">
            Import
          </button>
        </form>
      </div>
    </>
  );
}
