import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/env";
import { buildIcs, type IcsEvent } from "@/lib/ics";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!isSupabaseConfigured() || !token || token.length < 16) {
    return new NextResponse("Calendar feed is not available.", { status: 404 });
  }
  const supabase = createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("calendar_feed_events", { p_token: token });
  if (error || !data) {
    return new NextResponse("Calendar feed was not found.", { status: 404 });
  }
  const events = (data as IcsEvent[]).filter((event) => event.starts_at && event.ends_at);
  return new NextResponse(buildIcs(events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
