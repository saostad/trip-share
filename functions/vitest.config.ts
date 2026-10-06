import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only run tests from source. The compiled output in lib/ is CommonJS
    // and must not be picked up (vitest cannot require() itself from CJS).
    include: ["src/**/*.test.ts"],
  },
});
