#!/usr/bin/env bash
# Installa phpBB nel container di test e vi attiva il tema come child style di
# prosilver, senza passare dall'installer web.
#
# L'installer da riga di comando (install/phpbbcli.php) legge un YAML: è
# deterministico e non dipende dai campi form dell'installer web, che cambiano
# tra le versioni — cioè proprio la cosa che la matrice di versioni deve poter
# muovere senza rompersi. Lo style non ha un comando CLI di installazione, così
# lo si registra in phpbb_styles a mano, come fa il coppermine con le sue tabelle.
set -euo pipefail

COMPOSE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/compose.yml"
COMPOSE="${COMPOSE:-podman-compose}"

run_phpbb() { $COMPOSE -f "$COMPOSE_FILE" exec -T phpbb "$@"; }
run_sql()   { $COMPOSE -f "$COMPOSE_FILE" exec -T db mariadb -uphpbb -pphpbb phpbb; }

echo "==> attendo il database"
for _ in $(seq 1 40); do
    if echo 'SELECT 1' | run_sql >/dev/null 2>&1; then break; fi
    sleep 1
done
echo 'SELECT 1' | run_sql >/dev/null

echo "==> scrivo la configurazione dell'installer"
run_phpbb tee /tmp/install-config.yml >/dev/null <<'YAML'
installer:
    admin:
        name: admin
        password: adminadmin
        email: admin@progettodighe.it
    board:
        lang: en
        name: ProgettoDighe Forum
        description: Ambiente di test del tema
    database:
        dbms: mysqli
        dbhost: db
        dbport: 3306
        dbuser: phpbb
        dbpasswd: phpbb
        dbname: phpbb
        table_prefix: phpbb_
    email:
        enabled: false
    server:
        cookie_secure: false
        server_protocol: http://
        force_server_vars: false
        server_name: localhost
        server_port: 80
        script_path: /
    extensions: []
YAML

echo "==> installo phpBB"
run_phpbb php /var/www/html/install/phpbbcli.php install /tmp/install-config.yml

# phpBB avvisa finché la directory install/ esiste: in un ambiente usa-e-getta
# la togliamo subito.
run_phpbb rm -rf /var/www/html/install

echo "==> registro e attivo il tema come child di prosilver"
run_sql <<'SQL'
SET @p = (SELECT style_id FROM phpbb_styles WHERE style_name = 'prosilver');
INSERT INTO phpbb_styles (style_name, style_copyright, style_active, style_path, bbcode_bitfield, style_parent_id, style_parent_tree)
    VALUES ('progettodighe', '© Elvis Del Tedesco', 1, 'progettodighe-phpbb-theme', 'kNg=', @p, 'prosilver');
SET @s = LAST_INSERT_ID();
UPDATE phpbb_config SET config_value = @s WHERE config_name = 'default_style';
UPDATE phpbb_users SET user_style = @s;

-- Il menu del sito e la breadcrumb si basano su questo: senza, {U_SITE_HOME}
-- è vuoto e le voci Articoli/Gallery/Mappa non hanno destinazione.
UPDATE phpbb_config SET config_value = 'https://www.progettodighe.it' WHERE config_name = 'site_home_url';
UPDATE phpbb_config SET config_value = 'ProgettoDighe'                 WHERE config_name = 'site_home_text';

-- Ricompila i template quando cambiano: è il "modifica e ricarica" del bind-mount.
UPDATE phpbb_config SET config_value = '1' WHERE config_name = 'load_tplcompile';
SQL

echo "==> svuoto la cache"
run_phpbb php /var/www/html/bin/phpbbcli.php cache:purge

# phpbbcli gira come root (podman exec), quindi cache/production e store/ nascono
# root:755 e apache (www-data) non può scriverci: la prima query cachata (il
# check_ban di session_begin) fallirebbe la scrittura, il driver mysqli
# libererebbe il result e poi lo rileggerebbe — "mysqli_result object is already
# closed", fatal su ogni pagina. ponytail: 777 sull'usa-e-getta.
run_phpbb chmod -R 777 /var/www/html/cache /var/www/html/store

echo "==> fatto: http://127.0.0.1:${PHPBB_PORT:-8080}/"
