# Oppdrag (Opus, utførelsesøkt): utfør ETAPPE 4 — v1.3.3 QA-rettelser

Du skal UTFØRE, ikke re-planlegge. Hele planen ligger i `docs/plan-v133-qa.md`
— task for task med ferdig testkode, forventede tall og pinnede valg.
**Du tar ingen designbeslutninger.** Alle skjønnsvalg er avgjort i planens
seksjon «Pinnede skjønnsvalg». Stemmer planen ikke med koden, eller noe er
uklart: STOPP og spør Marius i stedet for å improvisere.

## Les først, i denne rekkefølgen

1. `docs/HANDOVER.md` — nåtilstand, driftslærdommer, Marius' beslutninger
2. `CLAUDE.md` — arkitektur, konvensjoner, FPL-API- og AI-kostnadsregler
3. `docs/plan-v133-qa.md` — HELE, inkl. «Globale rammer», «Pinnede
   skjønnsvalg», Vedlegg B og verifiseringstabellen
4. `ROADMAP.md` — køen øverst (v1.3.3 er kø-punkt 5)

## ABSOLUTT FORBUDT

- **Prod-`/brief` og prod-`/nyheter` skal ALDRI lastes** — ikke i nettleser,
  curl, fetch, testrunner eller Playwright. De genererer AI-tekst per visning;
  cachen ligger i minnet og tømmes ved hver deploy. Klikk aldri «Spør AI om
  råd» (`#ai-advice-btn`) på /lag. **0 AI-kall i hele etappen.**
- Alt lokalt kjøres med TOMME nøkler: `config.js` kaller
  `process.loadEnvFile()` som leser repoets `.env` uansett `--env-file` —
  sett `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=` TOMME i en
  scratchpad-`.env`. Verifiser `/health` → `ai:false, discord:false` FØR noe
  annet. Da er `/brief` og `/nyheter` gratis og skal MED i den lokale røyken.

## Slik jobber du

- Start med `git status -sb` — ikke anta at `main` = `origin/main`. Deretter
  Task 1.3-0 og videre i rekkefølge.
- Én commit per task, conventional commits. Docs i SAMME commit som
  endringen: CHANGELOG `[Unreleased]` per brukersynlig rettelse, HANDOVER-
  status per task (tak 200 linjer — roter eldste til
  `docs/arkiv/HANDOVER-historikk.md`).
- TDD som planen viser: rød fase først med forventet tall, så grønn.
  Baseline **299**, mål **322**. NB: en ESM-linkfeil tar HELE testfila —
  rødfasen kan vise FÆRRE tester enn anslått, ikke bare N røde.
- Kryss av `- [ ]` i planfila og før inn «Observert: ______» med EKTE tall
  fra kjørte kommandoer. Bevis, ikke påstander — aldri «fungerer» uten
  kommando + output i økten.
- Playwright KUN i scratchpad — gjenbruk oppsettet i
  `C:\Users\mariu\AppData\Local\Temp\claude\c--Users-mariu-Documents-Claude-Code-FPL\dac6fcf4-da08-4c03-892f-b9b259b42891\scratchpad`
  (`qa.mjs`, `qa-prod.mjs`, `qa-clubs.mjs`, `qa-clubs-prod.mjs`, chromium
  installert). `qa-v133.mjs` skrives dit fra planens Vedlegg B. Aldri
  Playwright i repoet, ingen nye avhengigheter.
- 390 px måles med iframe på samme origin
  (`<iframe src="/spillere" style="width:390px;height:760px">`).
- Markørstrengene i planens rammeseksjon er kontrakt — ordrett videre.
  Ingen hardkodede farger utenfor tokenblokkene; nye tokens i BEGGE
  temablokker (`test/style.test.js` vokter).
- Repoets filer er CRLF — skriv `\r\n` i node-patchskript. Bruk Write/Edit
  for norsk prosa og CSS (Bash-heredoc knekker på apostrofer).

## Stopp-punkter

- **Task 1.3-12:** røyk uten nøkler (11 ruter 200 + 404 — `/brief` og
  `/nyheter` er med LOKALT), Playwright 0 feil, docs — rapportér og
  **STOPP. Ingen release uten klarsignal.**
- **Task 1.3-13 KUN på eksplisitt klarsignal fra Marius.** Tidsvindu:
  FØR fredag 28. aug ~18:00 ELLER etter at GW2 er ferdigspilt (~31. aug) —
  aldri midt i. Før enhver push: `fixtures/?event=2` (og `?event=3` ved sen
  release) — ingen kamp `started && !finished_provisional`. Aldri torsdag
  19:00–21:00 (auto-briefen ~19:30). **Aldri push uten klarsignal — heller
  ikke docs.** Prod-verifisering UTEN `/brief` og `/nyheter`.
- Nærmer økten seg ~95 % usage: stopp, oppdater `docs/HANDOVER.md` grundig,
  commit alt, ingen push.

## Leveranse

Sluttrapport i chatten: hvilke funn som er rettet (alle 18 + det
uverifiserte transfers-pille-punktet), testtall 299 → observert, lint,
Playwright-tall lokalt (og mot prod hvis 1.3-13 ble kjørt, da også footer
`v1.3.3` og ny asset-hash). Hoppet du over noe: si hva og hvorfor.

---

*Denne promptfila er engangs: slett den i docs-committen når økten er
utført (git bevarer historikken).*
