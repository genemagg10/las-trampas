"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isStripeConfigured, isSupabaseAdminConfigured, siteUrl } from "@/lib/env";
import { sendEmail, emailShell } from "@/lib/email";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { buildWaiverPdf } from "@/lib/waiver-pdf";

function notice(path: string, message: string): never {
  redirect(`${path}?notice=${encodeURIComponent(message)}`);
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function userDb() {
  const supabase = await createClient();
  if (!supabase) fail("/login", "The member database is not connected yet.");
  return supabase!;
}

export async function updateProfile(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.person) fail("/login", "Sign in first.");
  const supabase = await userDb();
  const { error } = await supabase
    .from("people")
    .update({
      first_name: String(formData.get("first_name") || ""),
      last_name: String(formData.get("last_name") || ""),
      phone: String(formData.get("phone") || "") || null,
      birth_year: formData.get("birth_year") ? Number(formData.get("birth_year")) : null,
    })
    .eq("id", viewer.person!.id);
  if (error) fail("/account", error.message);
  const topics = ["reminders", "announcements", "lap_buddy", "payments"];
  for (const topic of topics) {
    await supabase.from("notification_prefs").upsert({
      person_id: viewer.person!.id,
      topic,
      email_enabled: formData.get(`pref_${topic}`) === "on",
    });
  }
  await supabase.from("privacy_settings").upsert({
    person_id: viewer.person!.id,
    show_name: formData.get("show_name") === "on",
    show_email: formData.get("show_email") === "on",
    show_phone: formData.get("show_phone") === "on",
    show_household: formData.get("show_household") === "on",
    show_children: formData.get("show_children") === "on",
    photo_consent: String(formData.get("photo_consent") || "members_only"),
    lap_buddy_visible: formData.get("lap_buddy_visible") === "on",
  });
  revalidatePath("/account");
  notice("/account", "Profile saved.");
}

export async function addHouseholdPerson(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.person) fail("/login", "Sign in first.");
  const supabase = await userDb();
  const kind = String(formData.get("kind") || "child");
  const { error } = await supabase.from("people").insert({
    household_id: viewer.person!.household_id,
    first_name: String(formData.get("first_name") || ""),
    last_name: String(formData.get("last_name") || ""),
    email: String(formData.get("email") || "") || null,
    kind,
    birth_year: formData.get("birth_year") ? Number(formData.get("birth_year")) : null,
  });
  if (error) fail("/account/household", error.message);
  revalidatePath("/account/household");
  notice("/account/household", "Person added. They can claim the email when they create a login.");
}

export async function removeHouseholdPerson(formData: FormData) {
  const supabase = await userDb();
  const { error } = await supabase.from("people").delete().eq("id", String(formData.get("person_id")));
  if (error) fail("/account/household", error.message);
  revalidatePath("/account/household");
  notice("/account/household", "Removed from the household.");
}

export async function signWaiver(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.person) fail("/login", "Sign in first.");
  if (!isSupabaseAdminConfigured()) {
    fail("/lap-swim/waiver", "Waiver storage needs the Supabase secret key before signatures can be kept.");
  }
  const supabase = await userDb();
  const admin = createAdminClient();
  if (!admin) fail("/lap-swim/waiver", "Waiver storage is not configured.");
  const templateId = String(formData.get("template_id"));
  const { data: template, error: templateError } = await supabase
    .from("waiver_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (templateError || !template) fail("/lap-swim/waiver", "That waiver is not available.");
  const acks = (template.acknowledgements as string[]) ?? [];
  if (acks.some((_, index) => formData.get(`ack_${index}`) !== "on")) {
    fail("/lap-swim/waiver", "Check each acknowledgement to sign.");
  }
  const typed = String(formData.get("typed_name") || "").trim();
  const expected = `${viewer.person!.first_name} ${viewer.person!.last_name}`.trim();
  if (expected && typed.toLowerCase() !== expected.toLowerCase()) {
    fail("/lap-swim/waiver", `Type your name as it appears on your profile (${expected}).`);
  }
  const signature = String(formData.get("signature_png") || "");
  if (!signature.startsWith("data:image/png")) fail("/lap-swim/waiver", "Draw your signature.");
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "";
  const userAgent = headerList.get("user-agent") || "";
  const signedAt = new Date().toISOString();
  const pdf = await buildWaiverPdf({
    title: template.title as string,
    body: template.body_md as string,
    typedName: typed,
    signedAt,
    ip,
    userAgent,
    bodySha256: template.body_sha256 as string,
  });
  const personId = viewer.person!.id;
  const folder = `${personId}/${crypto.randomUUID()}`;
  const png = Buffer.from(signature.split(",")[1] || "", "base64");
  const pngUpload = await admin.storage.from("waivers").upload(`${folder}/signature.png`, png, { contentType: "image/png" });
  if (pngUpload.error) fail("/lap-swim/waiver", pngUpload.error.message);
  const pdfUpload = await admin.storage.from("waivers").upload(`${folder}/waiver.pdf`, pdf.bytes, { contentType: "application/pdf" });
  if (pdfUpload.error) fail("/lap-swim/waiver", pdfUpload.error.message);
  const { error } = await supabase.from("waiver_signatures").insert({
    template_id: templateId,
    person_id: personId,
    typed_name: typed,
    signature_png_path: `${folder}/signature.png`,
    signed_at: signedAt,
    ip,
    user_agent: userAgent,
    pdf_path: `${folder}/waiver.pdf`,
    pdf_sha256: pdf.hash,
    body_sha256: template.body_sha256,
  });
  if (error) fail("/lap-swim/waiver", error.message);
  revalidatePath("/lap-swim");
  notice("/lap-swim", "Waiver signed. You can book lanes.");
}

