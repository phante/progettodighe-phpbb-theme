import { defineConfig, devices } from "@playwright/test";

/**
 * Un solo interruttore, come nel coppermine e nel sito principale: PD_BASE_URL.
 *
 *   npm run test:e2e       → il container di test (PHPBB_PORT, default 8080)
 *   PD_BASE_URL=...        → un'istanza qualunque (dev, produzione)
 *
 * Qui non c'è un webServer: le pagine le serve podman, e l'ambiente va tirato
 * su prima con `npm run env:up`.
 */
const baseURL = (
  process.env.PD_BASE_URL || `http://127.0.0.1:${process.env.PHPBB_PORT || 8080}`
).replace(/\/*$/, "/");
const inLocale = !process.env.PD_BASE_URL;

export default defineConfig({
  testDir: "test/e2e",
  timeout: 30_000,
  // Contro il container il fallimento è deterministico: i retry solo in rete.
  retries: inLocale ? 0 : 2,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "list" : "html",
  use: {
    baseURL,
    locale: "it-IT",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
});
