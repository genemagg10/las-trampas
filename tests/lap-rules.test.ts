import assert from "node:assert/strict";
import test from "node:test";
import { checkCaps, coverPullers, isUnlocked, pickRun } from "../lib/lap/rules.ts";

const s = (iso: string, min = 30) => ({ starts_at: iso, ends_at: new Date(new Date(iso).getTime() + min * 60000).toISOString() });
// Monday Oct 19 2026, 9am PT
const mon = new Date("2026-10-19T16:00:00Z");

test("60 minutes a day", () => {
  assert.equal(checkCaps({ now: mon, existing: [], adding: [s("2026-10-20T13:00:00Z"), s("2026-10-20T13:30:00Z")] }), null);
  assert.match(checkCaps({ now: mon, existing: [s("2026-10-20T13:00:00Z", 60)], adding: [s("2026-10-20T15:00:00Z")] }) ?? "", /60 minutes/);
});

test("3 days a week", () => {
  const existing = [s("2026-10-20T13:00:00Z"), s("2026-10-21T13:00:00Z"), s("2026-10-22T13:00:00Z")];
  assert.match(checkCaps({ now: mon, existing, adding: [s("2026-10-23T13:00:00Z")] }) ?? "", /3 days/);
  assert.equal(checkCaps({ now: mon, existing, adding: [s("2026-10-26T13:00:00Z")] }), null);
});

test("Wednesday unlocks the current week", () => {
  const wed = new Date("2026-10-21T16:00:00Z");
  assert.equal(isUnlocked(wed, "2026-10-23T13:00:00Z"), true);
  assert.equal(isUnlocked(wed, "2026-10-26T13:00:00Z"), false);
  assert.equal(isUnlocked(mon, "2026-10-23T13:00:00Z"), false);
  const existing = [s("2026-10-20T13:00:00Z"), s("2026-10-21T13:00:00Z"), s("2026-10-22T13:00:00Z")];
  assert.equal(checkCaps({ now: wed, existing, adding: [s("2026-10-23T13:00:00Z", 30), s("2026-10-23T13:30:00Z"), s("2026-10-23T14:00:00Z")] }), null);
});

test("Sunday Social counts as one hour", () => {
  assert.equal(checkCaps({ now: mon, existing: [], adding: [s("2026-10-25T15:00:00Z", 90)] }), null);
});

test("pickRun builds 90 minutes and covers", () => {
  const slots = [0, 1, 2, 3].map((i) => ({ id: `x${i}`, ...s(new Date(Date.parse("2026-10-20T12:00:00Z") + i * 1800000).toISOString()), capacity: 6, booked: 0 }));
  const run = pickRun(slots, "x1", 90);
  assert.ok(Array.isArray(run) && run.length === 3);
  assert.equal(typeof pickRun(slots, "x3", 60), "string");
  assert.deepEqual([...coverPullers(slots)], ["x0"]);
});
