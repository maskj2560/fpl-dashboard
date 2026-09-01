# Detaljplan v1.8.1 — Visuell redesign av /spillere

> Skrevet i planøkt 2026-09-01 (økt 49, Fable). Godkjent av Marius samme dag.
> Utførelses-økten skal kunne bygge dette UTEN å ta et eneste designvalg —
> alt er avgjort i Beslutningsfasiten. Arkiveres til `docs/arkiv/` når
> v1.8.1 er merget.

## Context

Marius er misfornøyd med utseendet på /spillere etter v1.8.0: siden virker,
men ser uferdig ut — en vegg av 772 grønnfylte knapper, et kaotisk
dødballoppsett, feil knappehierarki i duell-linja, statusstøy på alle 626
rader og inkonsistente desimaler. Målet er en side som ser proff, ren og
oversiktlig ut. Ingen funksjonsendring, ingen dataflyt-endring.

**STEG 0 avklart:** Spillerkort-modalen VIRKER i prod. Marius sendte
skjermbilde fra privat vindu 1. sep: sentrert kort, × oppe til høyre,
nøkkeltall i bokser. De ustylede skjermbildene var et cache-/verktøyproblem.
Planen inneholder derfor ingen feiljakt på modalen — kun redesign.

**Funn under planleggingen (ekte v1.8.0-bug):** terskelvelgeren 5/10/15 % på
/spillere er DØD. Ingen kode i `public/app.js` (eneste skript) lytter på
`diff-terskel`-radioene — målt med grep: null treff på `terskel`/`diff-` i
app.js. Klikk gjør ingenting; kun 10 %-tabellen kan vises. Fikses i T6 (den
nye segmenterte bryteren trenger uansett denne JS-en) — og fiksen låses med
test.

## Beslutningsfasit (Marius' valg 1. sep — IKKE re-spør)

Alle 11 spørsmål besvart, alle med anbefalt alternativ:

1. **Struktur: faner.** Segmentert bryter under overskriften: Tabell /
   Differensialer / Dødballtakere. Én seksjon synlig om gangen. URL-hash
   (`#differensialer` osv.) aktiverer riktig fane ved last. Duellen bor
   under Tabell-fanen. Uten JS vises kun tabellen (akseptert fallback).
2. **Spillernavn: lavmælt tekstlenke.** Fortsatt `<button>` (samme JS og
   tilgjengelighet), ny klasse — tekst i `var(--accent-text)`, understrek
   ved hover/fokus. Grønn fylt knapp reserveres for ekte handlinger.
3. **Status: kun avvik.** «Klar»-rader får tom statuscelle. Badge vises kun
   for status ≠ 'a' (skadet/tvilsom/suspendert/utilgjengelig/utlånt).
   Statusfilteret virker som før (leser `data-status`, ikke cellen).
   Modalen beholder badgen sin (én spiller — der er den informasjon).
4. **Tabell: alle 12 kolonner + rytme.** Zebra-striper, strammere
   linjehøyde, synlig «Duell»-etikett på checkbox-kolonnen. Ingen
   kolonne-toggling, ingen sticky navnekolonne.
5. **Desimaler: én desimal, i servicen.** `fdr3` og `score` formateres
   alltid med én desimal («3.0», «12.0») i `services/players.js` — låst med
   test. FPL-strenger (form, xG, eid …) røres ALDRI.
6. **Differensialer: segmentert bryter + søylestripe.** Radioene beholdes i
   markup (input + span i label), stylet som segmentert pillebryter. Score
   får diskret vannrett stripe bak tallet, bredde = andel av tabellens
   toppscore.
7. **Dødball: klubbkort i rutenett.** 20 kort med klubbmerke + tre roller
   som «Straffer: 1. Saka · 2. Ødegaard». Én kolonne på 390 px. Navn
   fortsatt klikkbare (spillerkort). Tabellen dør.
8. **Duell: tabell + spillerhoder, farge+vekt.** Sammenligningstabellen
   består, får hode med drakt + navn + klubb per spiller. Vinner = fet +
   `var(--accent-text)` (som nå, bedre rytme). Plassering som nå (under
   tabellen, scroll-til ved «Sammenlign»).
9. **Spillerkort-modal: stor drakt, delt vekt, tabell.** Drakt 110 px, navn
   KUN i modaltittelen (duplikatet i brødteksten fjernes), tekstblokka
   venstrejusteres. Form/Poeng/P/K store øverst; Eid %/xG/xA/Minutter
   mindre under. «Siste kamper» forblir tabell, strammet.
