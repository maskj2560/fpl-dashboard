# Doks-opprydning + veikart-revisjon — utførbar ryddeplan

> Planlagt av Fable 5 i plan mode, godkjent av Marius 23. august 2026 (natt).
> Utføres i samme økt. Kun dokumentasjon — ingen produksjonskode, 0 AI-kall,
> ingen besøk på `/brief`/`/nyheter` i prod.

**Mål:** `docs/`-rot fra 30 til 7 filer; utførte planer til `docs/arkiv/`;
konsumerte økt-prompter slettet; ROADMAP omskrevet med prioritert kø øverst;
HANDOVER slanket til ≤200 linjer.

## Verifiserte fakta (målt 23. aug ~01:30, ikke gjenverifiser)

- Rent tre, `main` = `origin/main` (tip `28506aa`). Prod: v1.2.3.
- 33 md-filer under `docs/**`, 11 119 linjer (`wc -l`). Promptens «30 filer /
  6 901 linjer» ekskluderte `docs/arkiv/` (1 fil) og `docs/superpowers/plans/`
  (2 filer); HANDOVER har dessuten vokst 706 → 720 linjer i økt 23.
- `npm test` 250/250, `npm run lint` exit 0 (kjørt i planøkten).
- Referanser utenfor filene som røres: kun `ROADMAP.md` (6 stier til
  `docs/plan-*`). README/DEPLOY/CHANGELOG refererer ingenting som flyttes.
- Interne referanser som må rettes: `docs/sjekkpunkt-c-live.md:224`
  (peker på `docs/plan-deploy-v122-v123.md` som arkiveres) og
  `docs/sjekkpunkt-d-kostnad.md:3` (peker på
  `docs/neste-okt-prompt-sesongstart.md` som slettes).
- Kampvinduer: søndag 23. aug 15:00 + 17:30 (slutt ~19:20), mandag 21:00.
  Docs-push ellers er trygg (harmløs rebuild av samme kode).

## Marius' beslutninger (23. aug — IKKE re-spør)

1. Konsumerte prompter **slettes** (git bevarer dem); utførte planer
   **arkiveres** til `docs/arkiv/`.
2. Målstruktur: **7 filer i docs/-rot** (se under) + `docs/arkiv/`.
3. ROADMAP-køen: **promptstruktur-fiksen på /lag øverst**, deretter
   datoblokkede verifiseringer, brief-kvalitetstrioen, UI-overhaling v1.3.0.
4. HANDOVER-tak: **200 linjer**; historikk roteres til
   `docs/arkiv/HANDOVER-historikk.md`.

## Skillet historikk / bruksanvisning

- **Bruksanvisning** (leses av nye økter, må være kort og oppdatert):
  HANDOVER, ROADMAP, VIDERE, sjekkpunkt-d-kostnad (aktiv metode),
  port9-chrome-prompt (gjenbrukbar oppskrift), prompt-ui-overhaul-plan
  (ukjørt, venter på kø-beslutning).
- **Historikk** (git har alt; arkivet holder det som faktisk slås opp):
  utførte planer — de bærer beslutningsbegrunnelser og avviksnotater, og
  `plan-cache-backoff.md`/`plan-sanitize-brief.md` er malen for nye planer.
  Konsumerte økt-prompter bærer ingenting en ny økt trenger → slettes.

## Klassifisering — alle 33 filer

### SLETT (19 økt-prompter, ~2 400 linjer)

Engangs-instruksjoner for gjennomførte økter; resultatene er dokumentert i
HANDOVER/CHANGELOG/ROADMAP og git.

| Fil | Linjer | Begrunnelse |
| --- | --- | --- |
| neste-okt-prompt.md | 294 | planleggingsbrief v1.0.1–v1.1.0 — utført |
| neste-okt-prompt-utforelse.md | 125 | utførelsesbrief samme milepæl — utført |
| neste-okt-prompt-qa-v111.md | 62 | QA-retteøkt v1.1.1 — utført |
| neste-okt-prompt-deploy-v111.md | 161 | deploy-økt v1.1.1 — utført |
| neste-okt-prompt-sesongstart.md | 124 | sjekkpunkt A–D lukket; restpunktene lever i sjekkpunkt-d-kostnad + ROADMAP-køen |
| neste-okt-prompt-kvalitetspass.md | 426 | v1.1.3 utført; P3-restene står i ROADMAP |
| neste-okt-prompt-hva-hvis-transfers.md | 243 | v1.2.0 utført; planen arkiveres |
| neste-okt-prompt-cache-backoff.md | 98 | planleggingsbrief P3-2 — utført |
| neste-okt-prompt-cache-backoff-utforelse.md | 22 | utførelsesbrief P3-2 — utført |
| neste-okt-prompt-sanitize-brief.md | 133 | planleggingsbrief P3-4 — utført |
| neste-okt-prompt-sanitize-brief-utforelse.md | 21 | utførelsesbrief P3-4 — utført |
| neste-okt-prompt-lag-anbefalinger-utforelse.md | 30 | utførelsesbrief v1.2.2 — utført |
| arkiv/neste-okt-prompt-lag-anbefalinger.md | 181 | planleggingsbrief v1.2.2 — samme kategori, samme skjebne |
| neste-okt-prompt-live-bonus-utforelse.md | 31 | utførelsesbrief v1.2.3 — utført |
| neste-okt-prompt-deploy-v122-v123.md | 264 | planleggingsbrief deploy — utført |
| neste-okt-prompt-deploy-utforelse.md | 40 | v1 med UTDATERT-banner — erstattet av v2, begge utført |
| neste-okt-prompt-deploy-utforelse-v2.md | 56 | utførelsesbrief v2 — deploy fullført port 0–10 |
| neste-okt-prompt-port0-avvik.md | 135 | plan-patch-oppdrag — utført |
| neste-okt-prompt-doks-opprydning.md | 210 | denne øktens prompt — konsumert av denne planen |

