/**
 * Il sito principale come lo semina test/bin/install.sh in site_home_url.
 * Contro un'istanza vera (dev, produzione) è già configurato nell'ACP: se lì
 * fosse diverso, si passa PD_SITE_HOME.
 */
export const SITE_HOME = process.env.PD_SITE_HOME || "https://www.progettodighe.it";

/**
 * Le pagine su cui verificare la scocca. La scocca (header, menu del sito,
 * footer) è la stessa ovunque perché viene dai template overall_*: indice e una
 * pagina di forum coprono i due modi in cui phpBB la rende.
 *
 * f=2 è "Your first forum", creato da ogni installazione fresca. Contro
 * un'istanza vera va dato un forum che esiste: PD_FORUM=12 npm run test:e2e:dev
 */
const FORUM = process.env.PD_FORUM || "2";
export const PAGINE = [
  ["indice", "index.php"],
  ["forum", `viewforum.php?f=${FORUM}`],
];

/**
 * Il menu del sito, nell'ordine di template/site_navbar.html. href null = punta
 * all'indice del forum ({U_INDEX}, dipende dalla base), verifichiamo solo il
 * testo; gli altri puntano al sito principale e li verifichiamo per intero.
 */
export const VOCI_MENU = [
  ["Home", null],
  ["Articoli", SITE_HOME],
  ["Forum", null],
  ["Gallery", `${SITE_HOME}/gallery`],
  ["Mappa", `${SITE_HOME}/mappa`],
];
