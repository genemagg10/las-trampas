// Lap swim rules (Phelps, Oct 2026). Pure functions so they can be unit tested.
export const ZONE = "America/Los_Angeles";
export const DAY_LIMIT = 3;
export const MINUTE_LIMIT = 60;

export type SlotLite = { id: string; starts_at: string; ends_at: string; capacity: number; booked: number; blocked?: boolean };

export function laDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

// 1 = Monday ... 7 = Sunday, in pool time.
export function isoDow(day: string): number {
  const d = new Date(`${day}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function weekStart(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (isoDow(day) - 1));
  return d.toISOString().slice(0, 10);
}

export function minutesOf(slot: { starts_at: string; ends_at: string }) {
  return Math.round((new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime()) / 60000);
}

export function isSocial(slot: { starts_at: string; ends_at: string }) {
  return minutesOf(slot) >= 90;
}

// Extra days and minutes unlock automatically from Wednesday for open slots in the current week.
export function isUnlocked(now: Date, slotStart: string) {
  const today = laDate(now);
  return weekStart(today) === weekStart(laDate(slotStart)) && isoDow(today) >= 3;
}

export function checkCaps(input: {
  now: Date;
  existing: { starts_at: string; ends_at: string }[];
  adding: { starts_at: string; ends_at: string }[];
}): string | null {
  const all = [...input.existing];
  for (const slot of input.adding) {
    if (isUnlocked(input.now, slot.starts_at)) {
      all.push(slot);
      continue;
    }
    const day = laDate(slot.starts_at);
    const sameDay = all.filter((s) => laDate(s.starts_at) === day);
    const minutes = sameDay.reduce((sum, s) => sum + Math.min(minutesOf(s), MINUTE_LIMIT), 0) + Math.min(minutesOf(slot), MINUTE_LIMIT);
    if (minutes > MINUTE_LIMIT) return `The limit is ${MINUTE_LIMIT} minutes a day. Extra time opens up for open slots from Wednesday.`;
    const week = weekStart(day);
    const days = new Set(all.filter((s) => weekStart(laDate(s.starts_at)) === week).map((s) => laDate(s.starts_at)));
    if (!days.has(day) && days.size >= DAY_LIMIT) return `The limit is ${DAY_LIMIT} days a week. Extra days open up for open slots from Wednesday.`;
    all.push(slot);
  }
  return null;
}

// Consecutive 30-minute slots from one start time (30, 60 or 90 minutes).
export function pickRun(slots: SlotLite[], startId: string, minutes: number): SlotLite[] | string {
  const sorted = [...slots].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const i = sorted.findIndex((s) => s.id === startId);
  if (i < 0) return "That start time is not available.";
  const first = sorted[i];
  if (isSocial(first)) return [first];
  const run: SlotLite[] = [first];
  let cursor = first;
  while (run.reduce((m, s) => m + minutesOf(s), 0) < minutes) {
    const next = sorted.find((s) => s.starts_at === cursor.ends_at && !isSocial(s));
    if (!next) return "There are not enough back-to-back times from that start.";
    run.push(next);
    cursor = next;
  }
  for (const s of run) {
    if (s.blocked) return "Part of that time is blocked.";
    if (s.booked >= s.capacity) return "Part of that time is full.";
  }
  return run;
}

// First slot of each pool day pulls the covers.
export function coverPullers(slots: { id: string; starts_at: string }[]): Set<string> {
  const first = new Map<string, { id: string; starts_at: string }>();
  for (const s of slots) {
    const day = laDate(s.starts_at);
    const cur = first.get(day);
    if (!cur || s.starts_at < cur.starts_at) first.set(day, s);
  }
  return new Set([...first.values()].map((s) => s.id));
}

// Nearest covered slot (someone else already in) on the same day.
export function nearestCovered<T extends { id: string; starts_at: string }>(target: T, candidates: (T & { others: string[] })[]) {
  const day = laDate(target.starts_at);
  const t = new Date(target.starts_at).getTime();
  return candidates
    .filter((c) => c.id !== target.id && c.others.length > 0 && laDate(c.starts_at) === day && new Date(c.starts_at).getTime() > Date.now() - 1)
    .sort((a, b) => Math.abs(new Date(a.starts_at).getTime() - t) - Math.abs(new Date(b.starts_at).getTime() - t))
    .slice(0, 2);
}
