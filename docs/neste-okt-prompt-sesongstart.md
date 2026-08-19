# Kjøreprompt: sesongstart-verifisering (M4) + AI-restverifisering

> **Til Marius:** kopier alt fra «# Oppdrag» og ned, lim inn i en ny
> Claude Code-økt i FPL-repoet. Send den tidligst **torsdag 20. august etter
> ~19:45** (etter at auto-briefen har kommet i Discord), helst **fredag
> 21. august etter kl. 19:30** (etter GW1-deadline) — da finnes ekte data.
> Toppen her er bruksanvisning til deg, ikke del av prompten.

---

# Oppdrag: verifiser sesongstarten og fullfør AI-verifiseringen

Du jobber i c:\Users\mariu\Documents\Claude Code\FPL (Express 5 + EJS, norsk
bokmål, ingen byggesteg, prod på https://fpl.marsk.no bak Cloudflare).

## Les først, i denne rekkefølgen

1. `docs/HANDOVER.md` — nøyaktig status og hva som allerede er verifisert
2. `CLAUDE.md` — arkitekturregler, gjelder foran alt
3. `DEPLOY.md` — deploy-flyt og verifiseringskommandoer

Utgangspunkt: **v1.1.2 er i prod og verifisert** (2026-08-20 ~01:30). Alle
QA-funn fra v1.1.0- og v1.1.1-rundene er rettet. `npm test` 118/118, lint 0.
GW1-deadline: **fredag 21. august kl. 19:30 norsk tid.** Etter den bytter
sidene fra tomtilstand til ekte data.

## Harde regler

- **Hvert AI-kall skal telles og begrunnes før det gjøres.** Denne økten har
  budsjett på maks ~3 kall utover det som skjer automatisk ved sidebesøk.
- **Ingen push uten klarsignal fra Marius.** Push til `main` auto-deployer.
- Ingen nye avhengigheter. Playwright kun i scratchpad, aldri i package.json.
- All polling mot FPL går via serverens cache — aldri hamre FPL-API-et direkte.
- Bevis, ikke påstander: vis kommando + faktisk output per punkt.
- Merk tydelig hva som krever Marius (nettleser, telefon, Discord-appen) og
  gjør resten selv.

## Del 1 — etterkontroll av kveldens auto-brief (torsdag ~19:30)

Auto-briefen skal ha blitt postet til Discord ~19:30 torsdag 20. august
(24 t før deadline), generert av v1.1.2-koden (norske uttrykk + tidsfakta +
sanitizeBriefText).

1. **[Marius]** Bekreft at meldingen kom i Discord-kanalen, og lim inn
   teksten (eller et skjermbilde) i økten.
2. Sammenlign med `https://fpl.marsk.no/api/brief.json`:
   - Header skal være `**Rundebrief — Runde 1**` med deadline
     «fredag 21. august kl. 19:30»
   - Ingen avkuttede/halve setninger (det ville tydet på at
     `sanitizeBriefText` har klippet feil — se `src/services/prompts.js`)
   - Ingen påstander som motsier `fixturesByDay`/`fixturesBeforeDeadline`
   - Norske uttrykk: «runde», «holdt nullen» — ikke «gameweek»/«clean sheet»
   - Akseptansekriterium: hver setning i briefen kan spores til data i
     brief.json eller er generell FPL-kunnskap
3. **[Marius]** Coolify-loggen: skal vise `Auto-brief sendt for Gameweek 1`
   og en `AI-kall: ai-brief-gw1 …`-linje rundt 19:30. Ved deploy senere samme
   kveld: `Auto-brief hoppet over … send-tidspunktet er passert` UTEN ny
   Discord-melding (anti-spam-guarden).

## Del 2 — tomtilstand → ekte data (etter fredag 19:30)

Verifiser i prod, side for side. For hver: HTTP 200 + at tomtilstanden er
erstattet av data, og at ingen konsollfeil oppstår.

| Side | Skal nå vise | Kritisk gren |
| --- | --- | --- |
| `/` | «Toppform», «Mest kjøpt/solgt» med ekte rader | P1-1-filtrene i `topForm`/`mostTransferredIn`/`mostTransferredOut` (`src/services/analysis.js`) skal SLIPPE data GJENNOM når form > 0 / overganger > 0 — de skal ikke lenger vise tomtekstene |
| `/spillere` | poeng/form-kolonner ≠ 0 etter første kamper | sortering på Poeng og Form gir meningsfull rekkefølge |
| `/lag` | oppstilling, statstripe med tall, «· Runde 1» i undertittel | P2-5/P2-6-gatene: når `squadView` finnes skal statstripa vise TALL, ikke «–», og runde-leddet skal vises |
| `/liga` | ligatabell med rader + differensialer | tomteksten «Ligatabellen er tom …» skal være borte |
| `/brief` | AI-brief + data-brief for aktiv/neste runde | |
| `/live` | under lørdagskampene: poeng, bonusestimat, kampstillinger | se Del 3 |
| `/nyheter` | AI-punkter sporbare til feed-titlene | `filterSummaryPoints` mot ekte AI-generering: ingen punkter uten kilde i saklista |

Kommandoer: `curl`-sjekkene i `DEPLOY.md` + les HTML-en. For grenene i
analysis.js: sammenlign `/api/brief.json` og bootstrap-tall, ikke gjett.

## Del 3 — live-polling uten å hamre API-et (lørdag under kampene)

1. Åpne `/live` mens kamper pågår (**[Marius]** eller Playwright i scratchpad).
2. Verifiser i nettverksfanen/serverloggen: klienten poller `/api/live.json`
   maks hvert 60. sekund, og polling STOPPER når `anyLive` blir false
   (`public/app.js` Modul 3).
3. Serverens cache tar støyten: to raske kall på `/api/live.json` skal gi
   samme `generatedAt`/data uten nytt FPL-kall (cache-TTL 1 min i
   `src/services/cache.js`-oppsettet). Vis logg/latens som bevis.
4. Utenfor kampvinduer: ingen polling i det hele tatt.

## Del 4 — AI-restverifiseringen (teller kall!)

1. **«Spør AI om råd» på /lag** — fortsatt ALDRI kalt. **[Marius]** klikker
   ÉN gang (etter fredag, når troppen finnes). Kall nr. 1.
   - Akseptanse: svar på norsk, nevner spillere fra faktisk tropp, kaptein +
     bytte + én ting å følge med på. Nytt klikk innen en time = cachet svar
     (ingen ny `AI-kall:`-linje i Coolify-loggen).
2. **sanitizeBriefText mot fersk ekte brief** — kveldens/fredagens auto-brief
   og /brief-genereringen ER den ekte testen (kall skjer uansett). Sjekk
   Coolify-loggen for `AI-brief: fjernet …`-linjer: fjernes noe, skal det
   faktisk være en uriktig påstand. Ingen ekstra kall.
3. **filterSummaryPoints mot ekte nyhetspunkter** — les AI-punktene på
   /nyheter og sjekk at hvert punkt har kilde i saklista. Ingen ekstra kall
   (generering skjer ved sidebesøk, cachet 30 min).

## Del 5 — kostnadskontroll (søndag/mandag, etter 2–3 dager)

1. **[Marius]** Hent alle `AI-kall:`-linjer fra Coolify-loggen.
2. Summer inn/ut-tokens per funksjon. Priser: se `claude-api`-referansen
   (Sonnet 5). Forventet: godt under $1/uke ved normal bruk.
3. Terskler: over ~$4/uke → bytt `AI_MODEL=claude-haiku-4-5` i Coolify
   (én env-endring + redeploy, ingen kodeendring). Mellom $1–4 → se hvilken
   funksjon som drar, vurder lengre cache før modellbytte.

## Del 6 — restpunkter og avslutning

1. **[Marius]** Skjermbilder til README (dashbord, /spillere, /lag i desktop
   + 390 px) — best etter at ekte data er inne. Legg i `docs/img/` eller
   der README forventer dem.
2. **[Marius]** Mobilvisning på ekte telefon: de fem sjekkene fra QA-en
   (vannrett scroll, sticky hode, footer, norsk, AI-merke).
3. Samle alt som IKKE er kritisk i en «v1.2.0-kandidater»-liste under
   «Senere / idéer» i ROADMAP.md — ikke fiks noe nytt uten avtale.
4. Oppdater HANDOVER/ROADMAP/CHANGELOG fortløpende. Grønn test + lint før
   hver commit. Ved avvik i prod: rapporter med faktisk output, foreslå
   årsak, og spør Marius før endringer i prod-oppsettet.
