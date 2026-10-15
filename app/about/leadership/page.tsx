import Link from "next/link";
import { boardRoles } from "@/lib/fees";
import { getBoardPositions } from "@/lib/queries";

export const metadata = { title: "Leadership" };

export default async function LeadershipPage() {
  const positions = await getBoardPositions();
  const rows =
    positions.length > 0
      ? positions.map((row) => ({
          key: String(row.key),
          label: String(row.label),
          inbox: (row.inbox_address as string | null) ?? null,
        }))
      : boardRoles.map((role) => ({ key: role.key, label: role.label, inbox: null }));

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Leadership</p>
          <h2>The board</h2>
          <p>Names are published by the board. Until then, this page lists the offices and how to reach them.</p>
        </div>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Office</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td>
                    {row.inbox ? (
                      <a href={`mailto:${row.inbox}`}>{row.inbox}</a>
                    ) : (
                      <Link href={`/contact?to=${row.key}`}>Send a message</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