10. **Tetthet: litt mer luft + tydeligere titler.** Ingen token-overhaling,
    ingen endring av --border/--shadow. Kortere ingress.
11. **Versjon: v1.8.1** (patch — ren redesign). Planleggingspakka beholder
    v1.9.0.

Fasit-fikser (bekreftede feilgrep, ingen spørsmål stilt):
- **Duell-bar-hierarkiet snus:** «Sammenlign» blir primær (grønn
  `btn-accent`, disabled til 2 valgt), «Tøm valg» blir lavmælt tekstknapp.
- **Navnedublett i modalen fjernes** (tittel + `kort-navn` viser samme navn).
- **Terskelvelger-JS-en skrives** (bugfiksen over) — egen `fix:`-commit.
- **Checkbox-kolonnen får synlig «Duell»-overskrift** (i dag kun sr-only).

## Målte fakta om dagens kode (1. sep, main = origin/main, v1.8.0)

### views/players.ejs
- 1–11: page-head, lang ingress, `jump-nav` med 3 hopplenker
- 13–51: filterform (urørt i denne planen, bortsett fra ev. luft)
- 54–58: duell-bar — `#duell-start` disabled uten klasse, `#duell-tom`
  har `btn-link` (fylt grønn) — feil hierarki
- 59–119: spillertabellen. thead 62–75 (12 th, første `data-nosort` med
  sr-only-tekst), navneknapp `btn-link js-spillerkort` på 101, status-badge
  på alle rader 111, empty-state med `btn-link` 117–118
- 121: `<section class="card" id="duell" hidden>`
- 123–174: differensialer. Radiovelger 131–136 (`name="diff-terskel"`),
  tre pre-rendrede tabeller 137–172 (`data-terskel`, kun 10 synlig),
  navneknapp 158
- 176–206: dødballtabellen, takere som `btn-link`-knapper adskilt med «·»
  på 197
- 210–213: shirt-`<template>` per lag (klones av modalen — og av duellen i T9)
- 215–224: modal-skallet

### public/style.css (1961 linjer totalt)
- Tokens: `:root` 13–115, `:root[data-theme="light"]` 120→. Relevante:
  `--accent-text` (grønn tekst, mørkegrønn i lyst), `--accent-soft`,
  `--surface`/`--surface-2`, `--border`, `--radius-pill`, `--fs-*`
- `table.data` 625–655 (rad-hover = `--surface-2` på 653), `.num` 657,
  `.status` 686–695 (pille), `.status-i/s/u/n/d` 861–869
- `.btn-accent, .btn-link` DELT blokk 1548–1571: grønn fylt knapp.
  `.btn-link` brukes OGSÅ av 404/error/no-team («Til dashbordet») og
  planleggeren på /overganger — de skal FORTSETTE å se slik ut
- Mobil ≤ 480: `.shirt` krympes til 40 px (1622–1626) — modal-drakta må
  scopes forbi denne
- v1.8.0-seksjonen 1778–1961: `.jump-nav` 1781, `.duell-bar` 1802,
  `.terskel-velger` 1817, `.modal` 1845, `.kort-*` 1900–1961

### public/app.js
- `playerCardHtml` 41–98: navnedublett på 48 (`kort-navn`), flat
  `kort-stats`-grid 56–59
- Duell: `DUELL_RADER` 103–116, `duelStatus` 118, `duelData` 122–141
  (leser IKKE `ds.team` i dag), `duelWinners` 148–167, `duelHtml` 169–185
  (ingen drakter/hode)
- Modul 2 (sortering) 334→, Modul 2b (filter) 390–452 —
  `applyFilters` setter `row.hidden` (419–423) og kaller
  `window.duellRyddSkjulte` (427)
- Modul 9 (modal) 990–1091: `shirtFor` 1005 kloner shirt-templates
- Modul 10 (duell) 1093–1154
- **INGEN modul håndterer `diff-terskel`** — terskelbytte er dødt i prod

### src/services/players.js
- `en1` 110–112 (Math.round → blandede desimaler),
  `buildDifferentials` 126–161: `fdr3` 133, `score` 146, sortering på
  `score` 154–158 (numerisk — må bestå etter strengformatering),
  `buildSetPieceTable` 179–203 (datastruktur uendret — kortene bruker samme)

