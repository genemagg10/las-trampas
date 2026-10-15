"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "/home";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/home";
}

export async function signInWithPassword(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/login?error=Auth+is+not+connected+yet");
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=Auth+is+not+connected+yet");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(safeNext(formData.get("next")));
}

export async function signUpWithPassword(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/login?error=Auth+is+not+connected+yet");
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=Auth+is+not+connected+yet");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const origin = (await headers()).get("origin") || siteUrl();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: {
        first_name: String(formData.get("first_name") || ""),
        last_name: String(formData.get("last_name") || ""),
        household_name: String(formData.get("household_name") || ""),
      },
    },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/login?notice=Check+your+email+to+confirm+the+account");
}

export async function sendMagicLink(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/login?error=Auth+is+not+connected+yet");
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=Auth+is+not+connected+yet");
  const email = String(formData.get("email") || "");
  const origin = (await headers()).get("origin") || siteUrl();
  const next = safeNext(formData.get("next"));
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/login?notice=Check+your+email+for+a+sign-in+link");
}

export async function sendPasswordReset(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/login?error=Auth+is+not+connected+yet");
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=Auth+is+not+connected+yet");
  const email = String(formData.get("email") || "");
  const origin = (await headers()).get("origin") || siteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/confirm?next=/account` });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/login?notice=Password+reset+sent+if+that+email+has+an+account");
}
