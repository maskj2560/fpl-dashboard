# Oppdrag (Opus 5): utfør deploy-planen v1.2.1 → v1.2.3 — forsøk 2

Du jobber i `c:\Users\mariu\Documents\Claude Code\FPL`. Dette er en
DEPLOY-økt — push er selve leveransen, men KUN der planen sier det.
Forrige forsøk (økt 21) stoppet korrekt i port 0 på et main-tip-avvik;
planen er nå patchet (økt 22) og **port 0 er forventet å passere**.

## Les først, i denne rekkefølgen

1. **`docs/plan-deploy-v122-v123.md` — FASIT.** Godkjent av Marius
   22. aug, patchet i økt 22 (se «Endret 22. aug (økt 22)»-blokka øverst —
   den lister nøyaktig hva som er endret siden forrige forsøk). Følg den
   port for port, i rekkefølge. Ingen re-planlegging, ingen omtolkning,
   ingen ny funksjonalitet.
2. `docs/HANDOVER.md` — status. 3. `CLAUDE.md` — gjelder foran alt.

## Ny forventet tilstand i port 0 (avviket fra økt 21 er nå normalen)

- `main`-tip = `c33aef1` — 4 docs-only commits oppå tag v1.2.1. Dette er
  FORVENTET og målt (økt 21/22); det er ikke lenger et stoppgrunnlag.
- Nytt steg i port 0: `git tag pre-deploy-main c33aef1` — lokalt
  reset-anker for 2a/2b (beslutning A, Marius økt 22). Taggen pushes
  ALDRI og slettes i port 10.
- `fix/live-bonus`-tip = docs-commitene fra økt 22 (plan-patch, v2-prompt,
  handover). `fix/lag-anbefalinger`-tip = `c5b9748`.

## Harde regler

- **Verifiserte fakta i planens «Kontekst» skal IKKE gjenverifiseres**
  (topologien, main-tip `c33aef1` + ancestry-målingene, merge-tree 0
  konflikter, 250/250 på `fix/live-bonus`, Docker kjører, GW2-deadline).
  Port 0 er en forutsetningssjekk, ikke en re-verifisering.
- **Push-lisens (uttømmende):** kun de eksakte refspecene i port 5, 6
  og 7, pluss docs-committen i port 10 — og kun etter grønn tidsport
  (port 4: ferdig verifisert før 11:30 lørdag, ellers utsett til søndag
  med tidsport 13:00). Alt annet er forbudt: aldri push av
  feature-branchene, aldri push av `pre-deploy-main`, aldri torsdag
  19:00–21:00, aldri mens kamper pågår.
- **STOPP-PUNKTENE er absolutte:** etter deploy 1 (port 5) og etter
  deploy 2 (port 6) stopper du, legger fram bevisene og venter på
  klarsignal fra Marius før neste push.
- **Bevis, ikke påstander:** hver port avsluttes med kommando + faktisk
  output limt inn. Feiler en port: STOPP ved portens stopp-kriterium og
  legg det fram — aldri videre «fordi det sannsynligvis går bra».
- **0 AI-kall fra deg.** B-2-kallet i port 6 klikker Marius selv.
- Avviker virkeligheten fra planens antakelser (f.eks. konflikt i en fil
  utenfor 2c-konfliktlista `{ CHANGELOG.md }`, uventet testtall, andre
  branch-tips enn forventet over): STOPP og rapporter.
- Reset-målet i 2a/2b er `pre-deploy-main` — ALDRI `v1.2.1` (det gamle
  målet ville kastet de 4 upushede docs-commitene).

## Tiltale og loggføring

Alle svar starter med «Hei Marius!». Alle beskjeder fra Marius loggføres
i `docs/HANDOVER.md` (dato + handling). Ved ~95 % usage: stopp, oppdater
HANDOVER grundig, commit.