### Tester (baseline 602/602 + lint 0)
- `test/views.test.js`: 333 feilside-`btn-link` (URØRT), 337–351
  sorteringskontrakt (12 th, `data-nosort`, én descending), 355–361
  hopplenker (ENDRES → faner), 363–372 navneknapp + data-attrs (ENDRES →
  ny klasse), 374–380 duell-skall (ENDRES → btn-accent/btn-quiet), 382–390
  terskler (består), 398→ dødball (ENDRES → kort)
- `test/players.test.js`: 292–334 låser `fdr3: 3` og `score: 12` som TALL
  (ENDRES → strenger '3.0'/'12.0' + `andel`)
- `test/app-client.test.js`: 240–306 `playerCardHtml` (ENDRES),
  307–366 duell-funksjonene (ENDRES i T9)
- `test/style.test.js`: **består URØRT.** Håndhever: hver fargetoken i begge
  temablokker, ingen hardkodede farger utenfor blokkene, kontrastpar (hex),
  strukturkrav (.topbar, pinned-tabell, hyphens, kantfade)
- `test/routes.test.js`: AI-låsen (players-pakka importerer aldri ai.js) —
  URØRT
- `test/fixtures/views.js`: `fx.players` 111–139 — Saka (status 'a',
  penalties_order 1) + Salah (status 'd') — avviksbadge kan testes uten nye
  fixtures

### Annet
- `src/routes/players.js` og `src/routes/api.js`: uendret
- Asset-versjonen regnes runtime av serveren; HANDOVER skal oppdateres med
  ny forventet hash etter merge (regnes fra git-blobber på main-toppen)

## Nye tokens

Én ny: `--row-alt` (zebra-bakgrunn). Defineres i BEGGE temablokker:
- mørkt: `rgba(190, 160, 255, 0.05)` (samme base som --border)
- lyst: `rgba(55, 0, 60, 0.04)`
rgba-tokens fanges av style.test.js' begge-temaer-krav (oppfylt) og kan
ikke stå i PAIRS (hex-only) — trengs heller ikke: stripa ligger over
--surface og flytter tekstkontrasten marginalt (verifiseres i QA).
Alt annet bruker eksisterende tokens (--accent, --accent-ink,
--accent-text, --accent-soft, --surface-2, --border).

## T-tasks (TDD: rød → grønn → commit per task)

Branch: `fix/spillere-redesign-v181` fra main. Baseline verifiseres først:
`npm test` (602/602) + `npm run lint` (0).

**T1 — Lavmælte navnelenker.**
Rød: views.test.js 365 + dødball-navnetesten endres til
`class="navn-lenke js-spillerkort"`. Grønn: players.ejs 101, 158, 197
bytter `btn-link` → `navn-lenke`; ny CSS-klasse `.navn-lenke`
(button-reset: transparent bakgrunn, ingen padding/border, `font: inherit`,
`color: var(--accent-text)`, `cursor: pointer`; hover/fokus: understrek;
fokus: `outline: 2px solid var(--focus)`). `btn-link`-blokka i CSS røres
IKKE (feilsidene + planleggeren bruker den fortsatt).
Commit: `fix(spillere): spillernavn som lavmælte lenker, ikke fylte knapper`

**T2 — Status kun ved avvik.**
Rød: views.test.js ny assertion — Salah (status 'd') HAR badge, Saka
(status 'a') har IKKE badge i sin rad (cella er tom). Grønn: players.ejs
111: `<% if (p.status !== 'a') { %><span class="status …">…</span><% } %>`.
data-status-attributtet på raden består (filteret leser det).
Commit: `fix(spillere): statusbadge kun ved avvik — «Klar» er stille`

**T3 — Tabellrytme: zebra + Duell-etikett.**
Rød: views.test.js — første th inneholder synlig tekst `Duell` (og
`data-nosort` består; 12-th-kontrakten 337–351 består urørt). Grønn:
players.ejs 63: `<th data-nosort>Duell</th>` (sr-only-spanet erstattes —
th-en har allerede uppercase/fs-xs-styling). CSS: `--row-alt` i begge
tokenblokker + `table.data tbody tr:nth-child(even of :not([hidden])) td
{ background: var(--row-alt); }` (of-syntaksen hopper over filtrerte
rader; eldre nettlesere mister bare zebraen), radhøyde strammes
(`table.data td` padding 0.5rem → 0.4rem vurderes visuelt). Hover-regelen
(653) skal fortsatt vinne over zebra (spesifisitet/rekkefølge).
Commit: `fix(spillere): zebra-rytme i tabellen og synlig duell-etikett`

