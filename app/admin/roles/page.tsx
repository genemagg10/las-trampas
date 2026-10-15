import { Notice } from "@/components/ui";
import { saveMemberRole } from "@/lib/actions/admin";
import { boardRoles } from "@/lib/fees";
import { readFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";
import { can, getViewer } from "@/lib/viewer";

export const metadata = { title: "Roles" };

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const flash = await readFlash(searchParams);
  const viewer = await getViewer();
  if (!can(viewer, "membership")) return <p className="alert error">Membership access is required.</p>;
  const supabase = await createClient();
  const roles = supabase ? await supabase.from("roles").select("key, label") : { data: [] };
  const grants = supabase
    ? await supabase.from("entitlements").select("id, role_key, scope, season, person_id, household_id, revoked_at").is("revoked_at", null).order("created_at", { ascending: false }).limit(40)
    : { data: [] };

  return (
    <>
      <Notice {...flash} />
      <form className="form card" action={saveMemberRole}>
        <h3>Grant a role</h3>
        <label>
          Person id
          <input name="person_id" />
        </label>
        <label>
          Or household id
          <input name="household_id" />
        </label>
        <label>
          Role
          <select name="role_key">
            {(roles.data ?? []).map((role) => (
              <option key={String(role.key)} value={String(role.key)}>
                {String(role.label || role.key)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Board office, if the role is board
          <select name="scope" defaultValue="">
            <option value="">None</option>
            {boardRoles.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Season year (blank keeps it until revoked)
          <input name="season" type="number" placeholder="2027" />
        </label>
        <button className="btn" type="submit">
          Grant
        </button>
      </form>
      <h3>Active grants</h3>
      {(grants.data ?? []).map((row) => (
        <form key={String(row.id)} action={saveMemberRole} className="slot">
          <div>
            {String(row.role_key)} {row.scope ? `(${row.scope})` : ""} · season {String(row.season ?? "standing")}
            <br />
            <small>person {String(row.person_id || "—")} · household {String(row.household_id || "—")}</small>
          </div>
          <input type="hidden" name="do" value="revoke" />
          <input type="hidden" name="entitlement_id" value={String(row.id)} />
          <button className="btn coral" type="submit">
            Revoke
          </button>
        </form>
      ))}
    </>
  );
}
