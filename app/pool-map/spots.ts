export type Spot = {
  n: number;
  name: string;
  x: number; // percent from left of the map image
  y: number; // percent from top
  status: "confirmed" | "tbc";
  note: string;
  source: string;
};

// Positions are read off the USGS NAIP aerial of 640 St. Mary's Road.
// "tbc" = the feature is confirmed to exist, but where it sits on the deck is not yet verified.
export const spots: Spot[] = [
  { n: 1, name: "Lap pool · 6 lanes × 25 yd", x: 43, y: 44, status: "confirmed", note: "Six lanes, 25 yards. Lap swim, swim team, and rec swim.", source: "lastrampaspool.com home page; visible in the aerial" },
  { n: 2, name: "Diving well", x: 52, y: 29, status: "confirmed", note: "Adjacent to the lap pool, with a diving board.", source: "lastrampaspool.com home page; deeper well visible at the end of the lap pool" },
  { n: 3, name: "Baby pool", x: 45, y: 66, status: "confirmed", note: "For children ages 5 and under.", source: "lastrampaspool.com home page; small round pool visible in the aerial" },
  { n: 4, name: "The lawn", x: 34, y: 34, status: "confirmed", note: "The big lawn for sunbathing, picnics, and member parties.", source: "lastrampaspool.com home page; grass panel visible in the aerial" },
  { n: 5, name: "East lawn", x: 52, y: 57, status: "confirmed", note: "Second grass area beside the deck.", source: "visible in the aerial" },
  { n: 6, name: "Bathhouse", x: 26, y: 61, status: "confirmed", note: "The club building beside the deck (restrooms and changing rooms inside are to be confirmed).", source: "LT History page (bathhouse); building visible in the aerial" },
  { n: 7, name: "Parking lot", x: 30, y: 87, status: "confirmed", note: "Off St. Mary's Road.", source: "LT History page (parking lot); visible in the aerial" },
  { n: 8, name: "Barbecues (2)", x: 26, y: 28, status: "tbc", note: "Two barbecues for member-hosted parties. Exact spot to be confirmed.", source: "lastrampaspool.com home page" },
  { n: 9, name: "Snack Shack", x: 19, y: 47, status: "tbc", note: "Burritos, chips and salsa at events. Exact spot to be confirmed.", source: "Opening Day Party 2026 event page" },
  { n: 10, name: "Basketball hoop & ball wall", x: 61, y: 18, status: "tbc", note: "Exact spot to be confirmed.", source: "lastrampaspool.com home page" },
  { n: 11, name: "Entrance", x: 40, y: 75, status: "tbc", note: "Main gate from the parking lot. Exact spot to be confirmed.", source: "inferred from the aerial" },
];