**T4 — Duell-bar-hierarkiet snus.**
Rød: views.test.js 376–378 endres: `#duell-start` har `btn-accent`,
`#duell-tom` har `btn-quiet` (og ingen `btn-link`). Grønn: players.ejs
56–57; ny CSS `.btn-quiet` (transparent, `color: var(--text-dim)`,
understrek ved hover/fokus, samme padding som btn-accent for
klikkflate); `.duell-bar .btn-accent:disabled { cursor: not-allowed; }`
(delt blokk 1568 bruker `wait` — riktig for AI-knappen, feil her).
Commit: `fix(spillere): Sammenlign er primærknappen, Tøm valg lavmælt`

**T5 — Én desimal i servicen.**
Rød: players.test.js 292–334 endres: `fdr3: '3.0'`, `score: '12.0'`
(strenger), ny `andel`-assertion (0–100, toppscore = 100). Grønn:
services/players.js — sorter numerisk FØRST, formater så: `fdr3` og
`score` med `.toFixed(1)`, nytt felt `andel` = `Math.round(score/maks*100)`
per terskeltabell (maks = toppscore i DEN tabellen; tom tabell → ingen
rader). FPL-strengene røres ikke. Viewet viser strengene som før
(ingen view-endring i denne tasken).
Commit: `fix(spillere): FDR og score med fast én desimal + andel for stripe`

**T6 — Segmentert bryter + søylestripe + terskel-FIKSEN.**
Rød (a): app-client.test.js — ny ren funksjon `terskelSynlighet(valgt)` →
`{5: hidden, 10: …, 15: …}`-logikk låses (fiksen på den døde velgeren).
Rød (b): views.test.js — score-cellen har stripe-elementet med
`--andel`-styleattributt; label-markupen har `<span>` rundt teksten.
Grønn: players.ejs 131–136: `<label><input type="radio" …><span>under
5 %</span></label>`; score-cellen 165: `<td class="num score-celle"
style="--andel: <%= r.andel %>%"><strong><%= r.score %></strong></td>`.
CSS: `.terskel-velger` → pillebryter (inputs visuelt skjult men
fokuserbare, `input:focus-visible + span` får fokusring,
`input:checked + span` får `background: var(--accent); color:
var(--accent-ink)`); `.score-celle` får
`background: linear-gradient(90deg, var(--accent-soft) var(--andel),
transparent var(--andel)) no-repeat` (høyrejustert tall over stripa).
app.js: ny Modul 11 — change-lytter på `diff-terskel`-radioene som toggler
`hidden` på `[data-terskel]`-boksene via `terskelSynlighet`.
To commits: `fix(spillere): terskelvelgeren virket ikke — JS manglet` +
`fix(spillere): segmentert terskelbryter og søylestripe på score`

**T7 — Faner.**
Rød: views.test.js 355–361 skrives om: tre faneknapper
(`.fane-knapp[data-fane]`, `aria-controls`, nøyaktig én med
`aria-selected="true"`), seksjonene beholder id-ene tabell/differensialer/
dodballtakere; Tabell-seksjonen synlig, de to andre `hidden` fra server.
Grønn: players.ejs — `jump-nav` erstattes av `.fane-rad` (tre
`<button role="tab">` i `role="tablist"`); `#differensialer` og
`#dodballtakere` rendres med `hidden`. app.js: ny Modul 12 — klikk bytter
fane (hidden + aria-selected), `history.replaceState` oppdaterer hash;
ved last: `location.hash` aktiverer riktig fane (default Tabell);
piltaster venstre/høyre mellom faner tas med (~10 linjer).
`#duell`-seksjonen flyttes INN i `#tabell`-seksjonen i markup (enklest —
følger fanens synlighet gratis). CSS: `.fane-rad` som segmentert kontroll
(aktiv fane: `--surface-2`-fyll + `--accent`-understrek, inaktiv:
`--text-dim`). Uten JS: `hidden`-attributtene gjør at kun tabellen vises —
akseptert (appen er JS-avhengig på /spillere allerede: filter, sortering,
modal). NB: sjekk med grep at ingen andre views lenker til
`/spillere#differensialer`/`#dodballtakere` — v1.7.1-krysslenkene bruker
`?sok=`/`?pos=` (Modul 2b, urørt).
Commit: `fix(spillere): tre faner erstatter ett langt scroll-dokument`

