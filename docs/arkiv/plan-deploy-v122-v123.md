# Plan: trygg deploy av v1.2.1 + v1.2.2 + v1.2.3 til prod

> Godkjent av Marius 22. august 2026 (~02:00).
> Utføres av Opus 5 i egen økt. Dette er en deploy-plan — ingen ny kode.

> **Endret 22. aug (økt 22) — port 0-avviket løst.** Deploy-økten (økt 21)
> stoppet i port 0: main-tippen var ikke `78d438e`, men `c33aef1` — 4
> docs-only commits oppå tag v1.2.1. Patchen rører KUN: fakta-avsnittet
> (nye økt 21/22-målinger), **port 0** (ny forventet tilstand + tagging av
> `pre-deploy-main`), **2a/2b** (reset-mål `v1.2.1` → `pre-deploy-main`),
> **2c** (ny konfliktmåling + konfliktliste i stopp-kriteriet) og
> **port 10** (tag-opprydding + dbcf253-notat). Porter 1 og 3–9 er
> uendret. Beslutning (Marius, økt 22 ~02:15): alternativ A —
> `pre-deploy-main`-tag som reset-anker; vinduet står fast (lørdag 22. aug,
> port 11:30, ellers søndag 13:00).

## Kontekst

Prod (https://fpl.marsk.no) kjører v1.2.0. Lokalt ligger tre ferdig kodede,
røyktestede funksjonssett som aldri er pushet: v1.2.1 (cache-backoff, allerede
merget til lokal `main` + tagget), v1.2.2-kandidatene (`fix/sanitize-brief` ⊂
`fix/lag-anbefalinger`) og v1.2.3 (`fix/live-bonus`, som inneholder alle tre
settene; 250/250, lint 0). De to siste verifiseringene fra sjekkpunkt C —
bonuskolonnen og stopp-testen — kan bare bestås med deployet kode under et
kampvindu. Marius' krav styrer alt: **alt skal bevises å funke FØR noe
pushes/merges til `main`** (auto-deploy til prod).

**Beslutninger tatt av Marius 22. aug 01:50 (IKKE re-spør):**

1. **Tre pusher:** v1.2.1 alene → v1.2.2 → v1.2.3, prod-verifisering og
   stopp/klarsignal mellom hver. Renest diagnose.
2. **Egen v1.2.2-tag** (i tillegg til v1.2.3): matcher CHANGELOG-seksjonene og
   praksis, gir rollback-punkt mellom releasene.
3. **B-2-AI-kallet tas i prod etter v1.2.2-deployen** (Marius klikker selv,
   budsjettkall 2 av ~3) — dobler som prod-verifisering av /lag-rådgiveren.
4. **Vindu: lørdag 22. aug, hard tidsport 11:30** — alle tre deployer ferdig
   verifisert før 11:30, ellers automatisk utsettelse til søndag formiddag
   (tidsport 13:00). Kampstart lørdag 13:30.

**Verifiserte fakta fra økt 19 — Opus skal IKKE gjenverifisere:** topologien
(`sanitize` ⊂ `lag-anbefalinger` ⊂ `live-bonus`), `main` = 10 commits foran
`origin/main` (tip `c33aef1` — se økt 21/22-fakta under; «tag v1.2.1 på
tippen» var foreldet), `git merge-tree` 0
konflikter (målt FØR release-commitene — se port 2c), 250/250 + lint 0 på
`fix/live-bonus`, røyktest grønn med tomme nøkler, Docker 29.6.2 kjører,
GW2-deadline `2026-08-28T17:30:00Z` (auto-brief-vinduet åpner torsdag 27. aug
19:30 — helgen er langt utenfor).

**Nye fakta verifisert i denne planøkten:** `src/config.js:2-6` fanger
manglende `.env` i try/catch (containeren har ingen `.env` — Dockerfile
COPY-er kun package-filer/src/views/public), og rutelista er 11 GET-ruter
(se port 1).

**Verifiserte fakta fra økt 21/22 — Opus skal IKKE gjenverifisere:**
main-tip = `c33aef1` med 4 docs-only commits oppå tag v1.2.1: `56e5d16`,
`c16cf14`, `9ca665f`, `c33aef1` (983 innsettinger, 0 kodeendringer). 3 av
de 4 (`56e5d16`, `c16cf14`, `9ca665f`) er allerede ancestors av alle tre
feature-branchene — kun `c33aef1` er unik for main, og den legger bare til
den nye fila `docs/prompt-ui-overhaul-plan.md`. Målt i økt 22, MED driften:
`git merge-tree --write-tree main fix/live-bonus` → exit 0, **0
konflikter**; `git diff --name-only fix/lag-anbefalinger fix/live-bonus`
inneholder ikke package.json/-lock. Port 1-baselinen fra økt 21 var grønn
(lagret som `port1-baseline.txt` i scratchpad) — porten kjøres likevel på
nytt, ferskt bevis er billig.

## Rammer

- **Ingen ny funksjonalitet, ingen nye avhengigheter.** Finner Opus en feil:
  STOPP, legg fram for Marius — aldri fiks inni deployen.
- **0 AI-kall fra Opus.** B-2-kallet klikkes av Marius (port 7).
- **Push-lisens (uttømmende):** Opus har KUN lov å pushe i portene 5, 6 og 7
  (de eksakte refspecene som står der) og docs-committen i port 10 — alt
  etter grønn tidsport (port 4). Aldri push av feature-branchene. Aldri push
  torsdag 19:00–21:00. Aldri push mens kamper pågår.
- Hver port har bevis-kommando + stopp-kriterium. Feiler en port: STOPP og
  legg fram for Marius — aldri videre «fordi det sannsynligvis går bra».
- Conventional commits. CHANGELOG/ROADMAP/HANDOVER i samme commit som
  endringen de beskriver.

## Port 0 — forutsetninger (lokalt) + reset-anker

```
git status                      # rent tre
git log --oneline -1 main fix/lag-anbefalinger fix/live-bonus
```

Forventet: rent tre; `main`-tip = `c33aef1` (4 docs-commits oppå tag
v1.2.1 — FORVENTET, jf. økt 21/22-fakta i Kontekst);
`fix/lag-anbefalinger`-tip = `c5b9748`; `fix/live-bonus`-tip =
docs-commitene fra økt 22 (plan-patch, v2-prompt, handover — jf.
HANDOVER-loggen).

Deretter settes reset-ankeret (beslutning A, Marius økt 22):

```
git tag pre-deploy-main c33aef1   # lokal stillas-tagg — pushes ALDRI
```

Taggen er escape-luka for port 2a/2b: `git reset --hard pre-deploy-main`
gjenoppretter nøyaktig dagens main-tilstand uten å kaste de 4 upushede
docs-commitene (slik det gamle reset-målet `v1.2.1` ville gjort — de er
kun gjenopprettbare via reflog). Taggen inngår IKKE i push-lisensen og
slettes i port 10. Docs-commitene følger med inn i v1.2.2-/v1.2.3-
releasene — ren dokumentasjon, ingen CHANGELOG-punkter.
**Stopp:** utrent tre eller andre tips enn forventet → rapporter, ikke
rydd på egen hånd.

## Port 1 — prod-baseline FØR alt annet

Slå fast hvordan prod ser ut nå, så «det virket før» ikke blir en antakelse:

```
curl -s https://fpl.marsk.no/health
for r in / /spillere /lag /liga /brief /live /nyheter /overganger /api/brief.json /api/live.json; do
  curl -s -o /dev/null -w "%{http_code} $r\n" "https://fpl.marsk.no$r"; done
curl -s -o /dev/null -w "%{http_code}\n" https://fpl.marsk.no/finnes-ikke
curl -s https://fpl.marsk.no/ | grep -o "v1\.2\.[0-9]"
```

Forventet: `/health` = `ai:true, discord:true, teamId:true, leagues:1`; alle
11 ruter 200 (de 10 over + /health); ukjent sti 404; footer `v1.2.0`.
Outputen lagres (scratchpad) som baseline-bevis.
**Stopp:** avvik fra forventet → legg fram for Marius før noe endres. En rød
baseline endrer hele diagnosen senere.

## Port 2 — lokal sammenstilling på `main` (ingenting pushes)

Escape-luke hele veien: hver deltilstand er tagget, så
`git reset --hard <tag>` ruller lokal `main` tilbake uten spor.
Kastbar branch er vurdert og valgt bort: den ville doblet merge- og
konfliktarbeidet (identisk CHANGELOG-oppløsning to ganger — ny feilkilde),
mens tag + reset gir samme sikkerhet fordi ingenting når `origin` før alt er
grønt.

### 2a. Merge `fix/lag-anbefalinger` → `main`

```
git checkout main
git merge --no-ff fix/lag-anbefalinger   # forventet: 0 konflikter (verifisert)
npm test && npm run lint
```

Forventet: **242/242**, lint exit 0 (main 218 + branch-settene = 242; branchen
er bygget fra main-med-cache-backoff, så ingenting mangler).
**Stopp:** konflikt eller rødt → `git reset --hard pre-deploy-main`,
rapporter.

### 2b. Release v1.2.2 på `main`

```
npm version 1.2.2 --no-git-tag-version   # bumper package.json OG package-lock.json i synk
```

Valgt mekanisme fordi den oppdaterer begge filene atomisk — manuell
redigering av lock-fila er nøyaktig feilen som velter `npm ci` i Coolify.

CHANGELOG: ny seksjon `## [1.2.2] - 2026-08-22` (samme datoformat/stil som
[1.2.1]). Disse **5** punktene flyttes fra `[Unreleased]`:
Changed: «AI-rådgiveren på /lag …»; Fixed: «/lag sier nå hvilken runde …»,
«Kapteinsforslagene … ikke lenger vilkårlige …», forkortelses-punktet,
lagnavn-variant-punktet. De 2 live-punktene (bonus + fløyta) BLIR STÅENDE i
`[Unreleased]`. NB: oppdragsprompten sier «seks punkter» — faktisk telling er
7 (1 Changed + 6 Fixed), og den eksplisitte opplistingen der dekker alle 7
(5 + 2). Ikke stopp på det avviket; opplistingen er fasit.

```
npm ci            # hardt bevis på at lock-fila er i synk — DEN mest sannsynlige byggefeilen
npm test && npm run lint     # 242/242 på reinstallerte node_modules
git add -A && git commit -m "chore: release v1.2.2"
git tag -a v1.2.2 -m "v1.2.2"
```

**Stopp:** `npm ci` feiler eller rødt → `git reset --hard pre-deploy-main`,
rapporter.

### 2c. Merge `fix/live-bonus` → `main` — VARSLET konflikt i CHANGELOG

`merge-tree`-målingen (0 konflikter) ble gjort FØR release-committen fantes.
Nå redigerer begge sider `[Unreleased]`-regionen, så **en konflikt i
`CHANGELOG.md` er forventet og skal løses slik:** `[Unreleased]` skal
inneholde KUN de 2 live-punktene (bonus + fløyta) under `### Fixed`;
`[1.2.2]`-seksjonen beholdes som main har den; resten uendret.
`package.json`/lock gir IKKE konflikt (branchen rørte dem aldri — main-siden
vinner automatisk med 1.2.2).

**Konfliktflaten er målt på nytt i økt 22, MED docs-driften:**
`git merge-tree --write-tree main fix/live-bonus` → 0 konflikter.
`docs/HANDOVER.md` kolliderer IKKE (økt 21-frykten avkreftet): 3 av de 4
docs-commitene ligger allerede i branchens historikk, og main-sidens eneste
unike endring utover release-commitene er den NYE fila
`docs/prompt-ui-overhaul-plan.md`. Den eksakte 2c-flaten inkluderer
2b-release-committen og kan ikke måles før den finnes — men siden driften
gir 0 konflikter, kan kun 2b-committens filer kollidere: CHANGELOG.md
(varslet over, med oppskrift); package.json/-lock er utelukket som
beskrevet. **Komplett konfliktliste for 2c: { CHANGELOG.md }.**

```
git merge --no-ff fix/live-bonus
# løs CHANGELOG som beskrevet, git add CHANGELOG.md, git commit (merge-commit)
npm test && npm run lint
```

Forventet: **250/250**, lint 0.
**Stopp:** konflikt i en fil som IKKE står på konfliktlista over (dvs. alt
annet enn CHANGELOG.md) → `git merge --abort`, `git reset --hard v1.2.2`,
rapporter.

### 2d. Release v1.2.3 på `main`

Som 2b: `npm version 1.2.3 --no-git-tag-version`; CHANGELOG-seksjon
`## [1.2.3] - 2026-08-22` med de 2 live-punktene, `[Unreleased]` blir stående
tom; `npm ci`; `npm test` (250/250) + lint; commit
`chore: release v1.2.3`; `git tag -a v1.2.3 -m "v1.2.3"`.

Sluttilstand: `main`-tip = release-committen v1.2.3; tre lokale tagger
v1.2.1/v1.2.2/v1.2.3. Ingenting pushet.

## Port 3 — Docker-bygg × 3 = nøyaktig det Coolify gjør

For hver tag `T` i `v1.2.1`, `v1.2.2`, `v1.2.3` (lagcache gjør 2 og 3 raske):

```
git checkout T
docker build -t fpl-deploy:T .
docker run -d --name fpl-smoke -p 3010:3000 -e FPL_TEAM_ID=5330646 fpl-deploy:T
curl -s http://localhost:3010/health        # + de 10 andre rutene + 404-sjekk som i port 1
docker logs fpl-smoke                        # kun lyttelinja, ingen AI-linjer
docker stop fpl-smoke && docker rm fpl-smoke
```

Ingen nøkler settes — imaget har ingen `.env` (verifisert: Dockerfile COPY-er
den ikke, og `config.js` tåler fraværet). Forventet `/health` i containeren:
`ai:false, discord:false, teamId:true, leagues:0`; alle ruter 200; 404 OK;
**0 AI-kall**. Til slutt `git checkout main`.

Dette fanger feilklassen testene ikke ser: manglende fil i COPY, `npm ci
--omit=dev` mot lock-fila, ting som bare virker pga. lokale `node_modules`,
feil `NODE_ENV`.
**Stopp:** byggfeil eller rød røyktest på NOEN av de tre → rapporter
(ingenting er pushet, prod er urørt).

## Port 4 — tidsport (GO/NO-GO før første push)

- **GO** kun hvis port 0–3 er grønne OG klokka gjør at alle tre deployer kan
  være ferdig verifisert **før 11:30 lørdag** (start siste push senest
  ~10:45).
- **NO-GO** → utsett til søndag formiddag: samme plan uendret, tidsport
  13:00 (kampstart 15:00). Ingen snarveier for å «rekke det».
- Sklir alt forbi onsdag 26. aug: re-verifiser auto-brief-vinduet før deploy
  (`curl -s "https://fantasy.premierleague.com/api/bootstrap-static/" | jq '.events[] | select(.id==2) | .deadline_time'`
  → vinduet åpner 24 t før) — og aldri push torsdag 19–21.

## Port 5 — deploy 1: v1.2.1 alene

```
git push origin 78d438e:refs/heads/main v1.2.1
```

(SHA-refspec: origin/main flyttes til v1.2.1-tilstanden uten mergene —
lokal main-tip forblir upushet til port 7/8.)

Deretter vent på Coolify-bygget — beviset er footeren, ikke pushet:

```
# poll hvert 30. sek, maks 10 min:
curl -s https://fpl.marsk.no/ | grep -o "v1\.2\.[0-9]"
```

Grønt når: footer `v1.2.1`, `/health` = baseline-verdiene fra port 1
(`ai:true, discord:true, teamId:true, leagues:1`), alle 11 ruter 200, 404 OK.
**Stopp:** footer ikke flippet på 10 min → sjekk Coolify-dashboardet med
Marius før noe mer gjøres. Rød rute/5xx → port 8 (rollback).

**STOPP-PUNKT: rapporter bevisene til Marius og vent på klarsignal.**

## Port 6 — deploy 2: v1.2.2

```
git push origin v1.2.2^{commit}:refs/heads/main v1.2.2
```

Samme venting og verifisering som port 5, pluss v1.2.2-synlig endring:
footer `v1.2.2`, og `/lag` viser «Anbefalinger for Runde 2» (nøyaktig én
gang, ingen «undefined»).

**Deretter B-2-kallet (Marius klikker, Opus klikker ALDRI):** Marius trykker
«Spør AI om råd» på https://fpl.marsk.no/lag én gang. Forventet: norsk råd
som nevner runde/deadline/kaptein-kontekst. Loggføres som budsjettkall
2 av ~3.

**STOPP-PUNKT: rapporter + vent på klarsignal.**

## Port 7 — deploy 3: v1.2.3

```
git push origin main v1.2.3      # main-tip ER v1.2.3-release-committen
```

Samme venting/verifisering: footer `v1.2.3`, `/health`, 11 ruter, 404.
I tillegg: `curl -s https://fpl.marsk.no/api/live.json` → radene inneholder
`bonusPublished`, og — før 13:30 er ingen kamp i gang — `anyLive:false` og
/live sier «Ingen kamper pågår akkurat nå».

## Port 8 — ROLLBACK (skrevet for å leses alene, midt i kampstart)

**Når:** `/health` feiler, en hovedrute gir 5xx, eller /live er synlig
ødelagt under kamp og ingen åpenbar årsak på ≤10 minutter. Da ruller du
tilbake FØRST og feilsøker lokalt ETTERPÅ — aldri feilsøk i prod.

**Vei 1 — Coolify (raskest, ingen git):** dash.marsk.no → applikasjonen →
Deployments → forrige vellykkede deployment → **Redeploy**. Ferdig når
footeren viser forrige versjon og `/health` er ok.

**Vei 2 — git (hvis Coolify-UI er nede).** Dette er planens ENESTE
sanksjonerte force-push, og den rører bare `origin/main` — lokal `main` og
taggene består, så en ny deploy senere er en vanlig push igjen:

```
git push --force origin v1.2.2^{commit}:refs/heads/main   # tilbake til v1.2.2
git push --force origin v1.2.1^{commit}:refs/heads/main   # tilbake til v1.2.1
git push --force origin v1.2.0^{commit}:refs/heads/main   # helt tilbake til dagens prod
```

Velg den nyeste tilstanden som var verifisert grønn. Etterpå: footer +
`/health` bekrefter, så STOPP — analysen skjer lokalt, ikke i prod.

## Port 9 — kampdag-observasjon (lørdag 13:30–~20:45, Marius + Claude in Chrome)

På https://fpl.marsk.no/live:

1. **Under kampene:** bonuskolonnen «Bonus» får verdier (`+N` i accent-farge;
   title-tekst «Bekreftet av FPL …» eller «Estimat fra BPS»), og «Effektivt»
   teller IKKE publisert bonus dobbelt (Effektivt = poeng + evt. estimat).
2. **Stopp-testen (sjekkpunkt C, blokkert til nå):** etter siste kampslutt
   ~20:20 (fløyta — FPL setter da bare `finished_provisional`) skal statusen
   innen ~1 min slå om til «Ingen kamper pågår akkurat nå», kampene merkes
   «Slutt», prikken slutter å pulsere, og nettverksfanen viser INGEN nye
   `live.json`-kall i minst 5 min etterpå.
3. **Noteres:** klokkeslett, de tre siste `live.json`-kallene, første
   observerte fravær av kall. Resultatet føres i `docs/arkiv/sjekkpunkt-c-live.md`.

Faller observasjonen (ikke deployen) utenfor lørdag: søndagskampene
(15:00/17:30, slutt ~19:20) eller mandag 21:00 dekker det samme.

## Port 10 — etterarbeid (docs, én commit — pushes ALDRI mens kamper pågår)

- `docs/HANDOVER.md`: full status (v1.2.1–v1.2.3 i prod med bevis),
  loggfør Marius' beskjeder fra øktene.
- `ROADMAP.md`: huk av deploy-punktene; «Manuell verifisering under neste
  kampvindu» og stopp-testen hukes av KUN når port 9 faktisk er bestått.
- `docs/arkiv/sjekkpunkt-c-live.md`: stopp-test-resultatet.
- `git tag -d pre-deploy-main` — stillas-taggen fra port 0 har utspilt
  rollen sin når v1.2.3 er verifisert i prod.
- NB: den utdaterte «BLOKKERER DEPLOY»-/«STOPPET I PORT 0»-teksten fra
  `dbcf253` er allerede ryddet av økt 22 (HANDOVER omskrevet da planen ble
  patchet) — port 10 gjør kun den vanlige post-deploy-oppdateringen.
- Commit (`docs: …`) + push til main **etter kampslutt** (~21:00+) eller
  neste formiddag — pushen trigger en harmløs rebuild av samme kode.

## Risikoer → hvor de er dekket

| Risiko | Dekket i |
| --- | --- |
| Tre funksjonssett samtidig → uklar diagnose | tre pusher m/stopp (port 5–7) |
| `npm ci` mot usynk lock-fil (mest sannsynlige byggefeil) | 2b/2d (`npm version` + `npm ci`-bevis) + port 3 |
| Deploy midt i kampvindu | port 4 (tidsport 11:30/13:00) |
| Torsdag 19–21 / auto-brief | port 4 (forbud + re-verifisering ved utsettelse) |
| CHANGELOG-konflikt ved merge 2 | 2c (varslet, med oppskrift) |
| Coolify-bygg feiler først i prod | port 3 (tre lokale Docker-bygg) |
| Ødelagt prod uten plan | port 8 (rollback, leselig alene) |

