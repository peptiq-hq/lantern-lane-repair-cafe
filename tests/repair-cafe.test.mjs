import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RepairDesk } from "../js/repair-desk.js";
import { registerActions } from "../site-actions.js";
import { AssistantMount } from "../site.js";
import { App } from "../js/app.js";

RepairDesk.now = () => new Date("2026-11-16T12:00:00");

function fresh() { return new RepairDesk(null); }
const sam = { sessionId: "2027-01-09", categoryId: "furniture-wood", item: "kitchen chair", problem: "one leg loose", name: "Sam Ortiz", email: "sam.ortiz@example.com" };

test("refused items are refused with a reason", () => {
  const d = fresh();
  for (const t of ["sparking microwave", "gas heater won't light", "my phone has a swollen battery", "old CRT monitor"]) {
    const r = d.checkItem({ description: t });
    assert.equal(r.ok, true); assert.equal(r.accepted, false); assert.ok(r.reason.length > 10);
  }
});

test("accepted item with category lists sessions with space", () => {
  const r = fresh().checkItem({ description: "lamp flickers", categoryId: "small-electrical" });
  assert.equal(r.accepted, true);
  assert.ok(r.sessions.length >= 1);
  assert.ok(r.sessions.every((s) => s.slotsLeft > 0));
});

test("find_sessions skips sessions with no slots for that skill", () => {
  const r = fresh().findSessions({ categoryId: "bicycles" });
  assert.deepEqual(r.sessions.map((s) => s.id), ["2026-12-05", "2027-01-09", "2027-02-06"]);
});

test("past sessions are hidden and refused", () => {
  RepairDesk.now = () => new Date("2026-12-10T12:00:00");
  const d = fresh();
  assert.ok(!d.getState().upcomingSessions.some((s) => s.id === "2026-12-05"));
  assert.equal(d.checkBooking({ ...sam, sessionId: "2026-12-05" }).ok, false);
  RepairDesk.now = () => new Date("2026-11-16T12:00:00");
});

test("booking takes a slot, gives a code, and stale versions are refused", () => {
  const d = fresh();
  const before = d.findSessions({ categoryId: "furniture-wood" }).sessions.find((s) => s.id === "2027-01-09").slotsLeft;
  assert.equal(d.placeBooking({ ...sam, expectedVersion: 99 }).ok, false);
  const r = d.placeBooking({ ...sam, expectedVersion: d.version });
  assert.equal(r.ok, true); assert.match(r.booking.code, /^LL-[A-Z2-9]{4}$/);
  const after = d.findSessions({ categoryId: "furniture-wood" }).sessions.find((s) => s.id === "2027-01-09").slotsLeft;
  assert.equal(after, before - 1);
  assert.equal(d.getState().latestBooking.code, r.booking.code);
});

test("one booking per email per session", () => {
  const d = fresh();
  assert.equal(d.placeBooking(sam).ok, true);
  const again = d.placeBooking({ ...sam, categoryId: "textiles", item: "jacket zip" });
  assert.equal(again.ok, false); assert.equal(again.field, "email");
});

test("refused item cannot be booked even under another category", () => {
  const r = fresh().checkBooking({ ...sam, categoryId: "small-electrical", item: "microwave" });
  assert.equal(r.ok, false); assert.equal(r.field, "item");
});

test("full sessions refuse bookings", () => {
  const d = fresh();
  for (let i = 0; i < 4; i++) assert.equal(d.placeBooking({ ...sam, email: `p${i}@example.com` }).ok, true);
  const r = d.checkBooking({ ...sam, email: "late@example.com" });
  assert.equal(r.ok, false); assert.equal(r.field, "sessionId");
});

test("missing name or bad email refused before anything changes", () => {
  const d = fresh(); const v = d.version;
  assert.equal(d.placeBooking({ ...sam, name: "" }).field, "name");
  assert.equal(d.placeBooking({ ...sam, email: "nope" }).field, "email");
  assert.equal(d.version, v); assert.equal(d.bookings.length, 0);
});

test("look up and cancel frees the slot; double cancel refused", () => {
  const d = fresh();
  const { booking } = d.placeBooking(sam);
  assert.equal(d.lookUpBooking({ code: booking.code.toLowerCase(), email: sam.email.toUpperCase() }).ok, true);
  assert.equal(d.lookUpBooking({ code: booking.code, email: "other@example.com" }).ok, false);
  assert.equal(d.cancelBooking({ code: booking.code, email: sam.email }).ok, true);
  assert.equal(d.checkCancel({ code: booking.code, email: sam.email }).ok, false);
  assert.equal(d.placeBooking(sam).ok, true);
});

test("late cancel gets a notice", () => {
  RepairDesk.now = () => new Date("2027-01-08T12:00:00");
  const d = fresh(); const { booking } = d.placeBooking(sam);
  assert.ok(d.checkCancel({ code: booking.code, email: sam.email }).lateNotice);
  RepairDesk.now = () => new Date("2026-11-16T12:00:00");
});

test("fill_booking_form keeps other fields and bumps the version", () => {
  const d = fresh();
  d.fillBookingForm({ item: "jacket" }); const v = d.version;
  const r = d.fillBookingForm({ sessionId: "2027-01-09" });
  assert.equal(r.version, v + 1); assert.equal(r.bookingForm.item, "jacket");
  assert.equal(d.fillBookingForm({ sessionId: "1999-01-01" }).ok, false);
});

test("site-actions registers exactly the manifest's agentTools with valid effects", () => {
  const manifest = JSON.parse(readFileSync(new URL("../agent-manifest.json", import.meta.url)));
  const defs = [];
  registerActions({ register: (d) => defs.push(d) });
  assert.deepEqual(defs.map((d) => d.name).sort(), [...manifest.actions.agentTools].sort());
  const effects = Object.fromEntries(defs.map((d) => [d.name, d.effect]));
  assert.equal(effects.place_booking, "irreversible"); assert.equal(effects.cancel_booking, "irreversible");
  assert.equal(effects.fill_booking_form, "write");
  for (const d of defs) { assert.equal(d.inputSchema.type, "object"); assert.equal(typeof d.execute, "function"); }
  const irreversible = defs.filter((d) => d.effect === "irreversible").map((d) => d.name).sort();
  assert.deepEqual(Object.keys(AssistantMount.DIALOGS).sort(), irreversible);
  const state = defs.find((d) => d.name === "get_cafe_state").execute({});
  assert.equal(state.cafe, "Lantern Lane Repair Café");
});

test("confirmation dialog shows details, and refuses what the site would refuse", () => {
  const item = { action: "place_booking", origin: "http://localhost:8080", effect: "irreversible", arguments: { ...sam, expectedVersion: App.page.desk.version } };
  const ok = AssistantMount.dialogContent(item);
  assert.equal(ok.refusal, undefined); assert.equal(ok.details.Email, sam.email); assert.equal(ok.confirm, "Book the slot");
  const bad = AssistantMount.dialogContent({ ...item, arguments: { ...item.arguments, item: "microwave" } });
  assert.ok(bad.refusal);
  for (const d of Object.values(AssistantMount.DIALOGS)) assert.notEqual(d.confirm, d.decline);
});