export async function bookLane(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.person) fail("/login", "Sign in first.");
  const supabase = await userDb();
  const slotId = String(formData.get("slot_id"));
  const existing = await supabase
    .from("lap_bookings")
    .select("id, status")
    .eq("slot_id", slotId)
    .eq("person_id", viewer.person!.id)
    .maybeSingle();
  const row = existing.data as { id: string; status: string } | null;
  const result = row
    ? await supabase.from("lap_bookings").update({ status: "booked" }).eq("id", row.id)
    : await supabase.from("lap_bookings").insert({ slot_id: slotId, person_id: viewer.person!.id, status: "booked" });
  if (result.error) fail("/lap-swim", result.error.message);
  revalidatePath("/lap-swim");
  notice("/lap-swim", "Lane booked. It is confirmed once the buddy rule is met.");
}

export async function cancelLane(formData: FormData) {
  const supabase = await userDb();
  const { error } = await supabase.from("lap_bookings").update({ status: "cancelled" }).eq("id", String(formData.get("booking_id")));
  if (error) fail("/lap-swim", error.message);
  revalidatePath("/lap-swim");
  notice("/lap-swim", "Booking cancelled.");
}

export async function inviteBuddy(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.person) fail("/login", "Sign in first.");
  const supabase = await userDb();
  const { error } = await supabase.from("buddy_invites").insert({
    from_person_id: viewer.person.id,
    to_person_id: String(formData.get("to_person_id")),
    slot_id: String(formData.get("slot_id")),
  });
  if (error) fail("/lap-swim", error.message);
  notice("/lap-swim", "Buddy invite sent.");
}

export async function respondInvite(formData: FormData) {
  const supabase = await userDb();
  const status = String(formData.get("status"));
  const { error } = await supabase.from("buddy_invites").update({ status }).eq("id", String(formData.get("invite_id")));
  if (error) fail("/lap-swim", error.message);
  if (status === "accepted") {
    const book = new FormData();
    book.set("slot_id", String(formData.get("slot_id")));
    await bookLane(book);
  }
  notice("/lap-swim", status === "accepted" ? "Invite accepted." : "Invite updated.");
}

export async function checkIn(formData: FormData) {
  const supabase = await userDb();
  const bookingId = String(formData.get("booking_id"));
  const { error } = await supabase.from("lap_checkins").insert({ booking_id: bookingId, method: "tap" });
  if (error) fail("/lap-swim", error.message);
  await supabase.from("lap_bookings").update({ status: "attended" }).eq("id", bookingId);
  notice("/schedule", "Checked in.");
}

export async function rsvpEvent(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.household) fail("/login", "Sign in first.");
  const supabase = await userDb();
  const eventId = String(formData.get("event_id"));
  const adults = Number(formData.get("adults") || 1);
  const kids = Number(formData.get("kids") || 0);
  const { data: event } = await supabase.from("events").select("price_cents, title").eq("id", eventId).single();
  const price = (event?.price_cents as number) ?? 0;
  let orderId: string | null = null;
  if (price > 0) {
    orderId = await createCheckoutOrder({
      purpose: "event_ticket",
      items: [{ price_item: "event_ticket", description: String(event?.title || "Event ticket"), quantity: adults + kids, amount_cents: price * (adults + kids), ref_id: eventId }],
      returnPath: `/events/${eventId}`,
    });
  }
  const { error } = await supabase.from("rsvps").upsert({
    event_id: eventId,
    household_id: viewer.household.id,
    adults,
    kids,
    status: price > 0 ? "pending_payment" : "going",
    order_id: orderId,
  });
  if (error) fail(`/events/${eventId}`, error.message);
  if (orderId && isStripeConfigured()) {
    const url = await startCheckout(orderId, `/events/${eventId}`);
    redirect(url);
  }
  revalidatePath(`/events/${eventId}`);
  notice(`/events/${eventId}`, price > 0 ? "RSVP saved. Payment is turned off, so it stays unpaid." : "RSVP saved.");
}

