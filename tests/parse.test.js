const test = require("node:test");
const assert = require("node:assert/strict");
const { parsePo, cloneOrder, SAMPLE_PO, SAMPLE_UNCERTAIN_PO } = require("../rekeypilot/demo/parse.js");

test("sample Harborview PO parses to the expected order", () => {
  const parsed = parsePo(SAMPLE_PO);

  assert.deepEqual(parsed.customer, { value: "Harborview Clinic", confidence: 96 });
  assert.deepEqual(parsed.email, { value: "orders@harborview.com", confidence: 98 });
  assert.deepEqual(parsed.poNumber, { value: "20817", confidence: 99 });
  assert.equal(parsed.terms.value, "Net 30");
  assert.equal(parsed.terms.confidence, 97);
  assert.equal(parsed.shipMethod.value, "UPS Ground");
  assert.equal(parsed.shipMethod.confidence, 84);
  assert.equal(
    parsed.shipTo.value,
    "the Elm St. location, 410 Elm Street, Portland OR 97214"
  );
  assert.equal(parsed.shipTo.confidence, 94);
  assert.match(parsed.notes.value, /^Please send on our usual terms/);
  assert.equal(parsed.lines.length, 3);

  assert.equal(parsed.lines[0].sku, "GLV-NIT-M");
  assert.equal(parsed.lines[0].qty, 10);
  assert.equal(parsed.lines[0].unit, "cs");
  assert.equal(parsed.lines[0].price, 42.5);
  assert.equal(parsed.lines[0].confidence, 98);

  assert.equal(parsed.lines[1].sku, "TWL-MF-4000");
  assert.equal(parsed.lines[1].qty, 4);
  assert.equal(parsed.lines[1].unit, "cs");
  assert.equal(parsed.lines[1].price, 38);
  assert.equal(parsed.lines[1].confidence, 99);

  assert.equal(parsed.lines[2].sku, "CLN-NEU-5G");
  assert.equal(parsed.lines[2].qty, 2);
  assert.equal(parsed.lines[2].unit, "ea");
  assert.equal(parsed.lines[2].price, 64);
  assert.equal(parsed.lines[2].confidence, 99);
});

test("the same text is deterministic", () => {
  assert.deepEqual(parsePo(SAMPLE_PO), parsePo(SAMPLE_PO));
  assert.deepEqual(parsePo(SAMPLE_UNCERTAIN_PO), parsePo(SAMPLE_UNCERTAIN_PO));
});

test("uncertain PO flags the unmatched line and keeps a customer", () => {
  const parsed = parsePo(SAMPLE_UNCERTAIN_PO);

  assert.equal(parsed.customer.value, "Lakeside Medical");
  assert.equal(parsed.customer.confidence, 86);
  assert.equal(parsed.poNumber.value, "44190");
  assert.equal(parsed.shipMethod.value, "UPS Ground");
  assert.equal(parsed.shipMethod.confidence, 98);
  assert.equal(parsed.lines.length, 3);

  assert.equal(parsed.lines[0].sku, "GLV-NIT-L");
  assert.equal(parsed.lines[0].unit, "bx");
  assert.equal(parsed.lines[0].confidence, 84);

  assert.equal(parsed.lines[1].sku, "TRH-LIN-33");
  assert.equal(parsed.lines[1].qty, 3);
  assert.equal(parsed.lines[1].confidence, 93);

  assert.equal(parsed.lines[2].sku, "");
  assert.equal(parsed.lines[2].matched, false);
  assert.equal(parsed.lines[2].confidence, 36);
  assert.match(parsed.lines[2].name, /lemon disinfectant/i);
});

test("empty and non-order text produce no lines and empty fields", () => {
  const empty = parsePo("");
  assert.equal(empty.customer.value, "");
  assert.equal(empty.customer.confidence, 0);
  assert.equal(empty.lines.length, 0);

  const chatter = parsePo("Hi Dana,\n\nThanks,\nMark\n");
  assert.equal(chatter.lines.length, 0);
  assert.equal(chatter.poNumber.value, "");
});

