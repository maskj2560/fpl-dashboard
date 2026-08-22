# Oppdrag (Fable, plan mode): løs port 0-avviket i deploy-planen

Du jobber i `c:\Users\mariu\Documents\Claude Code\FPL`, branch
`fix/live-bonus`. Dette er et **planleggingsoppdrag**, ikke utførelse.
Du skriver ingen kode og gjør ingen merge/push. Leveransen din er en
godkjent plan-oppdatering + en kort utførelsesprompt til Opus 5.

## Les først

1. `docs/plan-deploy-v122-v123.md` — den godkjente deploy-planen. Den er
   fortsatt fasit. Du skal **patche** den, ikke skrive den om.
2. `docs/HANDOVER.md` — Status, «Åpne punkter» (BLOKKERER DEPLOY) og
   brukerbeskjed-loggen for økt 21.
3. `CLAUDE.md` — gjelder foran alt.

## Bakgrunn: deploy-økten stoppet i port 0

Opus 5 startet utførelsen 22. aug ~02:00 og stoppet umiddelbart i port 0.
Planen forutsetter at lokal `main` står på `78d438e` (tag v1.2.1). Det gjør
den ikke — `main`-tippen er `c33aef1`, med **4 docs-only commits oppå
taggen**. Ingenting ble merget eller pushet; prod er urørt.

## Verifiserte fakta fra økt 21 — IKKE gjenverifiser disse

Alt under er målt med kommando og output i økt 21.

- Rent arbeidstre. Branch `fix/live-bonus`, tip nå `dbcf253`
  (handover-committen som loggførte stoppet).
- `main`-tip = `c33aef1`. Over tag `v1.2.1` (`78d438e`) ligger:
  `56e5d16` handover etter lokal v1.2.1-merge, `c16cf14` + `9ca665f`
  (P3-4 sanitize-plan/prompt), `c33aef1` (UI-overhaling-prompt).
- De 4 commitene rører **kun docs**: `docs/HANDOVER.md`,
  `docs/neste-okt-prompt-sanitize-brief.md`,
  `docs/neste-okt-prompt-sanitize-brief-utforelse.md`,
  `docs/plan-sanitize-brief.md`, `docs/prompt-ui-overhaul-plan.md`.
  983 innsettinger, **0 kodeendringer**.
- `main` er 10 commits foran `origin/main` (= `feb0c7f`, prod v1.2.0).
  Planens to fakta motsier hverandre: med taggen på tippen ville main vært
  6 foran, ikke 10. Driften er altså eldre enn planen.
- Topologien er intakt: `fix/sanitize-brief` ⊂ `fix/lag-anbefalinger` ⊂
  `fix/live-bonus`, og `78d438e` er ancestor av alle tre.
- `git merge-tree --write-tree main fix/lag-anbefalinger` → exit 0, **0
  konflikter**. Port 2a er ikke i fare av driften.
- Port 1 prod-baseline kjørt og **grønn**: `/health` =
  `ai:true, aiModel:claude-sonnet-5, discord:true, teamId:true, leagues:1`;
  alle 11 ruter 200; `/finnes-ikke` 404; footer `v1.2.0`. Lagret i
  scratchpad som `port1-baseline.txt`.
- Deploy 1 (port 5) pusher eksplisitt SHA `78d438e` og er derfor upåvirket
  av driften.

## Problem 1 — reset-ankeret (hovedspørsmålet)

Planens escape-luke i port 2a/2b er `git reset --hard v1.2.1`. Med dagens
main-tip ville den kastet de 4 upushede docs-commitene (kun gjenopprettbare
via reflog). Det er den ene ekte tapsrisikoen.

To alternativer er allerede lagt fram for Marius i økt 21:

- **A (anbefalt der):** tagg `c33aef1` som `pre-deploy-main` og bruk den
  som reset-mål i stedet for `v1.2.1`. Resten av planen uendret.
  Docs-commitene blir med i v1.2.2-/v1.2.3-releasene.
- **B:** park de 4 docs-commitene på egen branch først, så main-tippen
  faktisk blir `78d438e`. Gir rene releaser, men legger til et steg.

Du står fritt til å foreslå noe bedre. Anbefal ÉN og begrunn kort.

## Problem 2 — konflikt-forventningen i port 2c må måles på nytt

