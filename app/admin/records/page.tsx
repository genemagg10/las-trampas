import { Notice } from "@/components/ui";
import { saveRecord } from "@/lib/actions/features";
import { getSwimRecords } from "@/lib/features";
import { readFlash } from "@/lib/flash";
import { can, getViewer } from "@/lib/viewer";

export const metadata = { title: "Admin records" };

const fields: [string, string][] = [
  ["gender", "Gender (Girls/Boys/Mixed)"],
  ["age_group", "Age group"],
  ["distance", "Distance"],
  ["event", "Event"],
  ["swimmer", "Swimmer or relay"],
  ["time_text", "Time"],
  ["year", "Year"],
  ["meet", "Meet"],
  ["source_url", "Source URL"],
  ["source_date", "Source date (YYYY-MM-DD)"],
];

export default async function AdminRecords({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!can(viewer, "team")) return <p className="alert error">Swim team access is required.</p>;
  const { records, fromSeed } = await getSwimRecords();
  const blank = { id: "", gender: "", age_group: "", distance: "", event: "", swimmer: "", time_text: "", year: null, meet: null, source_url: null, source_date: null };
  return (
    <>
      <Notice {...flash} />
      {fromSeed ? <p className="alert error">Records are showing the bundled seed. Run the pool features migration to edit them.</p> : null}
      <details className="card" open>
        <summary>Add a record</summary>
        <RecordForm record={blank} />
      </details>
      {records.map((r, i) => (
        <details key={r.id || i} className="card">
          <summary>
            {r.gender} {r.age_group} {r.distance} {r.event} · {r.time_text} · {r.swimmer}
          </summary>
          <RecordForm record={r} />
        </details>
      ))}
    </>
  );
}

function RecordForm({ record }: { record: Record<string, unknown> }) {
  return (
    <form action={saveRecord} className="form">
      <input type="hidden" name="id" value={String(record.id ?? "")} />
      {fields.map(([name, label]) => (
        <label key={name}>
          {label}
          <input name={name} defaultValue={record[name] == null ? "" : String(record[name])} />
        </label>
      ))}
      <button className="btn" type="submit">
        Save
      </button>
      {record.id ? (
        <button className="btn secondary" type="submit" name="do" value="delete">
          Remove
        </button>
      ) : null}
    </form>
  );
}
