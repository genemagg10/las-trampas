import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { receiptEmail, sendEmail } from "@/lib/email";
import { money } from "@/lib/format";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const admin = createAdminClient();
  if (!stripe || !secret || !admin) {
    return NextResponse.json({ error: "payments_disabled" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const inserted = await admin.from("stripe_events").insert({ stripe_event_id: event.id, type: event.type });
  if (inserted.error) {
    if (inserted.error.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    return NextResponse.json({ error: inserted.error.message }, { status: 500 });
  }

  try {
    await apply(event, admin);
  } catch (error) {
    await admin.from("stripe_events").delete().eq("stripe_event_id", event.id);
    const message = error instanceof Error ? error.message : "webhook_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function apply(event: Stripe.Event, admin: NonNullable<ReturnType<typeof createAdminClient>>) {
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id || session.client_reference_id;
    if (!orderId) return;
    const status =
      event.type === "checkout.session.async_payment_failed"
        ? "failed"
        : event.type === "checkout.session.async_payment_succeeded" || session.payment_status === "paid"
          ? "paid"
          : "processing";
    const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    await admin.rpc("apply_order_status", {
      p_order_id: orderId,
      p_status: status,
      p_amount_cents: session.amount_total,
      p_payment_intent: intent ?? null,
      p_receipt_url: null,
    });
    if (status === "paid") await emailReceipt(admin, orderId);
    return;
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (!intent) return;
    const { data: order } = await admin.from("orders").select("id").eq("stripe_payment_intent_id", intent).maybeSingle();
    if (!order) return;
    await admin.rpc("apply_order_status", { p_order_id: order.id, p_status: "refunded" });
  }
}

async function emailReceipt(admin: NonNullable<ReturnType<typeof createAdminClient>>, orderId: string) {
  const { data: order } = await admin.from("orders").select("purpose, total_cents, person_id").eq("id", orderId).maybeSingle();
  if (!order?.person_id) return;
  const { data: person } = await admin.from("people").select("email").eq("id", order.person_id).maybeSingle();
  if (!person?.email) return;
  const mail = receiptEmail({ purpose: String(order.purpose), amount: money(Number(order.total_cents)) });
  await sendEmail({ to: person.email, subject: mail.subject, html: mail.html });
}
