import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import { can, getViewer } from "@/lib/viewer";

export async function GET(request: Request) {
  const viewer = await getViewer();
  const kind = new URL(request.url).searchParams.get("kind") || "members";
  const allowed =
    (kind === "payments" && can(viewer, "treasurer")) ||
    ((kind === "members" || kind === "bookings") && (can(viewer, "membership") || can(viewer, "lap") || viewer.isAdmin));
  if (!viewer.userId || !allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "database_disabled" }, { status: 503 });

  if (kind === "payments") {
    const { data, error } = await supabase.from("orders").select("id, purpose, status, total_cents, season, created_at, household_id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const csv = toCsv(
      ["id", "household_id", "purpose", "status", "total_cents", "season", "created_at"],
      (data ?? []).map((row) => [row.id, row.household_id, row.purpose, row.status, String(row.total_cents), String(row.season ?? ""), row.created_at].map(String)),
    );
    return csvResponse(csv, "payments.csv");
  }

  if (kind === "bookings") {
    const { data, error } = await supabase.from("lap_bookings").select("id, person_id, slot_id, status, created_at");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const csv = toCsv(
      ["id", "person_id", "slot_id", "status", "created_at"],
      (data ?? []).map((row) => [row.id, row.person_id, row.slot_id, row.status, row.created_at].map(String)),
    );
    return csvResponse(csv, "bookings.csv");
  }

  const { data, error } = await supabase.from("people").select("first_name, last_name, email, phone, kind, household_id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const csv = toCsv(
    ["first_name", "last_name", "email", "phone", "kind", "household_id"],
    (data ?? []).map((row) => [row.first_name, row.last_name, row.email, row.phone, row.kind, row.household_id].map((value) => String(value ?? ""))),
  );
  return csvResponse(csv, "members.csv");
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
