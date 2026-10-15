/** Working 2027 figures from the scope. The database price list wins when it is connected. */
export const fallbackFees = [
  { item: "renewal", label: "2027 renewal (by Feb 16)", amount_cents: 107500, notes: "Working figure. The board confirms the final amount." },
  { item: "renewal_late", label: "2027 renewal (after Feb 16)", amount_cents: 117500, notes: "Working figure." },
  { item: "volunteer_deposit", label: "Volunteer deposit", amount_cents: 5000, notes: "Earned back when the required shift is completed." },
  { item: "new_member", label: "New member fee", amount_cents: 67500, notes: "After an invitation from the waitlist." },
  { item: "new_member_deposit", label: "New member deposit", amount_cents: 7500, notes: "Refundable. Confirm with the treasurer." },
  { item: "lap_only", label: "Lap-swim-only membership", amount_cents: 52500, notes: "Invitation only." },
  { item: "waitlist_fee", label: "Waitlist application", amount_cents: 10000, notes: "Holds a place on the waitlist." },
  { item: "party_slot", label: "Party reservation", amount_cents: 10000, notes: "An admin approves the reservation." },
] as const;

export const boardRoles = [
  { key: "president", label: "President" },
  { key: "treasurer", label: "Treasurer" },
  { key: "lap_swim_vp", label: "Lap Swim VP" },
  { key: "social", label: "Social chair" },
  { key: "membership", label: "Membership" },
  { key: "communications", label: "Communications" },
  { key: "secretary", label: "Secretary" },
  { key: "webmaster", label: "Webmaster" },
  { key: "seahorses", label: "Swim team liaison" },
] as const;
