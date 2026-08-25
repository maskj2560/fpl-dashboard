# DEPLOY — fpl.marsk.no

Coolify bygger fra `Dockerfile` og deployer automatisk ved push til `main`.
Appen kjører bak Cloudflare. Denne filen beskriver hva som må stemme for at
en deploy faktisk blir synlig for brukerne.

## Flyt

1. Merge til `main` → Coolify henter, bygger og starter ny container (port 3000)
2. Health check på `/health` må svare 200 før den nye containeren tar over
3. Footeren viser `v<versjon> · sist oppdatert <starttid>` — starttiden er i
   praksis deploy-tidspunktet, siden hver deploy gir en ny container

## Helsesjekk i Coolify

**Coolifys egen helsesjekk for appen skal stå AV.** Da er det Dockerfilens
`HEALTHCHECK` (linje 16–17) som gjelder, og den er allerede riktig: den
kjører `node -e "fetch('http://localhost:3000/health')…"` og exit-koden
følger `r.ok`. Fasiten blir dermed versjonskontrollert i repoet i stedet
for å ligge i et Coolify-felt.

**Hvorfor (incident 24.–25. aug):** Coolifys egen HTTP-helsesjekk
OVERSTYRER Dockerfilens `HEALTHCHECK`, og kommandoen den var satt opp med
brukte `curl` — som ikke finnes i `node:22-alpine`. Deployloggen viste

```
Healthcheck logs: /bin/sh: curl: not found | Return code: 0
```

og Coolify konkluderte «New container is healthy». Sjekken var altså en
no-op: Coolify meldte «Running (healthy)» gjennom hele perioden prod svarte
`401` på alle stier. En helsesjekk som ikke kan feile er verre enn ingen —
den gjør deploy-signalet verdiløst.

**Fallback hvis Coolify ikke leser Docker-health når egen sjekk er av:**
slå på Coolifys sjekk igjen, men med en kommando som finnes i imaget —
busybox-`wget`:

```
wget -qO- http://localhost:3000/health
```

**Slik ser det ut i Coolify-UI-et:** helsesjekken har et `Type`-felt med to
valg, `HTTP` og `CMD`. Med `Type: HTTP` GENERERER Coolify kommandoen selv —
og det var den genererte kommandoen som brukte `curl`. Ordet «curl» sto
derfor aldri noe sted i UI-et, hvilket er hovedgrunnen til at feilen var
usynlig. `CMD` er feltet man ville limt wget-fallbacken inn i.

Slår du Coolifys sjekk av, plukker Coolify automatisk opp Dockerfilens egen —
deployloggen sier da `Custom healthcheck found in Dockerfile.` — og bruker
Dockerfilens verdier (start period 10 s, 3 forsøk), ikke Coolifys egne.
Innstillingene i UI-et blir stående urørt, så å angre er ett klikk på
`Enable Healthcheck` + Redeploy.

**Status (verifisert 25. aug 02:14–02:28):** alternativ a står aktivt.
Deployloggen gikk fra `Healthcheck logs: /bin/sh: curl: not found | Return
code: 0` til `Custom healthcheck found in Dockerfile` +
`Attempt 1 of 3 | Healthcheck status: "healthy"`.

**Bevis-krav (obligatorisk etter enhver endring av helsesjekken):**

1. **Kjører sjekken, og er den Dockerfilens?**
   ```
   docker inspect --format '{{json .State.Health}}' <container>
   ```
   Skal gi `"Status":"healthy"`, `"FailingStreak":0` og loggoppføringer med
   `"ExitCode":0` og tom `Output` — ikke «not found» sammen med exit 0.
   Kontroller samtidig at kommandoen er Dockerfilens:
   ```
   docker inspect --format '{{json .Config.Healthcheck}}' <container>
   ```
2. **Kan sjekken i det hele tatt feile?** Kjør Dockerfilens kommando manuelt,
   én gang mot riktig port og én gang mot en død port. Den skal gi exit 0 mot
   3000 og exit 1 mot f.eks. 9999. Dette er det egentlige beviset mot
   no-op-feilen, og det rører ikke appen.

**`kill 1` VIRKER IKKE for å teste dette — ikke kast tid på det.** Målt
25. aug: kommandoen kjører uten feilmelding, men appen dør ikke og containeren
restarter aldri. Årsaken er at PID 1 i et container-namespace kun mottar
signaler den selv har registrert en handler for, og appen har ingen
SIGTERM-handler (`src/server.js` avslutter med `app.listen`, ingen
`process.on('SIGTERM', …)`). Kjernen forkaster signalet. Vil du likevel se
statusfeltet slå om, er `docker pause <container>` + `docker unpause` den
trygge veien (sjekken timer ut, containeren exiter aldri, restart-policyen
utløses ikke) — `docker stop`/`docker kill` er det IKKE, fordi
restart-policyen `unless-stopped` da kan la appen bli liggende nede.

**VIKTIG BEGRENSNING — hva helsesjekken IKKE fanger.** Den kaller
`http://localhost:3000/health` INNE i containeren og går dermed utenom
Traefik og Cloudflare. Under 401-incidenten svarte appen helt normalt på
localhost:3000 — det var Traefiks basicauth-middleware som avviste alt
utenfra. **Den nye helsesjekken ville altså meldt «healthy» gjennom hele den
incidenten også.** Den beviser at appen startet og svarer, ikke at brukerne
når den. Feilsøking av «prod svarer rart» starter derfor fortsatt utenfra:
`curl -I https://fpl.marsk.no/health` fra egen maskin.

