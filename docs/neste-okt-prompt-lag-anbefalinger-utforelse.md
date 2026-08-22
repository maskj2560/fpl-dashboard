# Oppdrag (Opus 5): utfør planen for riktige anbefalinger på /lag (B-1…B-3)

Du jobber i `c:\Users\mariu\Documents\Claude Code\FPL`. Branchen
`fix/lag-anbefalinger` er opprettet (base: `fix/sanitize-brief`) og skal
brukes — bytt til den hvis den ikke alt er sjekket ut.

**Følg planen NØYAKTIG: `docs/plan-lag-anbefalinger.md`.** Alle seks
beslutningene der er tatt av Marius — ikke re-spør, ikke re-planlegg.
Les også `CLAUDE.md` (arkitekturregler, gjelder foran alt) og
`docs/HANDOVER.md` (status — sesongstart-verifiseringen pågår).

Harde regler (detaljer og rekkefølge står i planen):

- **TDD:** rødt observert før grønt. Baseline `npm test` skal være **228**
  på fersk branch — avvik → stopp og rapporter. Mål: **238**.
- **0 AI-kall under implementeringen.** Røyktest med tomme nøkler
  (teknikken står i HANDOVER-lærdommene; verifiser `/health` → `ai:false`).
  Det ene AI-verifiseringskallet tas først ETTER sjekkpunkt D, på eget
  klarsignal.
- **Aldri push. Ingen merge.** Aldri deploy torsdag 19:00–21:00.
- Ikke rør `public/app.js` (live-polling), `notify.js`, `brief.js` eller
  `gameUpdating`/banner i `fplClient.js` — sjekkpunkt C/D observerer dem.
- Ingen nye avhengigheter. All UI-tekst norsk bokmål.
- `npm test` + `npm run lint` grønt før hver commit. Conventional commits;
  CHANGELOG `[Unreleased]` + ROADMAP + HANDOVER i samme commit som endringen.
- Bevis for alt: kommando + faktisk output. Ingen «burde nå fungere».
- Avviker virkeligheten fra planens antakelser: stopp og legg det fram for
  Marius i stedet for å improvisere.

Tiltale: **Marius**. Start svarene med «Hei Marius!».
