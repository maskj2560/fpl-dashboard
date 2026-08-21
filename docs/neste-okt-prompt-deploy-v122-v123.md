# Oppdrag (Fable, plan mode): trygg deploy av v1.2.2 + v1.2.3 til prod

Du jobber i `c:\Users\mariu\Documents\Claude Code\FPL` — selvhostet
FPL-dashboard (Express 5 + EJS, Node 22+, norsk bokmål, ingen byggesteg,
prod på https://fpl.marsk.no via Coolify, **auto-deploy ved push til `main`**).

**Arbeidsdeling:** DU (Fable) planlegger i plan mode og får planen godkjent av
Marius. **Opus 5 gjennomfører** i en egen økt. Når planen er godkjent skal du
lage en KORT overleveringsprompt Marius kan lime inn i Opus 5-økten (se
«Leveranser» nederst). Du skriver ikke produksjonskode selv.

## Marius' krav — dette styrer hele planen

> «Jeg ønsker ikke noen problemer. Jeg vil at alt skal funke før det pushes og
> committes og merges til main.»

Dette er en **deploy-plan, ikke en kodeplan**. Ingen ny funksjonalitet skal
skrives. Verdien ligger utelukkende i at rekkefølgen er trygg og at hver
påstand om «dette virker» er bevist FØR noe når `main`.

Planen må derfor bygges som en kjede av **porter**: hver port har en
eksplisitt bevis-kommando og et eksplisitt stopp-kriterium. Feiler en port,
stopper Opus og legger det fram for Marius — den går aldri videre «fordi det
sannsynligvis går bra».

Dette er det første oppdraget i prosjektet der **push er selve leveransen**.
Alle tidligere prompter sier «aldri push». Planen må derfor si eksplisitt
hvor Opus har lov til å pushe, og hvor den absolutt ikke har det.

## Les først

1. `docs/HANDOVER.md` — status. v1.2.3 er ferdig kodet på `fix/live-bonus`
   (økt 19), ikke merget, ikke pushet. Sesongstart-verifiseringen (M4) står
   med sjekkpunkt D igjen.
2. `CLAUDE.md` — arkitektur- og prosessregler. **Gjelder foran alt annet i
   denne prompten.**
3. `docs/plan-live-bonus.md` — planen som nettopp ble utført, inkludert
   merge-rekkefølgen som ble bestemt der.
4. `CHANGELOG.md` → `[Unreleased]` — seks punkter som skal splittes på to
   versjoner (se «Hva planen må dekke», punkt 2).
5. `Dockerfile` — det Coolify faktisk bygger.
6. `docs/sjekkpunkt-c-live.md` — hva som fortsatt skal observeres i prod.

## Hvorfor dette haster litt (men ikke mer enn at det skal gjøres riktig)

De to siste utestående verifiseringene fra sjekkpunkt C — at bonuskolonnen
fylles, og stopp-testen der pollingen skal stanse etter siste kampslutt —
**kan ikke bestås lokalt**. De krever deployet kode og et pågående
kampvindu. Sjekkpunkt D er søndag/mandag, altså etter mesteparten av GW1.

Gjenstående GW1-kamper (norsk tid, verifisert mot FPL-API-et 22. aug 01:24):

| Dag | Avspark | Siste kamp ferdig ca. |
| --- | --- | --- |
| Lørdag 22. aug | 13:30, 16:00 ×3, 18:30 | 20:20 |
| Søndag 23. aug | 15:00 ×2, 17:30 | 19:20 |
| Mandag 24. aug | 21:00 | 22:50 |

Rekker man en deploy før 13:30 lørdag, får man en full kampdag på
bonuskolonnen og stopp-testen samme kveld. Rekker man det ikke, er søndag
formiddag et like godt vindu — **det er ingen grunn til å forsere noe.**
Planen skal ha et eksplisitt «hvis vi ikke rekker vinduet»-alternativ, ikke
et tidspress som presser fram snarveier.

## Verifiserte fakta — IKKE gjenverifiser disse

Alt under er bevist i økt 19 med faktiske kommandoer. Bygg planen på dette.

**Git-topologi**

- `fix/sanitize-brief` ⊂ `fix/lag-anbefalinger` ⊂ `fix/live-bonus`
  (bekreftet med `git merge-base --is-ancestor`). `fix/live-bonus` inneholder
  altså allerede alle tre funksjonssettene.
- `main` ligger **10 commits foran `origin/main`**, inkludert én ekte
  kodeendring: cache-backoff (`src/services/cache.js`), release v1.2.1.
- Bare **én** main-commit mangler i `fix/live-bonus`: `c33aef1`
  (`docs: planleggingsprompt for full UI-overhaling`) — ren docs, én ny fil
  `docs/prompt-ui-overhaul-plan.md`.
- **`git merge-tree`-tørrkjøring gir 0 konflikter.**
- Merge-rekkefølgen i `docs/plan-live-bonus.md` (`fix/sanitize-brief` →
  `fix/lag-anbefalinger` → `main`, deretter `fix/live-bonus`) er derfor
  **overflødig som tre separate merger** — men den er fortsatt relevant hvis
  Marius vil ha `v1.2.2` som egen tag (se åpent spørsmål 2).

**Versjoner**

- Prod (`origin/main`) kjører **v1.2.0**.
- Lokal `main` er **v1.2.1** i `package.json`.
- Taggen **`v1.2.1` finnes lokalt, men er IKKE pushet.** Siste pushede tag er
  `v1.2.0`.
- Prod ligger altså allerede én release bak, uavhengig av dette arbeidet.

**Kodetilstand på `fix/live-bonus`**

- Fire commits: `5ce81de`, `80f52fb`, `8b242e3`, `f55fecb`.
- `npm test` **250/250**, `npm run lint` exit 0.
- Røyktest port 3010 med tomme nøkler: `/health` → `ai:false, discord:false`,
  alle ruter 200, ukjent sti 404, **0 AI-kall**.
- `render()` er verifisert lokalt mot ekte payload i en vm med DOM-stub —
  15 rader rendret uten feil, bonuscellen ble
  `<td class="num accent" title="Bekreftet av FPL (foreløpig til runden er
  ferdig)">+3</td>`, «Effektivt» 11 (ikke dobbelttalt), kampen viste «Slutt».

**Miljø**

- **Docker 29.6.2 er installert og kjører på maskinen.** Det gjør det mulig å
  bygge nøyaktig det imaget Coolify bygger, lokalt, før push. Dette er
  planens viktigste enkeltgrep for kravet «alt skal funke før push».
- `Dockerfile` kjører `npm ci --omit=dev`. **`npm ci` feiler hardt hvis
  `package-lock.json` ikke er i synk med `package.json`** — det er den mest
  sannsynlige måten en versjonsbump kan velte Coolify-bygget på.

**Auto-brief-scheduleren**

- GW2-deadline er `2026-08-28T17:30:00Z` (fredag 28. aug 19:30 norsk).
  `BRIEF_HOURS_BEFORE_DEADLINE` er 24, så vinduet åpner torsdag 27. aug
  19:30. En omstart i helgen 22.–24. aug er **langt utenfor** vinduet og kan
  ikke utløse en dobbel Discord-brief. Dette er sjekket — planen kan slå det
  fast, men bør si hvordan Opus verifiserer det på nytt hvis deployen
  utsettes forbi 27. august.

## Hva planen må dekke

Strukturer planen som nummererte porter med bevis-kommando og
stopp-kriterium per port. Minimum følgende innhold — vurder selv om noe bør
splittes, slås sammen eller legges til:

**1. Port: prod-baseline før vi rører noe**

Slå fast hvordan prod ser ut FØR deploy, så «det virket før» ikke blir en
antakelse i etterkant: `/health` fra https://fpl.marsk.no, statuskoder for
alle ruter, hvilken versjon footeren viser. Uten baseline kan man ikke skille
en ny feil fra en gammel.

**2. Port: release-commitene — versjon, CHANGELOG, lock-fil**

`[Unreleased]` inneholder seks punkter som tilhører to ulike releaser. Planen
må slå fast splitten eksplisitt:

- **v1.2.2** (`fix/sanitize-brief` + `fix/lag-anbefalinger`): «AI-rådgiveren
  på /lag vet nå hvilken runde rådet gjelder» (Changed), «/lag sier nå hvilken
  runde anbefalingene gjelder», «Kapteinsforslagene på /lag er ikke lenger
  vilkårlige ved sesongstart», og de to punktene om AI-briefens etterkontroll
  (forkortelser + lagnavn-varianter).
- **v1.2.3** (`fix/live-bonus`): «Bonuskolonnen på /live viser nå FPLs
  publiserte bonus» og «/live regner nå kampen som ferdig ved fløyta».

Planen må også dekke: `package.json` 1.2.1 → 1.2.2 → 1.2.3, at
`package-lock.json` **må** oppdateres i samme slengen (kjør `npm install
--package-lock-only` eller tilsvarende — avgjør selv hva som er riktig her og
begrunn det), og at `npm ci` verifiseres lokalt etterpå. Datoformat og
seksjonsstil skal matche eksisterende versjonsseksjoner i `CHANGELOG.md`.

**3. Port: merge lokalt og test RESULTATET, ikke bare branchen**

Dette er kjernen i «alt skal funke før merge til main». 250/250 på
`fix/live-bonus` beviser at *branchen* er grønn — det beviser ikke at
*merge-resultatet* er grønn. Planen må kreve at merge gjøres lokalt først, og
at `npm test` + `npm run lint` kjøres på det sammenslåtte treet før noe når
`origin`. Vurder om det bør skje på en kastbar branch først, slik at `main`
ikke engang lokalt får en commit som viser seg å være feil.

**4. Port: Docker-bygg lokalt = det Coolify gjør**

Bygg imaget fra `Dockerfile`, start containeren, og røyktest den —
**med tomme AI-nøkler**, teknikken fra driftslærdommene i `docs/HANDOVER.md`.
Dette fanger den klassen feil som testene ikke ser: manglende fil i `COPY`,
`npm ci` som feiler på lock-filen, noe som bare virker fordi `node_modules`
tilfeldigvis ligger der lokalt, feil `NODE_ENV`. Planen må spesifisere
hvilken port containeren mappes til, hvordan env settes uten å lekke
prod-nøkler inn, og hvilke ruter som sjekkes. `/health` skal gi `ai:false`.

**5. Port: deploy 1 — `main` alene**

Push `main` slik den står (de 10 commitene + taggen `v1.2.1`), uten
branch-mergene. Da lander cache-backoff i prod isolert, og hvis noe skulle
skurre vet man nøyaktig hva det var. Planen må dekke: hvordan man vet at
Coolify faktisk har bygget ferdig (ikke bare at pushet gikk gjennom), hvor
lenge man venter, og hvilke sjekker som må være grønne før man går videre.

**6. Port: deploy 2 — v1.2.2 + v1.2.3**

Merge, tagg, push. Planen må si om taggene pushes sammen med commitene eller
separat, og gjenta prod-verifiseringen fra port 5.

**7. Rollback — skrevet FØR man trenger den**

Eksakt kommandosekvens for å få prod tilbake til forrige fungerende tilstand,
og et kriterium for når man faktisk skal trekke i den i stedet for å
feilsøke videre i prod. Marius skal kunne lese denne delen alene, midt i en
kampstart, og vite hva han gjør.

**8. Kampdag-observasjon etter deploy**

Hva som konkret skal ses etter: bonuskolonnen får verdier under kampene,
«Effektivt» teller ikke bonusen to ganger, og etter siste kampslutt ca. 20:20
skal statusen slå om til «Ingen kamper pågår», kampene merkes «Slutt» og
pollingen stanse. Det siste er stopp-testen fra sjekkpunkt C, som har vært
blokkert nettopp i påvente av denne fiksen. Si hvordan det observeres
(nettverksfanen / Claude in Chrome) og hva som skal noteres.

**9. Etterarbeid**

HANDOVER, ROADMAP (huk av «Manuell verifisering under neste kampvindu» når
den faktisk er gjort — ikke før), og loggføring av Marius' beskjeder.

## Risikoer planen må adressere eksplisitt

- **Tre funksjonssett lander samtidig i deploy 2.** Hvis noe brekker, hvilken
  av dem var det? Vurder om v1.2.2 og v1.2.3 bør være to separate pusher med
  verifisering mellom, eller om det er overdrevet gitt at hver av dem er
  røyktestet hver for seg. Gi en anbefaling med begrunnelse.
- **`npm ci` mot en usynk lock-fil** — den mest sannsynlige byggefeilen.
- **Deploy midt i et kampvindu.** /live er nettopp den siden som endres. Sett
  et hardt kriterium: ferdig deployet og verifisert i god tid før avspark,
  ellers utsettes det til neste formiddag.
- **Torsdag 19:00–21:00 er absolutt forbudt** (auto-briefen). Ikke relevant
  lørdag/søndag, men regelen skal stå i planen uansett.
- **B-2-verifiseringen koster 1 AI-kall** (budsjett: 1 av ~3 brukt). Etter
  deploy kan det tas i prod i stedet for lokalt, noe som gir bedre
  ende-til-ende-dekning for samme kall. Planen bør foreslå det, men det er
  Marius som bestemmer når kallet tas.

## Åpne spørsmål — still dem til Marius før planen ferdigstilles

1. **Én deploy eller to?** Anbefalingen fra økt 19 var to (først `main`
   alene, så mergene), fordi det holder diagnosen ren og koster lite når det
   er timer til avspark. Bekreft eller avvis.
2. **Egen `v1.2.2`-tag?** `fix/live-bonus` inneholder alt, så én merge er
   teknisk nok. Vil Marius ha v1.2.2 som eget merke i historikken, kreves to
   merger og to tagger.
3. **Når skal B-2-AI-kallet tas** — i dag etter deploy, eller ved sjekkpunkt
   D som opprinnelig planlagt?
4. **Hvilket tidsvindu sikter vi på?** Lørdag før 13:30, eller søndag
   formiddag med bedre margin?

## Rammer

- **Ingen ny funksjonalitet.** Finner du en feil underveis: legg den fram for
  Marius, ikke fiks den inni deployen.
- **Ingen nye avhengigheter.** All UI-tekst norsk bokmål.
- **0 AI-kall under planleggingen.**
- Conventional commits. CHANGELOG/ROADMAP/HANDOVER oppdateres i samme commit
  som endringen de beskriver.
- Bevis, ikke påstander: hver port skal ha en kommando og en forventet output,
  ikke «verifiser at det ser greit ut».
- Planen skal kunne følges av noen som ikke var med i økt 19.

## Leveranser

1. **`docs/plan-deploy-v122-v123.md`** — selve planen, strukturert som porter
   med bevis og stopp-kriterier, i samme stil som `docs/plan-live-bonus.md`.
2. **En kort Opus 5-prompt** (egen fil,
   `docs/neste-okt-prompt-deploy-utforelse.md`), som:
   - peker på planen som fasit og forbyr re-planlegging,
   - lister «verifiserte fakta — ikke gjenverifiser»,
   - sier **eksplisitt hvor Opus har lov til å pushe**, og at alt annet
     fortsatt er forbudt,
   - krever at Opus **stopper og spør Marius mellom deploy 1 og deploy 2**,
   - krever bevis (kommando + output) for hver port,
   - minner om tiltale «Hei Marius!» og loggføring i HANDOVER.
3. Oppdater `ROADMAP.md` og `docs/HANDOVER.md` med at deployen er planlagt.

Ikke skriv Opus-prompten før planen er godkjent av Marius.
