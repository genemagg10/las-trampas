"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mapMemberRow, parseCsv } from "@/lib/csv";
import { emailShell, sendEmail } from "@/lib/email";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { can, getViewer } from "@/lib/viewer";
import { siteUrl } from "@/lib/env";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, message: string): never {
  revalidatePath(path);
  redirect(`${path}?notice=${encodeURIComponent(message)}`);
}

async function guard(scope: string) {
  const viewer = await getViewer();
  if (!viewer.userId) fail("/login", "Sign in first.");
  if (!can(viewer, scope)) fail("/admin", "That admin area is not open for your role.");
  const supabase = await createClient();
  if (!supabase) fail("/admin", "Database is not connected.");
  return { viewer, supabase: supabase! };
}

export async function saveMemberRole(formData: FormData) {
  const { viewer, supabase } = await guard("membership");
  const action = String(formData.get("do"));
  if (action === "revoke") {
    const { error } = await supabase
      .from("entitlements")
      .update({ revoked_at: new Date().toISOString(), revoked_reason: String(formData.get("reason") || "revoked") })
      .eq("id", String(formData.get("entitlement_id")));
    if (error) fail("/admin/roles", error.message);
    ok("/admin/roles", "Role revoked.");
  }
  const { error } = await supabase.from("entitlements").insert({
    person_id: String(formData.get("person_id") || "") || null,
    household_id: String(formData.get("household_id") || "") || null,
    role_key: String(formData.get("role_key")),
    scope: String(formData.get("scope") || "") || null,
    season: formData.get("season") ? Number(formData.get("season")) : null,
    source: "admin",
    granted_by: viewer.person?.id ?? null,
    expires_at: String(formData.get("expires_at") || "") || null,
  });
  if (error) fail("/admin/roles", error.message);
  ok("/admin/roles", "Role granted.");
}

export async function saveSeason(formData: FormData) {
  const { supabase } = await guard("membership");
  const year = Number(formData.get("year"));
  const { error } = await supabase.from("seasons").upsert({
    year,
    name: String(formData.get("name") || `${year} season`),
    opens_on: String(formData.get("opens_on")),
    closes_on: String(formData.get("closes_on")),
    renewal_deadline: String(formData.get("renewal_deadline")),
    late_after: String(formData.get("late_after") || formData.get("renewal_deadline")),
    is_current: formData.get("is_current") === "on",
  });
  if (error) fail("/admin/seasons", error.message);
  if (formData.get("copy_prices") === "on") {
    const from = Number(formData.get("copy_from"));
    const { data: prices } = await supabase.from("price_list").select("item, label, amount_cents, notes").eq("season", from);
    if (prices?.length) {
      await supabase.from("price_list").upsert(
        (prices as { item: string; label: string; amount_cents: number; notes: string | null }[]).map((price) => ({
          ...price,
          season: year,
        })),
      );
    }
  }
  ok("/admin/seasons", "Season saved. Entitlements expire on their own dates.");
}

export async function savePrice(formData: FormData) {
  const { supabase } = await guard("treasurer");
  const { error } = await supabase.from("price_list").upsert(
    {
      season: Number(formData.get("season")),
      item: String(formData.get("item")),
      label: String(formData.get("label")),
      amount_cents: Number(formData.get("amount_cents")),
      notes: String(formData.get("notes") || ""),
    },
    { onConflict: "season,item" },
  );
  if (error) fail("/admin/seasons", error.message);
  ok("/admin/seasons", "Fee updated.");
}

