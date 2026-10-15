import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice, PhotoSlot, photos } from "@/components/ui";
import { cancelShift, rsvpEvent, takeShift } from "@/lib/actions/member";
import { readFlash } from "@/lib/flash";
import { formatWhen, money } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { getEvent } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { id } = await params;
  const flash = await readFlash(searchParams);
  const event = await getEvent(id);
  if (!event) notFound();
  const viewer = await getViewer();
  const supabase = await createClient();
  const shifts = supabase
    ? await supabase.from("volunteer_shifts").select("id, title, starts_at, ends_at, capacity, audience, counts_for_deposit").eq("event_id", id)
    : { data: [] };

  return (
    <section className="band">
      <div className="wrap">
        <PhotoSlot label={`Photo for ${event.title}`} photo={photos.poolDeck} />
        <div className="section-head" style={{ marginTop: "1rem" }}>
          <p className="eyebrow">{String(event.kind)}</p>
          <h2>{String(event.title)}</h2>
          <p>
            {formatWhen(String(event.starts_at))} · {String(event.location || "Las Trampas Pool")}
            {Number(event.price_cents) > 0 ? ` · ${money(Number(event.price_cents))} each` : " · free"}
          </p>
        </div>
        <Notice {...flash} />
        <article className="card" dangerouslySetInnerHTML={{ __html: renderMarkdown(String(event.description || event.summary || "")) }} />
        {viewer.household ? (
          <form className="form card" action={rsvpEvent} style={{ marginTop: "1rem" }}>
            <h3>RSVP</h3>
            <input type="hidden" name="event_id" value={id} />
            <label>
              Adults
              <input name="adults" type="number" min={0} defaultValue={1} />
            </label>
            <label>
              Kids
              <input name="kids" type="number" min={0} defaultValue={0} />
            </label>
            <button className="btn" type="submit">
              {Number(event.price_cents) > 0 ? "RSVP and pay" : "RSVP"}
            </button>
          </form>
        ) : (
          <p>
            <Link href={`/login?next=/events/${id}`}>Sign in to RSVP</Link>
          </p>
        )}
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3>Volunteer shifts</h3>
          {(shifts.data ?? []).length === 0 ? <p>No shifts on this event.</p> : null}
          {(shifts.data ?? []).map((shift) => (
            <article key={String(shift.id)} className="slot">
              <div>
                <strong>{String(shift.title)}</strong>
                <div>
                  {formatWhen(String(shift.starts_at))} · {String(shift.audience)}
                  {shift.counts_for_deposit ? " · counts toward the deposit" : ""}
                </div>
              </div>
              {viewer.person ? (
                <form action={takeShift}>
                  <input type="hidden" name="shift_id" value={String(shift.id)} />
                  <input type="hidden" name="event_id" value={id} />
                  <button className="btn secondary" type="submit">
                    Take shift
                  </button>
                </form>
              ) : null}
            </article>
          ))}
          {viewer.person ? (
            <form action={cancelShift} className="form" style={{ marginTop: "0.8rem" }}>
              <input type="hidden" name="event_id" value={id} />
              <label>
                Cancel a signup id
                <input name="signup_id" placeholder="From My schedule, if you need to cancel" />
              </label>
              <button className="btn secondary" type="submit">
                Cancel shift
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
