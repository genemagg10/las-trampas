export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function supabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

export function supabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabasePublishableKey());
}

export function isSupabaseAdminConfigured() {
  return Boolean(supabaseUrl() && supabaseSecretKey());
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function isStripePublishableConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export function emailFrom() {
  return process.env.EMAIL_FROM?.trim() || "Las Trampas Pool <updates@lastrampaspool.com>";
}

export type ServiceStatus = {
  supabase: boolean;
  supabaseAdmin: boolean;
  stripe: boolean;
  resend: boolean;
};

export function serviceStatus(): ServiceStatus {
  return {
    supabase: isSupabaseConfigured(),
    supabaseAdmin: isSupabaseAdminConfigured(),
    stripe: isStripeConfigured(),
    resend: isResendConfigured(),
  };
}
