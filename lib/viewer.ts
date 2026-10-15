import { cache } from "react";
import { serviceStatus } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  configured: boolean;
  userId: string | null;
  email: string | null;
  person: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    birth_year: number | null;
    kind: string;
    household_id: string;
  } | null;
  household: {
    id: string;
    name: string;
    membership_type: string;
    status: string;
    lap_only_invited: boolean;
  } | null;
  roles: string[];
  scopes: string[];
  isAdmin: boolean;
  isBoard: boolean;
  isMember: boolean;
  isLap: boolean;
  isTeam: boolean;
};

const empty: Viewer = {
  configured: false,
  userId: null,
  email: null,
  person: null,
  household: null,
  roles: [],
  scopes: [],
  isAdmin: false,
  isBoard: false,
  isMember: false,
  isLap: false,
  isTeam: false,
};

export const getViewer = cache(async (): Promise<Viewer> => {
  const status = serviceStatus();
  if (!status.supabase) return empty;
  const supabase = await createClient();
  if (!supabase) return { ...empty, configured: true };

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  if (!userId) return { ...empty, configured: true };

  const { data: personRow } = await supabase
    .from("people")
    .select("id, first_name, last_name, email, phone, birth_year, kind, household_id, households(id, name, membership_type, status, lap_only_invited)")
    .eq("user_id", userId)
    .maybeSingle();

  const person = personRow as Viewer["person"] & { households?: Viewer["household"] | Viewer["household"][] } | null;
  const householdRaw = person && "households" in person ? person.households : null;
  const household = Array.isArray(householdRaw) ? householdRaw[0] ?? null : householdRaw ?? null;

  const { data: entitlements } = await supabase
    .from("entitlements")
    .select("role_key, scope, expires_at, revoked_at")
    .is("revoked_at", null);
  const active = (entitlements ?? []).filter((row) => {
    const item = row as { role_key: string; scope: string | null; expires_at: string | null; revoked_at: string | null };
    return !item.expires_at || new Date(item.expires_at) > new Date();
  }) as { role_key: string; scope: string | null }[];

  const roles = [...new Set(active.map((row) => row.role_key))];
  const { data: positions } = await supabase.from("board_positions").select("key, scopes");
  const scopeMap = new Map((positions ?? []).map((row) => [row.key as string, (row.scopes as string[]) ?? []]));
  const scopes = new Set<string>();
  for (const row of active) {
    if (row.role_key !== "board" || !row.scope) continue;
    for (const scope of scopeMap.get(row.scope) ?? []) scopes.add(scope);
  }

  const isAdmin = roles.includes("admin") || scopes.has("all");
  return {
    configured: true,
    userId,
    email,
    person: person
      ? {
          id: person.id,
          first_name: person.first_name,
          last_name: person.last_name,
          email: person.email,
          phone: person.phone,
          birth_year: person.birth_year,
          kind: person.kind,
          household_id: person.household_id,
        }
      : null,
    household,
    roles,
    scopes: [...scopes],
    isAdmin,
    isBoard: roles.includes("board") || isAdmin,
    isMember: roles.includes("member") || isAdmin,
    isLap: roles.includes("lap_swimmer"),
    isTeam: roles.includes("swim_team_family") || isAdmin,
  };
});

export function can(viewer: Viewer, scope: string) {
  return viewer.isAdmin || viewer.scopes.includes("all") || viewer.scopes.includes(scope);
}
