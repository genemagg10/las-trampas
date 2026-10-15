import { fallbackFees } from "@/lib/fees";
import { createClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;

async function db() {
  return createClient();
}

export async function getSeason() {
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase.from("seasons").select("*").eq("is_current", true).maybeSingle();
  return data as Row | null;
}

export async function getPrices() {
  const supabase = await db();
  if (!supabase) return fallbackFees.map((fee) => ({ ...fee }));
  const season = await getSeason();
  if (!season) return fallbackFees.map((fee) => ({ ...fee }));
  const { data } = await supabase
    .from("price_list")
    .select("item, label, amount_cents, notes")
    .eq("season", season.year as number)
    .order("label");
  return (data as { item: string; label: string; amount_cents: number; notes: string | null }[] | null) ?? [];
}

export async function getPublicPosts() {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("posts")
    .select("id, title, slug, body_md, kind, publish_at, audience_role")
    .not("publish_at", "is", null)
    .lte("publish_at", new Date().toISOString())
    .order("publish_at", { ascending: false });
  return (data as Row[] | null) ?? [];
}

export async function getPost(slug: string) {
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase.from("posts").select("*").eq("slug", slug).maybeSingle();
  return data as Row | null;
}

export async function getEvents() {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.from("events").select("*").order("starts_at");
  return (data as Row[] | null) ?? [];
}

export async function getEvent(id: string) {
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  return data as Row | null;
}

export async function getDocuments() {
  const supabase = await db();
  if (!supabase) {
    return [
      {
        id: "rules",
        title: "Pool rules",
        kind: "rules",
        visibility: "public",
        body_md:
          "Las Trampas Pool is open to members from May through October. Full rules will replace this summary once the board publishes them.",
      },
    ];
  }
  const { data } = await supabase.from("documents").select("*").order("title");
  return (data as Row[] | null) ?? [];
}

export async function getDocument(id: string) {
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  return data as Row | null;
}

export async function getBoardPositions() {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.from("board_positions").select("*").order("sort_order");
  return (data as Row[] | null) ?? [];
}

export function isUpcoming(startsAt: unknown) {
  return new Date(String(startsAt)).getTime() >= Date.now();
}
