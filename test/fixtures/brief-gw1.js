// Ekte AI-brief fra prod, postet til Discord av auto-briefen 2026-08-20 kl. 19:30
// (24 t før GW1-deadline). Generert av v1.2.0 — altså med den GAMLE
// `sanitizeBriefText`, før P3-4. Teksten er tatt vare på uendret som regresjons-
// grunnlag: etterkontrollen skal ikke fjerne noe herfra, verken før eller etter
// P3-4. Header-linjene fra Discord-meldingen er ikke med — de bygges i
// notify.js og går aldri gjennom sanitizeBriefText.
//
// Hvorfor akkurat denne er nyttig: teksten treffer tre av tilfellene P3-4 la
// inn støtte for — «kl. 19:30» og «21. august» (punktum midt i setning),
// «Coventry» der FPL-dataene sier «Coventry City» (alias), og «Spurs' nye
// sesong» (genitiv med apostrof).
export const briefTextGw1 = `# Deadline
Fredag 21. august kl. 19:30. Merk at samtlige kamper i runde 1 spilles etter at deadline har passert – ingen tidlig kamp å ta hensyn til denne runden.

# Skadenytt
Ingen nevneverdig skadenytt blant høyt eide spillere foran runde 1. Alle stiller i utgangspunktet friske til sesongstart.

# Kapteinsvalg
Uten fjorårsform å lene seg på (alle viser 0.0 i form før sesongstart) er det Arsenal-trioen som peker seg ut som de mest brukte kapteinsvalgene globalt:

- **Raya** (36,3 % eid) – solid mellom stengene, Arsenal åpner hjemme mot et opprykkslag.
- **Calafiori** (32,3 % eid) – offensiv trussel fra bakre rekke, høyt eid til tross for manglende poenghistorikk i FPL.
- **Gabriel** (29,6 % eid) – klassisk «holdt nullen»-kandidat mot Coventry.

Med tanke på motstanderen (Coventry, nyopprykket) er Arsenal-alternativene et trygt valg for de som vil starte sesongen defensivt solid. Gabriel og Calafiori gir dessuten oppside på scoring ved dødball.

# Kamper å følge med på
- **Arsenal–Coventry City** (fre 21:00): Sesongåpneren – perfekt sjanse til å sjekke Arsenals kapteinskandidater i aksjon rett etter deadline.
- **Man City–Bournemouth** (søn 15:00): City hjemme til sesongstart er alltid interessant for eiere av deres angrepsspillere.
- **Newcastle–Liverpool** (søn 17:30): Tøff åpningskamp for begge – kan gi tidlige signaler om formkurver.
- **Brentford–Spurs** (lør 18:30): Spurs' nye sesong under lupen – følg med på rotasjon og startoppstilling.
- **Fulham–Chelsea** (man 24. aug, 21:00): Rundens siste kamp – nyttig for differensial-vurderinger før runde 2.`;

// Kampene slik briefen gjengir dem. Alle ligger etter deadline (fredag 19:30),
// som er nøyaktig det fasiten i prompten fortalte modellen.
export const briefGw1 = {
  gameweek: { name: 'Runde 1', deadlineFormatted: 'fredag 21. august kl. 19:30' },
  fixturesByDay: [
    {
      day: 'fredag',
      matches: [{ home: 'Arsenal', away: 'Coventry City', kickoff: '21:00', beforeDeadline: false }],
    },
    {
      day: 'lørdag',
      matches: [{ home: 'Brentford', away: 'Spurs', kickoff: '18:30', beforeDeadline: false }],
    },
    {
      day: 'søndag',
      matches: [
        { home: 'Man City', away: 'Bournemouth', kickoff: '15:00', beforeDeadline: false },
        { home: 'Newcastle', away: 'Liverpool', kickoff: '17:30', beforeDeadline: false },
      ],
    },
    {
      day: 'mandag',
      matches: [{ home: 'Fulham', away: 'Chelsea', kickoff: '21:00', beforeDeadline: false }],
    },
  ],
};