export async function takeShift(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.person) fail("/login", "Sign in first.");
  const supabase = await userDb();
  const { error } = await supabase.from("shift_signups").insert({
    shift_id: String(formData.get("shift_id")),
    person_id: viewer.person.id,
  });
  if (error) fail(`/events/${formData.get("event_id")}`, error.message);
  notice(`/events/${formData.get("event_id")}`, "You are signed up for that shift.");
}

export async function cancelShift(formData: FormData) {
  const supabase = await userDb();
  const { error } = await supabase.from("shift_signups").update({ status: "cancelled" }).eq("id", String(formData.get("signup_id")));
  if (error) fail(`/events/${formData.get("event_id")}`, error.message);
  notice(`/events/${formData.get("event_id")}`, "Shift cancelled.");
}

export async function requestParty(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.household) fail("/login", "Sign in first.");
  const supabase = await userDb();
  const slotId = String(formData.get("slot_id"));
  const { data: slot } = await supabase.from("party_slots").select("fee_cents, area").eq("id", slotId).single();
  if (!slot) fail("/parties", "That party time is gone.");
  const fee = slot.fee_cents as number;
  let orderId: string | null = null;
  if (fee > 0 && isStripeConfigured()) {
    orderId = await createCheckoutOrder({
      purpose: "party",
      items: [{ price_item: "party_slot", description: `Party · ${slot.area}`, quantity: 1, amount_cents: fee, ref_id: slotId }],
      returnPath: "/parties",
    });
  }
  const { error } = await supabase.from("party_reservations").insert({
    slot_id: slotId,
    household_id: viewer.household.id,
    notes: String(formData.get("notes") || ""),
    order_id: orderId,
    status: "requested",
  });
  if (error) fail("/parties", error.message);
  if (orderId) redirect(await startCheckout(orderId, "/parties"));
  notice("/parties", fee > 0 ? "Request saved. Online payment is turned off, so the treasurer will follow up." : "Party requested.");
}

export async function submitWaitlist(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.person) fail("/login", "Create an account before applying.");
  const supabase = await userDb();
  const { data: feeRow } = await supabase.from("price_list").select("amount_cents").eq("item", "waitlist_fee").maybeSingle();
  const fee = (feeRow?.amount_cents as number) ?? 10000;
  const season = await supabase.from("seasons").select("year").eq("is_current", true).maybeSingle();
  const { data: application, error } = await supabase
    .from("waitlist_applications")
    .insert({
      applicant_person_id: viewer.person.id,
      household_name: String(formData.get("household_name") || viewer.household?.name || ""),
      contact_email: viewer.email || viewer.person.email || "",
      contact_phone: String(formData.get("phone") || ""),
      about: String(formData.get("about") || ""),
      status: "pending_payment",
    })
    .select("id")
    .single();
  if (error || !application) fail("/join", error?.message || "Could not save the application.");
  if (!isStripeConfigured()) {
    notice("/join", "Application saved. Online payment is turned off, so the membership chair will contact you.");
  }
  const orderId = await createCheckoutOrder({
    purpose: "waitlist",
    season: (season.data?.year as number) ?? null,
    items: [{ price_item: "waitlist_fee", description: "Waitlist application", quantity: 1, amount_cents: fee, ref_id: null }],
    returnPath: "/join",
  });
  await supabase.from("waitlist_applications").update({ order_id: orderId }).eq("id", application.id);
  redirect(await startCheckout(orderId, "/join"));
}

export async function startDuesCheckout(formData: FormData) {
  const purpose = String(formData.get("purpose") || "renewal");
  const items = JSON.parse(String(formData.get("items") || "[]")) as {
    price_item: string;
    description: string;
    quantity: number;
    amount_cents: number;
    ref_id: string | null;
  }[];
  if (!isStripeConfigured()) fail("/dues", "Payments are turned off until Stripe is connected.");
  const orderId = await createCheckoutOrder({ purpose, items, returnPath: "/account/payments" });
  redirect(await startCheckout(orderId, "/dues"));
}

