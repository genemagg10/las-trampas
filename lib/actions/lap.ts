"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkCaps, isLateCancel, pickRun, strikeStatus } from "@/lib/lap/rules";
import { loadBoard, loadPolicy, loadStrikes } from "@/lib/lap/server";
import { readCancelToken } from "@/lib/lap/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { can, getViewer } from "@/lib/viewer";

function go(path: string, key: "notice" | "error", message: string, extra = ""): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}${extra}`);
}

async function db() {
  const client = await createClient();
  if (!client) go("/lap-swim", "error", "The database is not configured.");
  return client!;
}

function friendly(message: string) {
  if (/only book a lane for yourself|You can only book for yourself/i.test(message)) return message;
  return message.replace(/^.*?ERROR:\s*/, "");
}

export async function bookLap(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.person) redirect("/login?next=/lap-swim");
  const startId = String(formData.get("slot_id") || "");
  const minutes = [30, 60, 90].includes(Number(formData.get("minutes"))) ? Number(formData.get("minutes")) : 30;
  const forTeen = String(formData.get("for_person_id") || "");
  const confirmed = formData.get("confirm_alone") === "1";
  const shareOk = formData.get("share_ok") !== "0";
  const alertOnJoin = formData.get("alert_on_join") === "1";
  const personId = forTeen || viewer.person!.id;

  const board = await loadBoard(viewer.person!.id, 8);
  const run = pickRun(board, startId, minutes);
  if (typeof run === "string") go("/lap-swim", "error", run);
  const policy = await loadPolicy();
  const strikes = strikeStatus((await loadStrikes(personId, policy)).rows, policy, new Date());
  if (strikes.suspendedUntil) {
    go("/lap-swim", "error", `Booking is paused until ${strikes.suspendedUntil.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" })} because of strikes. Talk to the Lap Swim VP if this looks wrong.`);
  }

  if (!forTeen) {
    const mine = board.filter((s) => s.mineBookingId);
    const capError = checkCaps({ policy, existing: mine, adding: run.filter((s) => !board.find((b) => b.id === s.id)?.mineBookingId) });
    if (capError) go("/lap-swim", "error", capError);
    const alone = run.every((s) => (board.find((b) => b.id === s.id)?.others.length ?? 0) === 0);
    if (alone && !confirmed) {
      redirect(`/lap-swim?confirm=${startId}&minutes=${minutes}&share=${shareOk ? 1 : 0}#confirm`);
    }
  } else {
    const myHalfHours = run.every((s) => board.find((b) => b.id === s.id)?.mineBookingId);
    if (!myHalfHours) go("/lap-swim", "error", "A teen swims in your lane. Book yourself for the same time first.");
  }

  const supabase = await db();
  const ids: string[] = [];
  for (const slot of run) {
    const existing = await supabase.from("lap_bookings").select("id, status").eq("slot_id", slot.id).eq("person_id", personId).maybeSingle();
    const row = existing.data as { id: string; status: string } | null;
    if (row?.status === "booked") continue;
    const extras = { share_ok: shareOk, alert_on_join: alertOnJoin, booked_by: viewer.person!.id };
    let result = row
      ? await supabase.from("lap_bookings").update({ status: "booked", ...extras }).eq("id", row.id).select("id").single()
      : await supabase.from("lap_bookings").insert({ slot_id: slot.id, person_id: personId, status: "booked", ...extras }).select("id").single();
    if (result.error && /column|schema cache/i.test(result.error.message)) {
      // Lap rules migration not applied yet: book without the new columns.
      result = row
        ? await supabase.from("lap_bookings").update({ status: "booked" }).eq("id", row.id).select("id").single()
        : await supabase.from("lap_bookings").insert({ slot_id: slot.id, person_id: personId, status: "booked" }).select("id").single();
    }
    if (result.error) {
      if (ids.length) await supabase.from("lap_bookings").update({ status: "cancelled" }).in("id", ids);
      go("/lap-swim", "error", friendly(result.error.message));
    }
    ids.push(String(result.data!.id));
  }
  revalidatePath("/lap-swim");
  revalidatePath("/lap-swim/my");
  go("/lap-swim/my", "notice", `Booked ${minutes} minutes. Your cancel links are below.`);
}

