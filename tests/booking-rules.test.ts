import assert from "node:assert/strict";
import test from "node:test";
import { buddyMet, evaluateBooking, evaluateCancel, evaluateGateReveal, localDate } from "../lib/booking/rules.ts";

const now = new Date("2027-06-02T15:00:00.000Z");

const base = {
  now,
  slotStarts: new Date("2027-06-03T14:00:00.000Z"),
  blocked: false,
  capacity: 2,
  bookedCount: 0,
  alreadyBooked: false,
  isMember: true,
  isLapSwimmer: true,
  weeklyCount: 0,
  maxPerWeek: 3,
  maxAdvanceDays: 7,
};

test("a cleared member can book an open lane", () => {
  assert.deepEqual(evaluateBooking(base), { ok: true });
});

test("membership and a signed waiver are both required", () => {
  assert.equal(evaluateBooking({ ...base, isMember: false }).ok, false);
  assert.equal(evaluateBooking({ ...base, isLapSwimmer: false }).ok, false);
});

test("weekly limit, capacity, blocks, and the advance window stop a booking", () => {
  const weekly = evaluateBooking({ ...base, weeklyCount: 3 });
  const full = evaluateBooking({ ...base, bookedCount: 2 });
  const blocked = evaluateBooking({ ...base, blocked: true });
  const ahead = evaluateBooking({ ...base, slotStarts: new Date("2027-06-20T14:00:00.000Z") });
  const started = evaluateBooking({ ...base, slotStarts: new Date("2027-06-02T14:00:00.000Z") });
  assert.equal(weekly.ok, false);
  assert.equal(full.ok, false);
  assert.equal(blocked.ok, false);
  assert.equal(ahead.ok, false);
  assert.equal(started.ok, false);
  if (!weekly.ok) assert.match(weekly.reason, /weekly/);
  if (!full.ok) assert.match(full.reason, /full/);
  if (!blocked.ok) assert.match(blocked.reason, /blocked/);
  if (!ahead.ok) assert.match(ahead.reason, /days ahead/);
  if (!started.ok) assert.match(started.reason, /already started/);
});

test("a member cannot cancel inside the cutoff, and an admin can", () => {
  const slotStarts = new Date("2027-06-02T20:00:00.000Z");
  const late = new Date("2027-06-02T12:00:00.000Z");
  assert.equal(evaluateCancel({ now: late, slotStarts, cutoffMs: 12 * 60 * 60 * 1000, isAdmin: false }).ok, false);
  assert.equal(evaluateCancel({ now: late, slotStarts, cutoffMs: 12 * 60 * 60 * 1000, isAdmin: true }).ok, true);
});

test("the gate code is only for the booker, on that day, with a waiver and a buddy", () => {
  const slotStarts = new Date("2027-06-02T16:00:00.000Z");
  const input = {
    now,
    slotStarts,
    timeZone: "America/Los_Angeles",
    isBooker: true,
    active: true,
    buddyCount: 2,
    minBuddies: 2,
    waiverValid: true,
    hasCode: true,
  };
  assert.equal(evaluateGateReveal(input).ok, true);
  assert.equal(evaluateGateReveal({ ...input, now: new Date("2027-06-01T16:00:00.000Z") }).ok, false);
  assert.equal(evaluateGateReveal({ ...input, buddyCount: 1 }).ok, false);
  assert.equal(evaluateGateReveal({ ...input, waiverValid: false }).ok, false);
  assert.equal(evaluateGateReveal({ ...input, isBooker: false }).ok, false);
  assert.equal(evaluateGateReveal({ ...input, hasCode: false }).ok, false);
  assert.equal(buddyMet(2, 2), true);
  assert.equal(localDate(slotStarts, "America/Los_Angeles"), "2027-06-02");
});
