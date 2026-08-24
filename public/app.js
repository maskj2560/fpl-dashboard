// Delt HTML-escaping for modulene under. Escaper også anførselstegn, slik at
// verdien er trygg både som tekstinnhold og inne i et attributt.
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Live-polling: ett kall i minuttet mens kamper pågår, og et enkelt
// vekkesignal ved neste avspark ellers. Aldri et intervall utenfor kampvinduer.
const LIVE_POLL_MS = 60000;
const LIVE_KICKOFF_BUFFER_MS = 30000;

/**
 * Hvor lenge siden skal vente før den sjekker på nytt når ingen kamper pågår.
 * null = ingenting å vente på (kamper pågår alt, eller ingen kjent avspark).
 */
function nextWakeupDelay(live, nowMs, bufferMs) {
  if (!live || live.anyLive || !live.nextKickoff) return null;
  const at = new Date(live.nextKickoff).getTime();
  if (!Number.isFinite(at)) return null;
  return Math.max(at + bufferMs - nowMs, 0);
}

// Tema: «auto» følger systemet, «light»/«dark» er lagret valg. Inline-
// scriptet i layout.ejs setter data-theme før første paint med samme
// regel — dette er bare bryteren og live-lytting på systemet etterpå.
const THEME_KEY = 'fpl-theme';
const THEME_MODES = ['auto', 'light', 'dark'];
const THEME_LABELS = {
  auto: 'Tema: automatisk (følger systemet)',
  light: 'Tema: lyst',
  dark: 'Tema: mørkt',
};

function resolveTheme(stored, prefersLight) {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersLight ? 'light' : 'dark';
}

function nextMode(mode) {
  const i = THEME_MODES.indexOf(mode);
  return THEME_MODES[(i + 1) % THEME_MODES.length];
}

// Klubbmerke i klientrendret markup (/live). Speiler partials/club-badge.ejs.
// Klienten vet ikke hvilke bilder som finnes — feiler et bilde, bytter
// error-lytteren i Modul 3 det til plassholderen.
function clubBadgeHtml(shortName, code, version, size) {
  const name = '<span class="club-name">' + escapeHtml(shortName == null ? '?' : shortName) + '</span>';
  const img =
    Number.isInteger(code) && version
      ? '<img class="club-img" src="/img/clubs/t' + code + '.png?v=' + escapeHtml(version) +
        '" width="70" height="70" alt="" loading="lazy" decoding="async">'
      : '<span class="club-fallback" aria-hidden="true"></span>';
  return '<span class="club club--' + (size || 'sm') + '">' + img + name + '</span>';
}

// Modul 0: Mobilmenyen. Scroller aktiv lenke inn i syne, og togglar
// kantfade-klassene som viser at menyen har mer innhold sidelengs.
(function () {
  'use strict';

  const nav = document.querySelector('.topbar nav');
  if (!nav) return;

  const active = nav.querySelector('a[aria-current="page"]');
  if (active) active.scrollIntoView({ inline: 'center', block: 'nearest' });

  function updateFades() {
    const maxScroll = nav.scrollWidth - nav.clientWidth;
    nav.classList.toggle('nav-overflow-left', nav.scrollLeft > 4);
    nav.classList.toggle('nav-overflow-right', maxScroll - nav.scrollLeft > 4);
  }

  updateFades();
  nav.addEventListener('scroll', updateFades, { passive: true });
  window.addEventListener('resize', updateFades);
})();

