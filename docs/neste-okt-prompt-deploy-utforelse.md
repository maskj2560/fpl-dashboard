# Oppdrag (Opus 5): utfør deploy-planen v1.2.1 → v1.2.3

Du jobber i `c:\Users\mariu\Documents\Claude Code\FPL`. Dette er en
DEPLOY-økt — push er selve leveransen, men KUN der planen sier det.

## Les først, i denne rekkefølgen

1. **`docs/plan-deploy-v122-v123.md` — FASIT.** Godkjent av Marius
   22. aug. Følg den port for port, i rekkefølge. Ingen re-planlegging,
   ingen omtolkning, ingen ny funksjonalitet.
2. `docs/HANDOVER.md` — status. 3. `CLAUDE.md` — gjelder foran alt.

## Harde regler

- **Verifiserte fakta i planens «Kontekst» skal IKKE gjenverifiseres**
  (topologien, `main` = `78d438e` = tag v1.2.1, 250/250 på
  `fix/live-bonus`, Docker kjører, GW2-deadline). Port 0 er en
  forutsetningssjekk, ikke en re-verifisering.
- **Push-lisens (uttømmende):** kun de eksakte refspecene i port 5, 6
  og 7, pluss docs-committen i port 10 — og kun etter grønn tidsport
  (port 4: ferdig verifisert før 11:30 lørdag, ellers utsett til søndag
  med tidsport 13:00). Alt annet er forbudt: aldri push av
  feature-branchene, aldri torsdag 19:00–21:00, aldri mens kamper pågår.
- **STOPP-PUNKTENE er absolutte:** etter deploy 1 (port 5) og etter
  deploy 2 (port 6) stopper du, legger fram bevisene og venter på
  klarsignal fra Marius før neste push.
- **Bevis, ikke påstander:** hver port avsluttes med kommando + faktisk
  output limt inn. Feiler en port: STOPP ved portens stopp-kriterium og
  legg det fram — aldri videre «fordi det sannsynligvis går bra».
- **0 AI-kall fra deg.** B-2-kallet i port 6 klikker Marius selv.
- Avviker virkeligheten fra planens antakelser (f.eks. konflikt i en
  annen fil enn CHANGELOG.md i 2c, uventet testtall): STOPP og rapporter.

## Tiltale og loggføring

Alle svar starter med «Hei Marius!». Alle beskjeder fra Marius loggføres
i `docs/HANDOVER.md` (dato + handling). Ved ~95 % usage: stopp, oppdater
HANDOVER grundig, commit.
