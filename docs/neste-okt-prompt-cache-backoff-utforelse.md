# Oppdrag (Opus 5): utfør cache-backoff-planen (P3-2)

Repo: `c:\Users\mariu\Documents\Claude Code\FPL`. Les i rekkefølge:
`docs/HANDOVER.md` (AKTIVE økter — ikke forstyrr sesongstart-verifiseringen),
`CLAUDE.md`, og planen **`docs/plan-cache-backoff.md`** (godkjent av Marius).
Følg planen nøyaktig, ikke re-planlegg — avvik rapporteres eksplisitt.

Harde regler:
- Branch `fix/cache-backoff`. **ALDRI push** uten eksplisitt klarsignal fra
  Marius (push til `main` auto-deployer prod). **IKKE merge** før sjekkpunkt D
  er ferdig (søndag/mandag). Aldri deploy torsdag 19:00–21:00.
- TDD: se planens to røde tester røde FØR implementasjon; test + impl i samme
  commit. `npm test` + `npm run lint` grønne etter hver commit (utgangspunkt
  212/212 og lint 0, mål 218/218). Conventional commits.
- Ingen nye avhengigheter. Ingen nettverkskall/ekte timere i tester.
- Røyktest per planens Task 2: scratchpad-`.env` med TOMME `ANTHROPIC_API_KEY=`
  og `DISCORD_WEBHOOK_URL=`, `PORT=3010`, `FPL_TEAM_ID=5330646`. Verifiser
  `/health` → `ai:false, discord:false` FØR alt annet; 11 ruter 200, ukjent 404.
- Bevis, ikke påstander: vis kommando + output for hver verifisering.

Til slutt: kort sluttrapport (commits med hash, testtall 212→218, lint,
røyktestlinjene, avvik) + HANDOVER oppdatert i siste commit. **Ingen push.**