Ingen kodeendring → dette får ikke eget versjonsnummer.

## Asset-cache (viktig — årsaken til QA-funn P0-1)

`style.css` og `app.js` refereres med en innholdshash: `/style.css?v=<hash>`.
Hashen beregnes ved oppstart i `src/server.js` fra innholdet i de to filene.
Endres en av dem, endres URL-en, og Cloudflare må hente på nytt.

Cache-headerne settes i `express.static`:

| URL | Cache-Control |
| --- | --- |
| `/style.css?v=<8 hex>` eller `?v=<tall>` | `public, max-age=31536000, immutable` |
| `/style.css` (uten `?v=`) | `no-cache` |
| `/img/clubs/*.png?v=<IMG_VERSION>` | `public, max-age=31536000, immutable` |

Fonten (`/fonts/archivo-var.woff2?v=1`) er uendret innhold og versjoneres
manuelt. **Endres fontfilen, må `?v=` bumpes to steder samtidig:**

- `views/layout.ejs` (preload-lenken)
- `public/style.css` (`@font-face`-URL-en)

URL-ene må være identiske, ellers laster nettleseren fonten to ganger.

## Volum for brief-markøren

Auto-briefen skriver `brief-state.json` til `DATA_DIR` (default `data`,
i containeren `/app/data`) så en redeploy i kvarteret etter sendetidspunktet
ikke re-poster briefen til Discord. Uten volum tømmes fila ved hver deploy,
og appen oppfører seg som før v1.3.7 — den krasjer aldri.

Oppsett i Coolify (én gang): **Storages → Add → destination path**
`/app/data`.

Verifisering: etter en deploy som følger et sendt brief skal loggen vise
`Brief-markør lastet: runde N er alt sendt`.

## Klubbgrafikk (ny sesong)

Klubbmerkene og draktene i `public/img/clubs/` er selvhostet og committet i
repoet (60 filer, ~560 KB). Filnavnene er stabile per klubbkode, men FPL
bytter draktene hver sesong på de samme URL-ene. Derfor versjoneres de med
`?v=<IMG_VERSION>`, der versjonen er sesongen (`2627`).

Én gang per sesong, før første deploy av den nye sesongen:

1. `npm run fetch-clubs` — laster ned merke, drakt og keeperdrakt for alle
   lag i `bootstrap-static`. Forventet utskrift: «Lagret 60 av 60 filer».
   Nyopprykkede lag kommer med automatisk; mangler et bilde, feiler skriptet
   med exit 1 og lister hvilke.
2. Bump `IMG_VERSION` i `src/middleware.js` (f.eks. `'2627'` → `'2728'`).
3. **Commit bildene og bumpen sammen.** Gjøres ikke bumpen, serverer
   Cloudflare fjorårets drakter som `immutable` fram til manuell purge.

Etter deploy: `/health` skal vise `clubImages: {badges:20, shirts:20,
keepers:20}`. Mangler mappa helt, starter appen likevel — da vises kortnavn
i stedet for merker.

## Engangssteg: Cloudflare-purge

Cloudflare har fortsatt uversjonerte `/style.css`- og `/app.js`-oppføringer i
edge-cachen fra tiden før versjoneringen. De forsvinner ikke av seg selv.
**Én gang, rett etter at denne versjonen er deployet:**

1. Cloudflare-dashbordet → sonen `marsk.no` → **Caching** → **Configuration**
2. **Purge Everything** (eller purge de to URL-ene
   `https://fpl.marsk.no/style.css` og `https://fpl.marsk.no/app.js`)

Etterpå er purge ikke nødvendig ved deploy: nye assets får ny URL.

## Verifisering etter deploy

```bash
# Versjonert asset → immutable
curl -sI "https://fpl.marsk.no/style.css?v=$(curl -s https://fpl.marsk.no/ \
  | grep -o 'style\.css?v=[0-9a-f]*' | head -1 | cut -d= -f2)" | grep -i cache-control
# forventet: cache-control: public, max-age=31536000, immutable

# Uversjonert asset → no-cache
curl -sI https://fpl.marsk.no/style.css | grep -i cache-control
# forventet: cache-control: no-cache

# Riktig versjon ute
curl -s https://fpl.marsk.no/ | grep -o 'v1\.[0-9.]*'

# Alle ruter svarer
for p in / /spillere /lag /liga /brief /live /nyheter /health \
         /api/brief.json /api/live.json; do
  echo -n "$p "; curl -s -o /dev/null -w '%{http_code}\n' "https://fpl.marsk.no$p"
done
```

Ser du fortsatt gammel styling: sjekk `cf-cache-status`-headeren. `HIT` på en
uversjonert URL med `no-cache` betyr at purge-steget over ikke er gjort.

## Lokalt

```bash
npm run dev        # node --watch, leser .env
npm test           # node:test
npm run lint       # ESLint
docker build -t fpl-dashboard . && docker run -p 3000:3000 --env-file .env fpl-dashboard
```
