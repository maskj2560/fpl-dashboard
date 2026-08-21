# Oppdrag (Opus 5): utfør planen for publisert bonus på /live (v1.2.3)

Du jobber i `c:\Users\mariu\Documents\Claude Code\FPL`.

**Følg planen NØYAKTIG: `docs/plan-live-bonus.md`.** Beslutningen der er
tatt av Marius — ikke re-spør, ikke re-planlegg. Les også `CLAUDE.md`
(arkitekturregler, gjelder foran alt) og `docs/HANDOVER.md` (status —
sesongstart-verifiseringen pågår; sjekkpunkt C ga TO funn — begge fikses her).

Harde regler (detaljer og rekkefølge står i planen):

- **Task 0 er alt gjort av Fable** (commit `30a8dab` på
  `fix/lag-anbefalinger`) — verifiser, ikke committ på nytt. Ny branch
  `fix/live-bonus` derfra.
- **TDD:** rødt observert før grønt. Baseline `npm test` skal være **242**
  på fersk branch — avvik → stopp og rapporter. Mål: **250**.
- **0 AI-kall.** Røyktest med tomme nøkler (teknikken står i
  HANDOVER-lærdommene; verifiser `/health` → `ai:false`).
- **Aldri push. Ingen merge.** Aldri deploy torsdag 19:00–21:00.
- Ikke rør polling-tilstandsmaskinen i `public/app.js`
  (`schedule`/`poll`/`LIVE_POLL_MS`/`nextWakeupDelay`) — kun bonuscellen i
  `render()`. Ikke rør `notify.js`, `brief.js`, `gameUpdating`/banner i
  `fplClient.js`.
- Ingen nye avhengigheter. All UI-tekst norsk bokmål.
- `npm test` + `npm run lint` grønt før hver commit. Conventional commits;
  CHANGELOG `[Unreleased]` + ROADMAP + HANDOVER i samme commit som endringen.
- Bevis for alt: kommando + faktisk output. Ingen «burde nå fungere».
- Avviker virkeligheten fra planens antakelser: stopp og legg det fram for
  Marius i stedet for å improvisere.

Tiltale: **Marius**. Start svarene med «Hei Marius!».