**T8 — Dødball-klubbkort.**
Rød: views.test.js 398→ skrives om: `.dodball-grid` finnes, ett
`.dodball-kort` per klubb med klubbmerke, roller som «Straffer» med
«1. Navn» + «2. Navn» som `navn-lenke js-spillerkort`-knapper, «–» for
tomme roller. Grønn: players.ejs 180–205 erstattes: grid av kort, hvert
kort = header (club-badge-partial) + tre rader
(`<span class="dim">Straffer</span> 1. <button …>Saka</button> ·
2. <button …>Ødegaard</button>`). CSS: `.dodball-grid { display: grid;
grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: … }`,
`.dodball-kort { background: var(--surface-2); border: 1px solid
var(--border); border-radius: var(--radius-sm); padding: … }`.
Datastrukturen fra `buildSetPieceTable` er uendret.
Commit: `fix(spillere): dødballtakere som klubbkort i rutenett`

**T9 — Duell-hoder med drakter.**
Rød: app-client.test.js — `duelData` tar med `teamId` (fra `ds.team`,
finnes alt som data-attributt på raden, players.ejs 82); `duelHtml(a, b,
winners, shirtA, shirtB)` rendrer `.duell-hode` per spiller (drakt-html
settes inn rå — server-rendret template, samme kontrakt som
playerCardHtml) og escaper navn som før. Grønn: app.js — `duelData` +
`duelHtml` utvides; Modul 10 kloner `template[data-shirt="…"]` (samme
oppslag som Modul 9s `shirtFor`, trekk gjerne ut felles hjelper). CSS:
`.duell-hode`-rad (to kolonner, drakt + navn/klubb, navnet
`--fs-lg`/700). Vinnercellene består som `<strong class="accent">`.
Commit: `fix(spillere): duellen får spillerhoder med drakter`

**T10 — Spillerkort-modalen: hierarki.**
Rød: app-client.test.js 240→ oppdateres: `playerCardHtml` inneholder IKKE
lenger fulltNavn i brødteksten (tittelen eier navnet — Modul 9 setter den
alt, app.js 1050); primærstats (Form, Poeng, P/K) har egen klasse
`.kort-stat--stor`, sekundær (Eid %, xG, xA, Minutter) som før. Grønn:
app.js `playerCardHtml` — `kort-navn`-linja fjernes (48), kort-topp
venstrejusteres (tekstblokka skal ikke skyves — `.kort-topp > div
{ flex: 1; min-width: 12rem; }` mot dagens rare høyrestilling), stats
deles i to grids (eller én grid der de tre første spenner større og har
`--fs-xl`-tall). CSS: `.modal .shirt { width: 110px; height: auto; }`
(vinner over 480px-krympingen — spesifisitet .modal .shirt > .shirt,
verifiser rekkefølge/spesifisitet mot 1622), `.kort-stat--stor .kort-stat-val
{ font-size: var(--fs-xl); }`, kamptabellen strammes
(`.modal table.data td { padding: 0.3rem 0.5rem; }`).
Commit: `fix(spillere): spillerkortet — én navnekilde, delt statvekt, stor drakt`

**T11 — Luft, titler, ingress.**
Rød: views.test.js — ingress-teksten kortes (assertion på ny tekst hvis
noen låser den gamle — sjekk; hopplenke-testen er alt skrevet om i T7).
Grønn: players.ejs — ingressen kortes til én setning («Klikk på et
spillernavn for spillerkortet. xG/xA er FPLs forventede tall for
sesongen.»), forklaringer flyttes til `title`-attributter der de finnes
fra før. CSS scoped til siden (seksjonene har id-er): mer avstand mellom
fane-rad og innhold, `#tabell .duell-bar` får litt luft, h2-ene i
seksjonene får `--fs-xl`. Ingen globale .card-endringer.
Commit: `fix(spillere): kortere ingress og roligere typografi`

**T12 — Sluttkontroll + release.**
- `npm test` (alle — forvent 602+ etter nye assertions) + `npm run lint` 0
- Røyktest lokalt med tomme nøkler (scratchpad-.env, HANDOVER-lærdommen):
  /spillere 200, /api/spiller/:id 200/400/404, **0 «AI-kall:»-linjer**
- Visuell QA i BEGGE temaer på 390 px og desktop: faner, zebra + filter
  (stripene skal forbli annenhver på synlige rader), segmentbryter,
  søylestripe, dødballkort, duell med drakter, modal
- CHANGELOG: `[Unreleased]` → `[1.8.1]` med dato; ROADMAP-rad v1.8.1 hukes
  av; HANDOVER: status + ny forventet asset-hash (regnes fra git-blobbene
  på main-toppen ETTER merge); planfila arkiveres til `docs/arkiv/`
