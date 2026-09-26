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
  return { CATALOG: CATALOG };
});
