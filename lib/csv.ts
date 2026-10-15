export type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  if (rows.length === 0) return [];

  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((values) => {
    const record: CsvRow = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record;
  });
}

function normalizeHeader(header: string) {
  const key = header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const aliases: Record<string, string> = {
    household: "household_name",
    household_name: "household_name",
    family: "household_name",
    family_name: "household_name",
    first: "first_name",
    first_name: "first_name",
    last: "last_name",
    last_name: "last_name",
    email: "email",
    email_address: "email",
    phone: "phone",
    phone_number: "phone",
    member_type: "membership_type",
    membership_type: "membership_type",
    type: "membership_type",
    status: "membership_status",
    membership_status: "membership_status",
    kind: "kind",
    role: "kind",
    birth_year: "birth_year",
    year_of_birth: "birth_year",
  };
  return aliases[key] ?? key;
}

export type ImportedPerson = {
  household_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  kind: "adult" | "teen" | "child";
  birth_year: number | null;
  membership_type: "full" | "lap_only" | "none" | "waitlist";
  membership_status: "active" | "lapsed" | "waitlist" | "prospect";
  errors: string[];
};

export function mapMemberRow(row: CsvRow): ImportedPerson {
  const errors: string[] = [];
  const household_name = row.household_name || `${row.last_name || "Imported"} household`;
  const first_name = row.first_name || "";
  const last_name = row.last_name || "";
  const email = (row.email || "").toLowerCase();
  if (!first_name || !last_name) errors.push("First and last name are required.");
  if (email && !email.includes("@")) errors.push("Email looks wrong.");
  const kind = row.kind === "teen" || row.kind === "child" ? row.kind : "adult";
  const birth = row.birth_year ? Number(row.birth_year) : null;
  const membership_type = (["full", "lap_only", "none", "waitlist"].includes(row.membership_type)
    ? row.membership_type
    : "full") as ImportedPerson["membership_type"];
  const membership_status = (["active", "lapsed", "waitlist", "prospect"].includes(row.membership_status)
    ? row.membership_status
    : "active") as ImportedPerson["membership_status"];
  return {
    household_name,
    first_name,
    last_name,
    email,
    phone: row.phone || "",
    kind,
    birth_year: birth && Number.isFinite(birth) ? birth : null,
    membership_type,
    membership_status,
    errors,
  };
}

export function toCsv(headers: string[], rows: string[][]) {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
    return value;
  };
  return [headers, ...rows].map((row) => row.map((value) => escape(value ?? "")).join(",")).join("\n");
}
