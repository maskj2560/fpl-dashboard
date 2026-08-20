# Hva skjer videre med FPL-dashboardet

> Enkel oversikt for Marius — oppdateres når noe blir ferdig eller planlagt.
> (Tekniske detaljer bor i ROADMAP.md; dette er kortversjonen.)

**Sist oppdatert:** 20. august 2026

## Dette har du nå (v1.2.0, live på fpl.marsk.no)

Dashbord med nedtelling og skader · spillertabell med søk og filter · laget
ditt med kapteinsråd · miniligaen · rundebrief (AI skriver den på norsk) ·
live-poeng mens kampene går · nyheter med AI-oppsummering · auto-brief til
Discord kvelden før hver deadline · **NY: «Overganger»** — viser om byttene
dine faktisk ga eller kostet poeng (fylles når du gjør ditt første bytte).

## Denne helgen: sesongstarten overvåkes 🏁

Sesongen starter fredag 19:30. En egen økt sjekker at alt virker med ekte
data — du pinger den ved hvert sjekkpunkt:

| Når | Hva du gjør |
| --- | --- |
| Torsdag ~19:45 | Sjekk at auto-briefen kom i Discord, lim den inn i økten |
| Fredag ~20:30 | Se at sidene fylles med ekte data; klikk «Spør AI om råd» ÉN gang |
| Lørdag (kampene) | Økten sjekker live-siden selv |
| Søndag/mandag | Kostnadssjekk + mobilsjekk + oppsummering |

**Viktig: ingen oppdateringer av appen torsdag 19–21** (da sendes auto-briefen).

## Neste oppgave (prompt ligger klar)

**Roligere håndtering når FPL-serveren er nede.** I dag maser appen på FPL
hele tiden hvis FPL har trøbbel; etter fiksen venter den litt mellom hvert
forsøk og viser bare det den husker fra sist. Du merker ingenting i hverdagen
— det er en robusthetsfiks.

→ Prompten: `docs/neste-okt-prompt-cache-backoff.md`
(Fable planlegger → du godkjenner → Fable gir deg en kort prompt → Opus 5
bygger. Merges først ETTER helge-sjekkene.)

## Venter på ekte data (etter runde 2)

- Sjekke at «Overganger»-siden regner riktig når du har gjort ditt første
  bytte, og at den ser bra ut på mobilen.

## Ting bare du kan gjøre

- Se appen på telefonen din og si fra om noe ser rart ut.
- Skjermbilder til README (når du har tid — helt uviktig for driften).

## Idéer på vent (ikke planlagt, sniker ikke i køen)

- AI som kommenterer overgangsanalysen din («godt bytte, dårlig timing …»)
- Varsel når spillerprisene endrer seg
- E-postvarsling som alternativ til Discord
- Diverse små robusthetsfikser fra kvalitetsgjennomgangen (tas én og én,
  etter avtale)
