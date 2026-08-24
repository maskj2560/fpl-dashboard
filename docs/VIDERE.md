# Hva skjer videre med FPL-dashboardet

> Enkel oversikt for Marius — oppdateres når noe blir ferdig eller planlagt.
> (Tekniske detaljer bor i ROADMAP.md; dette er kortversjonen.)

**Sist oppdatert:** 24. august 2026

## Dette har du nå (v1.3.1, live på fpl.marsk.no)

Dashbord med nedtelling og skader · spillertabell med søk og filter · laget
ditt med kapteinsråd · miniligaen · rundebrief (AI skriver den på norsk) ·
live-poeng mens kampene går · nyheter med AI-oppsummering · auto-brief til
Discord kvelden før hver deadline · «Overganger» som viser om byttene dine
ga eller kostet poeng.

**Nytt siden sist (v1.3.1, 24. august): klubbmerker og drakter.** Merket
til klubben står nå ved siden av spilleren i alle tabeller og lister, og
på lagsiden har spillerne på banen fått klubbdrakta si — keeperen sin
egen keeperdrakt, akkurat som på FPL. Bildene ligger på vår egen server,
så de laster raskt og forsvinner ikke om FPL flytter på noe; mangler et
bilde, vises kortnavnet som før. Footeren krediterer klubbene og Premier
League. Dette er bit 2 av 4.

Fra før (v1.3.0): **ny drakt på siden — og du kan velge lyst eller mørkt
tema.** Knappen helt til høyre i toppmenyen sykler mellom automatisk
(følger telefonen/PC-en), lyst og mørkt, og husker valget ditt. Fargene
er FPLs egne: lilla toppmeny, grønn som handlingsfarge, cyan på alt AI-en
har skrevet, og FPLs nøyaktige fargeskala på kampvanskelighet.

Fra før (v1.2.5): **rundebriefen er blitt ærligere.**
Tre ting: (1) den kan ikke lenger skrive «alle stiller friske» når skadelista
har navn på seg — slike setninger lukes automatisk bort før du ser dem, og
det samme gjelder prosenttall den har vridd på (den skrev en gang 32,3 % der
dataene sa 32,6 %). (2) Kapteinslista i briefen er ikke lenger tilfeldig før
sesongstart: er formtallene 0 for alle, rangeres den på forventet poeng, akkurat
som lagsiden allerede gjorde. (3) Lista kalles nå «kapteinskandidater» — for det
er det den er. FPL publiserer ingen tall på hvem folk faktisk setter kaptein, og
briefen skrev tidligere «de mest brukte kapteinsvalgene globalt» som om den
visste det.

Fra før (v1.2.4): AI-rådgiveren på lagsiden dikter ikke lenger. Den får alle
tallene for hver spiller og må begrunne seg hvis den sier noe annet enn siden.
Har en spiller 0 minutter, sier den «ingen data ennå», ikke «dårlig form».

Fra før: sesongstarten er ferdig verifisert — alt virket med ekte data.
Live-siden viser bonuspoeng underveis i kampene og skjønner at kampen er
ferdig ved fløyta. Kapteinsrådene på lagsiden gir mening også før noen har
spilt. Kostnaden for AI-en er målt: under 1 dollar i uka.

## Neste oppgave — ny drakt på hele siden, i fire etapper

**Planen er godkjent (24. august), og du kan se resultatet før noe bygges:**
https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849
(klikk deg rundt: dashbord, spillere, lag, brief — knappen øverst til
høyre bytter mellom automatisk, lyst og mørkt tema, og «390 px» nederst
viser mobilbredden).

Det bygges i fire biter, og hver bit legges ut for seg når du sier fra —
siden er aldri halvferdig:

1. ~~**v1.3.0 — nye farger og temavalg.**~~ **Ferdig og ute 24. august.**
   FPL-lilla toppmeny, FPLs grønne og cyan som aksenter, og en knapp som
   bytter mellom automatisk/lyst/mørkt og husker valget ditt.
2. ~~**v1.3.1 — klubbmerker og drakter.**~~ **Ferdig og ute 24. august.**
   Merker i alle tabeller og lister, drakter på banen på lagsiden
   (keeperen får keeperdrakt). Bildene ligger på vår egen server;
   mangler et bilde, vises kortnavnet.
3. **v1.3.2 — finpuss.** **Bygget ferdig 24. august — venter på at du
   sier fra før den legges ut.** Rundeetiketten i nedtellingen, kampliste med
   klokkeslett i briefen, tydeligere feilsider, mobilpuss. Etterpå én
   AI-visning av briefen i prod for å se at teksten sitter i det nye
   designet (eneste AI-kall i hele løpet).
4. **v1.3.3 — rettelser** fra din egen gjennomgang i nettleser og på
   telefon.

## Deretter, i rekkefølge (nummerert plan, 24. august)

Bare oppdateringer med kodeendring får versjonsnummer. Sjekker og målinger
er «porter» — de skjer når datoen eller du er klar, uten å stoppe utviklingen.

- ~~**v1.2.4** — AI-rådgiveren slutter å dikte.~~ **Ferdig 24. august.**
- **Port: sjekke «Overganger» med ekte tall** når du har gjort ditt første
  bytte (etter runde 2, ca. 29.–31. august).
- **Port: prissjekk etter 1. september** — AI-prisen går opp 50 %, så vi
  måler på nytt at det fortsatt er billig (dagens bruk vil koste ca.
  1,50 dollar/uka).
- ~~**v1.2.5** — rundebriefen blir ærligere.~~ **Ferdig 24. august.**
- ~~**v1.3.0** — nye farger og temavalg.~~ **Ferdig 24. august.**
- ~~**v1.3.1** — klubbmerker og drakter.~~ **Ferdig 24. august.**
- **v1.3.2** — finpuss på alle sider. **Bygget 24. august, klar til
  utlegging når du sier fra.**
- **v1.3.3** — rettelser fra din gjennomgang.
- **v1.3.4 og utover** — små robusthetsfikser fra kvalitetsgjennomgangen,
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
