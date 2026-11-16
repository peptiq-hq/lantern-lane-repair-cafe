// Registers Lantern Lane Repair Café's operations with the agent runtime.
// agent-manifest.json loads this module through "actions.module". Only the names in
// "actions.agentTools" become model tools, called website_<name>. Every action wraps the
// same page object the page's own forms use, so no rule is copied here.
import { App } from "./js/app.js";

const SESSION = { type: "string", enum: App.page.sessionIds(), description: "Session id (its date) from website_get_cafe_state." };
const CATEGORY = { type: "string", enum: App.page.categoryIds(), description: "Category id from website_get_cafe_state." };
const text = (max, description) => ({ type: "string", minLength: 1, maxLength: max, description });

class SiteActions {
  static registerActions(actions) {
    actions.register({
      name: "get_cafe_state",
      description: "Read the café's repair categories, the items it refuses and why, house rules, contact, upcoming sessions with slots left per category, the visible booking form, its version and the latest booking made in this browser.",
      effect: "read",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => App.page.getState(),
    });
    actions.register({
      name: "check_item",
      description: "Check whether the café can take a broken item. Returns accepted false with the safety reason for refused items, a list of categories when no category is given, or the category notes and sessions with free slots.",
      effect: "read",
      inputSchema: { type: "object", additionalProperties: false, required: ["description"],
        properties: { description: text(300, "The item and what is wrong with it, in the visitor's words."), categoryId: CATEGORY } },
      execute: (args) => App.page.checkItem(args),
    });
    actions.register({
      name: "find_sessions",
      description: "List upcoming sessions that still have a free fixer slot for one category, with slots left.",
      effect: "read",
      inputSchema: { type: "object", additionalProperties: false, required: ["categoryId"], properties: { categoryId: CATEGORY } },
      execute: (args) => App.page.findSessions(args),
    });
    actions.register({
      name: "fill_booking_form",
      description: "Put details into the visible booking form, keeping fields not given. Does not book anything; the visitor can edit or clear the form. Returns the new version.",
      effect: "write",
      inputSchema: { type: "object", additionalProperties: false,
        properties: { sessionId: SESSION, categoryId: CATEGORY, item: text(120, "What the item is."),
          problem: text(400, "What is wrong with it."), name: text(80, "The visitor's name."), email: { type: "string", maxLength: 120, description: "The visitor's email." } } },
      execute: (args) => App.page.fillBookingForm(args),
    });
    actions.register({
      name: "look_up_booking",
      description: "Look up a booking made in this browser by its code and the email it was made with.",
      effect: "read",
      inputSchema: { type: "object", additionalProperties: false, required: ["code", "email"],
        properties: { code: text(12, "Booking code such as LL-7KQ2."), email: text(120, "The email on the booking.") } },
      execute: (args) => App.page.lookUpBooking(args),
    });
    actions.register({
      name: "place_booking",
      description: "Book one item into a fixer slot at a session. The browser asks the visitor to confirm first. The site refuses refused items, full sessions, a second booking for the same email that day, and a stale expectedVersion. Returns the booking code.",
      effect: "irreversible",
      inputSchema: { type: "object", additionalProperties: false, required: ["sessionId", "categoryId", "item", "name", "email", "expectedVersion"],
        properties: { sessionId: SESSION, categoryId: CATEGORY, item: text(120, "What the item is."),
          problem: { type: "string", maxLength: 400, description: "What is wrong with it." },
          name: text(80, "The name the visitor gave."), email: text(120, "The email the visitor gave."),
          expectedVersion: { type: "integer", minimum: 0, description: "The latest version in this turn: from website_get_cafe_state, or from a form change made after that read." } } },
      execute: (args) => App.page.placeBooking(args),
    });
    actions.register({
      name: "cancel_booking",
      description: "Cancel a booking and free its slot. The browser asks the visitor to confirm first. Needs the booking code and the email on it.",
      effect: "irreversible",
      inputSchema: { type: "object", additionalProperties: false, required: ["code", "email"],
        properties: { code: text(12, "Booking code such as LL-7KQ2."), email: text(120, "The email on the booking.") } },
      execute: (args) => App.page.cancelBooking(args),
    });
  }
}

export const registerActions = SiteActions.registerActions;
