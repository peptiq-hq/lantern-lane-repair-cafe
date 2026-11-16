// Booking rules for Lantern Lane Repair Café. No DOM here: the page and the assistant
// both call these methods, so there is one set of rules.
import { CATEGORIES, NOT_ACCEPTED, SESSIONS, HOUSE_RULES, CONTACT } from "./cafe-data.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class RepairDesk {
  /** Clock used for "upcoming" checks; tests replace it. */
  static now = () => new Date();

  constructor(storage = null) {
    this.storage = storage;
    this.version = 0;
    this.bookings = [];
    this.form = RepairDesk.emptyForm();
    this.load();
  }

  static emptyForm() {
    return { sessionId: "", categoryId: "", item: "", problem: "", name: "", email: "" };
  }

  static categoryIds() { return CATEGORIES.map((c) => c.id); }
  static sessionIds() { return SESSIONS.map((s) => s.id); }

  load() {
    if (!this.storage) return;
    try {
      const saved = JSON.parse(this.storage.getItem("lanternlane.bookings") || "[]");
      if (Array.isArray(saved)) this.bookings = saved;
    } catch { this.bookings = []; }
  }

  save() {
    if (this.storage) this.storage.setItem("lanternlane.bookings", JSON.stringify(this.bookings));
  }

  /** Today's date as YYYY-MM-DD in local time. */
  static today() {
    const d = RepairDesk.now();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /** Slots left for one skill at one session, after active bookings. */
  slotsLeft(session, skill) {
    const used = this.bookings.filter((b) => b.status === "booked" && b.sessionId === session.id
      && CATEGORIES.find((c) => c.id === b.categoryId)?.skill === skill).length;
    return Math.max(0, (session.slots[skill] || 0) - used);
  }

  upcomingSessions() {
    const today = RepairDesk.today();
    return SESSIONS.filter((s) => s.date >= today);
  }

  sessionView(session) {
    const left = {};
    for (const c of CATEGORIES) left[c.id] = this.slotsLeft(session, c.skill);
    return { id: session.id, date: session.date, start: session.start, end: session.end, venue: session.venue, slotsLeftByCategory: left };
  }

  /** Everything the page shows, as plain JSON. */
  getState() {
    const latest = this.bookings[this.bookings.length - 1];
    return {
      cafe: "Lantern Lane Repair Café",
      today: RepairDesk.today(),
      version: this.version,
      categories: CATEGORIES.map((c) => ({ id: c.id, name: c.name, examples: c.examples, notes: c.notes })),
      notAccepted: NOT_ACCEPTED.map((n) => ({ id: n.id, examples: n.keywords.slice(0, 3).join(", "), reason: n.reason })),
      houseRules: HOUSE_RULES.slice(),
      contact: { ...CONTACT },
      upcomingSessions: this.upcomingSessions().map((s) => this.sessionView(s)),
      bookingForm: { ...this.form },
      latestBooking: latest ? RepairDesk.receipt(latest) : null,
    };
  }

  static receipt(b) {
    const s = SESSIONS.find((x) => x.id === b.sessionId);
    const c = CATEGORIES.find((x) => x.id === b.categoryId);
    return { code: b.code, status: b.status, session: s ? `${s.date} ${s.start}-${s.end}, ${s.venue}` : b.sessionId,
      category: c ? c.name : b.categoryId, item: b.item };
  }

  /** Is this item something the café refuses? Returns the matching rule or null. */
  static refusedRule(text) {
    const t = ` ${String(text || "").toLowerCase()} `;
    return NOT_ACCEPTED.find((n) => n.keywords.some((k) => t.includes(k))) || null;
  }

  /** Check whether an item can come to the café, and where it could go. */
  checkItem(args) {
    const description = String(args.description || "").trim();
    if (!description) return { ok: false, reason: "Describe the item and what is wrong with it.", field: "description" };
    const refused = RepairDesk.refusedRule(description);
    if (refused) return { ok: true, accepted: false, reason: refused.reason, contact: CONTACT.email };
    if (!args.categoryId) {
      return { ok: true, accepted: "depends on category", reason: "Not on the refused list. Pick the category that fits to see sessions with free slots.",
        categories: CATEGORIES.map((c) => ({ id: c.id, name: c.name, examples: c.examples })) };
    }
    const c = CATEGORIES.find((x) => x.id === args.categoryId);
    if (!c) return { ok: false, reason: "Unknown category.", field: "categoryId" };
    return { ok: true, accepted: true, category: c.name, notes: c.notes, sessions: this.findSessions({ categoryId: c.id }).sessions };
  }

  /** Upcoming sessions with at least one free slot for a category. */
  findSessions(args) {
    const c = CATEGORIES.find((x) => x.id === args.categoryId);
    if (!c) return { ok: false, reason: "Unknown category.", field: "categoryId" };
    const sessions = this.upcomingSessions()
      .map((s) => ({ id: s.id, date: s.date, start: s.start, end: s.end, venue: s.venue, slotsLeft: this.slotsLeft(s, c.skill) }))
      .filter((s) => s.slotsLeft > 0);
    return { ok: true, category: c.name, sessions };
  }

  /** Put details into the visible booking form. Reversible: the visitor can edit or clear it. */
  fillBookingForm(args) {
    const next = { ...this.form };
    for (const key of Object.keys(next)) if (typeof args[key] === "string") next[key] = args[key].trim();
    if (next.sessionId && !SESSIONS.some((s) => s.id === next.sessionId)) return { ok: false, reason: "Unknown session.", field: "sessionId" };
    if (next.categoryId && !CATEGORIES.some((c) => c.id === next.categoryId)) return { ok: false, reason: "Unknown category.", field: "categoryId" };
    this.form = next;
    this.version += 1;
    return { ok: true, version: this.version, bookingForm: { ...this.form } };
  }

  clearForm() {
    this.form = RepairDesk.emptyForm();
    this.version += 1;
    return { ok: true, version: this.version };
  }

  /** Read-only check before placing a booking. Returns {ok:true, summary} or {ok:false, reason, field}. */
  checkBooking(args) {
    if (Number.isInteger(args.expectedVersion) && args.expectedVersion !== this.version) {
      return { ok: false, reason: "The page changed since you last read it. Read the page again and retry.", field: "expectedVersion" };
    }
    const s = SESSIONS.find((x) => x.id === args.sessionId);
    if (!s) return { ok: false, reason: "Unknown session.", field: "sessionId" };
    if (s.date < RepairDesk.today()) return { ok: false, reason: "That session has already happened.", field: "sessionId" };
    const c = CATEGORIES.find((x) => x.id === args.categoryId);
    if (!c) return { ok: false, reason: "Unknown category.", field: "categoryId" };
    const item = String(args.item || "").trim();
    if (!item) return { ok: false, reason: "Say what the item is.", field: "item" };
    const refused = RepairDesk.refusedRule(`${item} ${args.problem || ""}`);
    if (refused) return { ok: false, reason: refused.reason, field: "item" };
    if (this.slotsLeft(s, c.skill) <= 0) return { ok: false, reason: `No ${c.name.toLowerCase()} slots are left on ${s.date}.`, field: "sessionId" };
    const name = String(args.name || "").trim();
    if (name.length < 2) return { ok: false, reason: "A name is needed for the booking.", field: "name" };
    const email = String(args.email || "").trim().toLowerCase();
    if (!EMAIL.test(email)) return { ok: false, reason: "A valid email is needed so the café can reach you.", field: "email" };
    if (this.bookings.some((b) => b.status === "booked" && b.sessionId === s.id && b.email === email)) {
      return { ok: false, reason: "House rule: one booked item per person per session. This email already has a booking that day.", field: "email" };
    }
    return { ok: true, summary: { session: `${s.date} ${s.start}-${s.end}, ${s.venue}`, category: c.name, item, problem: String(args.problem || "").trim(), name, email } };
  }

  /** Place a booking. Irreversible from the visitor's point of view: it takes a slot and creates a code. */
  placeBooking(args) {
    const check = this.checkBooking(args);
    if (!check.ok) return check;
    const code = RepairDesk.newCode(this.bookings.map((b) => b.code));
    const booking = { code, status: "booked", sessionId: args.sessionId, categoryId: args.categoryId,
      item: check.summary.item, problem: check.summary.problem, name: check.summary.name, email: check.summary.email };
    this.bookings.push(booking);
    this.form = RepairDesk.emptyForm();
    this.version += 1;
    this.save();
    return { ok: true, version: this.version, booking: RepairDesk.receipt(booking),
      reminder: "Bring the item, any cables or parts, and arrive at the start time. Cancel at least 24 hours ahead if you cannot come." };
  }

  static newCode(taken) {
    for (;;) {
      let code = "LL-";
      const bytes = new Uint8Array(4);
      globalThis.crypto.getRandomValues(bytes);
      for (const b of bytes) code += CODE_CHARS[b % CODE_CHARS.length];
      if (!taken.includes(code)) return code;
    }
  }

  findBooking(code, email) {
    const c = String(code || "").trim().toUpperCase();
    const e = String(email || "").trim().toLowerCase();
    return this.bookings.find((b) => b.code === c && b.email === e) || null;
  }

  lookUpBooking(args) {
    const b = this.findBooking(args.code, args.email);
    if (!b) return { ok: false, reason: "No booking matches that code and email.", field: "code" };
    return { ok: true, booking: RepairDesk.receipt(b) };
  }

  /** Read-only check before cancelling. */
  checkCancel(args) {
    const b = this.findBooking(args.code, args.email);
    if (!b) return { ok: false, reason: "No booking matches that code and email.", field: "code" };
    if (b.status !== "booked") return { ok: false, reason: "That booking is already cancelled.", field: "code" };
    const s = SESSIONS.find((x) => x.id === b.sessionId);
    if (s && s.date < RepairDesk.today()) return { ok: false, reason: "That session has already happened.", field: "code" };
    const lessThanADay = s ? s.date <= RepairDesk.dayAfter(RepairDesk.today()) : false;
    return { ok: true, booking: RepairDesk.receipt(b), lateNotice: lessThanADay ? "This is less than 24 hours' notice. The slot may not be re-booked in time, but cancelling still helps." : null };
  }

  static dayAfter(ymd) {
    const d = new Date(`${ymd}T12:00:00`);
    d.setDate(d.getDate() + 1);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  cancelBooking(args) {
    const check = this.checkCancel(args);
    if (!check.ok) return check;
    const b = this.findBooking(args.code, args.email);
    b.status = "cancelled";
    this.version += 1;
    this.save();
    return { ok: true, version: this.version, booking: RepairDesk.receipt(b) };
  }
}