### ARKIVER til `docs/arkiv/` (8 utførte planer, ~6 800 linjer)

| Fil | Linjer | Begrunnelse |
| --- | --- | --- |
| plan-hva-hvis-transfers.md | 1068 | v1.2.0 utført; «Etter GW2»-sjekklista eies nå av ROADMAP-køen (punkt 4) |
| plan-cache-backoff.md | 399 | v1.2.1 utført; mal for planformatet |
| plan-sanitize-brief.md | 586 | P3-4 utført; mal for planformatet |
| plan-lag-anbefalinger.md | 189 | v1.2.2 utført |
| plan-live-bonus.md | 198 | v1.2.3 utført |
| plan-deploy-v122-v123.md | 371 | deploy utført port 0–10; rollback-oppskriften er tag-spesifikk og gjenskapes per deploy |
| superpowers/plans/2026-08-19-fpl-dashboard-v02-v10.md | 2565 | v0.2–v1.0 utført; avviksnotatene har historisk verdi |
| superpowers/plans/2026-08-19-fpl-v101-v110-verifisering-og-ui-makeover.md | 1429 | v1.0.1–v1.1.0 utført; samme |

Tom `docs/superpowers/` slettes.

### BEHOLD i `docs/`-rot

| Fil | Eier hva |
| --- | --- |
| HANDOVER.md (720 → ≤200) | nåtilstand, åpne punkter, lærdommer, beslutninger, logg siste økter |
| VIDERE.md (omskrives) | Marius' ikke-tekniske kortversjon |
| sjekkpunkt-c-live.md | bevismateriale v1.2.3/port 9 — referert fra ROADMAP |
| sjekkpunkt-d-kostnad.md | aktiv metode + skript for kostnadsmåling uken etter 31. aug |
| port9-chrome-prompt.md | gjenbrukbar oppskrift for nettleserobservasjon |
| prompt-ui-overhaul-plan.md | ukjørt planleggingsprompt — venter på v1.3.0-beslutningen |
| plan-doks-opprydning.md | denne planen (arkiveres når en senere økt rydder neste gang) |

**Hvor en ny økt begynner å lese:** `docs/HANDOVER.md` → `ROADMAP.md`
(køen øverst) → resten ved behov. Grensen er satt slik at hver fil i rot har
én eier og én grunn til å bli lest; alt uten leserverdi for en ny økt er i
arkiv eller git.

## Steg (ett steg = én commit; `npm test` 250/250 + `npm run lint` 0 før hver)

- [x] **Steg 1:** `docs: ryddeplan for docs-mappen` — denne fila.
      Stopp: test/lint grønt.
- [x] **Steg 2:** `docs: arkiver utforte planer` —
      `git mv docs/plan-{hva-hvis-transfers,cache-backoff,sanitize-brief,lag-anbefalinger,live-bonus,deploy-v122-v123}.md docs/arkiv/`,
      `git mv docs/superpowers/plans/*.md docs/arkiv/`, fjern tom
      `docs/superpowers/`, rett stien i `sjekkpunkt-c-live.md:224`.
      Stopp: `git status` viser kun renames + én endret fil.
- [x] **Steg 3:** `docs: slett konsumerte okt-prompter` — `git rm` de 19
      promptene, rett innledningen i `sjekkpunkt-d-kostnad.md`.
      Stopp: `docs/*.md` = nøyaktig 7 filer.
- [x] **Steg 4:** `docs: ROADMAP omskrevet - prioritert ko forst, historikk bak`.
      Stopp: 8 køpunkter til stede; `grep "docs/plan-" ROADMAP.md` treffer
      kun `docs/arkiv/`-stier.
- [x] **Steg 5:** `docs: HANDOVER slanket til 200 linjer, historikk arkivert` —
      omskrevet HANDOVER + ny `docs/arkiv/HANDOVER-historikk.md` (avsluttede
      status-blokker, sjekkpunkt-tabellen, versjonshistorikken, gammel logg —
      verbatim). Stopp: `wc -l docs/HANDOVER.md` ≤ 200.
- [x] **Steg 6:** `docs: VIDERE og CLAUDE.md oppdatert etter opprydningen` —
      VIDERE på v1.2.3 + køen i klarspråk; CLAUDE.md «Handover»-avsnittet får
      linjetak + arkiv-rotering.
- [x] **Steg 7:** `git push origin main` — utført natt til søndag 23. aug
      ~01:50 (ingen kamper; første avspark 15:00). Prod verifisert med `/`
      og `/health` — ALDRI `/brief`/`/nyheter` (AI-kall).
      Ekstra i denne committen: to referanse-fikser fanget av grep-sjekken
      (`prompt-ui-overhaul-plan.md:12` og `sjekkpunkt-c-live.md:215` pekte
      fortsatt på gamle plan-stier).

## Verifisering (oppsummert)

| Punkt | Kommando | Forventet |
| --- | --- | --- |
| Test/lint før hver commit | `npm test` + `npm run lint` | 250/250, exit 0 |
| Rot-telling etter steg 3 | `ls docs/*.md` | 7 filer |
| Arkiv-telling etter steg 5 | `ls docs/arkiv/*.md` | 9 filer |
| HANDOVER-tak | `wc -l docs/HANDOVER.md` | ≤ 200 |
| Døde referanser | `grep -rn "neste-okt-prompt\|docs/plan-\|superpowers" --include=*.md .` | kun arkiv-stier, denne planen, eller treff inne i arkiverte filer |
| Prod etter push | `curl -s https://fpl.marsk.no/ \| grep -o "v1\.2\.[0-9]"` | v1.2.3 |
