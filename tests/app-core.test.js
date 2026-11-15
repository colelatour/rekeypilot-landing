import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const core = require("../rekeypilot/app/core.js");
require("../rekeypilot/app/data.js");

const data = globalThis.RekeyAppData;

function memoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

describe("confidence status and chips", () => {
  it("treats 90 and above as ok, below 90 as review, and blank as not found", () => {
    expect(core.confidenceStatus("Harborview Clinic", 90)).toEqual({
      kind: "ok",
      label: "90%",
      aria: "Confidence 90 percent",
    });
    expect(core.confidenceStatus("Harborview Clinic", 98).kind).toBe("ok");
    expect(core.confidenceStatus("UPS Ground", 84)).toEqual({
      kind: "review",
      label: "review 84%",
      aria: "Needs review, confidence 84 percent",
    });
    expect(core.confidenceStatus("UPS Ground", 89).kind).toBe("review");
    expect(core.confidenceStatus("", 99)).toEqual({
      kind: "miss",
      label: "not found",
      aria: "Not found in the purchase order",
    });
    expect(core.confidenceStatus("   ", 99).kind).toBe("miss");
    expect(core.confidenceStatus(null, 95).kind).toBe("miss");
  });

  it("maps chip classes to ok, review, and not found", () => {
    expect(core.chip(core.confidenceStatus("Net 30", 97))).toContain('class="chip g"');
    expect(core.chip(core.confidenceStatus("UPS Ground", 84))).toContain('class="chip a"');
    expect(core.chip(core.confidenceStatus("", 0))).toContain('class="chip bad"');
    expect(core.chip({ kind: "edited", label: "edited", aria: "Edited by you" })).toContain('class="chip e"');
  });
});

describe("edited fields, drafts, and the welcome line", () => {
  it("detects edited header fields and line items", () => {
    const order = data.getOrder("harborview");
    const draft = core.seedDraft(order);
    expect(core.fieldChanged(draft, order, "customer")).toBe(false);
    expect(core.fieldStatus(draft, order, "customer").kind).toBe("ok");

    draft.customer = "Harborview Clinic East";
    expect(core.fieldChanged(draft, order, "customer")).toBe(true);
    expect(core.fieldStatus(draft, order, "customer")).toEqual({
      kind: "edited",
      label: "edited",
      aria: "Edited by you",
    });

    expect(core.lineChanged(draft.lines[0], order.lines[0])).toBe(false);
    draft.lines[0].qty = 12;
    expect(core.lineChanged(draft.lines[0], order.lines[0])).toBe(true);
    expect(core.lineStatus(draft.lines[0], order.lines[0]).kind).toBe("edited");
  });

  it("seeds a usable draft and rejects a draft that does not match the order", () => {
    const order = data.getOrder("lakeside");
    const draft = core.seedDraft(order);
    expect(draft.customer).toBe("Lakeside Medical");
    expect(draft.poNumber).toBe("44190");
    expect(draft.lines).toHaveLength(order.lines.length);
    expect(draft.lines[0]).not.toBe(order.lines[0]);
    expect(core.draftUsable(draft, order)).toBe(true);
    expect(core.draftUsable(null, order)).toBe(false);
    expect(core.draftUsable({ ...draft, lines: draft.lines.slice(0, 1) }, order)).toBe(false);
    const { notes, ...withoutNotes } = draft;
    expect(notes).toBe("");
    expect(core.draftUsable(withoutNotes, order)).toBe(false);
  });

  it("uses the singular welcome line for one order and the plural otherwise", () => {
    expect(core.countLine(1)).toBe("You have 1 order to review");
    expect(core.countLine(0)).toBe("You have 0 orders to review");
    expect(core.countLine(4)).toBe("You have 4 orders to review");
  });
});

describe("completed orders", () => {
  it("tracks completed ids and clears them the way sign-in and sign-out do", () => {
    const storage = memoryStorage();
    expect(core.readCompleted(storage)).toEqual([]);
    expect(core.markCompleted(storage, "harborview")).toEqual(["harborview"]);
    expect(core.markCompleted(storage, "harborview")).toEqual(["harborview"]);
    expect(core.markCompleted(storage, "lakeside")).toEqual(["harborview", "lakeside"]);
    core.clearCompleted(storage);
    expect(core.readCompleted(storage)).toEqual([]);
    storage.setItem(core.COMPLETED_KEY, "not-json");
    expect(core.readCompleted(storage)).toEqual([]);
  });

  it("filters ready orders out of the completed set and counts what is left", () => {
    const orders = data.ORDERS;
    const done = ["harborview"];
    const ready = core.readyOrders(orders, done);
    const completed = core.completedOrders(orders, done);
    expect(ready.map((order) => order.id)).toEqual(["lakeside", "mike", "dave"]);
    expect(completed.map((order) => order.id)).toEqual(["harborview"]);
    expect(ready).toHaveLength(3);
    expect(core.countLine(ready.length)).toBe("You have 3 orders to review");
    expect(core.readyOrders(orders, [])).toHaveLength(4);
    expect(core.completedOrders(orders, ["missing", "dave"]).map((order) => order.id)).toEqual(["dave"]);
  });
});

describe("money and order helpers", () => {
  it("formats dollar amounts and leaves missing numbers blank", () => {
    expect(core.formatMoney(42.5)).toBe("$42.50");
    expect(core.formatMoney(1000)).toBe("$1,000.00");
    expect(core.formatMoney(0)).toBe("$0.00");
    expect(core.formatMoney(null)).toBe("—");
    expect(core.formatMoney(undefined)).toBe("—");
    expect(core.formatMoney(Number.NaN)).toBe("—");
  });

  it("finds orders and prices a draft, leaving missing prices off the subtotal", () => {
    expect(data.getOrder("nope")).toBeNull();
    const order = data.getOrder("harborview");
    expect(order.label).toBe("Harborview");
    const draft = core.seedDraft(order);
    const outcome = data.buildOutcome(draft);
    expect(outcome.shipping.orderKey).toBe("ORD-20817");
    expect(outcome.invoice.invoiceNumber).toBe("INV-20817");
    expect(outcome.invoice.subtotal).toBe(705);
    expect(outcome.invoice.missingPrice).toBe(false);
    expect(outcome.invoice.lines[0].amount).toBe(425);

    draft.lines[2].price = "";
    const missing = data.buildOutcome(draft);
    expect(missing.invoice.lines[2].amount).toBeNull();
    expect(missing.invoice.lines[2].price).toBeNull();
    expect(missing.invoice.missingPrice).toBe(true);
    expect(missing.invoice.subtotal).toBe(577);

    draft.poNumber = "";
    const keyed = data.buildOutcome(draft);
    expect(keyed.shipping.orderKey).toBe("ORD-DRAFT");
    expect(keyed.invoice.invoiceNumber).toBe("INV-DRAFT");
  });
});
