/**
 * Logged-in app preview. Fake session only. No network, no auth provider.
 */
(function () {
  var SESSION_KEY = "rekeypilot_app_session";
  var DRAFT_KEY = "rekeypilot_app_drafts";
  var FIELDS = [
    { key: "customer", label: "Customer" },
    { key: "email", label: "Email" },
    { key: "poNumber", label: "PO #" },
    { key: "shipTo", label: "Ship to" },
    { key: "shipMethod", label: "Ship method" },
    { key: "terms", label: "Terms" },
  ];

  var page = document.body.getAttribute("data-page");

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function sessionOk(session) {
    return !!(session && session.company && session.person && String(session.email || "").trim());
  }

  function requireSession() {
    var session = readSession();
    if (!sessionOk(session)) {
      location.replace("index.html");
      return null;
    }
    return session;
  }

  function show() {
    document.documentElement.classList.remove("booting");
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

  function queryId() {
    return new URLSearchParams(location.search).get("id") || "";
  }

  function readDrafts() {
    try {
      return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function writeDraft(id, draft) {
    var all = readDrafts();
    all[id] = draft;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(all));
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
    return ["qty", "unit", "description", "sku", "price"].some(function (key) {
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

  function shakyField(order, key) {
    var field = order[key];
    return !!String(field.value || "").trim() && field.confidence < 75;
  }

  function shakyLine(line) {
    return !line.matched || line.confidence < 75;
  }

  function fillChrome(session) {
    var company = document.getElementById("company");
    var person = document.getElementById("person");
    if (company) company.textContent = session.company;
    if (person) person.textContent = session.person;
    var signout = document.getElementById("signout");
    if (signout) {
      signout.addEventListener("click", function () {
        sessionStorage.removeItem(SESSION_KEY);
        location.href = "index.html";
      });
    }
  }

  function welcomeText(session) {
    var ready = window.RekeyAppData.METRICS[0].value;
    return "Welcome, " + session.person + ". " + session.company + " has " + ready + " purchase orders ready to review.";
  }

  function wireSignIn() {
    var form = document.getElementById("signin");
    var input = document.getElementById("email");
    var error = document.getElementById("email-error");
    if (!form || !input) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var email = input.value.trim();
      if (!email) {
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", "email-error");
        if (error) {
          error.hidden = false;
          error.textContent = "Enter your work email.";
        }
        input.focus();
        return;
      }
      input.removeAttribute("aria-invalid");
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        company: "Northline",
        person: "Sam",
        email: email,
      }));
      location.href = "home.html";
    });
  }

  function renderHome(session) {
    var data = window.RekeyAppData;
    var welcome = document.getElementById("welcome");
    if (welcome) welcome.textContent = welcomeText(session);
    var metrics = document.getElementById("metrics");
    if (metrics) {
      metrics.innerHTML = data.METRICS.map(function (metric) {
        return '<article class="metric"><p class="k">' + esc(metric.label) + '</p><p class="n">' + esc(metric.value) + "</p></article>";
      }).join("");
    }
    var list = document.getElementById("list");
    if (list) {
      list.innerHTML = data.ORDERS.map(function (order) {
        var mail = order.email.value
          ? ' <span class="po-mail">· ' + esc(order.email.value) + "</span>"
          : "";
        return '<a class="po" href="review.html?id=' + encodeURIComponent(order.id) + '">' +
          '<span class="po-main">' +
            '<span class="po-name">' + esc(order.label) + mail + "</span>" +
            '<span class="po-sum">' + esc(order.summary) + "</span>" +
          "</span>" +
          '<span class="po-side">' +
            chip(confidenceStatus(order.summary, order.confidence)) +
            '<span class="po-status">' + esc(order.status) + "</span>" +
          "</span></a>";
      }).join("");
    }
    show();
  }

  function bannerFor(order) {
    if (order.tone === "messy") {
      return '<p class="banner">This paste is messy. Confidence dropped, so check the fields before anything is created.</p>';
    }
    if (order.tone === "mixed") {
      return '<p class="banner">One line did not match the catalog. Check it before anything is created.</p>';
    }
    return "";
  }

  function renderReview(session) {
    var data = window.RekeyAppData;
    var order = data.getOrder(queryId());
    var title = document.getElementById("title");
    var lead = document.getElementById("lead");
    var panel = document.getElementById("panel");
    var crumb = document.getElementById("crumb");
    if (!order) {
      if (title) title.textContent = "That purchase order is not in this preview.";
      if (lead) lead.textContent = "Head back to the four purchase orders waiting for Northline.";
      if (panel) panel.innerHTML = '<div class="actions"><a class="btn btn-p" href="home.html">Back to home</a></div>';
      show();
      return;
    }
    document.title = "Review " + order.label + " — RekeyPilot";
    if (crumb) crumb.textContent = order.label;
    if (title) title.textContent = "Review " + order.label;
    if (lead) lead.textContent = order.blurb;

    var saved = readDrafts()[order.id];
    var draft = draftUsable(saved, order) ? saved : seedDraft(order);

    var html = '<form id="review-form" novalidate autocomplete="off">' + bannerFor(order) + '<div class="readout">';
    FIELDS.forEach(function (field) {
      var shaky = shakyField(order, field.key) ? " needs-review" : "";
      html += '<div class="r' + shaky + '">' +
        '<label class="k" for="' + field.key + '">' + esc(field.label) + "</label>" +
        '<input id="' + field.key + '" data-field="' + field.key + '" type="text" autocomplete="off" value="' + esc(draft[field.key]) + '">' +
        '<span data-chip="' + field.key + '">' + chip(fieldStatus(draft, order, field.key)) + "</span></div>";
    });
    var notesShaky = shakyField(order, "notes") ? " needs-review" : "";
    html += '<div class="r' + notesShaky + '">' +
      '<label class="k" for="notes">Notes</label>' +
      '<textarea id="notes" data-field="notes" autocomplete="off">' + esc(draft.notes) + "</textarea>" +
      '<span data-chip="notes">' + chip(fieldStatus(draft, order, "notes")) + "</span></div></div>";

    html += '<h2 class="sub">Line items</h2><div class="lines-card">';
    order.lines.forEach(function (line, index) {
      var current = draft.lines[index];
      var shaky = shakyLine(line) ? " needs-review" : "";
      html += '<div class="line' + shaky + '">' +
        '<div class="line-top"><span class="k">Line ' + (index + 1) + '</span><span data-line-chip="' + index + '">' +
        chip(lineStatus(current, line)) + "</span></div>" +
        '<div class="line-grid">' +
          lineInput(index, "qty", "Qty", current.qty, "inputmode=\"decimal\"") +
          lineInput(index, "unit", "Unit", current.unit, "") +
          lineInput(index, "description", "Description", current.description, 'class="grow"') +
          lineInput(index, "sku", "SKU", current.sku, "") +
          lineInput(index, "price", "Unit price", current.price, "inputmode=\"decimal\"") +
        "</div>" +
        (line.source ? '<p class="source">From the PO: ' + esc(line.source) + "</p>" : "") +
        "</div>";
    });
    html += "</div>";
    html += '<details class="original"><summary>Original purchase order</summary><pre>' + esc(order.text) + "</pre></details>";
    html += '<div class="actions">' +
      '<a class="btn btn-s" href="home.html">Back</a>' +
      '<button class="btn btn-p" type="submit">Continue</button>' +
      "</div></form>";
    panel.innerHTML = html;

    function lineInput(index, key, label, value, extra) {
      var id = key + "-" + index;
      var wrapClass = extra.indexOf("grow") !== -1 ? ' class="grow"' : "";
      return "<div" + wrapClass + "><label for=\"" + id + "\">" + esc(label) + "</label>" +
        '<input id="' + id + '" data-line="' + index + '" data-key="' + key + '" type="text" autocomplete="off" value="' + esc(value) + '"></div>';
    }

    function refreshField(key) {
      var holder = panel.querySelector('[data-chip="' + key + '"]');
      if (holder) holder.innerHTML = chip(fieldStatus(draft, order, key));
    }

    function refreshLine(index) {
      var holder = panel.querySelector('[data-line-chip="' + index + '"]');
      if (holder) holder.innerHTML = chip(lineStatus(draft.lines[index], order.lines[index]));
    }

    panel.addEventListener("input", function (event) {
      var target = event.target;
      var field = target.getAttribute("data-field");
      if (field) {
        draft[field] = target.value;
        writeDraft(order.id, draft);
        refreshField(field);
        return;
      }
      var index = target.getAttribute("data-line");
      var key = target.getAttribute("data-key");
      if (index == null || !key || !draft.lines[index]) return;
      draft.lines[index][key] = target.value;
      writeDraft(order.id, draft);
      refreshLine(index);
    });

    panel.querySelector("#review-form").addEventListener("submit", function (event) {
      event.preventDefault();
      writeDraft(order.id, draft);
      location.href = "preview.html?id=" + encodeURIComponent(order.id);
    });
    show();
  }

  function pair(label, value) {
    return "<div><dt>" + esc(label) + "</dt><dd>" + (value ? esc(value) : "—") + "</dd></div>";
  }

  function renderShipStation(ss) {
    var rows = ss.items.map(function (item) {
      return "<tr><td class=\"mono\">" + (item.sku ? esc(item.sku) : "—") + "</td><td>" + esc(item.description || "—") +
        "</td><td class=\"mono\">" + esc(item.qty) + " " + esc(item.unit) + "</td></tr>";
    }).join("");
    return '<article class="doc" aria-label="ShipStation order preview">' +
      '<div class="hd"><div><p class="kicker">ShipStation</p><h3>Order ' + esc(ss.orderNumber || "—") + "</h3></div>" +
      '<span class="chip e">Not sent</span></div><dl>' +
      pair("Order key", ss.orderKey) +
      pair("Customer", ss.customer) +
      pair("Email", ss.email) +
      pair("Ship to", ss.shipTo) +
      pair("Service", ss.service) +
      pair("Notes", ss.notes) +
      "</dl>" +
      '<div class="table-wrap"><table><thead><tr><th>SKU</th><th>Item</th><th>Qty</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="3">No lines</td></tr>') +
      "</tbody></table></div></article>";
  }

  function renderQuickBooks(qb) {
    var rows = qb.lines.map(function (line) {
      var item = line.sku || line.description || "—";
      return "<tr><td class=\"mono\">" + esc(item) + "</td><td>" + esc(line.description || "—") +
        "</td><td class=\"mono\">" + esc(line.qty) + "</td><td class=\"mono\">" + esc(formatMoney(line.price)) +
        "</td><td class=\"mono\">" + esc(formatMoney(line.amount)) + "</td></tr>";
    }).join("");
    var note = qb.missingPrice ? '<p class="small warn">Lines without a unit price are left off the subtotal.</p>' : "";
    return '<article class="doc" aria-label="QuickBooks invoice preview">' +
      '<div class="hd"><div><p class="kicker">QuickBooks</p><h3>Invoice ' + esc(qb.invoiceNumber) + "</h3></div>" +
      '<span class="chip e">Not sent</span></div><dl>' +
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
      note + "</article>";
  }

  function renderPreview() {
    var data = window.RekeyAppData;
    var order = data.getOrder(queryId());
    var title = document.getElementById("title");
    var lead = document.getElementById("lead");
    var kicker = document.getElementById("kicker");
    var actions = document.getElementById("actions");
    var panel = document.getElementById("panel");
    var crumb = document.getElementById("crumb");
    if (!order) {
      if (kicker) kicker.textContent = "Preview";
      if (title) title.textContent = "That purchase order is not in this preview.";
      if (lead) lead.textContent = "";
      if (actions) actions.innerHTML = '<a class="btn btn-p" href="home.html">Back to home</a>';
      show();
      return;
    }
    document.title = "Preview " + order.label + " — RekeyPilot";
    if (crumb) crumb.textContent = order.label;
    if (kicker) kicker.textContent = "Not sent";
    if (title) title.textContent = "Nothing was sent.";
    var saved = readDrafts()[order.id];
    var draft = draftUsable(saved, order) ? saved : seedDraft(order);
    var outcome = data.buildOutcome(draft);
    var poBit = draft.poNumber ? " · PO " + draft.poNumber : "";
    if (lead) {
      lead.textContent = order.label + poBit + " stays in review. The ShipStation order and QuickBooks invoice below were not created.";
    }
    var reviewHref = "review.html?id=" + encodeURIComponent(order.id);
    if (actions) {
      actions.innerHTML = '<a class="btn btn-s" href="' + reviewHref + '">Back to review</a>' +
        '<a class="btn btn-p" href="home.html">Back to home</a>';
    }
    var payload = { mocked: true, sent: false, shipstation: outcome.shipstation, quickbooks: outcome.quickbooks };
    panel.innerHTML = '<p class="banner"><strong>Not sent.</strong> Nothing was sent. ShipStation and QuickBooks were not contacted.</p>' +
      '<div class="docs">' + renderShipStation(outcome.shipstation) + renderQuickBooks(outcome.quickbooks) + "</div>" +
      '<details class="original"><summary>Payload that would be sent</summary><pre>' + esc(JSON.stringify(payload, null, 2)) + "</pre></details>";
    show();
  }

  if (page === "signin") {
    wireSignIn();
    return;
  }

  var session = requireSession();
  if (!session) return;
  fillChrome(session);

  if (!window.RekeyAppData) {
    var panel = document.getElementById("panel") || document.getElementById("list");
    if (panel) panel.textContent = "App data did not load.";
    show();
    return;
  }

  if (page === "home") renderHome(session);
  else if (page === "review") renderReview(session);
  else if (page === "preview") renderPreview();
})();
