(function () {
  if (!window.RekeyParse) {
    var missing = document.getElementById("panel");
    if (missing) missing.textContent = "The demo parser did not load.";
    return;
  }
  var P = window.RekeyParse;
  var UNITS = ["cs", "ea", "bx", "pk", "rl", "dr", "pl"];
  var FIELDS = [
    { key: "customer", label: "Customer", type: "text" },
    { key: "email", label: "Email", type: "email" },
    { key: "poNumber", label: "PO number", type: "text" },
    { key: "shipTo", label: "Ship to", type: "text" },
    { key: "shipMethod", label: "Shipping method", type: "text" },
    { key: "terms", label: "Payment terms", type: "text" },
  ];
  var STEPS = [
    { n: 1, label: "Paste" },
    { n: 2, label: "Read" },
    { n: 3, label: "Review" },
    { n: 4, label: "Create" },
  ];

  var lineSeq = 0;
  var state = {
    step: 1,
    raw: P.SAMPLE_PO,
    rawError: "",
    parsed: null,
    order: null,
    baseline: null,
    errors: {},
    approved: false,
    approvedAt: "",
  };

  var app = document.getElementById("app");
  var stepperEl = document.getElementById("stepper");
  var panelEl = document.getElementById("panel");
  var statusEl = document.getElementById("status");

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function setStatus(message) {
    statusEl.textContent = message || "";
  }

  function stamp(order) {
    order.lines.forEach(function (line) {
      line.id = ++lineSeq;
    });
    return order;
  }

  function findLine(id) {
    return state.order.lines.find(function (line) {
      return String(line.id) === String(id);
    });
  }

  function baselineLine(id) {
    if (!state.baseline) return null;
    return state.baseline.lines.find(function (line) {
      return String(line.id) === String(id);
    }) || null;
  }

  function chip(status) {
    var kind = status.kind;
    var cls = kind === "ok" ? "g" : kind === "review" ? "a" : kind === "miss" ? "bad" : "e";
    return '<span class="chip ' + cls + '" aria-label="' + esc(status.aria) + '">' + esc(status.label) + "</span>";
  }

  function headerStatus(key) {
    var parsed = state.parsed[key];
    var confidence = parsed ? parsed.confidence : 0;
    var value = state.order[key];
    if (String(value) !== String(state.baseline[key])) {
      return { kind: "edited", label: "edited", aria: "Edited by you" };
    }
    return confidenceStatus(value, confidence);
  }

  function confidenceStatus(value, confidence) {
    if (!String(value || "").trim()) {
      return { kind: "miss", label: "not found", aria: "Not found in the purchase order" };
    }
    if (confidence >= 90) {
      return { kind: "ok", label: confidence + "%", aria: "Confidence " + confidence + " percent" };
    }
    return {
      kind: "review",
      label: "review " + confidence + "%",
      aria: "Needs review, confidence " + confidence + " percent",
    };
  }

  function lineStatus(line) {
    var base = baselineLine(line.id);
    if (!base) return { kind: "added", label: "added", aria: "Added by you" };
    var changed = ["qty", "unit", "description", "sku", "price"].some(function (key) {
      return String(line[key]) !== String(base[key]);
    });
    if (changed) return { kind: "edited", label: "edited", aria: "Edited by you" };
    return confidenceStatus(line.sku || line.description, line.confidence);
  }

  function formatMoney(amount) {
    if (amount == null || Number.isNaN(amount)) return "—";
    return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }

  function describedBy(id, hasError) {
    return hasError ? ' aria-invalid="true" aria-describedby="' + id + '-error"' : "";
  }

  function errorHtml(id) {
    var message = state.errors[id];
    if (!message) return "";
    return '<p class="err" id="' + id + '-error">' + esc(message) + "</p>";
  }

  function renderStepper() {
    var html = '<ol class="stepper">';
    STEPS.forEach(function (step) {
      var current = step.n === state.step;
      var enabled = step.n === 1 || !!state.parsed;
      html += '<li><button type="button" data-action="goto" data-step="' + step.n + '"' +
        (current ? ' aria-current="step"' : "") +
        (enabled ? "" : " disabled") +
        '><span class="n">0' + step.n + '</span>' + esc(step.label) + "</button></li>";
    });
    html += "</ol>";
    stepperEl.innerHTML = html;
  }

  function renderPaste() {
    return (
      '<form id="paste-form" novalidate autocomplete="off">' +
        '<h2 id="step-title" tabindex="-1">Paste a purchase order</h2>' +
        '<p class="lead">Paste the email your customer sent, or start from a synthetic example. Reading happens in this browser.</p>' +
        '<div class="field">' +
          '<label for="po-text">Purchase order text</label>' +
          '<textarea id="po-text" name="po"' + describedBy("po-text", !!state.rawError) + '>' + esc(state.raw) + "</textarea>" +
          (state.rawError ? '<p class="err" id="po-text-error">' + esc(state.rawError) + "</p>" : "") +
        "</div>" +
        '<div class="samples">' +
          '<button class="btn btn-s" type="button" data-action="sample">Use sample PO</button>' +
          '<button class="btn btn-s" type="button" data-action="uncertain">Load uncertain PO</button>' +
        "</div>" +
        '<p class="small">The sample is Harborview Clinic, PO 20817. The uncertain PO includes a product the catalog does not know, so you can see a review flag.</p>' +
        (state.parsed ? '<p class="small warn">Reading again replaces any edits on the review step.</p>' : "") +
        '<div class="actions">' +
          '<button class="btn btn-p" type="submit">Read purchase order</button>' +
          '<span class="small">Ctrl or Cmd + Enter also reads it. Nothing is uploaded.</span>' +
        "</div>" +
      "</form>"
    );
  }

  function renderRead() {
    var parsed = state.parsed;
    var rows = [
      ["Customer", parsed.customer],
      ["Email", parsed.email],
      ["PO number", parsed.poNumber],
      ["Ship to", parsed.shipTo],
      ["Shipping method", parsed.shipMethod],
      ["Payment terms", parsed.terms],
      ["Notes", parsed.notes],
    ];
    var html =
      '<h2 id="step-title" tabindex="-1">What RekeyPilot read</h2>' +
      '<p class="lead">Mock parse of the text you pasted. The same purchase order always fills the same fields. Edit them on the next step before anything is created.</p>' +
      '<div class="readout">';
    rows.forEach(function (row) {
      html +=
        '<div class="r"><span class="k">' + esc(row[0]) + "</span>" +
        '<span class="v">' + (row[1].value ? esc(row[1].value) : '<span class="muted">—</span>') + "</span>" +
        chip(confidenceStatus(row[1].value, row[1].confidence)) + "</div>";
    });
    html += "</div>";

    html += '<h3 class="sub">Line items</h3>';
    if (!parsed.lines.length) {
      html += '<p class="empty">No line items found. You can add them while reviewing.</p>';
    } else {
      html += '<div class="table-wrap"><table><thead><tr>' +
        "<th>Qty</th><th>Unit</th><th>From the PO</th><th>Matched item</th><th>SKU</th><th>Price</th><th>Confidence</th>" +
        "</tr></thead><tbody>";
      parsed.lines.forEach(function (line) {
        html += "<tr><td class=\"mono\">" + esc(line.qty) + "</td><td class=\"mono\">" + esc(line.unit) +
          "</td><td>" + esc(line.source) + "</td><td>" + esc(line.name) +
          "</td><td class=\"mono\">" + (line.sku ? esc(line.sku) : "—") +
          "</td><td class=\"mono\">" + (line.price === "" ? "—" : esc(formatMoney(line.price))) +
          "</td><td>" + chip(confidenceStatus(line.sku || line.name, line.confidence)) + "</td></tr>";
      });
      html += "</tbody></table></div>";
    }

    html +=
      '<details class="original"><summary>Original purchase order</summary><pre>' + esc(state.raw) + "</pre></details>" +
      '<div class="actions">' +
        '<button class="btn btn-s" type="button" data-action="goto" data-step="1">Back</button>' +
        '<button class="btn btn-p" type="button" data-action="goto" data-step="3">Review and edit</button>' +
      "</div>";
    return html;
  }

  function renderReview() {
    var summary = renderErrorSummary();
    var html =
      '<form id="review-form" novalidate autocomplete="off">' +
        '<h2 id="step-title" tabindex="-1">Review and edit</h2>' +
        '<p class="lead">Correct anything that looks wrong. ShipStation and QuickBooks are not contacted until you preview and approve, and even then only a mock document is shown.</p>' +
        summary +
        '<div class="fields">';

    FIELDS.forEach(function (field) {
      var id = field.key;
      var err = !!state.errors[id];
      html +=
        '<div class="field">' +
          '<div class="label-row"><label for="' + id + '">' + esc(field.label) + '</label><span data-chip="' + id + '">' + chip(headerStatus(id)) + "</span></div>" +
          '<input id="' + id + '" data-field="' + id + '" type="' + field.type + '" autocomplete="off" value="' + esc(state.order[id]) + '"' + describedBy(id, err) + ">" +
          errorHtml(id) +
        "</div>";
    });

    html +=
      '</div><div class="field">' +
        '<div class="label-row"><label for="notes">Notes</label><span data-chip="notes">' + chip(headerStatus("notes")) + "</span></div>" +
        '<textarea id="notes" data-field="notes" autocomplete="off">' + esc(state.order.notes) + "</textarea>" +
      "</div>" +
      '<fieldset class="lines"><legend>Line items</legend>' +
      (state.errors.lines ? '<p class="err" id="lines-error">' + esc(state.errors.lines) + "</p>" : "");

    if (!state.order.lines.length) {
      html += '<p class="empty">No lines yet.</p>';
    }

    state.order.lines.forEach(function (line, index) {
      html += renderLine(line, index);
    });

    html +=
      '<button class="btn btn-s" id="add-line" type="button" data-action="add-line">Add line</button>' +
      "</fieldset>" +
      '<div class="actions">' +
        '<button class="btn btn-s" type="button" data-action="goto" data-step="2">Back</button>' +
        '<button class="btn btn-p" type="submit">Preview outcome</button>' +
      "</div></form>";
    return html;
  }

  function renderLine(line, index) {
    var id = line.id;
    var qtyErr = !!state.errors["qty-" + id];
    var descErr = !!state.errors["desc-" + id];
    var priceErr = !!state.errors["price-" + id];
    var options = UNITS.map(function (unit) {
      return '<option value="' + unit + '"' + (line.unit === unit ? " selected" : "") + ">" + unit + "</option>";
    }).join("");
    var source = line.source
      ? '<p class="source">From the PO: ' + esc(line.source) + "</p>"
      : "";
    return (
      '<div class="line">' +
        '<div class="line-grid">' +
          '<div><label for="qty-' + id + '">Qty</label>' +
            '<input id="qty-' + id + '" data-line="' + id + '" data-key="qty" inputmode="decimal" type="number" min="0" step="1" value="' + esc(line.qty) + '"' + describedBy("qty-" + id, qtyErr) + ">" +
            errorHtml("qty-" + id) + "</div>" +
          '<div><label for="unit-' + id + '">Unit</label>' +
            '<select id="unit-' + id + '" data-line="' + id + '" data-key="unit">' + options + "</select></div>" +
          '<div class="grow"><label for="desc-' + id + '">Description</label>' +
            '<input id="desc-' + id + '" data-line="' + id + '" data-key="description" type="text" autocomplete="off" value="' + esc(line.description) + '"' + describedBy("desc-" + id, descErr) + ">" +
            errorHtml("desc-" + id) + "</div>" +
          '<div><label for="sku-' + id + '">SKU</label>' +
            '<input id="sku-' + id + '" class="mono" data-line="' + id + '" data-key="sku" type="text" autocomplete="off" value="' + esc(line.sku) + '"></div>' +
          '<div><label for="price-' + id + '">Unit price</label>' +
            '<input id="price-' + id + '" data-line="' + id + '" data-key="price" inputmode="decimal" type="number" min="0" step="0.01" value="' + esc(line.price) + '"' + describedBy("price-" + id, priceErr) + ">" +
            errorHtml("price-" + id) + "</div>" +
          '<div class="line-actions"><span data-line-chip="' + id + '">' + chip(lineStatus(line)) + "</span>" +
            '<button class="btn btn-s" type="button" data-action="remove-line" data-id="' + id + '" aria-label="Remove line ' + (index + 1) + '">Remove</button>' +
          "</div>" +
        "</div>" + source +
      "</div>"
    );
  }

  function renderErrorSummary() {
    var keys = Object.keys(state.errors);
    if (!keys.length) return "";
    var items = keys.map(function (key) {
      var target = key === "lines" ? "add-line" : key.indexOf("qty-") === 0 ? key : key.indexOf("desc-") === 0 ? "desc-" + key.slice(5) : key.indexOf("price-") === 0 ? "price-" + key.slice(6) : key;
      if (key.indexOf("qty-") === 0) target = key;
      return '<li><a href="#' + esc(target) + '">' + esc(state.errors[key]) + "</a></li>";
    }).join("");
    return '<div class="summary" id="error-summary" role="alert" tabindex="-1"><p>Fix the following before previewing the outcome.</p><ul>' + items + "</ul></div>";
  }

  function renderCreate() {
    var outcome = P.buildOutcome(state.order);
    var ss = outcome.shipstation;
    var qb = outcome.quickbooks;
    var actions =
      '<div class="actions">' +
        '<button class="btn btn-s" type="button" data-action="goto" data-step="3">Edit order</button>' +
        (state.approved
          ? '<button class="btn btn-p" type="button" disabled>Approved (preview only)</button>'
          : '<button class="btn btn-p" type="button" data-action="approve">Approve both</button>') +
        '<button class="btn btn-s" type="button" data-action="restart">Start over</button>' +
      "</div>";
    var created = state.approved
      ? '<div class="created" id="created" tabindex="-1">' +
          "<h3>Preview recorded in this browser</h3>" +
          "<p>Nothing was sent. A connected account would have created ShipStation order <span class=\"mono\">" + esc(ss.orderKey) +
          "</span> and QuickBooks invoice <span class=\"mono\">" + esc(qb.invoiceNumber) + "</span>.</p>" +
          '<p class="small">Recorded ' + esc(new Date(state.approvedAt).toLocaleString()) + ".</p>" +
        "</div>"
      : "";
    var payload = {
      mocked: true,
      approvedAt: state.approved ? state.approvedAt : null,
      shipstation: ss,
      quickbooks: qb,
    };

    return (
      '<h2 id="step-title" tabindex="-1">What would be created</h2>' +
      '<p class="banner">Preview only. Approving does not call ShipStation or QuickBooks, and no credentials are used.</p>' +
      actions +
      created +
      '<div class="docs">' +
        renderShipStation(ss) +
        renderQuickBooks(qb) +
      "</div>" +
      '<details class="original"><summary>Payload that would be sent</summary><pre>' + esc(JSON.stringify(payload, null, 2)) + "</pre></details>"
    );
  }

  function renderShipStation(ss) {
    var rows = ss.items.map(function (item) {
      return "<tr><td class=\"mono\">" + (item.sku ? esc(item.sku) : "—") + "</td><td>" + esc(item.description || "—") +
        "</td><td class=\"mono\">" + esc(item.qty) + " " + esc(item.unit) + "</td></tr>";
    }).join("");
    return (
      '<article class="doc" aria-label="ShipStation order preview">' +
        '<div class="hd"><div><p class="kicker">ShipStation</p><h3>Order ' + esc(ss.orderNumber || "—") + "</h3></div>" +
        '<span class="chip e">Not sent</span></div>' +
        '<dl>' +
          pair("Order key", ss.orderKey) +
          pair("Customer", ss.customer) +
          pair("Email", ss.email) +
          pair("Ship to", ss.shipTo) +
          pair("Service", ss.service) +
          pair("Notes", ss.notes) +
        "</dl>" +
        '<div class="table-wrap"><table><thead><tr><th>SKU</th><th>Item</th><th>Qty</th></tr></thead><tbody>' +
          (rows || '<tr><td colspan="3">No lines</td></tr>') +
        "</tbody></table></div></article>"
    );
  }

  function renderQuickBooks(qb) {
    var rows = qb.lines.map(function (line) {
      var item = line.sku || line.description || "—";
      return "<tr><td class=\"mono\">" + esc(item) + "</td><td>" + esc(line.description || "—") +
        "</td><td class=\"mono\">" + esc(line.qty) + "</td><td class=\"mono\">" + esc(formatMoney(line.price)) +
        "</td><td class=\"mono\">" + esc(formatMoney(line.amount)) + "</td></tr>";
    }).join("");
    var note = qb.missingPrice ? '<p class="small warn">Lines without a unit price are left off the subtotal.</p>' : "";
    return (
      '<article class="doc" aria-label="QuickBooks invoice preview">' +
        '<div class="hd"><div><p class="kicker">QuickBooks</p><h3>Invoice ' + esc(qb.invoiceNumber) + "</h3></div>" +
        '<span class="chip e">Not sent</span></div>' +
        '<dl>' +
          pair("Customer", qb.customer) +
          pair("Email", qb.email) +
          pair("PO number", qb.poNumber) +
          pair("Terms", qb.terms) +
          pair("Ship to", qb.shipTo) +
        "</dl>" +
        '<div class="table-wrap"><table><thead><tr><th>Item</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>' +
          (rows || '<tr><td colspan="5">No lines</td></tr>') +
        "</tbody></table></div>" +
        '<p class="total"><span>Subtotal</span><span class="mono">' + esc(formatMoney(qb.subtotal)) + "</span></p>" +
        note +
      "</article>"
    );
  }

  function pair(label, value) {
    return "<div><dt>" + esc(label) + "</dt><dd>" + (value ? esc(value) : "—") + "</dd></div>";
  }

  function render() {
    renderStepper();
    var body = "";
    if (state.step === 1) body = renderPaste();
    else if (state.step === 2) body = renderRead();
    else if (state.step === 3) body = renderReview();
    else body = renderCreate();
    panelEl.innerHTML = body;
  }

  function showStep(step, focusId) {
    state.step = step;
    render();
    var target = focusId ? document.getElementById(focusId) : document.getElementById("step-title");
    if (target) target.focus();
  }

  function validate() {
    var order = state.order;
    var errors = {};
    if (!String(order.customer).trim()) errors.customer = "Enter a customer name.";
    if (String(order.email).trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(order.email).trim())) {
      errors.email = "Enter a valid email, or leave it blank.";
    }
    if (!String(order.poNumber).trim()) errors.poNumber = "Enter a PO number.";
    if (!order.lines.length) errors.lines = "Add at least one line.";
    order.lines.forEach(function (line) {
      if (!(Number(line.qty) > 0)) errors["qty-" + line.id] = "Enter a quantity greater than zero.";
      if (!String(line.description).trim()) errors["desc-" + line.id] = "Enter a description.";
      if (line.price !== "" && line.price != null && !(Number(line.price) >= 0)) {
        errors["price-" + line.id] = "Enter a price of zero or more, or leave it blank.";
      }
    });
    return errors;
  }

  function goPreview() {
    state.errors = validate();
    if (Object.keys(state.errors).length) {
      state.approved = false;
      showStep(3, "error-summary");
      setStatus("Fix the highlighted fields before previewing the outcome.");
      return false;
    }
    showStep(4);
    setStatus("Outcome preview ready. Nothing has been sent.");
    return true;
  }

  function readPo() {
    if (!String(state.raw).trim()) {
      state.rawError = "Paste a purchase order, or use the sample.";
      showStep(1, "po-text");
      setStatus(state.rawError);
      return;
    }
    state.rawError = "";
    state.parsed = P.parsePo(state.raw);
    state.order = stamp(P.cloneOrder(state.parsed));
    state.baseline = JSON.parse(JSON.stringify(state.order));
    state.errors = {};
    state.approved = false;
    state.approvedAt = "";
    var count = state.parsed.lines.length;
    showStep(2);
    setStatus("Read " + count + " line " + (count === 1 ? "item" : "items") + " from the purchase order.");
  }

  function loadSample(kind) {
    state.raw = kind === "uncertain" ? P.SAMPLE_UNCERTAIN_PO : P.SAMPLE_PO;
    state.rawError = "";
    if (state.step !== 1) state.step = 1;
    render();
    var box = document.getElementById("po-text");
    if (box) {
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    }
    setStatus(kind === "uncertain" ? "Uncertain sample loaded." : "Sample purchase order loaded.");
  }

  function addLine() {
    var line = {
      id: ++lineSeq,
      qty: 1,
      unit: "ea",
      description: "",
      source: "",
      sku: "",
      price: "",
      confidence: 0,
    };
    state.order.lines.push(line);
    state.approved = false;
    delete state.errors.lines;
    render();
    var input = document.getElementById("desc-" + line.id);
    if (input) input.focus();
  }

  function removeLine(id) {
    var index = state.order.lines.findIndex(function (line) {
      return String(line.id) === String(id);
    });
    if (index < 0) return;
    state.order.lines.splice(index, 1);
    state.approved = false;
    render();
    var next = state.order.lines[index] || state.order.lines[index - 1];
    var focus = next ? document.getElementById("desc-" + next.id) : document.getElementById("add-line");
    if (focus) focus.focus();
  }

  function approve() {
    state.errors = validate();
    if (Object.keys(state.errors).length) {
      state.approved = false;
      showStep(3, "error-summary");
      setStatus("Fix the highlighted fields before previewing the outcome.");
      return;
    }
    state.approved = true;
    state.approvedAt = new Date().toISOString();
    showStep(4, "created");
    setStatus("Preview recorded in this browser. Nothing was sent to ShipStation or QuickBooks.");
  }

  function restart() {
    lineSeq = 0;
    state.step = 1;
    state.raw = P.SAMPLE_PO;
    state.rawError = "";
    state.parsed = null;
    state.order = null;
    state.baseline = null;
    state.errors = {};
    state.approved = false;
    state.approvedAt = "";
    render();
    var box = document.getElementById("po-text");
    if (box) box.focus();
    setStatus("Demo reset.");
  }

  function goto(step) {
    step = Number(step);
    if (step !== 1 && !state.parsed) return;
    if (step === 4) {
      goPreview();
      return;
    }
    showStep(step);
  }

  function refreshFieldChip(key) {
    var holder = document.querySelector('[data-chip="' + key + '"]');
    if (!holder) return;
    holder.innerHTML = chip(headerStatus(key));
  }

  function refreshLineChip(line) {
    var holder = document.querySelector('[data-line-chip="' + line.id + '"]');
    if (!holder) return;
    holder.innerHTML = chip(lineStatus(line));
  }

  function onInput(event) {
    var target = event.target;
    if (target.id === "po-text") {
      state.raw = target.value;
      if (state.rawError) {
        state.rawError = "";
        var err = document.getElementById("po-text-error");
        if (err) err.remove();
        target.removeAttribute("aria-invalid");
        target.removeAttribute("aria-describedby");
      }
      return;
    }
    if (!state.order) return;
    var field = target.getAttribute("data-field");
    if (field) {
      state.order[field] = target.value;
      state.approved = false;
      refreshFieldChip(field);
      return;
    }
    var line = findLine(target.getAttribute("data-line"));
    var key = target.getAttribute("data-key");
    if (!line || !key) return;
    line[key] = target.value;
    state.approved = false;
    refreshLineChip(line);
  }

  app.addEventListener("input", onInput);
  app.addEventListener("change", onInput);
  app.addEventListener("submit", function (event) {
    event.preventDefault();
    if (event.target.id === "paste-form") readPo();
    if (event.target.id === "review-form") goPreview();
  });
  app.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && event.target.id === "po-text") {
      event.preventDefault();
      readPo();
    }
  });
  app.addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button || button.disabled) return;
    var action = button.getAttribute("data-action");
    if (action === "sample") loadSample("sample");
    else if (action === "uncertain") loadSample("uncertain");
    else if (action === "goto") goto(button.getAttribute("data-step"));
    else if (action === "add-line") addLine();
    else if (action === "remove-line") removeLine(button.getAttribute("data-id"));
    else if (action === "approve") approve();
    else if (action === "restart") restart();
  });

  render();
})();