export async function saveEvent(formData: FormData) {
  const { supabase } = await guard("social");
  const id = String(formData.get("id") || "");
  const payload = {
    title: String(formData.get("title") || ""),
    slug: String(formData.get("slug") || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    kind: String(formData.get("kind") || "social"),
    summary: String(formData.get("summary") || ""),
    description: String(formData.get("description") || ""),
    location: String(formData.get("location") || "Las Trampas Pool"),
    starts_at: new Date(String(formData.get("starts_at"))).toISOString(),
    ends_at: formData.get("ends_at") ? new Date(String(formData.get("ends_at"))).toISOString() : null,
    capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
    price_cents: Number(formData.get("price_cents") || 0),
    audience_role: String(formData.get("audience_role") || "") || null,
    published: formData.get("published") === "on",
    season: formData.get("season") ? Number(formData.get("season")) : null,
  };
  const result = id
    ? await supabase.from("events").update(payload).eq("id", id)
    : await supabase.from("events").insert(payload);
  if (result.error) fail("/admin/events", result.error.message);
  ok("/admin/events", "Event saved.");
}

export async function saveShift(formData: FormData) {
  const { supabase } = await guard("social");
  const { error } = await supabase.from("volunteer_shifts").insert({
    event_id: String(formData.get("event_id")),
    title: String(formData.get("title")),
    starts_at: new Date(String(formData.get("starts_at"))).toISOString(),
    ends_at: new Date(String(formData.get("ends_at"))).toISOString(),
    capacity: Number(formData.get("capacity") || 1),
    counts_for_deposit: formData.get("counts_for_deposit") === "on",
    credit_units: Number(formData.get("credit_units") || 1),
    audience: String(formData.get("audience") || "member"),
    lead_person_id: String(formData.get("lead_person_id") || "") || null,
  });
  if (error) fail("/admin/events", error.message);
  ok("/admin/events", "Shift added.");
}

export async function completeShift(formData: FormData) {
  const { supabase } = await guard("social");
  const { error } = await supabase
    .from("shift_signups")
    .update({ status: String(formData.get("status") || "completed") })
    .eq("id", String(formData.get("signup_id")));
  if (error) fail("/admin/events", error.message);
  ok("/admin/events", "Shift updated.");
}

export async function generateSlots(formData: FormData) {
  const { supabase } = await guard("lap");
  const { data, error } = await supabase.rpc("generate_lap_slots", {
    p_season: Number(formData.get("season")),
    p_from: String(formData.get("from")),
    p_to: String(formData.get("to")),
  });
  if (error) fail("/admin/slots", error.message);
  ok("/admin/slots", `Generated ${data ?? 0} lane times.`);
}

export async function saveBlock(formData: FormData) {
  const { supabase } = await guard("lap");
  const { error } = await supabase.from("pool_blocks").insert({
    season: Number(formData.get("season")),
    starts_at: new Date(String(formData.get("starts_at"))).toISOString(),
    ends_at: new Date(String(formData.get("ends_at"))).toISOString(),
    lane_id: String(formData.get("lane_id") || "") || null,
    reason: String(formData.get("reason")),
    note: String(formData.get("note") || ""),
  });
  if (error) fail("/admin/slots", error.message);
  ok("/admin/slots", "Block saved. Regenerate lane times to apply it.");
}

export async function saveLapSettings(formData: FormData) {
  const { supabase } = await guard("lap");
  const { error } = await supabase.from("lap_settings").upsert({
    season: Number(formData.get("season")),
    max_per_week: Number(formData.get("max_per_week")),
    max_advance_days: Number(formData.get("max_advance_days")),
    cancel_cutoff: `${Number(formData.get("cancel_hours") || 12)} hours`,
    buddy_mode: String(formData.get("buddy_mode")),
    min_buddies: Number(formData.get("min_buddies") || 2),
  });
  if (error) fail("/admin/slots", error.message);
  ok("/admin/slots", "Lap rules saved.");
}

export async function setGateCode(formData: FormData) {
  const { supabase } = await guard("lap");
  const { error } = await supabase.rpc("set_gate_code", {
    p_code: String(formData.get("code")),
    p_from: String(formData.get("valid_from")),
    p_to: String(formData.get("valid_to")),
  });
  if (error) fail("/admin/slots", error.message);
  ok("/admin/slots", "Gate code stored. It is shown only to eligible swimmers on the day.");
}

export async function revokeWaiver(formData: FormData) {
  const { supabase } = await guard("lap");
  const { error } = await supabase
    .from("waiver_signatures")
    .update({ revoked_at: new Date().toISOString(), revoked_reason: String(formData.get("reason") || "revoked") })
    .eq("id", String(formData.get("signature_id")));
  if (error) fail("/admin/waivers", error.message);
  ok("/admin/waivers", "Waiver revoked.");
}

export async function publishWaiver(formData: FormData) {
  const { supabase } = await guard("lap");
  const { error } = await supabase
    .from("waiver_templates")
    .update({ published_at: new Date().toISOString(), body_md: String(formData.get("body_md") || undefined) })
    .eq("id", String(formData.get("template_id")));
  if (error) fail("/admin/waivers", error.message);
  ok("/admin/waivers", "Waiver published. New signatures use this text.");
}

export async function savePost(formData: FormData) {
  const { viewer, supabase } = await guard("communications");
  const slug = String(formData.get("slug") || formData.get("title") || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const payload = {
    kind: String(formData.get("kind") || "announcement"),
    title: String(formData.get("title")),
    slug,
    body_md: String(formData.get("body_md") || ""),
    audience_role: String(formData.get("audience_role") || "") || null,
    publish_at: formData.get("publish") === "on" ? new Date().toISOString() : null,
    created_by: viewer.person?.id ?? null,
  };
  const id = String(formData.get("id") || "");
  const result = id ? await supabase.from("posts").update(payload).eq("id", id) : await supabase.from("posts").insert(payload).select("id").single();
  if (result.error) fail("/admin/announcements", result.error.message);
  const postId = id || (result.data as { id: string } | null)?.id;
  if (formData.get("email") === "on" && postId) {
    const admin = createAdminClient();
    if (!admin) fail("/admin/announcements", "Email needs the Supabase secret key to read member addresses.");
    const { data: people } = await admin!
      .from("people")
      .select("email, id, notification_prefs(topic, email_enabled)")
      .not("email", "is", null);
    const recipients = (people ?? [])
      .filter((person) => {
        const prefs = (person.notification_prefs as { topic: string; email_enabled: boolean }[]) ?? [];
        const pref = prefs.find((item) => item.topic === "announcements");
        return person.email && (pref ? pref.email_enabled : true);
      })
      .map((person) => person.email as string);
    if (recipients.length) {
      const sent = await sendEmail({
        to: recipients,
        subject: payload.title,
        html: emailShell(payload.title, `<p>${payload.body_md.replaceAll("<", "&lt;")}</p><p><a href="${siteUrl()}/updates/${slug}">Read it on the site</a></p>`),
      });
      if (sent.sent) {
        await supabase.from("posts").update({ emailed_at: new Date().toISOString() }).eq("id", postId);
        await supabase.from("email_sends").insert({ post_id: postId, resend_id: sent.id, recipient_count: recipients.length, topic: "announcements" });
      }
    }
  }
  ok("/admin/announcements", "Update saved.");
}

export async function saveAlbum(formData: FormData) {
  const { supabase } = await guard("photos");
  const { error } = await supabase.from("albums").insert({
    title: String(formData.get("title")),
    season: formData.get("season") ? Number(formData.get("season")) : null,
    visibility: String(formData.get("visibility") || "members"),
    description: String(formData.get("description") || ""),
  });
  if (error) fail("/admin/photos", error.message);
  ok("/admin/photos", "Album created.");
}

export async function moderatePhoto(formData: FormData) {
  const { supabase } = await guard("photos");
  const { error } = await supabase
    .from("photos")
    .update({
      status: String(formData.get("status")),
      public_ok: formData.get("public_ok") === "on",
      alt_text: String(formData.get("alt_text") || ""),
      has_minors: formData.get("has_minors") === "on",
    })
    .eq("id", String(formData.get("photo_id")));
  if (error) fail("/admin/photos", error.message);
  ok("/admin/photos", "Photo updated.");
}

export async function uploadPhoto(formData: FormData) {
  const { viewer, supabase } = await guard("photos");
  const admin = createAdminClient();
  if (!admin) fail("/admin/photos", "Photo upload needs the Supabase secret key.");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) fail("/admin/photos", "Choose a photo.");
  const albumId = String(formData.get("album_id"));
  const path = `${albumId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]+/g, "-")}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const bucket = String(formData.get("visibility")) === "public" ? "photos-public" : "photos-members";
  const uploaded = await admin.storage.from(bucket).upload(path, bytes, { contentType: file.type || "image/jpeg" });
  if (uploaded.error) fail("/admin/photos", uploaded.error.message);
  const { error } = await supabase.from("photos").insert({
    album_id: albumId,
    storage_path: path,
    uploaded_by: viewer.person?.id ?? null,
    status: "approved",
    alt_text: String(formData.get("alt_text") || "Las Trampas Pool photo"),
    has_minors: formData.get("has_minors") === "on",
    public_ok: formData.get("public_ok") === "on",
  });
  if (error) fail("/admin/photos", error.message);
  ok("/admin/photos", "Photo uploaded.");
}

export async function importMembers(formData: FormData) {
  const { supabase } = await guard("membership");
  const admin = createAdminClient();
  const file = formData.get("file");
  const text = file instanceof File ? await file.text() : String(formData.get("csv") || "");
  const rows = parseCsv(text).map(mapMemberRow);
  const good = rows.filter((row) => row.errors.length === 0);
  if (good.length === 0) fail("/admin/import", "No usable rows. Check the column names.");
  const client = admin ?? supabase;
  const season = Number(formData.get("season") || 2027);
  let imported = 0;
  for (const row of good) {
    const { data: existing } = await client.from("people").select("id").ilike("email", row.email).maybeSingle();
    if (existing && row.email) continue;
    const { data: household } = await client
      .from("households")
      .insert({
        name: row.household_name,
        membership_type: row.membership_type === "waitlist" ? "waitlist" : row.membership_type,
        status: row.membership_status,
      })
      .select("id")
      .single();
    if (!household) continue;
    const { data: person } = await client
      .from("people")
      .insert({
        household_id: household.id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email || null,
        phone: row.phone || null,
        kind: row.kind,
        birth_year: row.birth_year,
      })
      .select("id")
      .single();
    if (!person) continue;
    await client.from("privacy_settings").insert({ person_id: person.id });
    if (row.kind === "adult") await client.from("household_admins").insert({ household_id: household.id, person_id: person.id });
    if (row.membership_status === "active" && row.membership_type !== "none") {
      await client.from("entitlements").insert({
        household_id: household.id,
        role_key: "member",
        season,
        source: "import",
      });
    }
    imported += 1;
  }
  ok("/admin/import", `Imported ${imported} people. ${rows.length - good.length} rows were skipped.`);
}

export async function decideParty(formData: FormData) {
  const { supabase } = await guard("social");
  const status = String(formData.get("status"));
  const { error } = await supabase.from("party_reservations").update({ status }).eq("id", String(formData.get("reservation_id")));
  if (error) fail("/admin/events", error.message);
  ok("/admin/events", status === "approved" ? "Party approved." : "Party updated.");
}

export async function refundOrder(formData: FormData) {
  const { viewer } = await guard("treasurer");
  const admin = createAdminClient();
  if (!admin) fail("/admin/payments", "Refunds need the Supabase secret key.");
  const orderId = String(formData.get("order_id"));
  const amount = Number(formData.get("amount_cents"));
  const reason = String(formData.get("reason") || "");
  const { data: order } = await admin.from("orders").select("stripe_payment_intent_id, total_cents").eq("id", orderId).single();
  const stripe = getStripe();
  let stripeRefundId: string | null = null;
  if (stripe && order?.stripe_payment_intent_id) {
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id as string,
      amount,
      reason: "requested_by_customer",
    });
    stripeRefundId = refund.id;
  }
  await admin.from("refunds").insert({
    order_id: orderId,
    amount_cents: amount,
    reason,
    stripe_refund_id: stripeRefundId,
    by_person_id: viewer.person?.id ?? null,
  });
  if (amount >= ((order?.total_cents as number) ?? amount)) {
    await admin.rpc("apply_order_status", { p_order_id: orderId, p_status: "refunded" });
  }
  ok("/admin/payments", stripe ? "Refund recorded." : "Refund recorded locally. Stripe is not connected, so no money moved.");
}

export async function inviteWaitlist(formData: FormData) {
  const { supabase } = await guard("membership");
  const { error } = await supabase.from("waitlist_applications").update({ status: "invited" }).eq("id", String(formData.get("application_id")));
  if (error) fail("/admin/members", error.message);
  ok("/admin/members", "Invitation recorded. They can start new-member checkout.");
}

export async function savePartySlot(formData: FormData) {
  const { supabase } = await guard("social");
  const { error } = await supabase.from("party_slots").insert({
    season: Number(formData.get("season")),
    starts_at: new Date(String(formData.get("starts_at"))).toISOString(),
    ends_at: new Date(String(formData.get("ends_at"))).toISOString(),
    area: String(formData.get("area") || "lawn"),
    fee_cents: Number(formData.get("fee_cents") || 10000),
  });
  if (error) fail("/admin/events", error.message);
  ok("/admin/events", "Party time added.");
}

export async function saveTeamRegistration(formData: FormData) {
  const { supabase } = await guard("team");
  const { error } = await supabase.from("team_registrations").insert({
    household_id: String(formData.get("household_id")),
    season: Number(formData.get("season")),
    swimmer_person_id: String(formData.get("swimmer_person_id")),
    source: "manual",
  });
  if (error) fail("/admin/members", error.message);
  ok("/admin/members", "Swim team family access granted for the season.");
}