// Modul 1: Nedtelling til neste deadline. Leser ISO-tidspunkt fra data-deadline.
(function () {
  'use strict';

  const box = document.querySelector('[data-deadline]');
  if (!box) return;

  const deadline = new Date(box.dataset.deadline).getTime();
  if (!Number.isFinite(deadline)) return;

  const fields = {
    d: box.querySelector('[data-unit="d"]'),
    h: box.querySelector('[data-unit="h"]'),
    m: box.querySelector('[data-unit="m"]'),
    s: box.querySelector('[data-unit="s"]'),
  };

  const pad = (n) => String(n).padStart(2, '0');

  function tick() {
    const diff = deadline - Date.now();

    if (diff <= 0) {
      box.innerHTML = '<p class="deadline-passed">Deadline er passert — lykke til!</p>';
      clearInterval(timer);
      return;
    }

    const totalSec = Math.floor(diff / 1000);
    fields.d.textContent = String(Math.floor(totalSec / 86400));
    fields.h.textContent = pad(Math.floor((totalSec % 86400) / 3600));
    fields.m.textContent = pad(Math.floor((totalSec % 3600) / 60));
    fields.s.textContent = pad(totalSec % 60);
  }

  tick();
  const timer = setInterval(tick, 1000);
})();

// Modul 2: Sortering og filtrering av spillertabellen (/spillere).
(function () {
  'use strict';

  const table = document.getElementById('players-table');
  if (!table) return;

  const tbody = table.tBodies[0];
  const headers = [...table.tHead.rows[0].cells];

  // Sortering: klikk på kolonneoverskrift, toggle retning.
  headers.forEach((th, index) => {
    th.tabIndex = 0;
    th.addEventListener('click', () => sortBy(th, index));
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        sortBy(th, index);
      }
    });
  });

  function sortBy(th, index) {
    const type = th.dataset.type || 'text';
    const dir = th.getAttribute('aria-sort') === 'descending' ? 'ascending' : 'descending';
    headers.forEach((h) => h.setAttribute('aria-sort', 'none'));
    th.setAttribute('aria-sort', dir);

    const rows = [...tbody.rows];
    rows.sort((a, b) => {
      const av = a.cells[index].textContent.trim();
      const bv = b.cells[index].textContent.trim();
      const cmp =
        type === 'num'
          ? (parseFloat(av) || 0) - (parseFloat(bv) || 0)
          : av.localeCompare(bv, 'nb');
      return dir === 'descending' ? -cmp : cmp;
    });
    rows.forEach((r) => tbody.appendChild(r));
  }

  // Filtrering uten sidelasting.
  const search = document.getElementById('filter-search');
  const position = document.getElementById('filter-position');
  const team = document.getElementById('filter-team');
  const price = document.getElementById('filter-price');
  const reset = document.getElementById('filter-reset');
  const count = document.getElementById('filter-count');

  function applyFilters() {
    const q = search.value.trim().toLowerCase();
    const pos = position.value;
    const teamId = team.value;
    const maxPrice = parseFloat(price.value);
    let shown = 0;
    const total = tbody.rows.length;

    for (const row of tbody.rows) {
      const ok =
        (!q || row.dataset.name.includes(q)) &&
        (!pos || row.dataset.pos === pos) &&
        (!teamId || row.dataset.team === teamId) &&
        (!Number.isFinite(maxPrice) || parseFloat(row.dataset.price) <= maxPrice);
      row.hidden = !ok;
      if (ok) shown++;
    }
    count.textContent = 'Viser ' + shown + ' av ' + total + ' spillere';
  }

  search.addEventListener('input', applyFilters);
  position.addEventListener('change', applyFilters);
  team.addEventListener('change', applyFilters);
  price.addEventListener('input', applyFilters);
  reset.addEventListener('click', () => {
    search.value = '';
    position.value = '';
    team.value = '';
    price.value = '';
    applyFilters();
  });

  applyFilters();
})();

