import Stripe from "stripe";
import { isStripeConfigured } from "@/lib/env";

let stripe: Stripe | null = null;

export function getStripe() {
  if (!isStripeConfigured()) return null;
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  }
  return stripe;
}
