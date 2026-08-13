# progettodighe-phpbb-theme

Tema del forum [phpBB](https://www.phpbb.com/) di ProgettoDighe. È un **child
style di prosilver**: eredita tutto da prosilver (`parent = prosilver` in
`style.cfg`) e sovrascrive solo i pochi file necessari, per ridurre al minimo i
punti da toccare quando phpBB si aggiorna.

A differenza del [tema della gallery](https://github.com/phante/progettodighe-coppermine-theme)
il forum **non** replica l'estetica del sito: forum e sito sono strumenti
diversi e devono restare visivamente distinti. Quello che condivide con la
gallery sono le *logiche di gestione* — ambiente di test usa-e-getta, matrice
di versioni, deploy — non l'aspetto.

In produzione gira su **phpBB 3.3.10 / PHP 8.1**.

## Struttura

| Percorso | Cosa |
|---|---|
| `style.cfg` | dichiara nome, versione e il parent `prosilver` |
| `template/` | i soli template sovrascritti: header, footer, navbar, menu del sito |
| `theme/` | il CSS del tema e le immagini (logo, avatar di default) |
| `test/` | ambiente podman e suite di test |

Le personalizzazioni rispetto a prosilver:

- logo del sito e altezza della barra superiore per contenerlo;
- menu globale del sito (`template/site_navbar.html`), che si basa sul valore
  **Home page URL del sito** (`site_home_url` nell'ACP): senza quello le voci
  Articoli / Gallery / Mappa non hanno destinazione;
- breadcrumb senza la home del sito principale.

## Ambiente di test locale

Serve [podman](https://podman.io/) con `podman-compose`, e Node 22+.

Prima, il tarball di phpBB va messo a mano in `test/pkg/`: `download.phpbb.com`
è dietro una sfida JS di Cloudflare che un build non-browser non passa, quindi
non si scarica dal `Containerfile`. È lo stesso motivo per cui il repo
`progettodighe-server` tiene i pacchetti phpBB gitignorati e scaricati a mano.

```sh
# da https://www.phpbb.com/downloads/ , con i nomi ufficiali:
#   test/pkg/phpBB-3.3.10.zip   (e ogni versione in test/versions.txt)

npm install
npm run env:up      # build da test/pkg/, avvia mariadb + apache, installa e attiva il tema
npm run test:e2e    # la suite contro http://127.0.0.1:8080
npm run env:down
```

`env:up` monta il tema in bind-mount read-only dentro il container come child
style di prosilver: si modifica un file in `template/` o `theme/` e si ricarica
il browser, senza rebuild (l'install accende `load_tplcompile`).

L'installazione **non** passa dall'installer web: `test/bin/install.sh` usa
`install/phpbbcli.php` con un YAML, poi registra lo style in `phpbb_styles` e
lo attiva. È deterministico, dura pochi secondi e non dipende dai campi form
dell'installer, che cambiano tra le versioni — cioè proprio la variabile che la
matrice deve poter muovere.

### Cosa coprono i test

- `test/e2e/chrome.spec.mjs` — logo verso il sito, le 5 voci del menu del sito
  in ordine (Home, Articoli, Forum, Gallery, Mappa) con le destinazioni giuste,
  nessuna traccia di umami, breadcrumb senza home del sito, e una rete di
  sicurezza minima contro un template che non compila;
- `test/e2e/no-404.spec.mjs` — nessuna sottorisorsa same-origin in errore.

I test verificano le personalizzazioni e che una modifica (o un upgrade) non
introduca rotture gravi sulla pagina. Non verificano parità estetica col sito:
qui non c'è, ed è voluto.

### Cambiare versione di phpBB

```sh
PHPBB_VERSION=3.3.17 PHP_TAG=8.3-apache npm run env:up
```

`npm run test:matrix` fa il giro completo su ogni riga di `test/versions.txt`
(versione phpBB + tag dell'immagine PHP), lanciando la suite su ciascuna e
stampando un riepilogo. Serve a vedere cosa si rompe *prima* di aggiornare il
server. Una riga che fallisce non ferma le altre.

Prima di aggiornare il server: `npm run test:matrix` verde.

## Pubblicazione

La pubblica Ansible, dal repo `progettodighe-server`. Un solo branch `main`;
l'ambiente lo sceglie una variabile (`main` su dev, un tag annotato in
produzione), non un branch. Il tema è statico, quindi non c'è niente da
costruire: Ansible clona il repo, ne fa `rsync` nella directory dello style
escludendo quanto elencato in `.deployignore`, e poi butta via il clone — così
la `.git` non entra mai nella directory servita da nginx.

**Ogni versione pubblicata vive in una directory sua**
(`styles/progettodighe-<versione>/`) e resta accanto alle precedenti, tutte
attive. È il motivo per cui `name` e `style_version` in `style.cfg` li riscrive
il deploy: phpBB tratta `style_name` come unico, e due versioni affiancate non
possono chiamarsi allo stesso modo. Serve a provare una versione nuova su un
singolo utente, in produzione, mentre gli altri vedono quella di prima.

La versione è `AA.MM.<hash breve>` — mese di pubblicazione e commit — e la
calcola il deploy. **Qui non c'è nessun numero da alzare**: i valori in
`style.cfg` restano quelli dell'ambiente di test locale, che pubblica il repo
com'è.

I comandi di rilascio e di rientro stanno in
`progettodighe-server/RILASCIO-TEMI.md`. Da qui serve solo il
tag, annotato, che dice quale commit va in produzione e nel messaggio dichiara
su quali versioni di phpBB è stato provato — è ciò che rende leggibile
`git tag -n99`:

```sh
git tag -a 26.08 -m "Cosa cambia.

Verificato su dev (phpBB 3.3.10, PHP 8.3): suite NN/NN."
git push origin 26.08
```

Il push non è facoltativo: Ansible clona dal remoto.

Dopo aver pubblicato su dev, i test contro il sito vero:

```sh
npm run test:e2e:dev
PD_FORUM=12 npm run test:e2e:prod
```

`PD_FORUM` serve perché l'id predefinito (`2`, "Your first forum") è quello
dell'installazione locale: su un forum vero va indicato un forum che esiste.
