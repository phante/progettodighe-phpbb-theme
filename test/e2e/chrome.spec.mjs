import { test, expect } from "@playwright/test";
import { PAGINE, VOCI_MENU, SITE_HOME } from "./fixtures.mjs";

// La scocca viene dai template overall_header / site_navbar / navbar_header: se
// una personalizzazione si rompe con un upgrade, si rompe su ogni pagina.
// Girare le stesse asserzioni su indice e forum costa poco e copre i due modi
// in cui phpBB rende la pagina.
for (const [nome, url] of PAGINE) {
  test.describe(`scocca — ${nome}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(url);
    });

    test("il logo del tema porta al sito principale", async ({ page }) => {
      const logo = page.locator("#logo");
      await expect(logo).toBeVisible();
      await expect(logo).toHaveAttribute("href", SITE_HOME);
      // Lo sfondo del logo è site_logo.png, servito da theme/stylesheet.css.
      await expect(logo.locator("span.site_logo")).toHaveCount(1);
    });

    test("il menu del sito ha le voci del tema, in ordine", async ({ page }) => {
      // .compact distingue il nav del sito (site_navbar) da quello di phpBB
      // (navbar_header), che condividono id="nav-main".
      const voci = page.locator("ul.nav-main.compact > li > a");
      await expect(voci).toHaveText(VOCI_MENU.map(([t]) => t));
      for (const [i, [, href]] of VOCI_MENU.entries()) {
        if (href) await expect(voci.nth(i)).toHaveAttribute("href", href);
      }
    });

    test("nessuna traccia di umami", async ({ page }) => {
      // Lo script di analytics e le classi umami--click--* sono stati tolti.
      await expect(page.locator("script[src*='umami']")).toHaveCount(0);
      await expect(page.locator("[class*='umami--']")).toHaveCount(0);
    });

    test("la breadcrumb non porta la home del sito principale", async ({ page }) => {
      // Il crumb verso {U_SITE_HOME} è stato commentato in navbar_header: la
      // breadcrumb parte dall'indice del forum, non dalla home del sito.
      await expect(
        page.locator('#nav-breadcrumbs a[data-navbar-reference="home"]'),
      ).toHaveCount(0);
    });

    test("la pagina non è rotta", async ({ page }) => {
      // Rete di sicurezza minima contro un template che non compila: il menu
      // del sito c'è, il corpo pagina c'è, il titolo non è vuoto.
      await expect(page.locator("ul.nav-main.compact")).toBeVisible();
      await expect(page.locator("#page-body")).toBeVisible();
      await expect(page).not.toHaveTitle("");
    });
  });
}
