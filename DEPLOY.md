# DEPLOY — fpl.marsk.no

Coolify bygger fra `Dockerfile` og deployer automatisk ved push til `main`.
Appen kjører bak Cloudflare. Denne filen beskriver hva som må stemme for at
en deploy faktisk blir synlig for brukerne.

## Flyt

1. Merge til `main` → Coolify henter, bygger og starter ny container (port 3000)
2. Health check på `/health` må svare 200 før den nye containeren tar over
3. Footeren viser `v<versjon> · sist oppdatert <starttid>` — starttiden er i
   praksis deploy-tidspunktet, siden hver deploy gir en ny container

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
