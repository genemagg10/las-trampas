import Link from "next/link";
import { AGE_GROUPS, EVENTS, RECORDS_SOURCE, getSwimRecords } from "@/lib/features";
import { Seahorse } from "@/components/seahorse";

export const metadata = { title: "Team records" };

export default async function RecordsPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const { g } = await searchParams;
  const gender = g === "boys" ? "Boys" : "Girls";
  const { records } = await getSwimRecords();
  const mine = records.filter((r) => r.gender === gender && (r.kind ?? "team") === "team");
  const sources = [...new Set(records.map((r) => r.source_date).filter(Boolean))];

  return (
    <>
      <section className="band">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Las Trampas Seahorses</p>
            <h2>Team records</h2>
            <p>
              The fastest swims in Seahorses history, by age group and event. Source:{" "}
              <a href={RECORDS_SOURCE.url}>{RECORDS_SOURCE.label}</a>, retrieved {sources[0] ?? RECORDS_SOURCE.retrieved}.
            </p>
          </div>
          <nav className="tabs" aria-label="Gender">
            <Link href="/records?g=girls" className={gender === "Girls" ? "on" : ""}>
              Girls
            </Link>
            <Link href="/records?g=boys" className={gender === "Boys" ? "on" : ""}>
              Boys
            </Link>
          </nav>
          {EVENTS.map((event, eventIndex) => {
            const rows = mine.filter((r) => r.event === event).sort((a, b) => AGE_GROUPS.indexOf(a.age_group) - AGE_GROUPS.indexOf(b.age_group) || a.distance.localeCompare(b.distance));
            if (rows.length === 0) return null;
            return (
              <div key={event} style={{ marginBottom: "2rem" }}>
                {eventIndex === 1 ? (
                  <div className="records-divider">
                    <Seahorse id="records" size={16} />
                  </div>
                ) : null}
                <div className="section-head" style={{ marginBottom: "0.6rem" }}>
                  <p className="eyebrow">{gender}</p>
                  <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.6rem" }}>{event}</h3>
                </div>
                <div className="table-scroll">
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>Age group</th>
                        <th>Distance</th>
                        <th>Time</th>
                        <th>{event.includes("Relay") ? "Relay team" : "Swimmer"}</th>
                        <th>Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={`${r.age_group}-${r.distance}-${r.event}`}>
                          <td>{r.age_group}</td>
                          <td>{r.distance}</td>
                          <td className="time">{r.time_text}</td>
                          <td>
                            {r.swimmer}
                            {r.meet ? (
                              <>
                                <br />
                                <small>{r.meet}</small>
                              </>
                            ) : null}
                          </td>
                          <td>{r.year ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          <p className="card">
            Individual best times are kept in the league database (Acorn Swim) and are not republished here. See{" "}
            <a href="https://ltst.org">ltst.org</a> for meet results.
          </p>
        </div>
      </section>
    </>
  );
}