// Modul 3: Live-oppdatering (/live). Poller kun mens kamper pågår.
(function () {
  'use strict';

  const root = document.getElementById('live-root');
  const dataEl = document.getElementById('live-data');
  if (!root || !dataEl) return;

  const playersBody = document.querySelector('#live-players tbody');
  const matchesRoot = document.getElementById('live-matches');
  const leaguesRoot = document.getElementById('live-leagues');
  const totalEl = document.getElementById('live-total');
  const statusEl = document.getElementById('live-status');
  const updatedEl = document.getElementById('live-updated');
  const pulseEl = document.getElementById('live-pulse');
  const imgVersion = root.dataset.imgVersion || '';
  // error bobler ikke — fanges i capture-fasen på rota.
  root.addEventListener(
    'error',
    (e) => {
      const img = e.target;
      if (!img || !img.classList || !img.classList.contains('club-img')) return;
      const ph = document.createElement('span');
      ph.className = 'club-fallback';
      ph.setAttribute('aria-hidden', 'true');
      img.replaceWith(ph);
    },
    true,
  );


  function render(live) {
    if (totalEl) totalEl.textContent = live.totalLive == null ? '–' : live.totalLive;
    playersBody.innerHTML = live.myPlayers
      .map(function (p) {
        // Publisert bonus ligger allerede i poengsummen, estimatet gjør ikke —
        // cellen viser summen, tittelen sier hvor tallet kommer fra.
        const bonus = p.bonusEst + p.bonusPublished;
        const title = p.bonusPublished > 0 && p.bonusEst > 0
          ? p.bonusPublished + ' bekreftet av FPL, ' + p.bonusEst + ' estimert fra BPS'
          : p.bonusPublished > 0
            ? 'Bekreftet av FPL (foreløpig til runden er ferdig)'
            : p.bonusEst > 0
              ? 'Estimat fra BPS'
              : '';
        return (
          '<tr' + (p.onBench ? ' class="row-bench"' : '') + '><td><strong>' + escapeHtml(p.name) + '</strong>' +
          (p.isCaptain ? ' <b class="cap">C</b>' : '') + ' ' + clubBadgeHtml(p.team, p.teamCode, imgVersion) + '</td>' +
          '<td class="num">' + p.minutes + "'</td>" +
          '<td class="num">' + p.points + '</td>' +
          '<td class="num' + (bonus > 0 ? ' accent' : '') + '"' + (title ? ' title="' + title + '"' : '') + '>' +
          (bonus > 0 ? '+' + bonus : '–') + '</td>' +
          '<td class="num"><strong>' + p.effective + '</strong></td></tr>'
        );
      })
      .join('');
    matchesRoot.innerHTML = live.matches
      .map(function (m) {
        const status = m.finished ? 'Slutt' : m.started ? m.minutes + "'" : 'Ikke startet';
        const live1 = m.started && !m.finished;
        return (
          '<div class="match' + (live1 ? ' match-live' : '') + '">' +
          '<span class="match-team">' + clubBadgeHtml(m.home, m.homeCode, imgVersion, 'md') + '</span>' +
          '<span class="match-score">' + (m.homeScore == null ? '–' : m.homeScore + '–' + m.awayScore) + '</span>' +
          '<span class="match-team">' + clubBadgeHtml(m.away, m.awayCode, imgVersion, 'md') + '</span>' +
          '<span class="match-status">' + status + '</span>' +
          '</div>'
        );
      })
      .join('');
    leaguesRoot.innerHTML = live.leagues
      .map(function (l) {
        return (
          '<section class="card"><h2>' + escapeHtml(l.name) + '</h2><div class="table-scroll"><table class="data"><thead><tr><th class="num">#</th><th>Lag</th><th class="num">GW</th><th class="num">Totalt</th></tr></thead><tbody>' +
          l.top
            .map(function (r) {
              return '<tr' + (r.me ? ' class="row-me"' : '') + '><td class="num">' + r.rank + '</td><td>' + escapeHtml(r.name) + '</td><td class="num">' + r.gw + '</td><td class="num">' + r.total + '</td></tr>';
            })
            .join('') +
          '</tbody></table></div></section>'
        );
      })
      .join('');
    statusEl.textContent = live.anyLive ? 'Kamper pågår' : 'Ingen kamper pågår akkurat nå';
    updatedEl.textContent = 'Sist oppdatert ' + new Date().toLocaleTimeString('nb-NO');
    pulseEl.classList.toggle('pulse-on', live.anyLive);
    return live;
  }

  let interval = null;
  let wakeup = null;

  // Tilstandsmaskin, ikke et engangsvalg ved sidelast: pågår kamper, går et
  // 60 s-intervall. Gjør de ikke det, stoppes intervalet og siden sover til
  // neste kjente avspark — så en fane som åpnes før kampstart, eller står åpen
  // i pausen mellom lørdagskampene, våkner av seg selv.
  function schedule(live) {
    clearTimeout(wakeup);
    wakeup = null;
    if (live.anyLive) {
      if (!interval) interval = setInterval(poll, LIVE_POLL_MS);
      return;
    }
    clearInterval(interval);
    interval = null;
    const delay = nextWakeupDelay(live, Date.now(), LIVE_KICKOFF_BUFFER_MS);
    if (delay !== null) wakeup = setTimeout(poll, delay);
  }

  async function poll() {
    try {
      const res = await fetch('/api/live.json');
      if (res.ok) {
        schedule(render(await res.json()));
        return;
      }
    } catch {
      // Nettverksglipp — håndteres som en feilet henting under.
    }
    // Går et intervall, tar neste tick den. Ellers ett nytt forsøk om et minutt.
    if (!interval) wakeup = setTimeout(poll, LIVE_POLL_MS);
  }

  schedule(render(JSON.parse(dataEl.textContent)));
})();

