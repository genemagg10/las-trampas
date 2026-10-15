import Link from "next/link";
import { formatWhen } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Swim team" };

export default async function TeamPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const events = viewer.isTeam && supabase
    ? await supabase.from("events").select("id, title, starts_at, location").eq("kind", "swim_team").eq("published", true).order("starts_at")
    : { data: [] };
  const shifts = viewer.isTeam && supabase
    ? await supabase.from("volunteer_shifts").select("id, title, starts_at, audience, events(title)").eq("audience", "swim_team")
    : { data: [] };

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Las Trampas Seahorses</p>
          <h2>Team schedule and jobs</h2>
          <p>
            The team site stays at <a href="https://ltst.org">ltst.org</a> until the Seahorses board decides to host more of it here. The official
            mark is not shown until they provide the file.
          </p>
        </div>
        {!viewer.isTeam ? (
          <p className="card">
            This page is for households the team has registered. {viewer.userId ? "Your login does not have swim-team access yet." : <Link href="/login?next=/team">Sign in</Link>}
          </p>
        ) : (
          <div className="grid-2">
            <article className="card">
              <h3>Schedule</h3>
              <ul>
                {(events.data ?? []).map((event) => (
                  <li key={String(event.id)}>
                    <Link href={`/events/${event.id}`}>
                      {formatWhen(String(event.starts_at))} · {String(event.title)}
                    </Link>
                  </li>
                ))}
              </ul>
              {(events.data ?? []).length === 0 ? <p>No team events are published.</p> : null}
            </article>
            <article className="card">
              <h3>Volunteer jobs</h3>
              <ul>
                {(shifts.data ?? []).map((shift) => (
                  <li key={String(shift.id)}>
                    {formatWhen(String(shift.starts_at))} · {String(shift.title)}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}
