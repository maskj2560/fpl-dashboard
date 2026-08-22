# Prompt til Fable (plan mode): doks-opprydning + full veikart-revisjon

Skrevet 23. august 2026 av Opus 5, rett etter at deploy-planen (port 0–10)
ble ferdig utført og v1.2.3 gikk i prod. Kopier blokken under inn i en ny
Fable-økt i plan mode.

Inventeringen i prompten er målt, ikke antatt — `wc -l` over `docs/` og
`docs/arkiv/` 23. august kl. 01:30.

## Prompten

````
# Oppdrag (Fable, plan mode): rydd dokumentasjonen og skriv veikartet ferdig

Du skal PLANLEGGE og SKRIVE DOKUMENTASJON. Ingen linje produksjonskode skal
endres i denne økten. Leveransen er én ryddeplan, et omskrevet ROADMAP.md og
oppdaterte levende dokumenter.

## Les først, i denne rekkefølgen — hele filer, ikke utdrag

1. `docs/HANDOVER.md` (706 linjer) — nåtilstand, aktive økter, driftslærdommer
2. `CLAUDE.md` — prosjektets regler. Gjelder foran denne prompten.
3. `~/.claude/CLAUDE.md` — mine globale regler. Gjelder foran alt.
4. `ROADMAP.md` — hele fila, særlig «Senere / idéer»
5. `CHANGELOG.md` — hva som faktisk er sluppet, v1.0.0 til v1.2.3
6. **Alle 30 filene under `docs/` og `docs/arkiv/`.** Dette er hovedjobben —
   du kan ikke foreslå en sammenslåing uten å ha lest det du slår sammen.
   Les også kildekoden i `src/` grovt, slik at veikartet ditt refererer til
   ekte moduler og ekte funksjonsnavn.

## Målt tilstand — ikke bruk tid på å måle dette på nytt

Prod kjører **v1.2.3** på https://fpl.marsk.no. Deploy-planen
`docs/plan-deploy-v122-v123.md` ble ferdig utført 22.–23. august, port 0–10,
og sjekkpunkt C er lukket. `main` = `origin/main`, rent tre, 250 tester
grønne, lint 0.

`docs/` inneholder **30 markdown-filer, til sammen 6 901 linjer**:

| Kategori | Antall | Merknad |
| --- | --- | --- |
| `neste-okt-prompt-*.md` | **18** | økt-overleveringer. Hovedproblemet. |
| `plan-*.md` | 6 | utførelsesplaner, alle utført |
| `sjekkpunkt-*.md` | 2 | c-live (377 l), d-kostnad (228 l) |
| Levende | 2 | `HANDOVER.md` (706 l), `VIDERE.md` (57 l) |
| Øvrig | 2 | `prompt-ui-overhaul-plan.md`, `port9-chrome-prompt.md` |

De fem største: `plan-hva-hvis-transfers.md` (1068), `HANDOVER.md` (706),
`plan-sanitize-brief.md` (586), `neste-okt-prompt-kvalitetspass.md` (426),
`plan-cache-backoff.md` (399).

**Mønsteret som skapte rotet:** hver funksjon fikk to prompt-filer — én
planleggingsbrief (`neste-okt-prompt-X.md`) og én utførelsesbrief
(`neste-okt-prompt-X-utforelse.md`) — pluss en `plan-X.md`. Tre filer per
funksjon. Når funksjonen er sluppet, har de to promptene ingen leserverdi
igjen; planen har historisk verdi. `docs/arkiv/` finnes allerede, men brukes
bare til én fil.

## Leveranse — tre ting

### 1. `docs/plan-doks-opprydning.md`

En utførbar ryddeplan i samme form som `docs/plan-cache-backoff.md` og
`docs/plan-sanitize-brief.md` (de er malen): «Verifiserte fakta», så steg for
steg med eksakte kommandoer og et stopp-kriterium per steg.

Krav til planen:

- **Klassifiser hver av de 30 filene** i en tabell: behold som den er /
  slå sammen inn i X / flytt til `docs/arkiv/` / slett. Én linje med
  begrunnelse per fil. Ingen fil får stå uklassifisert.
- **Foreslå målstrukturen konkret** — hvilke filer skal finnes etterpå, hva
  hver enkelt eier, og hvor en ny økt skal begynne å lese. Færre filer er
  målet, men ikke én diger fil: en samlefil ingen orker å lese er samme
  problem i ny innpakning. Begrunn hvor du setter grensene.
