import Link from "next/link";
import { Notice } from "@/components/ui";
import { formatDay, formatTime } from "@/lib/format";
import { getEvents } from "@/lib/queries";

export const metadata = { title: "Calendar" };

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string; view?: string; month?: string }>;
}) {
  const query = await searchParams;
  const flash = { notice: query.notice, error: query.error };
  const view = query.view === "list" ? "list" : "month";
  const events = (await getEvents()).filter((event) => event.published !== false);
  const anchor = query.month ? new Date(`${query.month}-01T12:00:00`) : new Date();
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: startPad + days }, (_, index) => (index < startPad ? null : index - startPad + 1));
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Calendar</p>
          <h2>Club calendar</h2>
          <p>Public events are visible to everyone. Member, team, and board events appear after you sign in, if your role includes them.</p>
        </div>
        <Notice {...flash} />
        <p style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Link className={view === "month" ? "btn" : "btn secondary"} href={`/calendar?view=month&month=${monthKey(anchor)}`}>
            Month
          </Link>
          <Link className={view === "list" ? "btn" : "btn secondary"} href={`/calendar?view=list&month=${monthKey(anchor)}`}>
            List
          </Link>
          <Link className="btn secondary" href={`/calendar?view=${view}&month=${monthKey(prev)}`}>
            Previous
          </Link>
          <Link className="btn secondary" href={`/calendar?view=${view}&month=${monthKey(next)}`}>
            Next
          </Link>
        </p>
        <h3>
          {anchor.toLocaleString("en-US", { month: "long", year: "numeric" })}
        </h3>
        {view === "list" ? (
          <div className="card">
            {events.length === 0 ? <p>No published events yet.</p> : null}
            <ul>
              {events.map((event) => (
                <li key={String(event.id)}>
                  <Link href={`/events/${event.id}`}>
                    {formatDay(String(event.starts_at))} {formatTime(String(event.starts_at))} · {String(event.title)}
                  </Link>
                  {event.audience_role ? <span className="badge muted"> {String(event.audience_role)}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="cal">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <strong key={label}>{label}</strong>
            ))}
            {cells.map((day, index) => {
              const dated = day ? events.filter((event) => new Date(String(event.starts_at)).getDate() === day && new Date(String(event.starts_at)).getMonth() === month) : [];
              return (
                <article key={index} className="card" style={{ minHeight: 110 }}>
                  <strong>{day ?? ""}</strong>
                  {dated.map((event) => (
                    <p key={String(event.id)} style={{ margin: "0.3rem 0" }}>
                      <Link href={`/events/${event.id}`}>{String(event.title)}</Link>
                    </p>
                  ))}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