Dette er ikke løst av noen, og det er viktigere enn problem 1.

Port 2c varsler konflikt i `CHANGELOG.md` og har stopp-kriteriet «konflikt i
NOEN annen fil enn CHANGELOG.md → abort og rapporter». Men nå redigerer
**begge sider** `docs/HANDOVER.md`: main via sine 4 docs-commits,
`fix/live-bonus` via sine egne docs-commits (`f55fecb`, `2243062`,
`29ac11f`, `9cf562c`, `dbcf253`). En HANDOVER-konflikt i 2c er dermed
sannsynlig — og med dagens ordlyd ville den utløse full stopp midt i
sammenstillingen.

Du skal: måle den faktiske konfliktflaten (`git merge-tree` er read-only og
lov), og skrive en eksplisitt forventning + oppløsningsoppskrift for hver
fil som faktisk kolliderer, på samme form som CHANGELOG-oppskriften i 2c.
Stopp-kriteriet omformuleres til «konflikt i en fil som IKKE står på denne
lista». Merk at 2b/2d også har release-commits imellom, så mål i riktig
rekkefølge eller si eksplisitt hva som ikke lar seg måle på forhånd.

## Problem 3 — `dbcf253` blir foreldet

Handover-teksten Opus skrev i økt 21 («BLOKKERER DEPLOY», «STOPPET I PORT
0») er sann nå, men blir feil i det planen er patchet. Si hvem som rydder
den og når — trolig i port 10, men det skal stå eksplisitt.

## Rammer

- **Ingen ny funksjonalitet, ingen kodeendring, ingen nye avhengigheter.**
  Dette er utelukkende en plan-patch.
- **Ingen push, ingen merge, ingen tagging** i planøkten. Kun docs-commits
  lokalt på `fix/live-bonus`.
- **0 AI-kall mot appens Anthropic-nøkkel.** B-2-kallet er fortsatt
  Marius' eget klikk i port 6.
- Planens øvrige beslutninger fra 22. aug 01:50 står fast og skal **ikke**
  re-spørres: tre pusher med stopp-punkt mellom hver, egen v1.2.2-tag,
  B-2-kallet i prod etter v1.2.2, uttømmende push-lisens.
- **Tidsport:** vinduet var lørdag 22. aug, hard port 11:30 (siste push
  ~10:45), ellers søndag med port 13:00. Sjekk klokka når du starter og si
  rett ut om lørdagsvinduet fortsatt er realistisk, eller om planen skal
  peke på søndag. Ikke foreslå snarveier for å «rekke det».
- Sklir alt forbi onsdag 26. aug: auto-brief-vinduet åpner torsdag 27. aug
  19:30 (GW2-deadline `2026-08-28T17:30:00Z`) — aldri push torsdag 19–21.

## Spør Marius før du ferdigstiller

Still bare spørsmål du faktisk trenger svar på for å velge. Kandidater:
valget mellom A og B i problem 1, og om lørdag/søndag. Alt annet avgjør du
selv med begrunnelse.

## Leveranse

1. **Patch av `docs/plan-deploy-v122-v123.md`** — samme struktur og
   portnummerering. Øverst i endringen: en kort «Endret 22. aug (økt 22)»-
   blokk som lister nøyaktig hvilke porter som er rørt og hvorfor, slik at
   Opus ser diffen mot planen han allerede har lest. Rør ikke porter som
   ikke trenger endring.
2. **Kort utførelsesprompt til Opus 5** i
   `docs/neste-okt-prompt-deploy-utforelse-v2.md` — samme strenge form som
   forrige: les-rekkefølge, harde regler, uttømmende push-lisens, absolutte
   stopp-punkter, bevis-krav, «Hei Marius!»-tiltale og HANDOVER-loggføring.
   Den skal si eksplisitt at port 0 nå er forventet å passere, og hva den
   nye forventede tilstanden er.
3. **`docs/HANDOVER.md`** oppdatert: Status, «Åpne punkter» (fjern eller
   omskriv BLOKKERER-punktet når planen er patchet) og brukerbeskjed-
   loggen med dato + handling.
4. Alt committet lokalt med conventional commits. **Ingen push.**

Presenter planen for Marius og få den godkjent før du skriver
utførelsesprompten.