async function createCheckoutOrder(input: {
  purpose: string;
  season?: number | null;
  items: { price_item: string; description: string; quantity: number; amount_cents: number; ref_id: string | null }[];
  returnPath: string;
}) {
  const viewer = await getViewer();
  if (!viewer.person || !viewer.household) fail("/login", "Sign in first.");
  const supabase = await userDb();
  const { data: season } = await supabase.from("seasons").select("year").eq("is_current", true).maybeSingle();
  const total = input.items.reduce((sum, item) => sum + item.amount_cents, 0);
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      household_id: viewer.household.id,
      person_id: viewer.person.id,
      purpose: input.purpose,
      season: input.season ?? (season?.year as number | undefined) ?? null,
      total_cents: total,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !order) fail(input.returnPath, error?.message || "Could not start the order.");
  const { error: itemError } = await supabase.from("order_items").insert(
    input.items.map((item) => ({ ...item, order_id: order.id })),
  );
  if (itemError) fail(input.returnPath, itemError.message);
  return order.id as string;
}

async function startCheckout(orderId: string, returnPath: string) {
  const stripe = getStripe();
  if (!stripe) fail(returnPath, "Payments are turned off until Stripe is connected.");
  const admin = createAdminClient();
  const supabase = await userDb();
  const viewer = await getViewer();
  const { data: order } = await supabase.from("orders").select("id, total_cents, purpose, household_id").eq("id", orderId).single();
  const { data: items } = await supabase.from("order_items").select("description, amount_cents, quantity").eq("order_id", orderId);
  if (!order || !items) fail(returnPath, "Order not found.");
  let customerId: string | undefined;
  if (admin && viewer.household) {
    const { data: household } = await admin.from("households").select("stripe_customer_id, name").eq("id", viewer.household.id).single();
    customerId = (household?.stripe_customer_id as string | null) ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: viewer.email || undefined,
        name: viewer.household.name,
        metadata: { household_id: viewer.household.id },
      });
      customerId = customer.id;
      await admin.from("households").update({ stripe_customer_id: customer.id }).eq("id", viewer.household.id);
    }
  }
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: orderId,
    metadata: { order_id: orderId },
    allowed_payment_method_types: ["us_bank_account", "card"],
    payment_method_options: {
      us_bank_account: { financial_connections: { permissions: ["payment_method"] } },
    },
    line_items: (items as { description: string; amount_cents: number; quantity: number }[]).map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(item.amount_cents / item.quantity),
        product_data: { name: item.description },
      },
    })),
    success_url: `${siteUrl()}/account/payments?notice=Payment+submitted`,
    cancel_url: `${siteUrl()}${returnPath}?notice=Payment+cancelled`,
  });
  if (admin) await admin.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", orderId);
  if (!session.url) fail(returnPath, "Stripe did not return a checkout page.");
  return session.url;
}

export async function sendContact(formData: FormData) {
  if (String(formData.get("company") || "")) notice("/contact", "Thanks.");
  const supabase = await createClient();
  if (!supabase) fail("/contact", "The contact form needs the database connection.");
  const name = String(formData.get("name") || "");
  const email = String(formData.get("email") || "");
  const topic = String(formData.get("topic") || "general");
  const body = String(formData.get("body") || "");
  const position = String(formData.get("board_position_key") || "") || null;
  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    topic,
    body,
    board_position_key: position,
  });
  if (error) fail("/contact", error.message);
  if (position) {
    const { data: route } = await supabase.from("board_positions").select("inbox_address, label").eq("key", position).maybeSingle();
    const inbox = route?.inbox_address as string | null;
    if (inbox) {
      await sendEmail({
        to: inbox,
        subject: `Website message for ${route?.label}: ${topic}`,
        html: emailShell("New website message", `<p>${name} (${email})</p><p>${body.replaceAll("<", "&lt;")}</p>`),
      });
    }
  }
  notice("/contact", "Message sent. A board member will reply from the club address.");
}

export async function revealGateCode(bookingId: string) {
  const viewer = await getViewer();
  if (!viewer.person) return { allowed: false as const, reason: "Sign in first." };
  const supabase = await userDb();
  const { data, error } = await supabase.rpc("reveal_gate_code", { p_booking_id: bookingId });
  if (error) return { allowed: false as const, reason: error.message };
  const result = (data ?? {}) as { allowed?: boolean; code?: string; reason?: string };
  return {
    allowed: Boolean(result.allowed),
    code: result.code,
    reason: result.reason || (result.allowed ? "Shown only to you, only today." : "The gate code is not available."),
  };
}

export async function rotateFeed() {
  const supabase = await userDb();
  const { error } = await supabase.rpc("rotate_calendar_token");
  if (error) fail("/schedule", error.message);
  revalidatePath("/schedule");
  notice("/schedule", "Calendar link replaced. Update it in Google or Apple Calendar.");
}