- `chore(release): v1.8.1`, merge `--no-ff`, tag `v1.8.1`, push
  (ALDRI torsdag 19–21, aldri under kamper)

## Filliste

| Fil | Endring |
| --- | --- |
| views/players.ejs | faner, navnelenker, statusbetingelse, duell-bar, terskelbryter-markup, score-stripe, dødballkort, kortere ingress |
| public/style.css | ny token `--row-alt` (begge temaer), `.navn-lenke`, `.btn-quiet`, zebra, fane-rad, segmentbryter, `.score-celle`, `.dodball-grid/-kort`, `.duell-hode`, modal-justeringer |
| public/app.js | Modul 11 (terskel), Modul 12 (faner), `duelData`/`duelHtml` (hoder), `playerCardHtml` (hierarki), felles shirt-hjelper |
| src/services/players.js | `fdr3`/`score` som «x.y»-strenger, nytt felt `andel` |
| test/views.test.js | oppdaterte assertions T1–T4, T6–T8, T11 |
| test/players.test.js | strengdesimaler + `andel` (T5) |
| test/app-client.test.js | `terskelSynlighet`, duell-hoder, playerCardHtml (T6, T9, T10) |
| docs (CHANGELOG, ROADMAP, HANDOVER, planfil) | løpende + release |

URØRT: src/routes/*, src/services/fplClient.js, test/style.test.js,
test/routes.test.js, alle andre views. Ingen nye avhengigheter, ingen
byggesteg, 0 AI-kall (ingen fil i pakka importerer ai.js — routes.test.js
låser).

## Testplan

- Hver T-task: rød først (endrede assertions feiler mot dagens kode), så
  grønn, commit per task med CHANGELOG-linje under `[Unreleased]`
- `test/style.test.js` kjøres URØRT og skal være grønn hele veien (nye
  tokens legges i begge blokker; ingen hex/rgba utenfor tokenblokkene —
  stripebredder og prosenter er ikke farger)
- Full suite + lint før hver commit; baseline 602/602 må aldri under
- Manuell QA-matrise i T12 (tema × bredde × fane)

## Risiko

1. **`:nth-child(even of :not([hidden]))`** — nyere CSS (Chrome 111+,
   FF 113+, Safari 9+). Eldre nettlesere mister kun zebraen (graceful).
   Alternativ (JS-striping i applyFilters) er beskrevet, tas KUN hvis QA
   feiler i Marius' nettlesere.
2. **Faner uten JS** viser kun tabellen (server-rendret `hidden`).
   Akseptert: /spillere er allerede JS-avhengig. Alternativ fallback
   (alle synlige, JS skjuler) ble valgt bort for å unngå innholdshopp.
3. **`.modal .shirt`-overstyring** må vinne over 480px-mediablokka
   (style.css 1622) — den vinner på spesifisitet (2 klasser mot 1), men
   verifiser visuelt på mobil.
4. **views.test.js-kontrakten 337–351** (12 th, indeksbasert sortering i
   Modul 2) består — ingen kolonner legges til/fjernes, kun innhold i
   cellene endres.
5. **Duell-drakter**: shirt-templates ligger UTENFOR fane-seksjonene i
   markup (players.ejs 210–213) — hold dem utenfor fanene også etter T7
   (templates rendres ikke visuelt, men ryddighet).
6. **Sortering på score etter strengformatering**: sorter numerisk før
   formatering i servicen — låst av eksisterende sorteringstest (321–334).

## Praktiske fallgruver (fra tidligere økter — gjelder utførelsen)

- ALLE docs er CRLF (ROADMAP har BOM): bruk Edit-verktøyet, aldri
  node-replace med `\n` i søkestrengen, aldri `sed -i`
- Heredoc via Bash knekker på apostrofer — bruk Write/Edit
- Restart dev-serveren etter endringer i `src/` (ESM lastes én gang)
- Lokal røyktest: tomme `ANTHROPIC_API_KEY=`/`DISCORD_WEBHOOK_URL=` i
  scratchpad-.env (config.js leser repoets .env uansett `--env-file`)
- Klikk ALDRI «Spør AI om råd» på /lag under verifisering
- Zebra + hover: hover-regelen (style.css 653) må stå ETTER/vinne over
  zebra-regelen, ellers forsvinner hover-effekten på partallsrader
- `en1`-navnet: funksjonen kan beholdes for internt bruk (FDR-snittet før
  formatering) — formatering skjer i radbyggingen, ikke i matten
