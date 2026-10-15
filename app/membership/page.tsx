import Link from "next/link";
import { Notice, PhotoSlot } from "@/components/ui";
import { readFlash } from "@/lib/flash";
import { money } from "@/lib/format";
import { getPrices, getSeason } from "@/lib/queries";
import { isStripeConfigured } from "@/lib/env";

export const metadata = { title: "Membership & fees" };

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const [prices, season] = await Promise.all([getPrices(), getSeason()]);
  return (
    <section className="band">
      <div className="wrap">
        <div className="grid-2" style={{ alignItems: "center", marginBottom: "2rem" }}>
          <div className="section-head">
            <p className="eyebrow">Membership</p>
            <h2>Fees for the season</h2>
            <p>
              {season
                ? `${season.name}. Renewal deadline ${season.renewal_deadline}. These amounts are the working fee schedule until the board confirms them.`
                : "Working 2027 figures. The live fee schedule replaces these once the database is connected."}
            </p>
          </div>
          <PhotoSlot label="The lawn and the pool" />
        </div>
        <Notice {...flash} />
        {!isStripeConfigured() ? (
          <p className="alert">Online payment is turned off until the treasurer connects Stripe. You can still read the fees.</p>
        ) : null}
        <div className="card" style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Fee</th>
                <th>Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((price) => (
                <tr key={price.item}>
                  <td>{price.label}</td>
                  <td>{money(price.amount_cents)}</td>
                  <td>{price.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid-2" style={{ marginTop: "1.5rem" }}>
          <article className="card">
            <h3>Current households</h3>
            <p>Sign in and renew from Dues. Bank transfer (ACH) is offered alongside card. A processing ACH payment can grant membership until it settles, then a failure removes it.</p>
            <Link className="btn" href="/login?next=/dues">
              Sign in to renew
            </Link>
          </article>
          <article className="card">
            <h3>Waitlist</h3>
            <p>New families apply here. The membership chair invites the next household; the new-member fee is paid in the same account.</p>
            <Link className="btn secondary" href="/join">
              Apply for the waitlist
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
