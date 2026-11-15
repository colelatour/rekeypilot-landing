import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/app-core.test.js"],
    environment: "node",
  },
});