// Modul 4: AI-rådgiver på /lag.
(function () {
  'use strict';

  const btn = document.getElementById('ai-advice-btn');
  const out = document.getElementById('ai-advice-result');
  if (!btn || !out) return;


  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Tenker …';
    out.hidden = false;
    // Tre prikker som animeres bak prefers-reduced-motion; ellers ren tekst.
    out.innerHTML = '<p class="loading">Henter råd <span class="dots"><i></i><i></i><i></i></span></p>';
    try {
      const res = await fetch('/api/ai-rad', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        out.textContent = data.error || 'Noe gikk galt.';
      } else {
        out.innerHTML = data.text
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => '<p>' + escapeHtml(l).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') + '</p>')
          .join('');
      }
    } catch {
      out.textContent = 'Nettverksfeil — prøv igjen.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Spør AI om råd';
    }
  });
})();

// Modul 5: Temabryteren i topbaren. Sykler auto → lys → mørk, lagrer valget
// (auto = ingen nøkkel), og følger systemet live så lenge valget er auto.
(function () {
  'use strict';

  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const media = window.matchMedia('(prefers-color-scheme: light)');
  const read = () => {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  };
  const write = (mode) => {
    try {
      if (mode === 'auto') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, mode);
    } catch {
      // Privat modus / blokkert lagring: valget gjelder til neste sidelast.
    }
  };

  function apply(mode) {
    const theme = resolveTheme(mode === 'auto' ? null : mode, media.matches);
    document.documentElement.setAttribute('data-theme', theme);
    btn.dataset.mode = mode;
    btn.setAttribute('aria-label', THEME_LABELS[mode]);
    btn.title = THEME_LABELS[mode];
  }

  let mode = THEME_MODES.includes(read()) ? read() : 'auto';
  apply(mode);
  btn.addEventListener('click', () => {
    mode = nextMode(mode);
    write(mode);
    apply(mode);
  });
  media.addEventListener('change', () => {
    if (mode === 'auto') apply(mode);
  });
})();

// Modul 6: Klikkbare tabellrader (/liga). Raden speiler lenken i cellen —
// tastatur og fokus dekkes av selve <a>-en, raden er bare et større mål.
(function () {
  'use strict';
  document.addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-href]');
    if (!row || e.target.closest('a')) return;
    window.location.href = row.dataset.href;
  });
})();
