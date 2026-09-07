# Økt-prompt til Fable — planlegg kandidat D «Slanking»: style.css + app.js → kjøreprompt til Opus

> Skrevet 7. september 2026 (økt 64, Fable) rett etter at v1.15.0 «Kostnadskontroll»
> gikk i prod. Kandidat D ble notert i økt 57 («D slanking av style.css/app.js»,
> `git show e63bd4b:docs/prompt-sikkerhetsnett-v1131.md:423`) og er aldri utredet.
> Denne Fable-økten **brainstormer og planlegger** med Marius og leverer en
> **kjøreprompt til Opus** som bygger. Prompten er konsumert når
> `docs/prompt-slanking-v1XX.md` er committet — da slettes denne fila (git bevarer den).

## Slik brukes den

Lim inn blokka under «Prompten» i et nytt Fable-vindu i plan-modus. Økten skriver
**0 kode**: den måler, foreslår, får Marius' valg og skriver kjøreprompten.
Premissene under er målt 7. sep mot `main` = `3738bbb` — verifiser før du siterer dem.

## Rammer (fra CLAUDE.md og tidligere beslutninger — ikke re-spør)

| Hva | Ramme |
| --- | --- |
| Hva D er | `public/style.css` (2612 linjer, 58,6 kB) og `public/app.js` (1503 linjer, 60,3 kB) har vokst gjennom 30 releaser uten én opprydning. Målet er **mindre og ryddigere kode med identisk oppførsel og utseende** — ingen nye funksjoner, ingen designendring. |
| Form | brainstorming først: **ett spørsmålssett om gangen, anbefaling først** (AskUserQuestion, maks 4 spørsmål per sett). Så plan → kjøreprompt til Opus. Samme rytme som v1.14.0. |
| Leveranse | `docs/prompt-slanking-v1XX.md` — kjøreprompt til Opus i samme form som `git show 225f053:docs/prompt-feltpakka-v1140.md` (fasit, målte premisser med fil:linje, T-tasks med testnavn, feller, ferdigkriterier, slippelista). Pluss ROADMAP § 9 og HANDOVER ajour, og denne fila slettet. |
| Harde rammer | 0 AI-kall, 0 nye avhengigheter, **ingen byggesteg** (ingen preprosessor, minifier eller bundler — filene serveres rått). CSP: ingen inline-script/`on*`. Tokens i BEGGE temaer, kontrast låst av `test/style.test.js`; 390 px er referansen; bevegelse bak `prefers-reduced-motion`. Alle 861 tester grønne hele veien. De 15 designbeslutningene fra v1.3 (`docs/arkiv/plan-v130-ui-overhaul.md` §2) rulles ikke tilbake. |
| Bevis for «identisk» | Playwright kun i scratchpad: skjermbilder av alle ni sider FØR og ETTER, begge temaer, 390 + 1440 px, pikseldiff. Klient-oppførsel er låst av `test/app-client.test.js` (58 tester) og `test/views.test.js`. |
| Spørsmål til Marius | brainstormingen ER spørsmålene. Utover det: kun hvis noe bryter rammene. |

Det eneste Marius har besluttet 7. sep: **Fable planlegger og brainstormer D, Opus bygger.**
Ambisjonsnivå, versjon og deling er åpne — se «Åpne valg».

## Målte premisser (7. sep 2026, `main` = `3738bbb`)

- v1.15.0 i prod 16:12. `npm test` → 861 (860 + 1 hoppet over lokalt), lint 0.
  Asset-hash `90e9512f` regnes i `src/app.js:51-52` over style.css + app.js — enhver
  endring gir ny `?v=` automatisk; `sw.js` cacher `?v=`-assets cache-først.
