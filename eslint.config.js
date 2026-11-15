import js from "@eslint/js";

const browser = {
  window: "readonly",
  document: "readonly",
  sessionStorage: "readonly",
  location: "readonly",
  URLSearchParams: "readonly",
  console: "readonly",
  globalThis: "readonly",
  module: "writable",
};

export default [
  {
    ignores: [
      "node_modules/**",
      "rekeypilot/demo/**",
      "rekeypilot/index.html",
      "rekeypilot/index-full.html",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["rekeypilot/app/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: browser,
    },
    rules: {
      "no-unused-vars": ["error", { caughtErrors: "none", args: "none" }],
    },
  },
  {
    files: ["functions/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        Response: "readonly",
        fetch: "readonly",
        console: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { caughtErrors: "none", args: "none" }],
    },
  },
  {
    files: ["tests/app-core.test.js", "vitest.config.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        globalThis: "readonly",
        console: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["tests/parse.test.js", "tests/serve.js", "e2e/**/*.js", "playwright.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        process: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        URL: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { caughtErrors: "none", args: "none" }],
    },
  },
];