async function slotStart(bookingId: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const res = await admin.from("lap_bookings").select("lap_slots(starts_at)").eq("id", bookingId).maybeSingle();
  const slot = res.data?.lap_slots as { starts_at: string } | { starts_at: string }[] | null | undefined;
  return (Array.isArray(slot) ? slot[0] : slot)?.starts_at ?? null;
}

export async function cancelLap(formData: FormData) {
  const back = String(formData.get("back") || "/lap-swim/my");
  const bookingId = String(formData.get("booking_id"));
  const policy = await loadPolicy();
  const start = await slotStart(bookingId);
  const late = Boolean(start && isLateCancel(new Date(), start, policy) && policy.late_cancel_strikes > 0);
  if (late && formData.get("confirm_late") !== "1") redirect(`${back}?late=${bookingId}#late`);
  const supabase = await db();
  const { error } = await supabase.from("lap_bookings").update({ status: "cancelled" }).eq("id", bookingId);
  if (error) go(back, "error", friendly(error.message));
  revalidatePath("/lap-swim");
  revalidatePath("/lap-swim/my");
  go(back, "notice", late ? "Cancelled. This late cancel counts as a strike. The others in that slot have been told." : "Cancelled. The others in that slot have been told.");
}

export async function cancelByToken(formData: FormData) {
  const token = String(formData.get("token") || "");
  const id = readCancelToken(token);
  const path = `/lap-swim/cancel/${encodeURIComponent(token)}`;
  if (!id) go(path, "error", "That cancel link is not valid.");
  const admin = createAdminClient();
  if (!admin) go(path, "error", "Cancelling is not available right now.");
  const { error } = await admin!.from("lap_bookings").update({ status: "cancelled" }).eq("id", id!).eq("status", "booked");
  if (error) go(path, "error", /only cancel your own/i.test(error.message) ? "Link cancelling is switched on after the club runs the lap update. Sign in and use My swims to cancel." : friendly(error.message));
  revalidatePath("/lap-swim");
  go(path, "notice", "Cancelled. The others in that slot have been told.");
}

export async function clearStrike(formData: FormData) {
  const viewer = await getViewer();
  if (!can(viewer, "lap")) go("/admin/no-shows", "error", "Only the Lap Swim VP or an admin can do that.");
  const supabase = await db();
  const { error } = await supabase.from("lap_strikes").update({ cleared_at: new Date().toISOString(), cleared_by: viewer.person?.id ?? null }).eq("id", String(formData.get("strike_id")));
  if (error) go("/admin/no-shows", "error", friendly(error.message));
  revalidatePath("/admin/no-shows");
  go("/admin/no-shows", "notice", "Strike cleared.");
}

export async function markNotificationsRead() {
  const viewer = await getViewer();
  if (!viewer.person) return;
  const supabase = await db();
  await supabase.from("lap_notifications").update({ read_at: new Date().toISOString() }).eq("person_id", viewer.person.id).is("read_at", null);
  revalidatePath("/lap-swim/my");
}

export async function markNoShow(formData: FormData) {
  const viewer = await getViewer();
  if (!can(viewer, "lap")) go("/admin/no-shows", "error", "Only the Lap Swim VP or an admin can do that.");
  const supabase = await db();
  const status = formData.get("undo") === "1" ? "attended" : "no_show";
  const { error } = await supabase.from("lap_bookings").update({ status }).eq("id", String(formData.get("booking_id")));
  if (error) go("/admin/no-shows", "error", friendly(error.message));
  revalidatePath("/admin/no-shows");
  go("/admin/no-shows", "notice", status === "no_show" ? "Marked as a no-show." : "Marked as attended.");
}
