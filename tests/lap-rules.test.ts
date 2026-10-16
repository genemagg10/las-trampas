import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_POLICY, checkCaps, coverPullers, isLateCancel, pickRun, strikeStatus } from "../lib/lap/rules.ts";

const s = (iso: string, min = 30) => ({ starts_at: iso, ends_at: new Date(new Date(iso).getTime() + min * 60000).toISOString() });
const now = new Date("2026-10-19T16:00:00Z");

test("caps are off by default", () => {
  const existing = [s("2026-10-20T13:00:00Z", 90), s("2026-10-21T13:00:00Z"), s("2026-10-22T13:00:00Z")];
  assert.equal(checkCaps({ policy: DEFAULT_POLICY, existing, adding: [s("2026-10-23T13:00:00Z", 90)] }), null);
});

test("caps apply when the board turns them on", () => {
  const policy = { ...DEFAULT_POLICY, caps_enabled: true };
  assert.match(checkCaps({ policy, existing: [s("2026-10-20T13:00:00Z", 60)], adding: [s("2026-10-20T15:00:00Z")] }) ?? "", /minutes/);
  const existing = [s("2026-10-20T13:00:00Z"), s("2026-10-21T13:00:00Z"), s("2026-10-22T13:00:00Z")];
  assert.match(checkCaps({ policy, existing, adding: [s("2026-10-23T13:00:00Z")] }) ?? "", /days/);
});

test("late cancel is under 12 hours", () => {
  assert.equal(isLateCancel(now, "2026-10-20T03:00:00Z", DEFAULT_POLICY), true);
  assert.equal(isLateCancel(now, "2026-10-20T05:00:00Z", DEFAULT_POLICY), false);
});

test("3 strikes in 60 days suspends for 14 days", () => {
  const st = (d: string, cleared: string | null = null) => ({ id: d, reason: "no_show", points: 1, created_at: d, cleared_at: cleared });
  const three = [st("2026-09-01T00:00:00Z"), st("2026-10-01T00:00:00Z"), st("2026-10-15T00:00:00Z")];
  assert.equal(strikeStatus(three, DEFAULT_POLICY, now).suspendedUntil?.toISOString(), "2026-10-29T00:00:00.000Z");
  assert.equal(strikeStatus(three, DEFAULT_POLICY, new Date("2026-10-30T00:00:00Z")).suspendedUntil, null);
  const old = [st("2026-08-01T00:00:00Z"), three[1], three[2]];
  assert.equal(strikeStatus(old, DEFAULT_POLICY, now).suspendedUntil, null);
  const cleared = [three[0], three[1], st("2026-10-15T00:00:00Z", "2026-10-16T00:00:00Z")];
  assert.equal(strikeStatus(cleared, DEFAULT_POLICY, now).points, 2);
});

test("pickRun builds 90 minutes and covers", () => {
  const slots = [0, 1, 2, 3].map((i) => ({ id: `x${i}`, ...s(new Date(Date.parse("2026-10-20T12:00:00Z") + i * 1800000).toISOString()), capacity: 6, booked: 0 }));
  const run = pickRun(slots, "x1", 90);
  assert.ok(Array.isArray(run) && run.length === 3);
  assert.equal(typeof pickRun(slots, "x3", 60), "string");
  assert.deepEqual([...coverPullers(slots)], ["x0"]);
});
