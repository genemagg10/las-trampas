"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { can, getViewer } from "@/lib/viewer";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
function ok(path: string, message: string, extra: string[] = []): never {
  revalidatePath(path);
  for (const p of extra) revalidatePath(p);
  redirect(`${path}?notice=${encodeURIComponent(message)}`);
}
async function guard(scopes: string[], path: string) {
  const viewer = await getViewer();
  if (!viewer.userId) fail("/login", "Sign in first.");
  if (!scopes.some((scope) => can(viewer, scope))) fail("/admin", "That admin area is not open for your role.");
  const supabase = await createClient();
  if (!supabase) fail(path, "Database is not connected.");
  return { viewer, supabase: supabase! };
}
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function addLostItem(formData: FormData) {
  const path = "/admin/lost-found";
  const { viewer, supabase } = await guard(["membership", "social"], path);
  const description = str(formData, "description");
  if (!description) fail(path, "Describe the item.");
  let photoPath: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const admin = createAdminClient();
    if (!admin) fail(path, "Photo upload needs the Supabase secret key.");
    photoPath = `lost-found/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]+/g, "-")}`;
    const up = await admin!.storage.from("photos-members").upload(photoPath, new Uint8Array(await file.arrayBuffer()), {
      contentType: file.type || "image/jpeg",
    });
    if (up.error) fail(path, up.error.message);
  }
  const { error } = await supabase.from("lost_found_items").insert({
    description,
    location: str(formData, "location") || null,
    found_on: str(formData, "found_on") || new Date().toISOString().slice(0, 10),
    photo_path: photoPath,
    created_by: viewer.person?.id ?? null,
  });
  if (error) fail(path, error.message);
  ok(path, "Item added.", ["/lost-found"]);
}

export async function updateLostItem(formData: FormData) {
  const path = "/admin/lost-found";
  const { supabase } = await guard(["membership", "social"], path);
  const id = str(formData, "id");
  if (str(formData, "do") === "delete") {
    const { error } = await supabase.from("lost_found_items").delete().eq("id", id);
    if (error) fail(path, error.message);
    ok(path, "Item removed.", ["/lost-found"]);
  }
  const claimed = formData.get("claimed") === "on";
  const { error } = await supabase
    .from("lost_found_items")
    .update({ claimed, claimed_at: claimed ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) fail(path, error.message);
  ok(path, claimed ? "Marked claimed." : "Marked unclaimed.", ["/lost-found"]);
}

export async function saveSnackItem(formData: FormData) {
  const path = "/admin/snack-shack";
  const { supabase } = await guard(["social"], path);
  const id = str(formData, "id");
  if (str(formData, "do") === "delete") {
    const { error } = await supabase.from("snack_items").delete().eq("id", id);
    if (error) fail(path, error.message);
    ok(path, "Item removed.", ["/snack-shack"]);
  }
  const price = str(formData, "price");
  const row = {
    category: str(formData, "category") || "Menu",
    name: str(formData, "name"),
    description: str(formData, "description") || null,
    price_cents: price ? Math.round(Number(price.replace(/[$,]/g, "")) * 100) : null,
    available: formData.get("available") === "on",
    sort_order: Number(str(formData, "sort_order") || 0),
  };
  if (!row.name) fail(path, "Item name is required.");
  if (row.price_cents !== null && Number.isNaN(row.price_cents)) fail(path, "Price must be a number.");
  const { error } = id ? await supabase.from("snack_items").update(row).eq("id", id) : await supabase.from("snack_items").insert(row);
  if (error) fail(path, error.message);
  ok(path, "Menu saved.", ["/snack-shack"]);
}

export async function saveSnackHours(formData: FormData) {
  const path = "/admin/snack-shack";
  const { supabase } = await guard(["social"], path);
  const id = str(formData, "id");
  if (str(formData, "do") === "delete") {
    const { error } = await supabase.from("snack_hours").delete().eq("id", id);
    if (error) fail(path, error.message);
    ok(path, "Hours removed.", ["/snack-shack"]);
  }
  const row = { label: str(formData, "label"), hours: str(formData, "hours"), sort_order: Number(str(formData, "sort_order") || 0) };
  if (!row.label || !row.hours) fail(path, "Day and hours are required.");
  const { error } = id ? await supabase.from("snack_hours").update(row).eq("id", id) : await supabase.from("snack_hours").insert(row);
  if (error) fail(path, error.message);
  ok(path, "Hours saved.", ["/snack-shack"]);
}

export async function saveRecord(formData: FormData) {
  const path = "/admin/records";
  const { supabase } = await guard(["team"], path);
  const id = str(formData, "id");
  if (str(formData, "do") === "delete") {
    const { error } = await supabase.from("swim_records").delete().eq("id", id);
    if (error) fail(path, error.message);
    ok(path, "Record removed.", ["/records"]);
  }
  const row = {
    kind: str(formData, "kind") || "team",
    gender: str(formData, "gender"),
    age_group: str(formData, "age_group"),
    distance: str(formData, "distance"),
    event: str(formData, "event"),
    swimmer: str(formData, "swimmer"),
    time_text: str(formData, "time_text"),
    year: Number(str(formData, "year")) || null,
    meet: str(formData, "meet") || null,
    source_url: str(formData, "source_url") || null,
    source_date: str(formData, "source_date") || new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  };
  if (!row.gender || !row.age_group || !row.event || !row.swimmer || !row.time_text) fail(path, "Gender, age group, event, swimmer, and time are required.");
  const { error } = id ? await supabase.from("swim_records").update(row).eq("id", id) : await supabase.from("swim_records").insert(row);
  if (error) fail(path, error.message);
  ok(path, "Record saved.", ["/records"]);
}
