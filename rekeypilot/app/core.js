/**
 * Pure helpers for the logged-in app preview.
 * Loaded with a plain script tag (window.RekeyAppCore) and via require() in Vitest.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.RekeyAppCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var COMPLETED_KEY = "rekeypilot_app_completed";
  var FIELDS = [
    { key: "customer", label: "Customer" },
    { key: "email", label: "Email" },
    { key: "poNumber", label: "PO #" },
    { key: "shipTo", label: "Ship to" },
    { key: "shipMethod", label: "Ship method" },
    { key: "terms", label: "Terms" },
  ];
  var LINE_KEYS = ["qty", "unit", "description", "sku", "price"];

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function confidenceStatus(value, confidence) {
    if (!String(value || "").trim()) {
      return { kind: "miss", label: "not found", aria: "Not found in the purchase order" };
    }
    var score = Number(confidence) || 0;
    if (score >= 90) {
      return { kind: "ok", label: score + "%", aria: "Confidence " + score + " percent" };
    }
    return {
      kind: "review",
      label: "review " + score + "%",
      aria: "Needs review, confidence " + score + " percent",
    };
  }

  function chip(status) {
    var kind = status.kind;
    var cls = kind === "ok" ? "g" : kind === "review" ? "a" : kind === "miss" ? "bad" : "e";
    return '<span class="chip ' + cls + '" aria-label="' + esc(status.aria) + '">' + esc(status.label) + "</span>";
  }

  function formatMoney(amount) {
    if (amount == null || Number.isNaN(Number(amount))) return "—";
    return Number(amount).toLocaleString("en-US", { style: "currency", currency: "USD" });
  }

  function seedDraft(order) {
    return {
      customer: order.customer.value,
      email: order.email.value,
      poNumber: order.poNumber.value,
      shipTo: order.shipTo.value,
      shipMethod: order.shipMethod.value,
      terms: order.terms.value,
      notes: order.notes.value,
      lines: order.lines.map(function (line) {
        return {
          qty: line.qty,
          unit: line.unit,
          description: line.description,
          sku: line.sku,
          price: line.price,
        };
      }),
    };
  }

  function draftUsable(draft, order) {
    if (!draft || !draft.lines || draft.lines.length !== order.lines.length) return false;
    for (var i = 0; i < FIELDS.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(draft, FIELDS[i].key)) return false;
    }
    return Object.prototype.hasOwnProperty.call(draft, "notes");
  }

  function fieldChanged(draft, order, key) {
    return String(draft[key] == null ? "" : draft[key]) !== String(order[key].value);
  }

  function lineChanged(draftLine, original) {
    return LINE_KEYS.some(function (key) {
      return String(draftLine[key] == null ? "" : draftLine[key]) !== String(original[key] == null ? "" : original[key]);
    });
  }

  function fieldStatus(draft, order, key) {
    if (fieldChanged(draft, order, key)) {
      return { kind: "edited", label: "edited", aria: "Edited by you" };
    }
    return confidenceStatus(order[key].value, order[key].confidence);
  }

  function lineStatus(draftLine, original) {
    if (lineChanged(draftLine, original)) {
      return { kind: "edited", label: "edited", aria: "Edited by you" };
    }
    return confidenceStatus(original.sku || original.description, original.confidence);
  }

  function countLine(ready) {
    var noun = ready === 1 ? "order" : "orders";
    return "You have " + ready + " " + noun + " to review";
  }

  function readCompleted(storage) {
    try {
      var parsed = JSON.parse(storage.getItem(COMPLETED_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function markCompleted(storage, id) {
    var ids = readCompleted(storage);
    if (ids.indexOf(id) === -1) ids.push(id);
    storage.setItem(COMPLETED_KEY, JSON.stringify(ids));
    return ids;
  }

  function clearCompleted(storage) {
    storage.removeItem(COMPLETED_KEY);
  }

  function readyOrders(orders, doneIds) {
    return orders.filter(function (order) {
      return doneIds.indexOf(order.id) === -1;
    });
  }

  function completedOrders(orders, doneIds) {
    return doneIds
      .map(function (id) {
        for (var i = 0; i < orders.length; i++) {
          if (orders[i].id === id) return orders[i];
        }
        return null;
      })
      .filter(Boolean);
  }

  return {
    COMPLETED_KEY: COMPLETED_KEY,
    FIELDS: FIELDS,
    esc: esc,
    confidenceStatus: confidenceStatus,
    chip: chip,
    formatMoney: formatMoney,
    seedDraft: seedDraft,
    draftUsable: draftUsable,
    fieldChanged: fieldChanged,
    lineChanged: lineChanged,
    fieldStatus: fieldStatus,
    lineStatus: lineStatus,
    countLine: countLine,
    readCompleted: readCompleted,
    markCompleted: markCompleted,
    clearCompleted: clearCompleted,
    readyOrders: readyOrders,
    completedOrders: completedOrders,
  };
});
