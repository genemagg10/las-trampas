import seedRecords from "@/lib/seed/team-records.json";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SwimRecord = {
  id?: string;
  kind?: string;
  gender: string;
  age_group: string;
  distance: string;
  event: string;
  swimmer: string;
  time_text: string;
  year: number | null;
  meet: string | null;
  source_url?: string | null;
  source_date?: string | null;
};

export const RECORDS_SOURCE = {
  label: "DCSL league database (Acorn Swim), Las Trampas team records",
  url: "https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM",
  retrieved: "2026-10-15",
};

export const AGE_GROUPS = ["6&U", "7-8", "9-10", "11-12", "13-14", "15-18"];
export const EVENTS = ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "Individual Medley", "Medley Relay", "Free Relay"];

/** Team records from the database, or the bundled seed if the table is not migrated yet. */
export async function getSwimRecords(): Promise<{ records: SwimRecord[]; fromSeed: boolean }> {
  const supabase = await createClient();
  if (supabase) {
    const { data, error } = await supabase.from("swim_records").select("*").order("sort_order");
    if (!error && data && data.length > 0) return { records: data as SwimRecord[], fromSeed: false };
  }
  const records = (seedRecords as Array<Omit<SwimRecord, "time_text"> & { time: string }>).map((r) => ({
    ...r,
    time_text: r.time,
    source_url: RECORDS_SOURCE.url,
    source_date: RECORDS_SOURCE.retrieved,
  }));
  return { records, fromSeed: true };
}

export type SnackItem = { id?: string; category: string; name: string; description: string | null; price_cents: number | null; available: boolean; source?: string | null; sort_order?: number };
export type SnackHours = { id?: string; label: string; hours: string; sort_order?: number };

export const SNACK_SEED: SnackItem[] = [
  {
    category: "Seahorse Day Camp",
    name: "Snack Shack Tuesday Meal Deal",
    description: "Optional add-on for Seahorse Day Camp campers (summer 2026).",
    price_cents: 900,
    available: true,
    source: "https://www.ltst.org/seahorse-day-camp-2023",
  },
];

export async function getSnackShack(): Promise<{ items: SnackItem[]; hours: SnackHours[]; migrated: boolean }> {
  const supabase = await createClient();
  if (supabase) {
    const [items, hours] = await Promise.all([
      supabase.from("snack_items").select("*").order("sort_order"),
      supabase.from("snack_hours").select("*").order("sort_order"),
    ]);
    if (!items.error && !hours.error) return { items: (items.data ?? []) as SnackItem[], hours: (hours.data ?? []) as SnackHours[], migrated: true };
  }
  return { items: SNACK_SEED, hours: [], migrated: false };
}

export type LostItem = { id: string; found_on: string; description: string; location: string | null; photo_path: string | null; claimed: boolean; url?: string | null };

export async function getLostItems(): Promise<{ items: LostItem[]; migrated: boolean }> {
  const supabase = await createClient();
  if (!supabase) return { items: [], migrated: false };
  const { data, error } = await supabase.from("lost_found_items").select("*").order("found_on", { ascending: false }).limit(200);
  if (error) return { items: [], migrated: false };
  const items = (data ?? []) as LostItem[];
  const admin = createAdminClient();
  const paths = items.map((i) => i.photo_path).filter(Boolean) as string[];
  if (admin && paths.length) {
    const signed = await admin.storage.from("photos-members").createSignedUrls(paths, 3600);
    const map = new Map((signed.data ?? []).map((s) => [s.path, s.signedUrl]));
    for (const item of items) item.url = item.photo_path ? map.get(item.photo_path) ?? null : null;
  }
  return { items, migrated: true };
}

export function money(cents: number | null) {
  return cents === null ? "" : `$${(cents / 100).toFixed(2)}`;
}
