# Oppdrag (Opus 5): utfør sanitize-brief-planen (P3-4)

Jobb i `c:\Users\mariu\Documents\Claude Code\FPL`. Les i denne rekkefølgen:
`docs/HANDOVER.md` (sesongstart-verifiseringen A–D er AKTIV i en annen økt —
ikke forstyrr den), `CLAUDE.md` (gjelder foran alt), og planen
`docs/plan-sanitize-brief.md`. Følg planen NØYAKTIG, task for task — ikke
re-planlegg, ingen subagenter. Fakta i planens «Verifiserte fakta» er bevist;
ikke gjenverifiser med nettverkskall.

- Branch `fix/sanitize-brief` ut fra `main`. ALDRI push (push auto-deployer
  prod). IKKE merge før sjekkpunkt D (søndag/mandag) + klarsignal fra Marius.
- `main` har upushede commits + upushet tag `v1.2.1` — ikke rør dem.
- INGEN AI-kall. TDD med rødt observert først (Task 1: 223 tester/4 fail,
  Task 2: 228/2 fail), grønt + lint 0 etter hver commit. Utgangspunkt 218/218.
- Røyktest per Task 3: scratchpad-`.env` med TOMME nøkler, PORT=3010 —
  verifiser `/health` → `ai:false, discord:false` FØR alt annet.
- Bevis, ikke påstander: kommando + output for hver verifisering.
- Loggfør Marius' beskjeder i HANDOVER. Tiltale: alle svar «Hei Marius!».

Sluttrapport: commitliste, rødt→grønt-tall per task, lint, røyktest-output,
og bekreftelsen «0 AI-kall, ingen push, ingen merge».
