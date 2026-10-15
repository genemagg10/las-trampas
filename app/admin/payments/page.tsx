import { Notice } from "@/components/ui";
import { refundOrder } from "@/lib/actions/admin";
import { readFlash } from "@/lib/flash";
import { money, formatWhen } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { can, getViewer } from "@/lib/viewer";

export const metadata = { title: "Admin payments" };

export default async function AdminPayments({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!can(viewer, "treasurer")) return <p className="alert error">Treasurer access is required.</p>;
  const supabase = await createClient();
  const orders = supabase
    ? await supabase.from("orders").select("id, purpose, status, total_cents, created_at, household_id").order("created_at", { ascending: false }).limit(50)
    : { data: [] };
  const deposits = supabase ? await supabase.from("deposit_ledger").select("*").limit(50) : { data: [] };

  return (
    <>
      <Notice {...flash} />
      <p>
        <a href="/api/admin/export?kind=payments">Download payments CSV</a>
      </p>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Purpose</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Refund</th>
            </tr>
          </thead>
          <tbody>
            {(orders.data ?? []).map((order) => (
              <tr key={String(order.id)}>
                <td>{formatWhen(String(order.created_at))}</td>
                <td>{String(order.purpose)}</td>
                <td>{money(Number(order.total_cents))}</td>
                <td>{String(order.status)}</td>
                <td>
                  <form action={refundOrder}>
                    <input type="hidden" name="order_id" value={String(order.id)} />
                    <input name="amount_cents" type="number" defaultValue={Number(order.total_cents)} />
                    <input name="reason" placeholder="Reason" />
                    <button className="btn secondary" type="submit">
                      Refund
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Volunteer deposits</h3>
      <ul>
        {(deposits.data ?? []).map((row) => (
          <li key={String(row.household_id)}>
            Household {String(row.household_id)} · paid {money(Number(row.paid_cents))} · earned {String(row.credit_units_earned)}/{String(row.credit_units_required)} · {String(row.status)}
          </li>
        ))}
      </ul>
    </>
  );
}
