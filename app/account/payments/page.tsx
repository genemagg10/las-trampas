import Link from "next/link";
import { Notice } from "@/components/ui";
import { readFlash } from "@/lib/flash";
import { money, formatWhen } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Payments" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!viewer.household) {
    return (
      <section className="band">
        <div className="wrap">
          <Link href="/login?next=/account/payments">Sign in</Link>
        </div>
      </section>
    );
  }
  const supabase = await createClient();
  const orders = supabase
    ? await supabase
        .from("orders")
        .select("id, purpose, status, total_cents, receipt_url, created_at, order_items(description, amount_cents)")
        .eq("household_id", viewer.household.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Receipts</p>
          <h2>Household payments</h2>
          <p>Receipts stay on this page. Email only points you back here.</p>
        </div>
        <Notice {...flash} />
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>What</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(orders.data ?? []).map((order) => (
                <tr key={String(order.id)}>
                  <td>{formatWhen(String(order.created_at))}</td>
                  <td>
                    {String(order.purpose)}
                    <br />
                    {((order.order_items as { description: string }[]) ?? []).map((item) => item.description).join(", ")}
                    {order.receipt_url ? (
                      <>
                        <br />
                        <a href={String(order.receipt_url)}>Stripe receipt</a>
                      </>
                    ) : null}
                  </td>
                  <td>{money(Number(order.total_cents))}</td>
                  <td>{String(order.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(orders.data ?? []).length === 0 ? <p>No payments yet.</p> : null}
        </div>
        <p>
          <Link href="/dues">Dues and renewals</Link>
        </p>
      </div>
    </section>
  );
}
