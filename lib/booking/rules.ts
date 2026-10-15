/** UI mirror of the lap-booking checks enforced in private.assert_can_book. */

export type BookingInput = {
  now: Date;
  slotStarts: Date;
  blocked: boolean;
  capacity: number;
  bookedCount: number;
  alreadyBooked: boolean;
  isMember: boolean;
  isLapSwimmer: boolean;
  weeklyCount: number;
  maxPerWeek: number;
  maxAdvanceDays: number;
};

export type RuleResult = { ok: true } | { ok: false; reason: string };

export function evaluateBooking(input: BookingInput): RuleResult {
  if (input.alreadyBooked) return { ok: false, reason: "You already have this lane." };
  if (!input.isMember) return { ok: false, reason: "You need an active membership for this season." };
  if (!input.isLapSwimmer) return { ok: false, reason: "Sign the lap swim waiver before booking." };
  if (input.blocked) return { ok: false, reason: "That lane is blocked." };
  if (input.slotStarts.getTime() <= input.now.getTime()) {
    return { ok: false, reason: "That lane time has already started." };
  }
  const advanceMs = input.maxAdvanceDays * 24 * 60 * 60 * 1000;
  if (input.slotStarts.getTime() > input.now.getTime() + advanceMs) {
    return { ok: false, reason: `You can only book ${input.maxAdvanceDays} days ahead.` };
  }
  if (input.bookedCount >= input.capacity) return { ok: false, reason: "That lane is full." };
  if (input.weeklyCount >= input.maxPerWeek) {
    return { ok: false, reason: `You have reached the weekly booking limit (${input.maxPerWeek}).` };
  }
  return { ok: true };
}

export function evaluateCancel(input: { now: Date; slotStarts: Date; cutoffMs: number; isAdmin: boolean }): RuleResult {
  if (input.isAdmin) return { ok: true };
  if (input.now.getTime() > input.slotStarts.getTime() - input.cutoffMs) {
    return { ok: false, reason: "Cancellations close before the cutoff." };
  }
  return { ok: true };
}

export function localDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function evaluateGateReveal(input: {
  now: Date;
  slotStarts: Date;
  timeZone: string;
  isBooker: boolean;
  active: boolean;
  buddyCount: number;
  minBuddies: number;
  waiverValid: boolean;
  hasCode: boolean;
}): RuleResult {
  if (!input.isBooker) return { ok: false, reason: "This booking is not yours." };
  if (!input.active) return { ok: false, reason: "This booking is not active." };
  if (localDate(input.slotStarts, input.timeZone) !== localDate(input.now, input.timeZone)) {
    return { ok: false, reason: "The gate code is shown only on the day of your booking." };
  }
  if (!input.waiverValid) return { ok: false, reason: "Your waiver is not on file for this season." };
  if (input.buddyCount < input.minBuddies) {
    return { ok: false, reason: "The buddy rule is not met yet. Invite another cleared swimmer." };
  }
  if (!input.hasCode) return { ok: false, reason: "No gate code is on file yet." };
  return { ok: true };
}

export function buddyMet(count: number, minBuddies: number) {
  return count >= minBuddies;
}
