# Hva skjer videre med FPL-dashboardet

> Enkel oversikt for Marius — oppdateres når noe blir ferdig eller planlagt.
> (Tekniske detaljer bor i ROADMAP.md; dette er kortversjonen.)

**Sist oppdatert:** 24. august 2026

## Dette har du nå (v1.2.4, live på fpl.marsk.no)

Dashbord med nedtelling og skader · spillertabell med søk og filter · laget
ditt med kapteinsråd · miniligaen · rundebrief (AI skriver den på norsk) ·
live-poeng mens kampene går · nyheter med AI-oppsummering · auto-brief til
Discord kvelden før hver deadline · «Overganger» som viser om byttene dine
ga eller kostet poeng.

**Nytt siden sist (v1.2.4, 24. august):** **AI-rådgiveren på lagsiden
dikter ikke lenger.** Den får nå alle tallene for hver spiller — form,
ventet poeng, spilte minutter, totalpoeng og skadestatus med spillesjanse —
pluss forslagene siden selv viser deg. Sier den noe annet enn siden, må den
begrunne hvorfor. Har en spiller 0 minutter, skal den si «ingen data ennå»,
ikke «dårlig form». Testet i prod: den skrev nettopp «João Pedro har 0
minutter spilt så langt — dette er ikke nødvendigvis dårlig form, men
mangel på data». Nøyaktig feilen du fant.

Fra før: sesongstarten er ferdig verifisert — alt virket med ekte data.
Live-siden viser bonuspoeng underveis i kampene og skjønner at kampen er
ferdig ved fløyta. Kapteinsrådene på lagsiden gir mening også før noen har
spilt. Kostnaden for AI-en er målt: under 1 dollar i uka.

## Neste oppgave (blir v1.2.5) — plan godkjent 24. august

**Rundebriefen blir ærligere.** Du godkjente planen 24. august, og den
inneholder tre ting: briefen skal ikke kunne skrive «alle er friske» når
dataene viser en skade (og prosenttall den vrir på, lukes bort automatisk),
kapteinslista i briefen får samme sesongstart-fiks som lagsiden fikk, og
lista kalles det den faktisk er — kandidater, ikke «mest valgte kapteiner».
Bygges i en egen økt; ingenting legges ut før du gir klarsignal.

## Deretter, i rekkefølge (nummerert plan, 24. august)

Bare oppdateringer med kodeendring får versjonsnummer. Sjekker og målinger
er «porter» — de skjer når datoen eller du er klar, uten å stoppe utviklingen.

- ~~**v1.2.4** — AI-rådgiveren slutter å dikte.~~ **Ferdig 24. august.**
- **Port: sjekke «Overganger» med ekte tall** når du har gjort ditt første
  bytte (etter runde 2, ca. 29.–31. august).
- **Port: prissjekk etter 1. september** — AI-prisen går opp 50 %, så vi
  måler på nytt at det fortsatt er billig (dagens bruk vil koste ca.
  1,50 dollar/uka).
- **v1.2.5** — rundebriefen blir ærligere (oppgaven over).
- **v1.3.0** — ny drakt på hele siden (stort løft): FPL-følelse med
  klubblogoer og drakter, og valg mellom mørkt og lyst tema. **Du bekreftet
  24. august at du vil ha den** — den bygges etter v1.2.5.
- **v1.3.1 og utover** — små robusthetsfikser fra kvalitetsgjennomgangen,
  én og én etter avtale.

## Ting bare du kan gjøre

- Sjekke i Discord-kanalen at auto-briefen faktisk kom torsdag 20. august
  ~19:30 (loggen på serveren er borte, så kanalen er beviset).
- Se appen på telefonen din og si fra om noe ser rart ut.
- Skjermbilder til README (når du har tid — helt uviktig for driften).

## Idéer på vent (ikke planlagt, sniker ikke i køen)

- AI som kommenterer overgangsanalysen din («godt bytte, dårlig timing …»)
- Varsel når spillerprisene endrer seg
- E-postvarsling som alternativ til Discord
