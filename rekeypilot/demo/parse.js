/**
 * Deterministic mock PO parser for the RekeyPilot demo.
 * Same text always yields the same fields. No network calls.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.RekeyParse = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var CATALOG = [
    {
      sku: "GLV-NIT-M",
      name: "Nitrile gloves, medium, blue",
      unit: "cs",
      price: 42.5,
      needles: [
        { re: /nitrile/i, w: 3 },
        { re: /glove/i, w: 3 },
        { re: /\bmedium\b|\bmed\b/i, w: 2 },
        { re: /\bblue\b/i, w: 1 },
      ],
    },
    {
      sku: "GLV-NIT-L",
      name: "Nitrile gloves, large, blue",
      unit: "cs",
      price: 42.5,
      needles: [
        { re: /nitrile/i, w: 3 },
        { re: /glove/i, w: 3 },
        { re: /\blarge\b|\blg\b/i, w: 2 },
        { re: /\bblue\b/i, w: 1 },
      ],
    },
    {
      sku: "TWL-MF-4000",
      name: "Multifold towels, 4,000/cs",
      unit: "cs",
      price: 38,
      needles: [
        { re: /multifold/i, w: 4 },
        { re: /paper towel/i, w: 3 },
        { re: /\btowels?\b/i, w: 2 },
      ],
    },
    {
      sku: "CLN-NEU-5G",
      name: "Neutral floor cleaner, 5 gal",
      unit: "ea",
      price: 64,
      needles: [
        { re: /floor cleaner/i, w: 4 },
        { re: /neutral/i, w: 2 },
        { re: /5\s*gal/i, w: 2 },
      ],
    },
    {
      sku: "TRH-LIN-33",
      name: "Can liners, 33 gal, 1.5 mil",
      unit: "cs",
      price: 29.75,
      needles: [
        { re: /can liner/i, w: 4 },
        { re: /trash bag/i, w: 3 },
        { re: /33\s*gal/i, w: 2 },
      ],
    },
  ];

  var SAMPLE_PO = [
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
  ].join("\n");

  var SAMPLE_UNCERTAIN_PO = [
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
  ].join("\n");

  function field(value, confidence) {
    var v = value == null ? "" : String(value).trim();
    return { value: v, confidence: v ? confidence : 0 };
  }

  function normUnit(unit) {
    if (!unit) return "ea";
    var s = String(unit).toLowerCase();
    if (s === "cs" || s.indexOf("case") === 0) return "cs";
    if (s === "bx" || s.indexOf("box") === 0) return "bx";
    if (s === "pk" || s.indexOf("pack") === 0) return "pk";
    if (s.indexOf("roll") === 0) return "rl";
    if (s.indexOf("drum") === 0) return "dr";
    if (s.indexOf("pail") === 0) return "pl";
    return "ea";
  }

  function cleanDesc(desc) {
    return String(desc).replace(/\s+/g, " ").replace(/[.,;:\s]+$/, "").trim();
  }

  function isMetaLine(line) {
    return (
      /^(from|to|subject|date|sent|cc|bcc)\s*:/i.test(line) ||
      /^(hi|hello|hey|dear)\b/i.test(line) ||
      /^(thanks|thank you|sincerely|regards|best)\b/i.test(line) ||
      /^(deliver(?:ed)?\s+to|ship\s*to|bill\s*to|sold\s*to|customer|company)\b/i.test(line) ||
      /^(?:p\.?\s*o\.?|purchase\s+order)\b/i.test(line) ||
      /^(ups|fedex|usps|freight)\b/i.test(line)
    );
  }

  function parseQtyLine(raw) {
    var line = raw.trim().replace(/^[-*•]\s*/, "");
    if (!line || isMetaLine(line)) return null;

    var mult = line.match(
      /^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(gal|gallon|gallons)\s+(.+)$/i
    );
    if (mult) {
      return {
        qty: Number(mult[1]),
        unit: "ea",
        unitGiven: true,
        description: cleanDesc(mult[2] + " " + mult[3] + " " + mult[4]),
      };
    }

    var m = line.match(
      /^(\d+(?:\.\d+)?)\s*(cs|cases?|case|ea|each|boxes?|box|bx|packs?|pack|pk|rolls?|roll|drums?|drum|pails?|pail)?\s+(?:of\s+)?(.+)$/i
    );
    if (!m) return null;
    var desc = cleanDesc(m[3]);
    if (desc.length < 3) return null;
    if (/^(please|thanks|thank)\b/i.test(desc)) return null;
    return {
      qty: Number(m[1]),
      unit: normUnit(m[2]),
      unitGiven: Boolean(m[2]),
      description: desc,
    };
  }

  function rankCatalog(description) {
    var text = description.toLowerCase();
    var ranked = CATALOG.map(function (item) {
      var hits = 0;
      var weight = 0;
      item.needles.forEach(function (n) {
        weight += n.w;
        if (n.re.test(text)) hits += n.w;
      });
      return { item: item, hits: hits, weight: weight, ratio: weight ? hits / weight : 0 };
    }).sort(function (a, b) {
      if (b.hits !== a.hits) return b.hits - a.hits;
      return b.ratio - a.ratio;
    });
    return { best: ranked[0], secondHits: ranked[1] ? ranked[1].hits : 0 };
  }

  function matchLine(parsed) {
    var rank = rankCatalog(parsed.description);
    var best = rank.best;
    var unmatched = !best || best.hits < 4;
    if (unmatched) {
      var weak = best ? Math.min(58, 36 + best.hits * 6) : 41;
      return {
        qty: parsed.qty,
        unit: parsed.unit,
        description: parsed.description,
        source: parsed.description,
        sku: "",
        name: parsed.description,
        price: "",
        confidence: weak,
        matched: false,
      };
    }

    var margin = best.hits - rank.secondHits;
    var confidence = Math.round(72 + Math.min(best.hits, 8) * 3 + Math.min(margin, 3));
    confidence = Math.max(62, Math.min(99, confidence));

    var unit = parsed.unitGiven ? parsed.unit : best.item.unit;
    if (parsed.unitGiven && unit !== best.item.unit) {
      confidence = Math.max(62, confidence - 8);
    }

    return {
      qty: parsed.qty,
      unit: unit,
      description: parsed.description,
      source: parsed.description,
      sku: best.item.sku,
      name: best.item.name,
      price: best.item.price,
      confidence: confidence,
      matched: true,
    };
  }

  function extractEmail(text) {
    var m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return field(m ? m[0] : "", 98);
  }

  function extractPoNumber(text) {
    var patterns = [
      /\b(?:purchase\s+order|p\.?\s*o\.?)\s*(?:number|no\.?|#)?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]*)/gi,
      /\bPO\s*#\s*([A-Z0-9][A-Z0-9-]*)/gi,
      /\bPO\s+([A-Z0-9][A-Z0-9-]*)/gi,
    ];
    for (var i = 0; i < patterns.length; i++) {
      var re = patterns[i];
      var m;
      while ((m = re.exec(text))) {
        var token = m[1];
        if (/\d/.test(token) && /^[A-Z0-9-]{2,20}$/i.test(token)) {
          return field(token.toUpperCase(), 99);
        }
      }
    }
    return field("", 0);
  }

  function extractTerms(text) {
    var m = text.match(/\b(net\s*\d+|due on receipt|cash on delivery|cod)\b/i);
    if (m) {
      var raw = m[1].replace(/\s+/g, " ");
      var net = raw.match(/^net\s*(\d+)$/i);
      var value = net ? "Net " + net[1] : raw.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      if (/^cod$/i.test(value)) value = "COD";
      return field(value, 97);
    }
    if (/\busual terms\b/i.test(text)) return field("Net 30", 66);
    return field("", 0);
  }

  function extractShipMethod(text) {
    var rules = [
      { re: /\bups\s+next\s+day\b|\bovernight\b/i, value: "UPS Next Day", confidence: 93 },
      { re: /\bfedex\s+ground\b/i, value: "FedEx Ground", confidence: 98 },
      { re: /\bups\s+ground\b/i, value: "UPS Ground", confidence: 98 },
      { re: /\busps\b/i, value: "USPS", confidence: 94 },
      { re: /\bfreight\b/i, value: "Freight", confidence: 90 },
      { re: /\bground\b/i, value: "UPS Ground", confidence: 84 },
    ];
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].re.test(text)) return field(rules[i].value, rules[i].confidence);
    }
    return field("", 0);
  }

  function extractShipTo(text) {
    var m = text.match(/^(?:deliver(?:ed)?\s+to|ship\s*to)\s*[:\-]?\s*(.+)$/im);
    if (!m) return field("", 0);
    var value = m[1]
      .replace(/[.,]?\s*(ups\s+ground|fedex\s+ground|usps|overnight|ground is fine)\.?\s*$/i, "")
      .replace(/[.\s]+$/, "")
      .trim();
    return field(value, /\d/.test(value) ? 94 : 78);
  }

  function customerFromSubject(text) {
    var m = text.match(/^subject:\s*(.+)$/im);
    if (!m) return "";
    var stripped = m[1].replace(/^po\s*#?\s*[A-Z0-9-]+\s*[—–:\-]\s*/i, "").trim();
    if (!stripped || stripped === m[1].trim()) return "";
    if (/^order\b/i.test(stripped)) return "";
    return stripped;
  }

  function customerFromLabel(text) {
    var m = text.match(/^(?:bill\s*to|sold\s*to|customer)\s*:\s*(.+)$/im);
    return m ? m[1].trim() : "";
  }

  function customerFromShip(ship) {
    if (!ship || ship.indexOf(",") === -1) return "";
    var first = ship.split(",")[0].replace(/^the\s+/i, "").trim();
    var rest = ship.slice(ship.indexOf(",") + 1);
    if (!/\d/.test(rest)) return "";
    if (!first || /^\d/.test(first)) return "";
    if (/\b(st|street|ave|avenue|rd|road|blvd|location|suite|ste)\b/i.test(first)) return "";
    return first;
  }

  function customerFromDomain(email) {
    if (!email || email.indexOf("@") === -1) return "";
    var host = email.split("@")[1].split(".")[0];
    if (!host || /^(gmail|yahoo|outlook|hotmail|icloud|me)$/i.test(host)) return "";
    return host.replace(/[-_]+/g, " ").replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
  }

  function extractCustomer(text, email, shipTo) {
    var labeled = customerFromLabel(text);
    if (labeled) return field(labeled, 97);
    var subject = customerFromSubject(text);
    if (subject) return field(subject, 96);
    var fromShip = customerFromShip(shipTo);
    if (fromShip) return field(fromShip, 86);
    var domain = customerFromDomain(email);
    if (domain) return field(domain, 58);
    return field("", 0);
  }

  function extractNotes(text) {
    var lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (/^please\b/i.test(line) && !parseQtyLine(line)) {
        return field(line.replace(/:\s*$/, ""), 78);
      }
    }
    return field("", 0);
  }

  function parsePo(text) {
    var raw = String(text || "").replace(/\r\n/g, "\n");
    var email = extractEmail(raw);
    var shipTo = extractShipTo(raw);
    var lines = [];
    raw.split("\n").forEach(function (line) {
      var qty = parseQtyLine(line);
      if (qty) lines.push(matchLine(qty));
    });
    return {
      customer: extractCustomer(raw, email.value, shipTo.value),
      email: email,
      poNumber: extractPoNumber(raw),
      shipTo: shipTo,
      shipMethod: extractShipMethod(raw),
      terms: extractTerms(raw),
      notes: extractNotes(raw),
      lines: lines,
    };
  }

  function cloneOrder(parsed) {
    return {
      customer: parsed.customer.value,
      email: parsed.email.value,
      poNumber: parsed.poNumber.value,
      shipTo: parsed.shipTo.value,
      shipMethod: parsed.shipMethod.value,
      terms: parsed.terms.value,
      notes: parsed.notes.value,
      lines: parsed.lines.map(function (line) {
        return {
          qty: line.qty,
          unit: line.unit,
          description: line.name,
          source: line.source,
          sku: line.sku,
          price: line.price === "" ? "" : line.price,
          confidence: line.confidence,
          parsedDescription: line.name,
          parsedSku: line.sku,
          parsedPrice: line.price === "" ? "" : line.price,
          parsedQty: line.qty,
          parsedUnit: line.unit,
        };
      }),
    };
  }

  function roundMoney(n) {
    return Math.round(n * 100) / 100;
  }

  function buildOutcome(order) {
    var lines = (order.lines || []).map(function (line) {
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
    var missingPrice = lines.some(function (line) {
      return line.amount == null && line.description;
    });
    var subtotal = roundMoney(lines.reduce(function (sum, line) {
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
        items: lines,
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
        lines: lines,
        subtotal: subtotal,
        missingPrice: missingPrice,
      },
    };
  }

  return {
    CATALOG: CATALOG,
    SAMPLE_PO: SAMPLE_PO,
    SAMPLE_UNCERTAIN_PO: SAMPLE_UNCERTAIN_PO,
    parsePo: parsePo,
    cloneOrder: cloneOrder,
    buildOutcome: buildOutcome,
  };
});
