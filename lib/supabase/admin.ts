import { createClient } from "@supabase/supabase-js";
import { isSupabaseAdminConfigured, supabaseSecretKey, supabaseUrl } from "@/lib/env";

export function createAdminClient() {
  if (!isSupabaseAdminConfigured()) return null;
  return createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