- **Skill hardt mellom «historikk» og «bruksanvisning».** Utførte planer er
  historikk — git har dem uansett, så arkiv eller sletting er begge greit,
  men velg bevisst og si hvorfor. Det som fortsatt skal LESES av en ny økt
  er bruksanvisning og må være kort og oppdatert.
- **`HANDOVER.md` er i scope.** 706 linjer lastes inn ved hver ny økt, og
  CLAUDE.md sier at fila skal holde «kun nåtilstand, aktive økter og
  lærdommer». Foreslå hvordan den holdes under et tak — for eksempel ved at
  avsluttede økter flyttes til en historikkfil. Sett et konkret linjetak.
- **Bevar det som faktisk gjenbrukes.** `docs/port9-chrome-prompt.md` er en
  gjenbrukbar oppskrift for nettleserobservasjon, og sjekkpunkt-filene er
  bevismateriale det er referert til fra ROADMAP. Ikke kast dem uten grunn.
- **Ett steg = én commit.** Planen skal si nøyaktig hvilke commits som lages,
  i hvilken rekkefølge, med conventional-commit-meldinger.

### 2. `ROADMAP.md` — omskrevet til å ha full framoversikt

I dag er ROADMAP en historikk over utførte milepæler med en «Senere /
idéer»-hale. Marius vil at den skal svare på ett spørsmål umiddelbart:
**hva er neste funksjon, og hva kommer etter den?**

Krav:

- Behold den utførte historikken (den er verdifull), men flytt den bak, og
  legg en **prioritert kø** øverst med det som gjenstår.
- **Køen skal være komplett.** Alt som er nevnt under skal ha en plass, med
  en anslått størrelse og en begrunnet plassering i rekkefølgen. Nye idéer du
  selv får, går under «Senere / idéer» — de sniker ikke i køen.
- Hvert køpunkt skal ha: hva det er, hvorfor det står der det står, hvilken
  fil som eier detaljene (eller «plan mangler»), og hva som blokkerer det.

**Kjente punkter som SKAL med — hentet fra ROADMAP, HANDOVER og økten
22.–23. august:**

*Kjente feil og kvalitet:*

1. **AI-rådgiverens promptstruktur på /lag.** Funnet 22. august fra
   B-2-kallet i prod. `routes/api.js:86-88` sender kun navn, lag, posisjon,
   pris, **form** og motstander per spiller. Verken `minutes`,
   `total_points`, `ep_next`, skadestatus eller antall spilte runder følger
   med, så modellen kan ikke skille «ingen data» fra «dårlig form» og dikter
   opp begrunnelser — den skrev «Haaland … formscore 0.0 (kun én runde
   spilt)» om en spiller med `minutes: 0`. Utilsiktet sideeffekt av v1.2.2:
   UI-et rangerer nå på `ep_next` når ingen har form, mens prompten fortsatt
   kun får `form` — siden og rådgiveren resonnerer altså fra ulike signaler.
   Rådgiveren har heller ingen etterkontroll tilsvarende `sanitizeBriefText`.
   Full analyse i ROADMAP «Senere / idéer». **Marius har pekt på denne som
   den han vil ha fikset — vurder den høyt i køen.**
2. De øvrige v1.2.0-kandidatene under «Senere / idéer»: AI-briefen kan motsi
   datagrunnlaget, kapteinslista ved sesongstart, «Mest aktuelle kapteiner
   globalt»-etiketten, `gameUpdating`-livssyklus, alderstak på stale data +
   `dataAlder` (rest av P3-2), SWR i `ai.js`, `filterSummaryPoints`-dybde,
   persistent «brief sendt»-markør.

*Ny funksjonalitet:*

3. **UI-overhaling v1.3.0.** `docs/prompt-ui-overhaul-plan.md` er en
   planleggingsprompt som aldri ble kjørt — ingen plan er skrevet ennå.
   Avklar i køen om den fortsatt er ønsket, og hva den i så fall koster.
4. «Andre idéer»: AI-kommentar til overgangsanalysen, prisendrings-varsler,
   e-postvarsling som alternativ til Discord.

*Verifisering og drift:*

5. **Kostnadskontroll på nytt i uken etter 31. august.** Sonnet 5 kjører
   introduksjonspris ($2/$10 per 1M) til og med 31. august; fra 1. september
   er den $3/$15. Målingen 23. august ga $0,94/uke — under terskelen, men
   samme bruk koster $1,48/uke etter prisendringen. Metode og verktøy ligger
   i `docs/sjekkpunkt-d-kostnad.md`.
