export type IcsEvent = {
  uid: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location?: string | null;
};

function stamp(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function text(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}

export function buildIcs(events: IcsEvent[], calendarName = "Las Trampas Pool") {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Las Trampas Pool//Member schedule//EN",
    `X-WR-CALNAME:${text(calendarName)}`,
    "CALSCALE:GREGORIAN",
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${text(event.uid)}@lastrampaspool.com`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(event.starts_at)}`,
      `DTEND:${stamp(event.ends_at)}`,
      `SUMMARY:${text(event.title)}`,
      `LOCATION:${text(event.location || "Las Trampas Pool")}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
