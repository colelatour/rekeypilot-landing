/**
 * Phase 0 sample purchase orders for the logged-in app preview.
 * Field values and confidences are the static result of demo parsePo + cloneOrder
 * on the four SAMPLES (harborview, lakeside, mike, dave). Metrics are fixed.
 * Nothing here contacts a network.
 */
(function (root) {
  function lines() {
    return [
      {
        id: "harborview",
        label: "Harborview",
        tone: "clean",
        blurb: "Clean purchase order. Customer, units, and the ship-to are written out.",
        summary: "10 cs nitrile gloves, medium, blue · 4 cs multifold towels · 2 × 5 gal neutral floor cleaner",
        confidence: 98,
        status: "Ready to review",
        customer: { value: "Harborview Clinic", confidence: 96 },
        email: { value: "orders@harborview.com", confidence: 98 },
        poNumber: { value: "20817", confidence: 99 },
        shipTo: { value: "the Elm St. location, 410 Elm Street, Portland OR 97214", confidence: 94 },
        shipMethod: { value: "UPS Ground", confidence: 84 },
        terms: { value: "Net 30", confidence: 97 },
        notes: { value: "Please send on our usual terms (Net 30)", confidence: 78 },
        lines: [
          { qty: 10, unit: "cs", description: "Nitrile gloves, medium, blue", sku: "GLV-NIT-M", price: 42.5, confidence: 98, matched: true, source: "nitrile gloves, medium, blue" },
          { qty: 4, unit: "cs", description: "Multifold towels, 4,000/cs", sku: "TWL-MF-4000", price: 38, confidence: 99, matched: true, source: "paper towels (the multifold ones)" },
          { qty: 2, unit: "ea", description: "Neutral floor cleaner, 5 gal", sku: "CLN-NEU-5G", price: 64, confidence: 99, matched: true, source: "5 gal floor cleaner, neutral" },
        ],
        text: [
          "From: Mark Ellison <orders@harborview.com>",
          "Subject: PO 20817 — Harborview Clinic",
          "",
          "Hi Dana,",
          "",
          "Please send on our usual terms (Net 30):",
          "",
          "10 cs nitrile gloves, medium, blue",
          "4 cs paper towels (the multifold ones)",
          "2 × 5 gal floor cleaner, neutral",
          "",
          "Deliver to the Elm St. location, 410 Elm Street, Portland OR 97214. Ground is fine.",
          "",
          "Thanks,",
          "Mark",
          "Harborview Clinic",
        ].join("\n"),
      },
      {
        id: "lakeside",
        label: "Lakeside",
        tone: "mixed",
        blurb: "Readable order with one product the catalog does not know.",
        summary: "6 bx blue gloves, large · 3 cs can liners, 33 gal · 1 drum lemon disinfectant",
        confidence: 36,
        status: "Ready to review",
        customer: { value: "Lakeside Medical", confidence: 86 },
        email: { value: "priya@lakesidemedical.org", confidence: 98 },
        poNumber: { value: "44190", confidence: 99 },
        shipTo: { value: "Lakeside Medical, 88 Harbor Ave, Suite 200, Seattle WA 98104", confidence: 94 },
        shipMethod: { value: "UPS Ground", confidence: 98 },
        terms: { value: "", confidence: 0 },
        notes: { value: "", confidence: 0 },
        lines: [
          { qty: 6, unit: "bx", description: "Nitrile gloves, large, blue", sku: "GLV-NIT-L", price: 42.5, confidence: 84, matched: true, source: "those blue gloves, large" },
          { qty: 3, unit: "cs", description: "Can liners, 33 gal, 1.5 mil", sku: "TRH-LIN-33", price: 29.75, confidence: 93, matched: true, source: "can liners 33 gallon" },
          { qty: 1, unit: "dr", description: "the lemon disinfectant we got last time", sku: "", price: "", confidence: 36, matched: false, source: "the lemon disinfectant we got last time" },
        ],
        text: [
          "From: priya@lakesidemedical.org",
          "Subject: Order for next week",
          "",
          "Hi — please ship when you can:",
          "",
          "6 boxes of those blue gloves, large",
          "3 cs can liners 33 gallon",
          "1 drum of the lemon disinfectant we got last time",
          "",
          "Ship to: Lakeside Medical, 88 Harbor Ave, Suite 200, Seattle WA 98104",
          "UPS Ground",
          "PO #44190",
        ].join("\n"),
      },
      {
        id: "mike",
        label: "Mike's shop",
        tone: "messy",
        blurb: "Forwarded email, a nickname, typos, and missing units. Confidence should drop.",
        summary: "2 blue gloves, med · 4 multifold towels · 2 floor cleaner · 1 css can liners · lemon stuff",
        confidence: 36,
        status: "Ready to review",
        customer: { value: "Mike (the shop)", confidence: 37 },
        email: { value: "mike.shopguy@gmail.com", confidence: 98 },
        poNumber: { value: "", confidence: 0 },
        shipTo: { value: "the usual spot behind the shop idk the zip", confidence: 46 },
        shipMethod: { value: "UPS Ground", confidence: 61 },
        terms: { value: "", confidence: 0 },
        notes: { value: "can u send this whenever, jen said ground is fine i think??", confidence: 52 },
        lines: [
          { qty: 2, unit: "", description: "Nitrile gloves, medium, blue", sku: "GLV-NIT-M", price: 42.5, confidence: 40, matched: true, source: "those blue glovs, med" },
          { qty: 4, unit: "", description: "Multifold towels, 4,000/cs", sku: "TWL-MF-4000", price: 38, confidence: 43, matched: true, source: "towells (multifold??)" },
          { qty: 2, unit: "", description: "Neutral floor cleaner, 5 gal", sku: "CLN-NEU-5G", price: 64, confidence: 65, matched: true, source: "floor cleaner, neutral, 5 gal — unit might be pail not sure" },
          { qty: 1, unit: "css", description: "Can liners, 33 gal, 1.5 mil", sku: "TRH-LIN-33", price: 29.75, confidence: 65, matched: true, source: "can liners 33 gal" },
          { qty: 1, unit: "", description: "also the lemon stuff from last time if u have it", sku: "", price: "", confidence: 36, matched: false, source: "also the lemon stuff from last time if u have it" },
        ],
        text: [
          "---------- Forwarded message ---------",
          "From: Mike <mike.shopguy@gmail.com>",
          "Date: Tue, Sep 22, 2026 at 4:12 PM",
          "Subject: Fwd: stuff for the shop",
          "To: Dana <dana@supplier.example>",
          "",
          "hey dana!!",
          "",
          "can u send this whenever, jen said ground is fine i think??",
          "address is the usual spot behind the shop idk the zip",
          "",
          "PO kinda 88-ish",
          "",
          "- a couple of those blue glovs, med",
          "- 4 towells (multifold??)",
          "- 2 floor cleaner, neutral, 5 gal — unit might be pail not sure",
          "- 1 css can liners 33 gal",
          "- also the lemon stuff from last time if u have it",
          "",
          "thx",
          "mike",
          "(the shop)",
        ].join("\n"),
      },
      {
        id: "dave",
        label: "Dave @ clinic",
        tone: "messy",
        blurb: "Casual forward with bad units, a forgotten quantity, and a vague ship-to.",
        summary: "10 boxs blue gloves, lg · multifold towels · floor cleaner · liners, qty forgotten",
        confidence: 41,
        status: "Ready to review",
        customer: { value: "Dave @ the clinic", confidence: 41 },
        email: { value: "davesclinicstuff@yahoo.com", confidence: 98 },
        poNumber: { value: "", confidence: 0 },
        shipTo: { value: "back door, ask for jen, she knows", confidence: 48 },
        shipMethod: { value: "Freight", confidence: 54 },
        terms: { value: "", confidence: 0 },
        notes: { value: "need this on the truck tmrw?? not sure if its freight or just ground whatever is cheaper", confidence: 52 },
        lines: [
          { qty: 10, unit: "boxs", description: "Nitrile gloves, large, blue", sku: "GLV-NIT-L", price: 42.5, confidence: 64, matched: true, source: "blue gloves lg" },
          { qty: 1, unit: "rolls?", description: "Multifold towels, 4,000/cs", sku: "TWL-MF-4000", price: 38, confidence: 43, matched: true, source: "multifold towels — wait maybe 3 cs idk" },
          { qty: 1, unit: "", description: "Neutral floor cleaner, 5 gal", sku: "CLN-NEU-5G", price: 64, confidence: 47, matched: true, source: "floor cleener" },
          { qty: 1, unit: "", description: "liners 33gal — forgot the qty", sku: "", price: "", confidence: 44, matched: false, source: "liners 33gal — forgot the qty" },
          { qty: 1, unit: "", description: "Neutral floor cleaner, 5 gal", sku: "CLN-NEU-5G", price: 64, confidence: 41, matched: true, source: "neutral cleaner if its the 5 gal one" },
        ],
        text: [
          "Begin forwarded message:",
          "",
          "From: dave <davesclinicstuff@yahoo.com>",
          "Sent: Monday, September 21, 2026 9:02 AM",
          "To: orders",
          "Subject: FW: need stuff asap lol",
          "",
          "yo — dave @ the clinic again",
          "",
          "need this on the truck tmrw?? not sure if its freight or just ground whatever is cheaper",
          "",
          "no po yet just put dave on it",
          "",
          "10 boxs of blue gloves lg",
          "some rolls? of multifold towels — wait maybe 3 cs idk",
          "1x floor cleener",
          "liners 33gal — forgot the qty",
          "?? neutral cleaner if its the 5 gal one",
          "",
          "ship to back door, ask for jen, she knows",
          "",
          "thx!!",
          "-d",
        ].join("\n"),
      },
    ];
  }

  var METRICS = [
    { label: "Ready to review", value: "4" },
    { label: "Needs a second look", value: "2" },
    { label: "Reviewed, not sent", value: "3" },
    { label: "Oldest waiting", value: "2 days" },
  ];

  var ORDERS = lines();

  function getOrder(id) {
    for (var i = 0; i < ORDERS.length; i++) {
      if (ORDERS[i].id === id) return ORDERS[i];
    }
    return null;
  }

  function roundMoney(n) {
    return Math.round(n * 100) / 100;
  }

  function buildOutcome(order) {
    var built = (order.lines || []).map(function (line) {
      var qty = Number(line.qty);
      var price = line.price === "" || line.price == null ? null : Number(line.price);
      var amount = null;
      if (Number.isFinite(qty) && price != null && Number.isFinite(price)) {
        amount = roundMoney(qty * price);
      }
      return {
        sku: line.sku ? String(line.sku) : "",
        description: line.description ? String(line.description) : "",
        qty: Number.isFinite(qty) ? qty : 0,
        unit: line.unit || "ea",
        price: price != null && Number.isFinite(price) ? price : null,
        amount: amount,
      };
    });
    var missingPrice = built.some(function (line) {
      return line.amount == null && line.description;
    });
    var subtotal = roundMoney(built.reduce(function (sum, line) {
      return sum + (line.amount || 0);
    }, 0));
    var key = String(order.poNumber || "").replace(/[^A-Za-z0-9-]/g, "").toUpperCase() || "DRAFT";
    return {
      shipstation: {
        system: "ShipStation",
        orderNumber: order.poNumber || "",
        orderKey: "SS-" + key,
        customer: order.customer || "",
        email: order.email || "",
        shipTo: order.shipTo || "",
        service: order.shipMethod || "",
        notes: order.notes || "",
        items: built,
      },
      quickbooks: {
        system: "QuickBooks",
        invoiceNumber: "INV-" + key,
        customer: order.customer || "",
        email: order.email || "",
        poNumber: order.poNumber || "",
        terms: order.terms || "",
        shipTo: order.shipTo || "",
        notes: order.notes || "",
        lines: built,
        subtotal: subtotal,
        missingPrice: missingPrice,
      },
    };
  }

  root.RekeyAppData = {
    METRICS: METRICS,
    ORDERS: ORDERS,
    getOrder: getOrder,
    buildOutcome: buildOutcome,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
