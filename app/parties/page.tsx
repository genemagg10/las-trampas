import Link from "next/link";
import { Notice } from "@/components/ui";
import { requestParty } from "@/lib/actions/member";
import { readFlash } from "@/lib/flash";
import { formatWhen, money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Parties" };

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  const supabase = await createClient();
  const slots = supabase ? await supabase.from("party_slots").select("*").order("starts_at") : { data: [] };
  const mine = viewer.household && supabase
    ? await supabase.from("party_reservations").select("id, status, slot_id").eq("household_id", viewer.household.id)
    : { data: [] };

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Parties</p>
          <h2>Reserve a party time</h2>
          <p>Full members can request an open time. Social approves it. Lap-only memberships cannot reserve a party.</p>
        </div>
        <Notice {...flash} />
        {!viewer.userId ? <Link href="/login?next=/parties">Sign in</Link> : null}
        {(slots.data ?? []).length === 0 ? <p>No party times are open. Social adds them in the admin console.</p> : null}
        <div className="lane-grid">
          {(slots.data ?? []).map((slot) => (
            <article key={String(slot.id)} className="slot">
              <div>
                <strong>{String(slot.area)}</strong>
                <div>
                  {formatWhen(String(slot.starts_at))} · {money(Number(slot.fee_cents))}
                </div>
              </div>
              {viewer.household ? (
                <form action={requestParty}>
                  <input type="hidden" name="slot_id" value={String(slot.id)} />
                  <input name="notes" placeholder="Head count, notes" />
                  <button className="btn" type="submit">
                    Request
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
        {(mine.data ?? []).length > 0 ? (
          <p>
            Your requests: {(mine.data ?? []).map((row) => `${row.status}`).join(", ")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
