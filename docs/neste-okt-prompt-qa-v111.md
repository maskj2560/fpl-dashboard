# Kjøreprompt: utfør QA-retteplanen (v1.1.0 → v1.1.1)

> Kopier alt under linjen inn som første melding til en ny kodeagent i dette repoet.

---

# Oppdrag: utfør QA-retteplanen for fpl.marsk.no (v1.1.0 → v1.1.1)

Du jobber i repoet `c:\Users\mariu\Documents\Claude Code\FPL` (Express 5 + EJS,
ingen byggesteg, norsk bokmål, mørkt tema). En planleggingsøkt har allerede
kartlagt kodebasen, verifisert QA-funnene mot koden og designet løsningen for
hvert funn (P0-1…P2-8). Din jobb er å UTFØRE planen — ikke re-planlegge.

## Les i denne rekkefølgen før du skriver kode

1. **`C:\Users\mariu\.claude\plans\oppdrag-rett-opp-foamy-fog.md`** — planen.
   Den er fasit for løsningsdesignet: hvert funn har konkret løsning med
   filstier, og seksjonen «Beslutninger avklart med Marius» er endelig —
   ikke re-spør om noe der. (Finner du ikke filen: stopp og spør Marius.)
2. `CLAUDE.md` i repoet — arkitekturregler, kommandoer, konvensjoner. Gjelder foran alt.
3. `docs/HANDOVER.md` — status og logg. Oppdater den ved arbeidsstans og ved ferdigstillelse.

## Rammer

- Branch `fix/qa-v1.1.1` fra `main`. Én commit per funn, funn-ID i emnelinjen
  (f.eks. `fix: P0-1 asset-versjonering med innholdshash`). Conventional commits.
- **ALDRI push, tag-push eller deploy** — push til main auto-deployer til prod
  via Coolify. Alt forblir lokalt til Marius sier ifra.
- Ingen nye avhengigheter, byggesteg eller CDN-er i repoet. Playwright til
  verifisering installeres KUN i scratchpad-mappen din, aldri i package.json.
- Rekkefølge: P0-1 → P0-2 → P1-1…P1-7 → P2-1…P2-8 → release (v1.1.1 i
  package.json + CHANGELOG + HANDOVER + lokal tag).
- CHANGELOG.md oppdateres under `[Unreleased]` i samme commit som hver endring.
- Ikke gjør endringer utenfor planen — nye idéer går i sluttrapporten som forslag.
- P2-7 skal IKKE kodes: FPL-API-et leverer selv «Var Har Skylda» (verifisert i
  planleggingen mot `entry/5330646/`). Dokumenter det i sluttrapporten.
- Ikke klikk/kall «Spør AI om råd»-stien. Lokal lasting av /brief og /nyheter
  med ekte `.env` utløser inntil 2 cachede AI-kall — det er OK, mer er det ikke.
- Test aldri mot https://fpl.marsk.no — all verifisering skjer mot lokal server.

## Verifisering (bevis, ikke påstander — vis kommandoer og output)

1. `npm test` og `npm run lint` grønne etter hvert funn og til slutt.
2. Lokal server: curl-sjekker av asset-headere (`?v=` → immutable, uten → no-cache),
   `/health` (leagues=1), alle 10 ruter 200, 404-status.
3. Kontrastscript i Node (ingen avhengigheter): th, fdr-1…5, aktiv grønn — ≥ 4,5:1.
4. Playwright (scratchpad) mot lokal server på 390×844, 360×740, 844×390 og
   1440×900: sticky-overlapp (elementFromPoint i th ved scroll y=400/900/1500/
   2500/3000, overlapp = 0), ingen vannrett scroll på body, ai-badge ≤ 24 px én
   linje, ≥ 4 av 5 GW-kolonner i FDR ved 390, topbar én linje, fokus-ringer,
   null konsollfeil, sortering/filter på /spillere (alle 11 kolonner + kombinerte
   filtre), footer viser v1.1.1 på alle 8 sider.
5. Kjør hele regresjonssjekklista i planens verifiseringsseksjon punkt for punkt.

## Sluttrapport til Marius

- Én linje per funn: ID, endring, filer, hvordan verifisert.
- Uløste funn med årsak. Alt som IKKE ble verifisert, eksplisitt (minst:
  Cloudflare-oppførsel i prod og AI-rådgiver-stien).
- Manuelle steg utenfor repoet: Cloudflare-purge (står i ny DEPLOY.md),
  push/deploy-klarsignal, ev. omdøping av ligaen i FPL-UI-et (P2-7).
- Konflikter mellom QA-rapporten og repoet (planen lister dem allerede).
