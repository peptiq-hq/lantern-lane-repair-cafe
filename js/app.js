// Page script for Lantern Lane Repair Café. It owns the one RepairDesk the page and the
// assistant share, renders it, and wires the page's own forms to the same methods.
import { RepairDesk } from "./repair-desk.js";

const hasDom = typeof document !== "undefined" && typeof document.querySelector === "function";
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

class CafePage {
  constructor() {
    let storage = null;
    try { storage = typeof localStorage !== "undefined" ? localStorage : null; } catch { storage = null; }
    this.desk = new RepairDesk(storage);
  }

  categoryIds() { return RepairDesk.categoryIds(); }
  sessionIds() { return RepairDesk.sessionIds(); }

  getState() { return this.desk.getState(); }
  checkItem(args) { return this.desk.checkItem(args); }
  findSessions(args) { return this.desk.findSessions(args); }
  lookUpBooking(args) { return this.desk.lookUpBooking(args); }
  checkBooking(args) { return this.desk.checkBooking(args); }
  checkCancel(args) { return this.desk.checkCancel(args); }

  fillBookingForm(args) { const r = this.desk.fillBookingForm(args); this.render(); return r; }
  placeBooking(args) { const r = this.desk.placeBooking(args); this.render(); return r; }
  cancelBooking(args) { const r = this.desk.cancelBooking(args); this.render(); return r; }

  /** Draw sessions, the booking form and the latest booking. */
  render() {
    if (!hasDom) return;
    const state = this.desk.getState();
    const cats = state.categories;
    const tbody = document.querySelector("#sessions-body");
    if (tbody) {
      tbody.innerHTML = state.upcomingSessions.map((s) => `<tr><td>${esc(s.date)}</td><td>${esc(s.start)}–${esc(s.end)}</td><td>${esc(s.venue)}</td><td>${
        cats.filter((c) => s.slotsLeftByCategory[c.id] > 0).map((c) => `${esc(c.name)} (${s.slotsLeftByCategory[c.id]})`).join(", ") || "Full"}</td></tr>`).join("")
        || `<tr><td colspan="4">No upcoming sessions are scheduled yet.</td></tr>`;
    }
    const f = state.bookingForm;
    const set = (id, v) => { const el = document.querySelector(id); if (el && el.value !== v) el.value = v; };
    const sessionSel = document.querySelector("#book-session");
    if (sessionSel && sessionSel.options.length <= 1) {
      for (const s of state.upcomingSessions) { const o = document.createElement("option"); o.value = s.id; o.textContent = `${s.date} · ${s.venue}`; sessionSel.appendChild(o); }
    }
    const catSel = document.querySelector("#book-category");
    if (catSel && catSel.options.length <= 1) {
      for (const c of cats) { const o = document.createElement("option"); o.value = c.id; o.textContent = c.name; catSel.appendChild(o); }
    }
    set("#book-session", f.sessionId); set("#book-category", f.categoryId); set("#book-item", f.item);
    set("#book-problem", f.problem); set("#book-name", f.name); set("#book-email", f.email);
    const latest = document.querySelector("#latest-booking");
    if (latest) {
      latest.innerHTML = state.latestBooking
        ? `<strong>${esc(state.latestBooking.status === "booked" ? "Booked" : "Cancelled")}:</strong> ${esc(state.latestBooking.item)} (${esc(state.latestBooking.category)}), ${esc(state.latestBooking.session)}. Code <code>${esc(state.latestBooking.code)}</code>.`
        : "No booking made in this browser yet.";
    }
  }

  readForm() {
    const v = (id) => (document.querySelector(id)?.value || "").trim();
    return { sessionId: v("#book-session"), categoryId: v("#book-category"), item: v("#book-item"), problem: v("#book-problem"), name: v("#book-name"), email: v("#book-email") };
  }

  show(id, text, ok) {
    const el = document.querySelector(id);
    if (el) { el.textContent = text; el.className = ok ? "msg ok" : "msg err"; }
  }

  /** Wire the page's own forms. The page works without the assistant. */
  wire() {
    if (!hasDom) return;
    document.querySelector("#check-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const r = this.checkItem({ description: document.querySelector("#check-desc").value, categoryId: document.querySelector("#check-category").value || undefined });
      if (!r.ok) return this.show("#check-result", r.reason, false);
      if (r.accepted === false) return this.show("#check-result", `Sorry, we can't take this: ${r.reason}`, false);
      if (r.accepted === true) return this.show("#check-result", `Yes — bring it to a ${r.category} table. ${r.notes} Sessions with space: ${r.sessions.map((s) => s.date).join(", ") || "none right now"}.`, true);
      return this.show("#check-result", r.reason, true);
    });
    const catSel = document.querySelector("#check-category");
    if (catSel) for (const c of this.getState().categories) { const o = document.createElement("option"); o.value = c.id; o.textContent = c.name; catSel.appendChild(o); }
    for (const id of ["#book-session", "#book-category", "#book-item", "#book-problem", "#book-name", "#book-email"]) {
      document.querySelector(id)?.addEventListener("change", () => this.desk.fillBookingForm(this.readForm()));
    }
    document.querySelector("#book-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.desk.fillBookingForm(this.readForm());
      const r = this.placeBooking({ ...this.readForm(), expectedVersion: this.desk.version });
      this.show("#book-result", r.ok ? `Booked! Your code is ${r.booking.code}. ${r.reminder}` : r.reason, r.ok);
    });
    document.querySelector("#cancel-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const args = { code: document.querySelector("#cancel-code").value, email: document.querySelector("#cancel-email").value };
      const check = this.checkCancel(args);
      if (!check.ok) return this.show("#cancel-result", check.reason, false);
      const r = this.cancelBooking(args);
      this.show("#cancel-result", r.ok ? `Cancelled ${r.booking.code}. Thank you for freeing the slot.` : r.reason, r.ok);
    });
    this.render();
  }
}

export class App {
  static page = new CafePage();
}

if (hasDom) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => App.page.wire());
  else App.page.wire();
}