test("labeled purchase orders, terms, and carriers", () => {
  const parsed = parsePo(
    [
      "Customer: Northwind Wholesale",
      "Purchase Order Number: ABC-1002",
      "Ship to: 12 Dock St, Boise ID 83702",
      "FedEx Ground",
      "Terms: Net 15",
      "8 cs trash bags 33 gal",
    ].join("\n")
  );

  assert.equal(parsed.customer.value, "Northwind Wholesale");
  assert.equal(parsed.customer.confidence, 97);
  assert.equal(parsed.poNumber.value, "ABC-1002");
  assert.equal(parsed.terms.value, "Net 15");
  assert.equal(parsed.shipMethod.value, "FedEx Ground");
  assert.equal(parsed.shipTo.value, "12 Dock St, Boise ID 83702");
  assert.equal(parsed.lines[0].sku, "TRH-LIN-33");
  assert.equal(parsed.lines[0].unit, "cs");
});

test("buildOutcome prices the reviewed order into mock documents", () => {
  const order = cloneOrder(parsePo(SAMPLE_PO));
  order.lines[2].price = "";
  const outcome = require("../rekeypilot/demo/parse.js").buildOutcome(order);

  assert.equal(outcome.shipstation.orderKey, "SS-20817");
  assert.equal(outcome.shipstation.customer, "Harborview Clinic");
  assert.equal(outcome.shipstation.service, "UPS Ground");
  assert.equal(outcome.shipstation.items[0].amount, 425);
  assert.equal(outcome.quickbooks.invoiceNumber, "INV-20817");
  assert.equal(outcome.quickbooks.terms, "Net 30");
  assert.equal(outcome.quickbooks.subtotal, 577);
  assert.equal(outcome.quickbooks.missingPrice, true);
  assert.equal(outcome.quickbooks.lines[2].amount, null);

  order.poNumber = "acme/9";
  const keyed = require("../rekeypilot/demo/parse.js").buildOutcome(order);
  assert.equal(keyed.shipstation.orderKey, "SS-ACME9");
  assert.equal(keyed.quickbooks.invoiceNumber, "INV-ACME9");
});

test("falls back carefully for units, domains, terms, and carriers", () => {
  const parsed = parsePo(
    [
      "From: buyer@north-wind.co",
      "Please rush this overnight.",
      "2 each paper towels",
      "1 pail floor cleaner, neutral, 5 gal",
      "Usual terms.",
    ].join("\n")
  );
  assert.equal(parsed.customer.value, "North Wind");
  assert.equal(parsed.customer.confidence, 58);
  assert.equal(parsed.shipMethod.value, "UPS Next Day");
  assert.equal(parsed.terms.value, "Net 30");
  assert.equal(parsed.terms.confidence, 66);
  assert.equal(parsed.lines[0].unit, "ea");
  assert.equal(parsed.lines[1].unit, "pl");

  const gmail = parsePo("From: person@gmail.com\nThanks");
  assert.equal(gmail.customer.value, "");

  const draft = require("../rekeypilot/demo/parse.js").buildOutcome({
    customer: "",
    email: "",
    poNumber: "",
    shipTo: "",
    shipMethod: "",
    terms: "",
    notes: "",
    lines: [{ qty: "nope", unit: "ea", description: "Mystery", sku: "", price: "nope" }],
  });
  assert.equal(draft.shipstation.orderKey, "SS-DRAFT");
  assert.equal(draft.quickbooks.lines[0].amount, null);
  assert.equal(draft.quickbooks.missingPrice, true);
});

test("cloneOrder copies parsed values into an editable order", () => {
  const order = cloneOrder(parsePo(SAMPLE_PO));
  assert.equal(order.customer, "Harborview Clinic");
  assert.equal(order.poNumber, "20817");
  assert.equal(order.lines.length, 3);
  assert.equal(order.lines[0].description, "Nitrile gloves, medium, blue");
  assert.equal(order.lines[0].parsedSku, "GLV-NIT-M");
  order.lines[0].qty = 12;
  assert.equal(parsePo(SAMPLE_PO).lines[0].qty, 10);
});
