// Lantern Lane Repair Café: a fictional volunteer repair café used for this demo.
// All data lives here so the page, the booking rules and the assistant read one source.

/** What the café can look at, grouped by the fixer skill each needs. */
export const CATEGORIES = [
  { id: "small-electrical", name: "Small electrical", skill: "electrical",
    examples: "lamps, toasters, kettles, fans, hair dryers, radios",
    notes: "Bring the power cord and any adapter. We test with a PAT tester before and after." },
  { id: "electronics", name: "Electronics", skill: "electronics",
    examples: "headphones, speakers, game controllers, keyboards, phone charging ports",
    notes: "Back up your data first. We do not unlock, jailbreak or bypass security on any device." },
  { id: "textiles", name: "Clothing & textiles", skill: "sewing",
    examples: "seams, hems, zips, buttons, patches, bag straps",
    notes: "Wash the item first. Bring matching thread or a replacement zip if you have one." },
  { id: "bicycles", name: "Bicycles", skill: "bikes",
    examples: "punctures, brakes, gears, chains, lights",
    notes: "Bring the bike clean, with an inner tube in the right size if you suspect a puncture." },
  { id: "furniture-wood", name: "Furniture & wood", skill: "woodwork",
    examples: "wobbly chairs, loose joints, drawer runners, small frames",
    notes: "Items must fit through a standard door and be carried in by you." },
  { id: "toys", name: "Toys", skill: "electronics",
    examples: "battery toys, ride-on toy wiring, soft-toy seams",
    notes: "Remove batteries before you arrive." },
  { id: "jewellery", name: "Jewellery", skill: "jewellery",
    examples: "broken chains, clasps, jump rings, re-stringing beads",
    notes: "We do not resize rings, solder precious metals or value items." },
  { id: "knives-tools", name: "Knife & tool sharpening", skill: "sharpening",
    examples: "kitchen knives, scissors, garden shears",
    notes: "Wrap blades in cloth or cardboard to carry them in." },
];

/** Items the café refuses for safety or legal reasons, with the reason it gives. */
export const NOT_ACCEPTED = [
  { id: "gas", keywords: ["gas", "boiler", "propane", "butane", "gas hob", "gas heater"],
    reason: "Gas appliances need a registered gas engineer. We cannot open or test them." },
  { id: "microwave", keywords: ["microwave"],
    reason: "Microwave ovens hold dangerous high-voltage charge even when unplugged." },
  { id: "crt", keywords: ["crt", "tube tv", "cathode"],
    reason: "Old tube (CRT) televisions and monitors store lethal voltage." },
  { id: "swollen-battery", keywords: ["swollen", "bulging battery", "puffy battery", "battery smoking"],
    reason: "Swollen or damaged lithium batteries are a fire risk. Take them to a battery recycling point." },
  { id: "large-appliance", keywords: ["washing machine", "dishwasher", "fridge", "freezer", "dryer", "oven", "cooker"],
    reason: "Large appliances do not fit our tables and need a home visit from a technician." },
  { id: "weapons", keywords: ["gun", "firearm", "airsoft", "crossbow"],
    reason: "We do not work on firearms, airguns or weapons of any kind." },
  { id: "medical", keywords: ["hearing aid", "pacemaker", "insulin", "cpap", "wheelchair motor"],
    reason: "Medical devices must be serviced by the maker or a certified technician." },
];

/**
 * Sessions on the café calendar. Each has a fixed number of table slots per skill.
 * Times are local to the café (America/New_York).
 */
export const SESSIONS = [
  { id: "2026-12-05", date: "2026-12-05", start: "10:00", end: "13:00", venue: "Lantern Lane Library, Community Room",
    slots: { electrical: 6, electronics: 4, sewing: 6, bikes: 4, woodwork: 2, jewellery: 0, sharpening: 6 } },
  { id: "2026-12-19", date: "2026-12-19", start: "10:00", end: "13:00", venue: "Lantern Lane Library, Community Room",
    slots: { electrical: 6, electronics: 4, sewing: 4, bikes: 0, woodwork: 2, jewellery: 3, sharpening: 6 } },
  { id: "2027-01-09", date: "2027-01-09", start: "10:00", end: "13:00", venue: "Old Mill Hall",
    slots: { electrical: 8, electronics: 6, sewing: 6, bikes: 4, woodwork: 4, jewellery: 3, sharpening: 8 } },
  { id: "2027-01-23", date: "2027-01-23", start: "10:00", end: "13:00", venue: "Lantern Lane Library, Community Room",
    slots: { electrical: 6, electronics: 4, sewing: 6, bikes: 0, woodwork: 2, jewellery: 0, sharpening: 6 } },
  { id: "2027-02-06", date: "2027-02-06", start: "10:00", end: "13:00", venue: "Old Mill Hall",
    slots: { electrical: 8, electronics: 6, sewing: 6, bikes: 4, woodwork: 4, jewellery: 3, sharpening: 8 } },
];

/** House rules every visitor sees. */
export const HOUSE_RULES = [
  "Repairs are free. Donations to cover parts and tea are welcome but never required.",
  "You stay with your item and learn alongside the fixer; we do not keep items overnight.",
  "One booked item per person per session, so more neighbours get a turn.",
  "Fixers are volunteers. We cannot guarantee a repair, and you accept the item back as it is.",
  "Spare parts are not stocked. If a part is needed, the fixer writes down what to buy.",
  "Cancel at least 24 hours before the session so the slot can go to someone else.",
];

/** Contact and walk-in details for things the café does not do through this page. */
export const CONTACT = {
  email: "hello@lanternlane-repair.example",
  walkIns: "Walk-ins are welcome in the last hour of each session if a fixer is free.",
};
