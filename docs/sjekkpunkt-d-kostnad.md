# Sjekkpunkt D — kostnadskontroll og restpunkter

Sjekkpunkt D er Del 5 (kostnadskontroll) + Del 6 (restpunkter) i
sesongstart-verifiseringen (M4), og lever videre som ROADMAP § 1 (P4):
kostnaden følges løpende av Marius i `console.anthropic.com`, og denne fila
holder metoden, tersklene og målingene. Første måling 23. aug 2026, remålt
7. sep 2026 (økt 64).

## Priser (live-verifisert 7. sep 2026)

Kilder: platform.claude.com → models overview, og claude.com/pricing.

| Modell | Inn $/1M | Ut $/1M |
| --- | --- | --- |
| `claude-sonnet-5` (prod, `AI_MODEL`) | **2.00** | **10.00** |
| `claude-haiku-4-5` (billig-alternativet, én env-endring) | 1.00 | 5.00 |

Ingen intro- eller kampanjepris og ingen datert prisendring finnes i kildene.
Målingen 23. aug antok en økning til $3/$15 fra 1. sep — den ble aldri
bekreftet og er forkastet. Sensitivitet: stiger prisen 50 %, blir $0,76/uke
til $1,14/uke. Prisene ligger i `src/services/aiCost.js` (`PRICES_VERIFIED`
sier når de sist ble sjekket).

## Terskler (planens Del 5, punkt 3)

- Under **$1/uke** — ingen tiltak.
- **$1–4/uke** — se hvilken funksjon som drar; kortere svar (lengdeinstruksjonen
  i prompten) er billigere enn modellbytte — ut-tokens er ~¾ av kostnaden.
- Over **$4/uke** — bytt `AI_MODEL=claude-haiku-4-5` i Coolify (én
  env-endring + redeploy, ingen kodeendring).

## Datagrunnlag og verktøy

Tallene ligger på `/health → aiStats` (fra v1.13.0): `since`, `totals` og
`byKey.<cacheKey>` med `calls`, `inputTokens`, `outputTokens`, `failures`,
`lastAt` og `model` — persistert i volumets `ai-stats.json`, så de overlever
deploy. Rapporten lages med (fra v1.15.0):

```
npm run ai-kostnad -- https://fpl.marsk.no/health --restarts N
```

Stdin (`curl -s …/health | npm run ai-kostnad`) og filsti virker også.
`--restarts N` er antall containerstarter i perioden (Coolify → Deployments):
hver kostet **3 kall** t.o.m. v1.14.0 (brief + nyheter + overgangskommentar fra
oppstartstikket), 0 fra v1.15.0 når versjonen er den samme. Regningen bor i
`src/services/aiCost.js`, testet mot prod-svaret fra 7. sep. Nøklene grupperes
til funksjonene: `ai-brief-*`, `news-summary`, `transfer-comment:*`, `ai-rad-*`
og `league-report:*`. Hver `AI-kall: …`-linje i loggen er fortsatt ett betalt
kall, men loggen trengs ikke lenger (100 linjer, nullstilles ved deploy).

## Resultat — målt 7. september 2026

`aiStats` siden 2. sep 18:59Z, 4,71 døgn, 0 failures, kun `claude-sonnet-5`.

| Funksjon | kall | inn | ut | $ (2/10) | snitt inn/ut per kall |
| --- | --- | --- | --- | --- | --- |
| Nyhetsoppsummering (/nyheter) | 27 | 35 887 | 17 676 | 0,249 | 1 329 / 655 |
| AI-brief (gw3 14 + gw4 5) | 19 | 25 440 | 17 204 | 0,223 | 1 339 / 905 |
| Overgangskommentar (/overganger) | 5 | 2 512 | 1 520 | 0,020 | 502 / 304 |
| AI-rådgiver (ett klikk 7. sep 13:55) | 1 | 2 067 | 1 457 | 0,019 | — |
| **SUM** | **52** | 65 906 | 37 857 | **0,510** | |

- **Brutto: $0,76/uke** på Sonnet 5 (77 kall/uke); $0,38/uke på Haiku 4.5.
  Ut-tokens er 74 % av kostnaden. `league-report:*` mangler fordi GW3 ikke var
  ferdigspilt ennå.
- **Deploystøy:** AI-cachen bodde bare i minnet, så hver av de 8–12 restartene
  i perioden (18 first-parent-commits på `main`, flere pushet sammen) kostet
  3 kall — bevist av tidsstemplene 7. sep 11:39:53 / 11:40:08 / 11:40:16Z rett
  etter deployen 13:32 CEST. 24–36 av 52 kall var altså støy fra en uke med
  fem releaser. **Organisk takt: ~24–42 kall/uke, $0,23–0,41/uke** — innenfor
  budsjettet på ~49–53 kall/uke.
- **Verdict: under $1/uke → ingen tiltak.** Modellen forblir Sonnet 5. Støyen
  fjernes i v1.15.0: cachen persisteres i `ai-cache.json`, merket med versjon.

### Neste måling — etter GW4 (fra 15. sep)

- `league-report:4` skal finnes i `byKey` med 1 kall (første runde med
  `finished && data_checked` siden tellingen startet).
- En docs-push (samme versjon) skal ikke øke `totals.calls`; loggen skal vise
  «AI-cache lastet fra disk: 3 tekster».
- **[Marius]** Anthropic-konsollen: Cost 2.–7. sep mot $0,51 — bekrefter at
  `aiStats` teller alt dashbordet bruker.

## Resultat — målt 23. august 2026 (historikk)

Konsollens Cost-visning ga **$0,94** for uka 16.–22. aug (108 948 inn /
76 689 ut, kun Sonnet 5) — under terskelen, ingen tiltak. 44 % av kostnaden
kom 19. aug, før GW1: lokal pre-flight-testing, ikke prod-trafikk. Per funksjon
kunne ikke måles retroaktivt (100-linjers loggvindu, fire deployer 22. aug) —
løst i v1.13.0 med `aiStats`. Prod-sveipene over `/brief` og `/nyheter` kostet
den gang ~6 kall (~$0,07) fordi rutene genererte ved besøk — gratis fra v1.3.4.
Full tekst med det gamle loggskriptet: `git show 5ea543a:docs/sjekkpunkt-d-kostnad.md`.

## Restpunkter i Del 6

- [x] Skjermbilder til README — utført 26. aug (Playwright mot prod, `docs/img/`).
- [ ] **[Marius]** Mobilvisning på ekte telefon: vannrett scroll, sticky hode,
      footer, norsk, AI-merke.
- [x] «v1.2.0-kandidater» samlet under «Senere / idéer» i ROADMAP.md.
- [x] Auto-briefen 20. aug verifisert (P1, bekreftet i Discord 25. aug).
