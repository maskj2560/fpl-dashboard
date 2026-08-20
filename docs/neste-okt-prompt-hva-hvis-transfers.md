# Oppdrag: historisk «hva hvis»-analyse av egne transfers

Du jobber i `c:\Users\mariu\Documents\Claude Code\FPL` — selvhostet
FPL-dashboard (Express 5 + EJS, Node 22+, norsk bokmål, ingen byggesteg,
prod på https://fpl.marsk.no via Coolify, auto-deploy ved push til `main`).

**Funksjonen du skal planlegge og bygge:** «Historisk *hva hvis*-analyse av
egne transfers» — den ligger i dag i `ROADMAP.md` under «Senere / idéer →
Andre idéer» som én linje. Ingenting av den finnes i koden.

Kort sagt: for hver transfer Marius faktisk har gjort denne sesongen, regn ut
hva den var verdt. Hvor mange poeng ga spilleren han hentet inn, mot hva
spilleren han solgte ville gitt, fra og med runden byttet gjaldt — minus
eventuell poengstraff. Summert opp: har transfers gitt eller kostet poeng i år?

## Arbeidsform — plan først, kode etterpå

1. **Start med å lage en fullstendig plan.** Bruk plan mode. Planen skal dekke
   hele greia: datagrunnlag, beregningsmodell, arkitektur, UI, tester,
   feilhåndtering, tomtilstander, ytelse/kostnad, og en konkret
   commit-for-commit-rekkefølge.
2. **Legg planen fram for Marius og få den godkjent før du skriver kode.**
   Er noe uavklart, spør — ikke gjett deg til en beslutning han skal ta.
3. Deretter implementerer du planen, med TDD, i den rekkefølgen planen sier.

Planen skal være god nok til at en ny økt kan overta den uten deg. Lagre den
som `docs/plan-hva-hvis-transfers.md` og oppdater den underveis.

## Les først

1. `docs/HANDOVER.md` — status og aktive økter. **NB:** sesongstart-
   verifiseringen (M4) pågår med sjekkpunkter torsdag kveld–mandag i en annen
   økt. Ikke forstyrr den, og ikke endre oppførsel den observerer uten avtale.
2. `CLAUDE.md` — arkitekturregler. Gjelder foran alt annet i denne prompten.
3. `ROADMAP.md` — milepælrekkefølgen og hva som allerede ligger som
   v1.2.0-kandidater.
4. `CHANGELOG.md` — format og tone på oppføringene.

## Tidskontekst (viktig for hva som finnes av data)

- **v1.1.3 er i prod** siden 2026-08-20 ~03:00 (kvalitetspass, 29 funn rettet).
- GW1-deadline er **fredag 21. august 19:30**. Sesongen har altså ikke startet.
- Auto-briefen postes til Discord ~24 t før deadline. **Aldri push i vinduet
  19:00–21:00 torsdag.**

### Konsekvens du må planlegge rundt

Verifisert mot FPL-API-et 2026-08-20 (kall kjørt, output sett):

| Endepunkt | Status nå |
| --- | --- |
| `entry/{id}/transfers/` | Finnes, returnerer array — **tom**. FPL nullstiller ved sesongskifte |
| `entry/{id}/history/` | `current: []` (ingen runder spilt), `past: [1 sesong]` med kun `season_name, total_points, rank, rank_percentage` |
| `element-summary/{id}/` | `fixtures`, `history` (**tom** før sesongstart), `history_past` |

**Funksjonen har null data før GW2 er i gang** — første transfer kan tidligst
skje etter GW1. Tomtilstanden er derfor ikke et hjørnetilfelle, den er det
Marius ser de første ukene. Planlegg den som en førsteklasses tilstand med
ordentlig norsk tekst, ikke en tom tabell.

Feltnavnene i `transfers/`-arrayet fikk jeg **ikke** verifisert (arrayet er
tomt både for Marius' lag og for en offentlig entry). Allment dokumentert
skjema er `element_in`, `element_in_cost`, `element_out`, `element_out_cost`,
`entry`, `event`, `time` — men **behandle det som uverifisert**. Første
oppgave i implementeringen er å bekrefte skjemaet mot ekte data og få koden
til å tåle at et felt mangler.

## Harde regler

### Git og deploy

- **Jobb på egen branch**, f.eks. `feat/hva-hvis-transfers`. Aldri direkte på
  `main`.
- **ALDRI push uten eksplisitt klarsignal fra Marius.** Push til `main`
  auto-deployer til prod.
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`,
  `refactor:`, `perf:`). Commit hyppig — minst én per delfunksjon.
- Merge til `main` med `--no-ff` når Marius gir klarsignal, og først etter at
  `main` er verifisert grønn.

### Kode

- **Ingen nye avhengigheter.** Ingen nye rammeverk, ingen CDN-er. Appen skal
  forbli liten og rask.
- Moderne JS: ESM, async/await.
- **Dataflyt: routes → services → fplClient → FPL-API.** Nettverkskall mot FPL
  skjer KUN i `src/services/fplClient.js`. Aldri forretningslogikk i routes
  eller views — det var nettopp et av funnene i forrige kvalitetspass, ikke
  gjeninnfør det.
- Ren beregningslogikk skilles fra henting: mønsteret som allerede finnes er
  `buildLive`/`assembleLive` i `src/services/live.js` og
  `buildBrief`/`assembleBrief` i `src/services/brief.js`. Følg det.
- All UI-tekst på **norsk bokmål**. Mørkt tema, alle farger som CSS-variabler
  i `:root`, systemfonter, responsivt.

### Tester

- **TDD:** skriv testen først, se den feile, rett, se grønt. Ingen
  produksjonskode uten en test som feilet først.
- `node:test`, tester i `test/`.
- **Ingen nettverkskall i tester.** Mock global `fetch` (mønster i
  `test/fplClient.test.js`) eller injiser fakes via små test-hooks (mønster:
  `_setNow`/`_flush`/`clear` i `cache.js`, `_setClient`/`_setNow`/`_reset` i
  `ai.js`, `_send`/`_setHooks`/`_reset` i `notify.js`).
- All logikk i services skal ha tester.
- `npm test` og `npm run lint` skal være grønne **etter hver commit**.
  Utgangspunkt: 185/185 grønne, lint 0.

### Bevis, ikke påstander

Si aldri at noe «virker», «er fikset» eller «består» uten at du har kjørt
kommandoen og sett outputen i økten. Vis kommandoen og de relevante linjene.
Kunne du ikke kjøre den, si det eksplisitt — ikke pakk det inn i «burde nå
fungere».

## Dokumentasjonsregler — oppdateres løpende, ikke til slutt

Dette er ikke opprydding på tampen. Dokumentene oppdateres **i samme commit**
som endringen de beskriver.

- **`CHANGELOG.md`** — Keep a Changelog. Hver brukersynlig endring inn under
  `[Unreleased]` i samme commit som endringen. Norsk, forklarende tone: hva
  brukeren merker, ikke hvilken funksjon som ble skrevet. Se v1.1.3-seksjonen
  som mal. Ved ferdig milepæl: flytt til versjonert seksjon med dato, bump
  `package.json` **og** rot-versjonen i `package-lock.json` (kun linje 3 og 9
  — dependencies har egne versjoner), og sett git-tag (SemVer) etter at prod
  er verifisert.
- **`ROADMAP.md`** — jobb i milepælrekkefølge, huk av etter hvert. Flytt
  «Historisk hva hvis-analyse» ut av «Andre idéer» og opp som en egen
  versjonsseksjon når den er planlagt. Nye idéer som dukker opp underveis
  legges under «Senere / idéer» — de sniker ikke i køen. Alt du bevisst IKKE
  gjør, skrives opp med én linje og en begrunnelse.
- **`docs/HANDOVER.md`** — den levende overleveringsfilen. Oppdateres ved hver
  milepæl og ved arbeidsstans, med nøyaktig status, neste steg, åpne
  beslutninger og kjente feil. **Alle beskjeder fra Marius loggføres** i
  seksjonen «Logg over brukerbeskjeder» med dato og hvilken handling de
  utløste. Nærmer økten seg usage-grensen (~95 %): stopp, oppdater
  `docs/HANDOVER.md` grundig, commit alt.
- **`CLAUDE.md`** — oppdateres når arkitekturen endres: nye filer i
  filkartet, nye services og deres ansvar, nye env-variabler, nye
  test-hooks. Ny modul uten linje i CLAUDE.md er ikke ferdig.
- **`.env.example`** — holdes oppdatert hvis du innfører en ny env-variabel.
  `.env` er gitignored og skal aldri i repoet.
- **`docs/plan-hva-hvis-transfers.md`** — planen. Holdes i takt med
  virkeligheten; avviker implementeringen fra planen, oppdater planen og skriv
  hvorfor.

## Hva planen må svare på

Dette er spørsmålene, ikke fasiten. Ta stilling til hvert punkt i planen, og
foreslå et valg med begrunnelse der det er et valg å ta.

### 1. Beregningsmodellen

- Hva er «hva hvis»-en? Forslag til utgangspunkt: for hver transfer
  (`element_out` → `element_in`, gjennomført før runde N), summer poengene
  begge spillerne faktisk fikk fra og med runde N til nå. Differansen er
  gevinsten. Men: hvor lenge skal en transfer «telle»? Til spilleren selges
  igjen? Ut sesongen? Et fast vindu? Begrunn.
- Hva med spillere som ble kjøpt og solgt igjen? Kjeder av transfers på samme
  plass i troppen?
- **Poengstraff:** `entry/{id}/history/` sin `current[]` har per runde et felt
  for transferkostnad. Verifiser navnet mot ekte data. Straffen tilhører
  runden, ikke den enkelte transferen — hvordan fordeles den når en runde har
  flere transfers?
- **Benk og kaptein:** spilleren du hentet inn ga bare poeng hvis han faktisk
  sto på laget. Skal analysen bruke rå spillerpoeng, eller poeng vektet for om
  han startet? Rå poeng er enklere og ærligere som «hva hvis»; vektet er mer
  presist, men mye mer komplekst. Velg ett, og skriv i UI-et hva som måles.
- Wildcard og Free Hit endrer premissene helt (mange transfers uten straff,
  Free Hit reverseres etter én runde). `entry/{id}/history/` sin `chips`
  forteller hvilke runder. Hvordan håndteres de?

### 2. Data og kostnad

- Ny funksjon i `fplClient.js` for `entry/{id}/transfers/`. Velg TTL og
  begrunn den mot de eksisterende (bootstrap 15 min, entry/picks/history
  5 min, live og per-runde-fixtures 1 min, element-summary 30 min).
- **Ytelsesfellen:** poeng per runde per spiller ligger i
  `element-summary/{id}/`, ett kall per spiller. Med 20 transfers blir det
  opptil 40 spillere → 40 nettverkskall for én sideinnlasting. Det er ikke
  akseptabelt. Løs det i planen: kan `event/{gw}/live/` brukes i stedet (ett
  kall per runde, inneholder alle spillere)? Vurder begge, velg én, begrunn.
- Alt skal gå gjennom `cache.js`. Ingen ny cache-mekanisme.
- FPL kan svare 503 «The game is being updated». Siden skal vise banner, ikke
  krasje — mønsteret finnes allerede.

### 3. Arkitektur og plassering

- Egen service (`src/services/transfers.js`) med `buildTransferAnalysis(...)`
  som ren funksjon + en `assemble...`-variant som henter? Følg mønsteret fra
  `live.js` og `brief.js`.
- Egen side (`/transfers`?) eller en seksjon på `/lag`? Ta stilling til navn i
  menyen, URL og hva som er lettest å finne. Ny side krever oppføring i
  `views/layout.ejs` sin navigasjon og i `src/server.js`.
- Trenger `/api/`-endepunkt? Bare hvis noe faktisk konsumerer det.
- Krever `FPL_TEAM_ID`. Uten den skal siden vise `no-team`-viewet, som de
  andre lagsidene gjør.

### 4. UI

- Hva ser Marius? Foreslå konkret: en tabell per transfer (runde, ut, inn,
  netto poeng, straff, sum), en totalsum øverst i `stat-strip`-stilen som
  finnes, og en tydelig markering av beste og verste bytte.
- Tomtilstander: ingen transfers ennå (som nå), ingen runder spilt, ingen
  `FPL_TEAM_ID`. Alle tre skal ha egen norsk tekst.
- Tall skal være lesbare uten forklaring. Er «netto poeng» tvetydig, skriv en
  kort forklarende linje under overskriften.
- Følg eksisterende komponenter: `.card`, `.data`-tabeller, `.table-scroll`,
  `.stat-strip`, `.empty`. Ingen nye designspråk.
- Mobil (390 px) skal ikke gi vannrett scroll på siden — bare inne i
  `.table-scroll`.

### 5. AI (valgfritt, og kun hvis det tilfører noe)

Appen krever aldri API-nøkkel. Vil du la modellen kommentere analysen, skal
det gå gjennom `src/services/ai.js`, være cachet med minimumsintervall, og
funksjonen skal være fullt brukbar uten nøkkel. Foreslå det gjerne, men
argumenter for at det er verdt kostnaden — og la det være siste steg, ikke
første.

## Avgrensninger

- Ikke rør oppførsel som sesongstart-verifiseringen observerer denne helgen
  (live-polling, auto-brief, banner-logikk) uten å avklare med Marius først.
- Ikke plukk opp P3-funnene eller v1.2.0-kandidatene i `ROADMAP.md` på veien —
  de er egne oppdrag.
- Ikke innfør persistens (database, fil på volum) uten at Marius har tatt den
  arkitekturbeslutningen eksplisitt. Analysen skal kunne regnes ut på
  forespørsel fra FPL-API-et.

## Slutt-tilstand

- Planen ligger i `docs/plan-hva-hvis-transfers.md` og er godkjent av Marius.
- Funksjonen er implementert på branchen, med tester.
- `npm test` og `npm run lint` grønne — vis kommandoen og outputen.
- Røyktest lokalt: alle ruter 200 (inkludert den nye), 404 på ukjent sti.
  Kjør serveren med **AI og Discord slått av** (egen `.env` i scratchpad —
  aldri repoets `.env` med prod-nøklene, og aldri i repoet).
- `CHANGELOG.md`, `ROADMAP.md`, `docs/HANDOVER.md` og `CLAUDE.md` oppdatert.
- **Ikke merget, ikke pushet** før Marius sier fra.
- Kort rapport til Marius: hva som er bygget, hvilke beslutninger som ble tatt
  og hvorfor, hva som bevisst er utelatt, og hva som gjenstår.
