# Plan — idépakken: 16 nye funksjoner fordelt på v1.6.0–v1.9.0 (27. aug 2026)

## Context

Marius ba om idéliste for nye funksjoner og valgte ALLE 16 foreslåtte.
Alle nøkkelvalg er besluttet gjennom fire spørsmålsrunder 27. aug (se
Beslutninger). Denne planen er dekomponering + beslutningsfasit: hver
versjon får sin egen detaljplan-økt (T-tasks, TDD) før bygging, akkurat
som v1.5.0 fikk. Ekstra-idéene som IKKE ble valgt (prisvarsler, BPS-race,
FPL-karrieren, badges, PWA) ligger i ROADMAP «Senere / idéer».

## Beslutninger (Marius, 27. aug — fasit, ikke spør igjen)

1. **Rival-radar**: velgbar i UI (dropdown, alle i ligaen), auto-forslag =
   nærmeste over; valget huskes i nettleseren (localStorage).
2. **Miniliga-historikk**: hele ligaen i grafen. Rank per runde
   rekonstrueres fra `entry/{id}/history` (1 kall per manager, cachet 6 t)
   — ingen snapshots i DATA_DIR nødvendig.
3. **Ligarapport**: tone «roast med glimt» — erter taperen, skåler for
   vinneren, holder seg til ekte tall.
4. **Kaptein-liga**: hele ligaen, sist spilte runde + sesongakkumulering
   etter hvert som runder spilles (picks per manager, 6 t cache på ferdige).
5. **Benkesløsing** → /innsikt.
6. **Kapteinsfasit**: måles mot BEGGE — optimal i egen tropp OG global
   favoritt. To kolonner, treffprosent mot begge. → /innsikt.
7. **Chip-planlegger**: regelbasert anbefaling («Beste BB-vindu: runde
   26–29») fra fixture-tetthet, FDR, DGW/BGW-deteksjon. 0 AI-kall.
8. **Flaksbarometer**: xG/xA-basert (expected-tall per spiller per runde
   fra live-data) mot faktiske poeng. → /innsikt.
9. **Spillerduell**: avkrysning på rader i /spillere + «Sammenlign»-knapp,
   duellvisning på samme side. Ingen ny side.
10. **Spillerkort**: modal-kort ved klikk på spillernavn, lukkes ×/Esc,
    lazy-hentes fra nytt API-endepunkt.
11. **Differensial-finner**: < 10 % global eierandel, rangert form ×
    fixtures, terskel justerbar i UI (5/10/15 %).
12. **Straffeoversikt**: seksjon på /spillere — 20 klubber, første
    straffetaker + neste i køen (`penalties_order`), med draktbilde.
13. **Deadline-sjekk**: kjøres 3 t før deadline, Discord-melding KUN ved
    funn (skadet/suspendert i XI, flagget kaptein, m.m.). 0 AI-kall.
14. **Runde-/ligarapport**: SLÅTT SAMMEN til én Discord-melding etter
    rundeslutt — din runde + ligaen, roast med glimt. 1 AI-kall/uke totalt.
15. **Rundens XI**: FPLs dream team vs ditt lag. → /innsikt.
16. **Kalender-feed**: /kalender.ics med alle GW-deadlines + kampene til
    spillerne i DIN tropp.
- **Byggerekkefølge**: Liga-pakka først (Marius' valg), deretter innsikt →
  spillere → planlegging (anbefalt rekkefølge, kan stokkes ved
  planlegging av hver versjon).

## Versjonsinndeling

### v1.6.0 «Liga-pakka» (FØRST)
Rival-radar (1), miniliga-historikk-graf (2), kaptein-liga (4), samlet
runde-/ligarapport til Discord + webvisning (3+14). Alt bor på /liga.
- Nye data: `entry/{id}/history` for alle ligamedlemmer (getEntryHistory
  finnes — trenger flertall + cache-gjennomgang), picks per manager per
  runde (getPicksHistoric fra v1.5.0 gjenbrukes), liga-standings (finnes).
- Ny service: `league-insights.js` (ren analyse) + rapportgenerator i
  prompts.js/notify.js-mønsteret. Rapport-trigger: scheduler i notify.js
  når bootstrap sier runden er `finished`/`data_checked`.
- AI: +1 kall/uke (samlet rapport). Roast med glimt + REGLER-blokk
  (kun ekte tall, navngitte managere fra standings).
- Kall-budsjett: N managere × (1 history + 1 picks per ny runde), cachet
  6 t — for en 10-mannsliga ~20 kall per nye runde, 0 ved varm cache.

### v1.7.0 «/innsikt»
Ny side med fire seksjoner: benkesløsing (5), kapteinsfasit (6),
flaksbarometer (8), rundens XI (15).
- Gjenbruk: baseline.js-simulatoren (autosub/formasjon) fra v1.5.0 for
  benkesløsing; getPicksHistoric; liveByGw har xG-stats per spiller per
  runde (`expected_goals`/`expected_assists` i event-live siden 22/23).
- Nye data: `dream-team/{gw}/` (nytt fplClient-endepunkt, 6 t cache på
  ferdige runder).
- Ny service: `insights.js` (rene funksjoner per seksjon).

### v1.8.0 «Spiller-pakka»
Spillerkort-modal (10), spillerduell på /spillere (9),
differensial-finner (11), straffeoversikt (12).
- Nye data: `element-summary/{id}` for spillerkortets rundehistorikk —
  KUN lazy ved klikk, aldri i bulk (regelen fra v1.5.0 står: bulk-analyse
  bruker aldri element-summary). Nytt API-endepunkt /api/spiller/:id.
  `penalties_order`/`corners_and_indirect_freekicks_order` fra bootstrap.
- Duell + differensialer bygges fra bootstrap alene (0 nye kall).

### v1.9.0 «Planleggingspakka»
Chip-planlegger (7), deadline-sjekk 3 t før (13), kalender-feed (16).
- Chip-planlegger: ren funksjon over fixtures (tetthet per lag, DGW/BGW =
  lag med 2/0 kamper i en runde) + FDR — bor på /lag eller /brief
  (avgjøres i detaljplanen).
- Deadline-sjekk: ny timer i notify.js (deadline − 3 t), sjekker picks
  mot bootstrap-status, poster kun ved funn.
- Kalender: /kalender.ics — ren generator (RFC 5545, VTIMEZONE
  Europe/Oslo), deadlines + fixtures for lagene i troppen.

## Rammer (gjelder alle fire versjonene)

- Bygging starter ETTER P4-mergen (7. sept+): v1.3.8 → v1.4.0 → v1.5.0
  merges først, så ny branch per versjon fra main. Ingen 4. etasje på
  dagens branch-stabel.
- Hver versjon: egen planøkt med T-tasks → TDD (RED→GREEN) → røyktest med
  tomme nøkler → Marius tester → merge + tag + push. CHANGELOG under
  [Unreleased] løpende.
- Nettverk kun i fplClient.js. Sidevisning blokkerer aldri på AI og
  utløser aldri AI-kall. Norsk UI, tema-tokens (begge blokker),
  kontrastkrav, 390 px referanse, klubbgrafikk via partials.
- AI-budsjett etter alle fire: dagens ~48–52 + 1 (samlet rapport)
  ≈ 49–53 kall/uke. Ingen andre nye AI-kall.

## Status

- 27. aug: plan godkjent av Marius. Ren beslutningsfasit — ingen kode
  bygget ennå. v1.6.0 får egen detaljplan-økt før bygging.