6. **Auto-brief 20. august ~19:30 verifiseres** — eneste gjenstående punkt
   fra sjekkpunkt A. Coolify-loggen er overskrevet, så Discord-kanalen er
   beviset. `[Marius]`
7. **README-skjermbilder** og **mobil-QA på ekte telefon** — Del 6 i
   sesongstart-verifiseringen. `[Marius]`
8. **Etter GW2: verifiser transfers-skjemaet mot ekte data** (ROADMAP-punkt).

*Lærdom som skal skrives ned et sted den blir lest:*

9. **Loggen kan ikke gi per-funksjon-kostnad i etterkant** — Coolify har
   100-linjers vindu og containeren restartes ved hver deploy. Skal
   fordelingen måles, må `AI-kall:`-linjene samles løpende.
10. **Prod-rutesveip koster penger.** `GET /brief` kaller `generateAiBrief()`
    ved hvert besøk, og `/nyheter` genererer tilsvarende. Deploy-planen
    forbød AI-kall og foreskrev samtidig sveip over de rutene — anslagsvis 6
    betalte kall, ~$0,07. Framtidige deploy-planer må enten utelate `/brief`
    og `/nyheter` fra prod-sveipet eller budsjettere for dem.
    (`/api/brief.json` er ren data og trygg.)
11. **En ren merge er ikke bevis på en riktig merge.** Under deployen merget
    git CHANGELOG.md uten konflikt, men plasserte v1.2.3-punktene inni
    `[1.2.2]`-seksjonen. Kun inspeksjon av resultatet fanget det.

### 3. Oppdaterte levende dokumenter

- `docs/HANDOVER.md` — nåtilstand etter opprydningen, og hvor en ny økt
  begynner. Følg ryddeplanens eget linjetak.
- `docs/VIDERE.md` — Marius' kortversjon, sist oppdatert 20. august og dermed
  utdatert. Den skal si hva han har nå (v1.2.3, ikke v1.2.0) og hva som
  kommer, i klarspråk uten teknisk sjargong.
- `CLAUDE.md` — hvis ryddeplanen endrer hvor ting bor, må mappekartet og
  «Handover»-avsnittet oppdateres i samme slengen.

## Harde regler

- **Plan mode. Ingen produksjonskode endres.** Finner du en feil i koden:
  skriv den opp i køen, ikke fiks den.
- `CLAUDE.md` og de globale reglene gjelder foran denne prompten.
- **Bevis, ikke påstander.** Påstår du noe om en fil, ha lest den. Påstår du
  et tall, ha kjørt kommandoen. Kan du ikke verifisere noe, si det eksplisitt
  i stedet for å omgå det.
- **Ingen sletting uten begrunnelse per fil.** Git bevarer historikken, men
  planen skal likevel si hvorfor hver enkelt fil kan forsvinne.
- **Ingen ny funksjonalitet, ingen nye avhengigheter.**
- **Conventional commits.** Dokumentendringer inn i samme commit som det de
  beskriver. `npm test` (250 skal passere) og `npm run lint` grønt før hver
  commit — kjør dem, ikke anta.
- **Push til `main` auto-deployer prod.** Docs-only push er trygt og trigger
  bare en rebuild av samme kode, men gjør det bevisst, og aldri mens kamper
  pågår. Kommende kamper: søndag 23. august 15:00 og 17:30, mandag 24. august
  21:00.
- **0 AI-kall.** Denne økten trenger ingen, og prod-rutene `/brief` og
  `/nyheter` skal ikke pinges.
- **Nye idéer under «Senere / idéer»** — de sniker ikke i køen.
- Alle svar starter med «Hei Marius!», og alle beskjeder fra Marius loggføres
  i `docs/HANDOVER.md` med dato og handling.

## Legg fram for Marius før du utfører

Dette er beslutninger som er hans, ikke dine. Legg dem fram med en anbefaling
hver, og vent på svar:

1. **Arkiv eller sletting** for de utførte prompt- og planfilene.
2. **Målstrukturen** — hvilke filer som skal finnes etterpå.
3. **Rekkefølgen i køen** — særlig hvor høyt promptstruktur-fiksen skal ligge
   mot UI-overhalingen v1.3.0.
4. **Linjetaket på `HANDOVER.md`** og hvor det avsluttede stoffet flyttes.
````
