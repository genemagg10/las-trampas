import Link from "next/link";
import { Notice } from "@/components/ui";
import { startDuesCheckout } from "@/lib/actions/member";
import { isStripeConfigured } from "@/lib/env";
import { readFlash } from "@/lib/flash";
import { money } from "@/lib/format";
import { getPrices, getSeason } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Dues" };

export default async function DuesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  const [prices, season] = await Promise.all([getPrices(), getSeason()]);
  const byItem = new Map(prices.map((price) => [price.item, price]));
  const late = season?.late_after ? new Date() > new Date(String(season.late_after)) : false;
  const renewal = byItem.get(late ? "renewal_late" : "renewal");
  const deposit = byItem.get("volunteer_deposit");
  const renewalItems = [renewal, deposit].filter(Boolean).map((price) => ({
    price_item: price!.item,
    description: price!.label,
    quantity: 1,
    amount_cents: price!.amount_cents,
    ref_id: null,
  }));
  const supabase = await createClient();
  const ledger = viewer.household && supabase
    ? await supabase.from("deposit_ledger").select("*").eq("household_id", viewer.household.id).maybeSingle()
    : { data: null };

  function pay(purpose: string, itemKey: string) {
    const price = byItem.get(itemKey);
    if (!price) return null;
    const items = [{ price_item: price.item, description: price.label, quantity: 1, amount_cents: price.amount_cents, ref_id: null }];
    if (itemKey === "new_member" && byItem.get("new_member_deposit")) {
      const extra = byItem.get("new_member_deposit")!;
      items.push({ price_item: extra.item, description: extra.label, quantity: 1, amount_cents: extra.amount_cents, ref_id: null });
    }
    return (
      <form action={startDuesCheckout}>
        <input type="hidden" name="purpose" value={purpose} />
        <input type="hidden" name="items" value={JSON.stringify(items)} />
        <button className="btn" type="submit" disabled={!viewer.userId || !isStripeConfigured()}>
          Pay {money(items.reduce((sum, item) => sum + item.amount_cents, 0))}
        </button>
      </form>
    );
  }

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Dues</p>
          <h2>Renew, join, or pay a deposit</h2>
          <p>
            {season ? `${season.name}. Renewal deadline ${season.renewal_deadline}.` : "Connect the database to load the live season."} Amounts come
            from the fee schedule.
          </p>
        </div>
        <Notice {...flash} />
        {!isStripeConfigured() ? <p className="alert">Payments are turned off until Stripe is connected.</p> : null}
        {!viewer.userId ? (
          <p>
            <Link href="/login?next=/dues">Sign in to pay</Link>
          </p>
        ) : null}
        <div className="grid-2">
          <article className="card">
            <h3>{late ? "Late renewal" : "Renewal"}</h3>
            <p>Household dues{deposit ? " plus the volunteer deposit" : ""}.</p>
            <form action={startDuesCheckout}>
              <input type="hidden" name="purpose" value={late ? "renewal" : "renewal"} />
              <input type="hidden" name="items" value={JSON.stringify(renewalItems)} />
              <button className="btn" type="submit" disabled={!viewer.userId || !isStripeConfigured()}>
                Pay {money(renewalItems.reduce((sum, item) => sum + item.amount_cents, 0))}
              </button>
            </form>
          </article>
          <article className="card">
            <h3>New member</h3>
            <p>Available after the membership chair invites your waitlist application.</p>
            {pay("new_member", "new_member")}
          </article>
          <article className="card">
            <h3>Lap-swim-only</h3>
            <p>Invitation only. {viewer.household?.lap_only_invited ? "Your household is invited." : "The membership chair marks an invitation first."}</p>
            {pay("lap_only", "lap_only")}
          </article>
          <article className="card">
            <h3>Volunteer deposit</h3>
            {ledger.data ? (
              <p>
                Paid {money(Number(ledger.data.paid_cents))} · earned {String(ledger.data.credit_units_earned)} of {String(ledger.data.credit_units_required)} · {String(ledger.data.status)}
              </p>
            ) : (
              <p>No deposit is on the ledger yet.</p>
            )}
            {pay("volunteer_deposit", "volunteer_deposit")}
          </article>
        </div>
        <p>
          <Link href="/account/payments">Receipts</Link> · <Link href="/join">Waitlist</Link>
        </p>
      </div>
    </section>
  );
}
