import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Directory" };

export default async function DirectoryPage() {
  const viewer = await getViewer();
  if (!viewer.userId) {
    return (
      <section className="band">
        <div className="wrap">
          <h1>Directory</h1>
          <p>The directory is for members.</p>
          <Link href="/login?next=/directory">Sign in</Link>
        </div>
      </section>
    );
  }
  const supabase = await createClient();
  const result = supabase ? await supabase.rpc("directory_list") : { data: [], error: { message: "Database is not connected." } };
  const rows = (result.data ?? []) as {
    person_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    household_name: string | null;
    kind: string;
  }[];

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Directory</p>
          <h2>Members</h2>
          <p>Each person chooses what other members can see. Hidden fields stay blank. Change yours on your account page.</p>
        </div>
        {result.error ? <p className="alert error">{result.error.message}</p> : null}
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Household</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.person_id}>
                  <td>{[row.first_name, row.last_name].filter(Boolean).join(" ") || "Name hidden"}</td>
                  <td>{row.household_name || "—"}</td>
                  <td>{row.email || "—"}</td>
                  <td>{row.phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
