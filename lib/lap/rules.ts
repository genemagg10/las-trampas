// Lap swim rules (Phelps, Oct 2026). Pure functions so they can be unit tested.
export const ZONE = "America/Los_Angeles";
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

export type LapPolicy = {
  caps_enabled: boolean;
  max_days_per_week: number;
  max_minutes_per_day: number;
  late_cancel_hours: number;
  late_cancel_strikes: number;
  no_show_strikes: number;
  strike_limit: number;
  strike_window_days: number;
  suspension_days: number;
};

// DRAFT defaults; the board approves the policy. Stored in club_settings.lap_policy.
export const DEFAULT_POLICY: LapPolicy = {
  caps_enabled: false,
  max_days_per_week: 3,
  max_minutes_per_day: 60,
  late_cancel_hours: 12,
  late_cancel_strikes: 1,
  no_show_strikes: 1,
  strike_limit: 3,
  strike_window_days: 60,
  suspension_days: 14,
};

// Optional caps, off unless the board turns them on.
export function checkCaps(input: {
  policy: LapPolicy;
  existing: { starts_at: string; ends_at: string }[];
  adding: { starts_at: string; ends_at: string }[];
}): string | null {
  const { policy } = input;
  if (!policy.caps_enabled) return null;
  const all = [...input.existing];
  for (const slot of input.adding) {
    const day = laDate(slot.starts_at);
    const minutes = all.filter((s) => laDate(s.starts_at) === day).reduce((sum, s) => sum + minutesOf(s), 0) + minutesOf(slot);
    if (minutes > policy.max_minutes_per_day) return `The current limit is ${policy.max_minutes_per_day} minutes a day.`;
    const week = weekStart(day);
    const days = new Set(all.filter((s) => weekStart(laDate(s.starts_at)) === week).map((s) => laDate(s.starts_at)));
    if (!days.has(day) && days.size >= policy.max_days_per_week) return `The current limit is ${policy.max_days_per_week} days a week.`;
    all.push(slot);
  }
  return null;
}

export function isLateCancel(now: Date, startsAt: string, policy: LapPolicy) {
  return new Date(startsAt).getTime() - now.getTime() < policy.late_cancel_hours * 3600000;
}

export type Strike = { id: string; reason: string; points: number; created_at: string; cleared_at: string | null };

export function strikeStatus(strikes: Strike[], policy: LapPolicy, now: Date) {
  const windowStart = now.getTime() - policy.strike_window_days * 86400000;
  const active = strikes.filter((s) => !s.cleared_at && new Date(s.created_at).getTime() > windowStart);
  const points = active.reduce((sum, s) => sum + s.points, 0);
  const last = active.reduce((m, s) => Math.max(m, new Date(s.created_at).getTime()), 0);
  const until = points >= policy.strike_limit && last ? new Date(last + policy.suspension_days * 86400000) : null;
  return { points, active, suspendedUntil: until && until > now ? until : null };
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
