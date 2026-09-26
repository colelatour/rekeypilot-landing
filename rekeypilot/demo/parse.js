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

  // Forwarded shop note: nickname, typos, missing units, hedged shipping.
  var SAMPLE_MESSY_MIKE = [
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
  ].join("\n");

  // Casual clinic forward: bad units, forgotten qty, conflicting ship words.
  var SAMPLE_MESSY_DAVE = [
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
  ].join("\n");

  var SAMPLES = [
    {
      id: "harborview",
      label: "Harborview",
      tone: "clean",
      blurb: "Clean purchase order. Customer, units, and the ship-to are written out.",
      text: SAMPLE_PO,
    },
    {
      id: "lakeside",
      label: "Lakeside",
      tone: "mixed",
      blurb: "Readable order with one product the catalog does not know.",
      text: SAMPLE_UNCERTAIN_PO,
    },
    {
      id: "mike",
      label: "Mike's shop",
      tone: "messy",
      blurb: "Forwarded email, a nickname, typos, and missing units. Confidence should drop.",
      text: SAMPLE_MESSY_MIKE,
    },
    {
      id: "dave",
      label: "Dave @ clinic",
      tone: "messy",
      blurb: "Casual forward with bad units, a forgotten quantity, and a vague ship-to.",
      text: SAMPLE_MESSY_DAVE,
    },
  ];

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

  var GOOD_UNIT_LIST = ["cs", "case", "cases", "ea", "each", "box", "boxes", "bx", "pk", "pack", "packs", "roll", "rolls", "drum", "drums", "pail", "pails"];
  var BAD_UNITS = {
    css: 1, cass: 1, casse: 1, boxs: 1, bxes: 1, eaches: 1, pcs: 1, pc: 1,
    piece: 1, pieces: 1, uom: 1, unit: 1, units: 1, bunch: 1, bunches: 1,
    stuff: 1, thing: 1, things: 1, qty: 1, bag: 1, bags: 1, btl: 1,
    bottle: 1, bottles: 1, ct: 1, count: 1,
  };
  var NOT_UNITS = {
    blue: 1, red: 1, black: 1, white: 1, large: 1, small: 1, medium: 1, med: 1, lg: 1,
    gloves: 1, glove: 1, glovs: 1, towel: 1, towels: 1, towells: 1, paper: 1, floor: 1,
    trash: 1, neutral: 1, liner: 1, liners: 1, those: 1, these: 1, with: 1, from: 1,
    gallon: 1, gallons: 1, nitrile: 1, multifold: 1, lemon: 1, cleaner: 1, cleener: 1,
  };

  function isMetaLine(line) {
    return (
      /^(from|to|subject|date|sent|cc|bcc)\s*:/i.test(line) ||
      /^(hi|hello|hey|dear|yo)\b/i.test(line) ||
      /^(thanks|thank you|sincerely|regards|best|thx|cheers)\b/i.test(line) ||
      /^(deliver(?:ed)?\s+to|ship\s*to|bill\s*to|sold\s*to|customer|company)\b/i.test(line) ||
      /^(?:p\.?\s*o\.?|purchase\s+order)\b/i.test(line) ||
      /^(ups|fedex|usps|freight)\b/i.test(line) ||
      /^-{2,}\s*forwarded message\b/i.test(line) ||
      /^begin forwarded message\b/i.test(line) ||
      /^on .+wrote:\s*$/i.test(line) ||
      /^\(the\s+[a-z]+\)\s*$/i.test(line)
    );
  }

  function lineHedged(line) {
    return /(?:\?\?|\bidk\b|\bnot sure\b|\bmaybe\b|\bforgot\b|\bkinda\b|\blol\b|\bwait\b|might be|\bi think\b|\bwhatever\b)/i.test(line);
  }

  function editDistance(a, b) {
    var rows = a.length + 1;
    var cols = b.length + 1;
    var dp = new Array(rows);
    for (var i = 0; i < rows; i++) {
      dp[i] = new Array(cols);
      dp[i][0] = i;
    }
    for (var j = 0; j < cols; j++) dp[0][j] = j;
    for (var r = 1; r < rows; r++) {
      for (var c = 1; c < cols; c++) {
        var cost = a.charAt(r - 1) === b.charAt(c - 1) ? 0 : 1;
        dp[r][c] = Math.min(dp[r - 1][c] + 1, dp[r][c - 1] + 1, dp[r - 1][c - 1] + cost);
      }
    }
    return dp[a.length][b.length];
  }

  function isNearUnit(token) {
    if (token.length < 3 || token.length > 8) return false;
    for (var i = 0; i < GOOD_UNIT_LIST.length; i++) {
      var good = GOOD_UNIT_LIST[i];
      if (Math.abs(good.length - token.length) > 1) continue;
      if (good.charAt(0) !== token.charAt(0)) continue;
      if (editDistance(token, good) === 1) return true;
    }
    return false;
  }

  function classifyUnitToken(token) {
    var uncertain = /[?!]/.test(token);
    var low = token.replace(/[?!.,]+$/g, "").toLowerCase();
    if (!low || NOT_UNITS[low]) return null;
    var known = false;
    for (var i = 0; i < GOOD_UNIT_LIST.length; i++) {
      if (GOOD_UNIT_LIST[i] === low) known = true;
    }
    if (known) {
      return {
        unit: normUnit(low),
        quality: uncertain ? "bad" : "good",
        raw: uncertain ? token : normUnit(low),
      };
    }
    if (BAD_UNITS[low] || isNearUnit(low)) {
      return { unit: low, quality: "bad", raw: token.replace(/[.,]+$/g, "") };
    }
    return null;
  }

  function splitUnit(rest) {
    var parts = rest.match(/^([A-Za-z][A-Za-z.]{0,12}[?!]?)\s+(?:of\s+)?(.+)$/);
    if (!parts) return { unitInfo: null, desc: rest };
    var unitInfo = classifyUnitToken(parts[1]);
    if (!unitInfo) return { unitInfo: null, desc: rest };
    return { unitInfo: unitInfo, desc: parts[2] };
  }

  function finishQty(qty, rest, line, qtyUncertain) {
    var split = splitUnit(String(rest).replace(/^(?:of\s+)/i, ""));
    var desc = cleanDesc(split.desc);
    if (desc.length < 3) return null;
    if (/^(please|thanks|thank)\b/i.test(desc)) return null;
    var unitInfo = split.unitInfo;
    return {
      qty: qty,
      unit: unitInfo ? (unitInfo.quality === "bad" ? unitInfo.raw : unitInfo.unit) : "",
      unitGiven: !!unitInfo,
      unitBad: !!(unitInfo && unitInfo.quality === "bad"),
      description: desc,
      qtyUncertain: !!qtyUncertain,
      hedged: lineHedged(line),
    };
  }

  function parseQtyLine(raw) {
    var line = String(raw || "").trim().replace(/^[-*•]\s*/, "").replace(/\s+/g, " ");
    if (!line || isMetaLine(line)) return null;

    var mult = line.match(
      /^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(gal|gallon|gallons)\s+(.+)$/i
    );
    if (mult) {
      return {
        qty: Number(mult[1]),
        unit: "ea",
        unitGiven: true,
        unitBad: false,
        description: cleanDesc(mult[2] + " " + mult[3] + " " + mult[4]),
        qtyUncertain: false,
        hedged: lineHedged(line),
      };
    }

    var leading = line.match(/^(\d+(?:\.\d+)?)(?:\s*[x×])?\s+(.+)$/i);
    if (leading) return finishQty(Number(leading[1]), leading[2], line, false);

    var word = line.match(/^(?:(a\s+couple(?:\s+of)?)|(a\s+few(?:\s+of)?)|(a\s+bunch(?:\s+of)?)|(some))\s+(.+)$/i);
    if (!word) return null;
    var qty = word[1] ? 2 : word[2] ? 3 : 1;
    return finishQty(qty, word[5], line, true);
  }

  function parseLooseItem(raw) {
    var line = String(raw || "").trim().replace(/^[-*•]\s*/, "").replace(/\s+/g, " ");
    if (!line || isMetaLine(line) || parseQtyLine(line)) return null;
    if (!/^(?:also|plus)\b/i.test(line) && !/forgot the qty/i.test(line) && !/^\?\?/.test(line)) return null;
    var desc = cleanDesc(line.replace(/^\?\?\s*/, ""));
    if (desc.length < 3) return null;
    return {
      qty: 1,
      unit: "",
      unitGiven: false,
      unitBad: false,
      description: desc,
      qtyUncertain: true,
      hedged: true,
    };
  }

  function foldTypos(text) {
    var rules = [
      [/\bglovs\b/i, "gloves"],
      [/\btowells\b/i, "towels"],
      [/\bcleener\b/i, "cleaner"],
      [/\bcleanr\b/i, "cleaner"],
      [/\bnitril\b/i, "nitrile"],
      [/\bmultifod\b/i, "multifold"],
    ];
    var folded = text;
    var typo = false;
    rules.forEach(function (rule) {
      if (rule[0].test(folded)) {
        typo = true;
        folded = folded.replace(rule[0], rule[1]);
      }
    });
    return { text: folded, typo: typo };
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
    var folded = foldTypos(parsed.description);
    var rank = rankCatalog(folded.text);
    var best = rank.best;
    var unmatched = !best || best.hits < 4;
    var messyFlags = parsed.qtyUncertain || parsed.hedged || parsed.unitBad || !parsed.unitGiven;
    if (unmatched) {
      var weak = best ? Math.min(58, 36 + best.hits * 6) : 41;
      if (messyFlags) weak = Math.min(weak, 44);
      return {
        qty: parsed.qty,
        unit: parsed.unitBad || parsed.unitGiven ? parsed.unit : "",
        suggestedUnit: "",
        unitBad: !!parsed.unitBad,
        unitMissing: !parsed.unitGiven && !parsed.unitBad,
        description: parsed.description,
        source: parsed.description,
        sku: "",
        name: parsed.description,
        price: "",
        confidence: weak,
        matched: false,
        qtyUncertain: !!parsed.qtyUncertain,
      };
    }

    var margin = best.hits - rank.secondHits;
    var confidence = Math.round(72 + Math.min(best.hits, 8) * 3 + Math.min(margin, 3));
    confidence = Math.max(62, Math.min(99, confidence));

    var unit = parsed.unitGiven ? parsed.unit : best.item.unit;
    var unitMissing = !parsed.unitGiven;
    var suggestedUnit = unitMissing ? best.item.unit : "";
    if (parsed.unitGiven && !parsed.unitBad && unit !== best.item.unit) {
      confidence = Math.max(62, confidence - 8);
    }
    if (parsed.unitBad) {
      confidence -= 28;
      unit = parsed.unit;
      unitMissing = false;
      suggestedUnit = best.item.unit;
    } else if (unitMissing) {
      confidence -= 24;
      unit = "";
    }
    if (folded.typo) confidence -= 16;
    if (parsed.qtyUncertain) confidence -= 12;
    if (parsed.hedged) confidence -= 10;
    if (parsed.unitBad || unitMissing || folded.typo || parsed.qtyUncertain || parsed.hedged) {
      confidence = Math.min(confidence, 74);
    }
    confidence = Math.max(34, Math.min(99, confidence));

    return {
      qty: parsed.qty,
      unit: unit,
      suggestedUnit: suggestedUnit,
      unitBad: !!parsed.unitBad,
      unitMissing: unitMissing,
      description: parsed.description,
      source: parsed.description,
      sku: best.item.sku,
      name: best.item.name,
      price: best.item.price,
      confidence: confidence,
      matched: true,
      qtyUncertain: !!parsed.qtyUncertain,
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

  function casualShip(value) {
    return /ask for|idk|usual spot|back door|she knows|whenever|behind the shop|\blol\b|tmrw/i.test(value);
  }

  function extractShipMethod(text) {
    var rules = [
      { re: /\bups\s+next\s+day\b|\bovernight\b/i, value: "UPS Next Day", confidence: 93, id: "overnight" },
      { re: /\bfedex\s+ground\b/i, value: "FedEx Ground", confidence: 98, id: "fedex-ground" },
      { re: /\bups\s+ground\b/i, value: "UPS Ground", confidence: 98, id: "ups-ground" },
      { re: /\busps\b/i, value: "USPS", confidence: 94, id: "usps" },
      { re: /\bfreight\b/i, value: "Freight", confidence: 90, id: "freight" },
      { re: /\bground\b/i, value: "UPS Ground", confidence: 84, id: "ground" },
    ];
    var found = [];
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].re.test(text)) found.push(rules[i]);
    }
    var ids = found.map(function (rule) { return rule.id; });
    if (ids.indexOf("ups-ground") !== -1 || ids.indexOf("fedex-ground") !== -1) {
      found = found.filter(function (rule) { return rule.id !== "ground"; });
    }
    if (!found.length) return field("", 0);
    var confidence = found[0].confidence;
    if (found.length > 1) {
      confidence = Math.min(confidence, 54);
    } else if (shipRuleHedged(text, found[0].re)) {
      confidence = Math.min(confidence, 61);
    }
    return field(found[0].value, confidence);
  }

  function shipRuleHedged(text, re) {
    var lines = text.split("\n");
    for (var i = 0; i < lines.length; i++) {
      if (re.test(lines[i]) && lineHedged(lines[i])) return true;
    }
    return false;
  }

  function cleanShipValue(value) {
    return value
      .replace(/[.,]?\s*(ups\s+ground|fedex\s+ground|usps|overnight|ground is fine)\.?\s*$/i, "")
      .replace(/[.\s]+$/, "")
      .trim();
  }

  function extractShipTo(text) {
    var m = text.match(/^(?:deliver(?:ed)?\s+to|ship\s*to)\s*[:\-]?\s*(.+)$/im);
    if (m) {
      var value = cleanShipValue(m[1]);
      var confidence = /\d/.test(value) ? 94 : 78;
      if (casualShip(value) || lineHedged(value)) confidence = Math.min(confidence, 48);
      return field(value, confidence);
    }
    var loose = text.match(/^(?:address is|send (?:it|them) to)\s+(.+)$/im);
    if (!loose) return field("", 0);
    return field(cleanShipValue(loose[1]), 46);
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

  function capWord(word) {
    if (!word) return "";
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  function customerFromInformal(text) {
    var nick = text.match(/\b([A-Za-z]{2,14})\s+@\s+the\s+([A-Za-z]{3,20})\b/);
    if (nick) {
      return { value: capWord(nick[1]) + " @ the " + nick[2].toLowerCase(), confidence: 41 };
    }
    var fromLine = text.match(/^from:\s*([^<\n]+?)\s*</im);
    var name = fromLine ? fromLine[1].replace(/["']/g, "").trim() : "";
    if (!/^[A-Za-z][a-z]{1,12}$/.test(name)) return null;
    var shop = text.match(/\(\s*(the\s+[a-z]{3,20})\s*\)/i);
    if (shop) return { value: capWord(name) + " (" + shop[1].toLowerCase() + ")", confidence: 37 };
    return { value: capWord(name), confidence: 46 };
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
    var informal = customerFromInformal(text);
    if (informal) return field(informal.value, informal.confidence);
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
    for (var j = 0; j < lines.length; j++) {
      var casual = lines[j].trim();
      if (/^(?:can u\b|can you\b|need this\b|pls\b|plz\b)/i.test(casual) && !parseQtyLine(casual)) {
        return field(casual, 52);
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
      var qty = parseQtyLine(line) || parseLooseItem(line);
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
    SAMPLE_MESSY_MIKE: SAMPLE_MESSY_MIKE,
    SAMPLE_MESSY_DAVE: SAMPLE_MESSY_DAVE,
    SAMPLES: SAMPLES,
    parsePo: parsePo,
    cloneOrder: cloneOrder,
    buildOutcome: buildOutcome,
  };
});
