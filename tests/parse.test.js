const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parsePo,
  cloneOrder,
  buildOutcome,
  SAMPLE_PO,
  SAMPLE_UNCERTAIN_PO,
  SAMPLE_MESSY_MIKE,
  SAMPLE_MESSY_DAVE,
  SAMPLES,
} = require("../rekeypilot/demo/parse.js");

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

test("sample switcher lists Harborview plus the messier pastes", () => {
  assert.deepEqual(SAMPLES.map((sample) => sample.id), ["harborview", "lakeside", "mike", "dave"]);
  assert.equal(SAMPLES[0].text, SAMPLE_PO);
  assert.equal(SAMPLES[1].text, SAMPLE_UNCERTAIN_PO);
  assert.equal(SAMPLES[2].text, SAMPLE_MESSY_MIKE);
  assert.equal(SAMPLES[3].text, SAMPLE_MESSY_DAVE);
  assert.equal(SAMPLES[2].tone, "messy");
  assert.equal(SAMPLES[3].tone, "messy");
});

test("Mike's shop paste stays low-confidence and keeps a nickname", () => {
  const parsed = parsePo(SAMPLE_MESSY_MIKE);
  const cleanMin = Math.min(...parsePo(SAMPLE_PO).lines.map((line) => line.confidence));

  assert.deepEqual(parsed.customer, { value: "Mike (the shop)", confidence: 37 });
  assert.equal(parsed.email.value, "mike.shopguy@gmail.com");
  assert.equal(parsed.poNumber.value, "");
  assert.equal(parsed.poNumber.confidence, 0);
  assert.equal(parsed.shipTo.value, "the usual spot behind the shop idk the zip");
  assert.equal(parsed.shipTo.confidence, 46);
  assert.equal(parsed.shipMethod.value, "UPS Ground");
  assert.equal(parsed.shipMethod.confidence, 61);
  assert.equal(parsed.terms.value, "");
  assert.equal(parsed.notes.confidence, 52);
  assert.match(parsed.notes.value, /i think\?\?/);
  assert.equal(parsed.lines.length, 5);

  assert.equal(parsed.lines[0].sku, "GLV-NIT-M");
  assert.equal(parsed.lines[0].qty, 2);
  assert.equal(parsed.lines[0].unitMissing, true);
  assert.equal(parsed.lines[0].unit, "");
  assert.equal(parsed.lines[0].suggestedUnit, "cs");
  assert.equal(parsed.lines[0].confidence, 40);

  assert.equal(parsed.lines[1].sku, "TWL-MF-4000");
  assert.equal(parsed.lines[1].confidence, 43);
  assert.equal(parsed.lines[1].unitMissing, true);

  assert.equal(parsed.lines[2].sku, "CLN-NEU-5G");
  assert.equal(parsed.lines[2].confidence, 65);
  assert.equal(parsed.lines[2].unitMissing, true);

  assert.equal(parsed.lines[3].sku, "TRH-LIN-33");
  assert.equal(parsed.lines[3].unit, "css");
  assert.equal(parsed.lines[3].unitBad, true);
  assert.equal(parsed.lines[3].confidence, 65);

  assert.equal(parsed.lines[4].matched, false);
  assert.equal(parsed.lines[4].confidence, 36);
  assert.match(parsed.lines[4].name, /lemon stuff/i);

  parsed.lines.forEach((line) => {
    assert.ok(line.confidence < 75, "messy line confidence should stay under 75");
    assert.ok(line.confidence < cleanMin);
  });
  assert.ok(!parsed.lines.some((line) => /forwarded message/i.test(line.name)));
});

test("Dave @ clinic paste flags bad units, a forgotten qty, and a vague customer", () => {
  const parsed = parsePo(SAMPLE_MESSY_DAVE);

  assert.deepEqual(parsed.customer, { value: "Dave @ the clinic", confidence: 41 });
  assert.equal(parsed.email.value, "davesclinicstuff@yahoo.com");
  assert.equal(parsed.poNumber.value, "");
  assert.equal(parsed.shipTo.value, "back door, ask for jen, she knows");
  assert.equal(parsed.shipTo.confidence, 48);
  assert.equal(parsed.shipMethod.value, "Freight");
  assert.equal(parsed.shipMethod.confidence, 54);
  assert.equal(parsed.notes.confidence, 52);
  assert.equal(parsed.lines.length, 5);

  assert.equal(parsed.lines[0].sku, "GLV-NIT-L");
  assert.equal(parsed.lines[0].qty, 10);
  assert.equal(parsed.lines[0].unit, "boxs");
  assert.equal(parsed.lines[0].unitBad, true);
  assert.equal(parsed.lines[0].confidence, 64);

  assert.equal(parsed.lines[1].sku, "TWL-MF-4000");
  assert.equal(parsed.lines[1].unit, "rolls?");
  assert.equal(parsed.lines[1].unitBad, true);
  assert.equal(parsed.lines[1].qtyUncertain, true);
  assert.equal(parsed.lines[1].confidence, 43);

  assert.equal(parsed.lines[2].sku, "CLN-NEU-5G");
  assert.equal(parsed.lines[2].confidence, 47);
  assert.equal(parsed.lines[2].unitMissing, true);

  assert.equal(parsed.lines[3].matched, false);
  assert.equal(parsed.lines[3].confidence, 44);
  assert.match(parsed.lines[3].source, /forgot the qty/i);

  assert.equal(parsed.lines[4].sku, "CLN-NEU-5G");
  assert.equal(parsed.lines[4].confidence, 41);
  assert.equal(parsed.lines[4].qtyUncertain, true);

  assert.ok(parsed.lines.every((line) => line.confidence <= 64));
  assert.ok(parsed.customer.confidence < 60);
  assert.ok(parsed.shipMethod.confidence < 70);
  assert.deepEqual(parsePo(SAMPLE_MESSY_DAVE), parsed);

  const outcome = buildOutcome(cloneOrder(parsed));
  assert.equal(outcome.shipstation.orderKey, "SS-DRAFT");
  assert.equal(outcome.shipstation.customer, "Dave @ the clinic");
  assert.equal(outcome.shipstation.service, "Freight");
  assert.equal(outcome.quickbooks.missingPrice, true);
  assert.equal(outcome.quickbooks.invoiceNumber, "INV-DRAFT");
});