- `style.css`: 2612 linjer, 84 seksjonskommentarer, 9 `@media`, **218 klassenavn —
  14 finnes ikke i views/app.js/src:** `nav-overflow-left/right`, `table-fade-left/right`,
  `status-s/u/n`, `club--md/lg`, `shirt--badge`, `graph-x-raden`, `jump-nav`, `kort-navn`,
  `btn-accent-blokk`. Flere er trolig dynamiske prefikser (`status-` + kode fra FPL,
  `club--` + størrelse) — **verifiser hver før den strykes.**
- `app.js`: 1503 linjer, 53 navngitte funksjoner, 38 `addEventListener`, ingen
  seksjonshoder. Én fil for alle ni sider, lastet på alle — mål hvor mye hver side
  faktisk bruker.
- 17 EJS-filer bruker klassene (`views/*.ejs` + `views/partials/`).

## Retninger å legge fram (Fable måler først, så spør — anbefaling først)

1. **Død kode** — klasser/regler ingen bruker, funksjoner ingen kaller, duplikatregler
   mellom seksjoner. Lav risiko, målbar gevinst (kB og linjer før/etter).
2. **Struktur** — seksjonsrekkefølge og -hoder i begge filene, én konvensjon for
   side-spesifikk kode (init per side via et `data-`-attributt på `<body>` e.l.),
   `@media` samlet per komponent.
3. **Deling** — én fil vs. flere (per side/komponent, fortsatt uten byggesteg). Berører
   `src/app.js:51-52` (hashen), `layout.ejs` (`?v=`), `sw.js` (asset-lista) og
   `style.test.js`. Krever Marius' ja.
4. **Konsolidering** — like mønstre (korthoder, tabellvarianter, tomtilstander, knapper)
   til felles klasser. Risiko for synlige avvik → skjermbilde-diffen er dommeren.
5. **Vakt** — en kildelås-test som feiler på nye ubrukte klasser (à la låsene i
   `test/routes.test.js`), så det holder seg slankt.

## Åpne valg for Marius (første spørsmålssett)

- **Ambisjonsnivå:** kun 1 / 1+2 / 1+2+4 / alt. Anbefaling velges etter målingen.
- **Versjon:** `v1.15.1` (patch, ren opprydning uten synlig endring — anbefalt) eller
  minor hvis deling (3) tas med.
- **Deploy-vindu:** GW4 spilles lør 12.–man 14. sep; GW5-deadline fre 18. sep 17:30Z
  (auto-brief tor 17. sep ~19:30, Lagsjekk fre ~16:30); **landslagspause 21. sep–10. okt
  = rolig vindu.** Docs-deploy koster 0 AI-kall fra v1.15.0, kodedeploy 3.

## Prompten

```
Les docs/HANDOVER.md, CLAUDE.md og køen i ROADMAP.md. Deretter
docs/prompt-plan-slanking-kandidat-d.md — den er fasit for denne økten. Du er i
plan-modus og skriver 0 kode.

1. Mål public/style.css og public/app.js selv: ubrukte klasser/regler/funksjoner,
   duplikater, seksjoner, hva hver av de ni sidene faktisk bruker. Verifiser
   premissene i prompten (fil:linje). Ta referanse-skjermbilder av alle ni sider
   (Playwright i scratchpad, begge temaer, 390 + 1440 px).
2. Brainstorm med Marius: ett spørsmålssett om gangen, anbefaling først, maks 4
   spørsmål. Start med ambisjonsnivå og versjon, så retningene som trenger et ja.
3. Når planen er godkjent: skriv kjøreprompten til Opus i docs/prompt-slanking-v1XX.md
   i samme form som `git show 225f053:docs/prompt-feltpakka-v1140.md` — fasit med
   Marius' valg, målte premisser med fil:linje, T-tasks med testnavn (rød test først
   der det er logikk, skjermbilde-diff der det er utseende), feller, ferdigkriterier
   og slippelista (branch → CI → merge --no-ff → tag → prod-sjekk).
4. ROADMAP § 9 og HANDOVER ajour, slett denne prompten, én docs-commit, push.
```
