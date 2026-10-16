import Link from "next/link";
import { Notice } from "@/components/ui";
import { cancelByToken } from "@/lib/actions/lap";
import { formatWhen } from "@/lib/format";
import { readCancelToken } from "@/lib/lap/token";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Cancel lap swim", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CancelPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw);
  const flash = await searchParams;
  const id = readCancelToken(token);
  const admin = createAdminClient();
  const row = id && admin
    ? ((await admin.from("lap_bookings").select("status, lap_slots(starts_at)").eq("id", id).maybeSingle()).data as { status: string; lap_slots: { starts_at: string } | null } | null)
    : null;
  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 560 }}>
        <h1>Cancel lap swim</h1>
        <Notice notice={flash.notice} error={flash.error} />
        {!row ? (
          <p>This cancel link is not valid.</p>
        ) : row.status !== "booked" ? (
          <p>This half hour {row.lap_slots ? `(${formatWhen(row.lap_slots.starts_at)})` : ""} is already {row.status}.</p>
        ) : (
          <form action={cancelByToken} className="card">
            <p>Cancel your lap swim at {row.lap_slots ? formatWhen(row.lap_slots.starts_at) : "this time"}? The others in that half hour will be told.</p>
            <input type="hidden" name="token" value={token} />
            <button className="btn" type="submit">Yes, cancel</button>
          </form>
        )}
        <p><Link href="/lap-swim">Lap swim</Link></p>
      </div>
    </section>
  );
}