test("messy cues lower confidence without punishing a clean line or a labeled customer", () => {
  const cleanLine = parsePo("From: Jen <jen@gmail.com>\n2 cs nitrile gloves, medium, blue");
  assert.equal(cleanLine.customer.value, "Jen");
  assert.equal(cleanLine.customer.confidence, 46);
  assert.equal(cleanLine.lines[0].sku, "GLV-NIT-M");
  assert.equal(cleanLine.lines[0].confidence, 98);
  assert.equal(cleanLine.lines[0].unit, "cs");

  const labeled = parsePo("From: Mike <mike@gmail.com>\nCustomer: Harborview Clinic\n(the shop)\n4 cs paper towels");
  assert.equal(labeled.customer.value, "Harborview Clinic");
  assert.equal(labeled.customer.confidence, 97);

  const folded = parsePo("3 nitril glovs, medium\n2 floor cleanr, neutral, 5 gal\n1 multifod towel");
  assert.equal(folded.lines[0].sku, "GLV-NIT-M");
  assert.ok(folded.lines[0].confidence < 75);
  assert.equal(folded.lines[1].sku, "CLN-NEU-5G");
  assert.ok(folded.lines[1].confidence < 75);
  assert.equal(folded.lines[2].sku, "TWL-MF-4000");
  assert.ok(folded.lines[2].confidence < 75);

  const wordQty = parsePo("a few blue gloves, large\na bunch of paper towels\nplus lemon disinfectant from last time");
  assert.equal(wordQty.lines[0].qty, 3);
  assert.equal(wordQty.lines[0].qtyUncertain, true);
  assert.equal(wordQty.lines[0].sku, "GLV-NIT-L");
  assert.ok(wordQty.lines[0].confidence < 75);
  assert.equal(wordQty.lines[1].qty, 1);
  assert.equal(wordQty.lines[1].sku, "TWL-MF-4000");
  assert.equal(wordQty.lines[2].matched, false);

  const badUnit = parsePo("4 casse can liners 33 gal\n2 pcs nitrile gloves medium blue\n2 boxx nitrile gloves, medium, blue\n9 qox paper towels");
  assert.equal(badUnit.lines[0].unit, "casse");
  assert.equal(badUnit.lines[0].unitBad, true);
  assert.equal(badUnit.lines[0].sku, "TRH-LIN-33");
  assert.equal(badUnit.lines[1].unit, "pcs");
  assert.equal(badUnit.lines[1].unitBad, true);
  assert.equal(badUnit.lines[2].unit, "boxx");
  assert.equal(badUnit.lines[2].unitBad, true);
  assert.equal(badUnit.lines[2].sku, "GLV-NIT-M");
  assert.equal(badUnit.lines[3].unitMissing, true);
  assert.equal(badUnit.lines[3].sku, "TWL-MF-4000");
  assert.ok(badUnit.lines.every((line) => line.confidence < 80));

  const carriers = parsePo("Ship to: send them to 9 Pier Ave, Astoria OR 97103\nUSPS\nTerms: COD\nDue on receipt is not the only phrase here, but COD is.\n2 each paper towels");
  assert.equal(carriers.shipMethod.value, "USPS");
  assert.equal(carriers.shipMethod.confidence, 94);
  assert.equal(carriers.terms.value, "COD");
  assert.equal(carriers.shipTo.value, "send them to 9 Pier Ave, Astoria OR 97103");

  const due = parsePo("Terms due on receipt\nSend them to the side door");
  assert.equal(due.terms.value, "Due On Receipt");
  assert.equal(due.shipTo.value, "the side door");
  assert.equal(due.shipTo.confidence, 46);

  const quoted = parsePo("On Tue, Sep 1, 2026 at 1:00 PM Dana wrote:\nThanks for the note.");
  assert.equal(quoted.lines.length, 0);
  assert.equal(quoted.customer.value, "");
});
