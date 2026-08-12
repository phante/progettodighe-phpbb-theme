import { test, expect } from "@playwright/test";
import { PAGINE } from "./fixtures.mjs";

// Rete di sicurezza per gli asset: se il tema importa un CSS o un'immagine che
// un upgrade ha spostato, la pagina resta in piedi ma tira giù dei 404 che
// nessuno vede. Questo test li fa vedere.
for (const [nome, url] of PAGINE) {
  test(`nessuna sottorisorsa in errore — ${nome}`, async ({ page, baseURL }) => {
    const rotte = [];

    // Solo same-origin: risorse di terze parti che cadono non sono una
    // regressione del tema, e in un ambiente senza rete farebbero fallire la
    // suite per il motivo sbagliato.
    const nostra = (u) => u.startsWith(baseURL);

    page.on("response", (res) => {
      if (res.request().resourceType() === "document") return;
      if (nostra(res.url()) && res.status() >= 400) rotte.push(`${res.status()} ${res.url()}`);
    });
    page.on("requestfailed", (req) => {
      if (nostra(req.url())) rotte.push(`FAILED ${req.url()} (${req.failure()?.errorText})`);
    });

    await page.goto(url, { waitUntil: "networkidle" });

    expect(rotte, `sottorisorse in errore su ${nome}`).toEqual([]);
  });
}
