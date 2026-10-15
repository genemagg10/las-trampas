import assert from "node:assert/strict";
import test from "node:test";
import { mapMemberRow, parseCsv, toCsv } from "../lib/csv.ts";
import { buildIcs } from "../lib/ics.ts";
import { renderMarkdown } from "../lib/markdown.ts";

test("CSV headers from Membership Toolkit-style exports map onto member fields", () => {
  const rows = parseCsv('Family,First,Last,Email Address,Phone,Role,Year of Birth,Type,Status\n"Rivera, household",Sam,Rivera,Sam.Rivera@example.com,925-555-0101,adult,1984,full,active\n');
  const person = mapMemberRow(rows[0]);
  assert.equal(person.errors.length, 0);
  assert.equal(person.household_name, "Rivera, household");
  assert.equal(person.email, "sam.rivera@example.com");
  assert.equal(person.kind, "adult");
  assert.equal(person.membership_type, "full");
});

test("a row without a name is rejected", () => {
  const person = mapMemberRow({ email: "not-an-email" });
  assert.ok(person.errors.length > 0);
});

test("CSV export quotes commas", () => {
  assert.equal(toCsv(["name"], [["Rivera, household"]]), 'name\n"Rivera, household"');
});

test("an iCal feed lists the member's events and escapes commas", () => {
  const ics = buildIcs([
    {
      uid: "lane-1",
      title: "Lane 1, dawn",
      starts_at: "2027-06-02T14:00:00.000Z",
      ends_at: "2027-06-02T15:00:00.000Z",
      location: "Las Trampas Pool",
    },
  ]);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:Lane 1\\, dawn/);
  assert.match(ics, /DTSTART:20270602T140000Z/);
  assert.match(ics, /END:VCALENDAR/);
});

test("markdown escapes HTML and keeps paragraphs, lists, and bold", () => {
  const html = renderMarkdown("Hello <script>\n\n- **Buddy** rule");
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /<li><strong>Buddy<\/strong> rule<\/li>/);
});
