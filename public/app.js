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

// Sortering (v1.7.1): delt av spillertabellen og live-tabellen.
// 'num' tolker cellen som tall (ikke-tall teller som 0), 'text' bruker norsk locale.
function compareCells(av, bv, type) {
  return type === 'num'
    ? (parseFloat(av) || 0) - (parseFloat(bv) || 0)
    : av.localeCompare(bv, 'nb');
}

// Filterfasiten for spillertabellen: alle aktive filtre må treffe raden.
// ds er radens dataset (name/pos/team/price/status), f de valgte filtrene.
function rowMatchesFilters(ds, f) {
  return (
    (!f.q || ds.name.includes(f.q)) &&
    (!f.pos || ds.pos === f.pos) &&
    (!f.team || ds.team === f.team) &&
    (!Number.isFinite(f.maxPrice) || parseFloat(ds.price) <= f.maxPrice) &&
    (!f.status || ds.status === f.status)
  );
}

// Leser én query-parameter uten URLSearchParams (testbar i ren V8-kontekst).
function queryParam(qs, name) {
  for (const part of String(qs).replace(/^\?/, '').split('&')) {
    const i = part.indexOf('=');
    if (i > 0 && decodeURIComponent(part.slice(0, i)) === name) {
      return decodeURIComponent(part.slice(i + 1).replace(/\+/g, ' '));
    }
  }
  return null;
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

// Kantfade-tilstand for en vannrett scrollboks. Ren funksjon (testes i
// test/app-client.test.js); 4 px slingring så subpiksel-scroll ikke flimrer.
function edgeFadeState(scrollLeft, scrollWidth, clientWidth) {
  const maxScroll = scrollWidth - clientWidth;
  return { left: scrollLeft > 4, right: maxScroll - scrollLeft > 4 };
}

// Delte oppdaterere: resize treffer alle registrerte bokser; oppdaterere for
// elementer som er fjernet fra DOM (live-rerender) melder seg av selv.
const edgeFadeUpdates = new Set();

function initEdgeFades(el, prefix) {
  function update() {
    if (!el.isConnected) { edgeFadeUpdates.delete(update); return; }
    const s = edgeFadeState(el.scrollLeft, el.scrollWidth, el.clientWidth);
    el.classList.toggle(prefix + '-left', s.left);
    el.classList.toggle(prefix + '-right', s.right);
  }
  update();
  el.addEventListener('scroll', update, { passive: true });
  edgeFadeUpdates.add(update);
  return update;
}

// Modul 0: Kantfade på vannrette scrollbokser — mobilmenyen og tabellene.
// Faden vises bare mot kanter med skjult innhold. Modul 3 initierer på nytt
// for tabeller den rendrer selv.
(function () {
  'use strict';

  window.addEventListener('resize', () => {
    for (const update of edgeFadeUpdates) update();
  });

  const nav = document.querySelector('.topbar nav');
  if (nav) {
    const update = initEdgeFades(nav, 'nav-overflow');
    const active = nav.querySelector('a[aria-current="page"]');
    if (active) active.scrollIntoView({ inline: 'center', block: 'nearest' });
    requestAnimationFrame(update);
  }

  for (const box of document.querySelectorAll('.table-scroll')) {
    initEdgeFades(box, 'table-fade');
  }
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

// Modul 2: Sortering av tabeller med data-sortable (/spillere, /live).
(function () {
  'use strict';

  const tables = document.querySelectorAll('table[data-sortable]');
  if (tables.length === 0) return;

  function applySort(table, index, dir) {
    const type = table.tHead.rows[0].cells[index].dataset.type || 'text';
    const tbody = table.tBodies[0];
    const rows = [...tbody.rows];
    rows.sort((a, b) => {
      const cmp = compareCells(
        a.cells[index].textContent.trim(),
        b.cells[index].textContent.trim(),
        type,
      );
      return dir === 'descending' ? -cmp : cmp;
    });
    rows.forEach((r) => tbody.appendChild(r));
  }

  function sortBy(table, th, index) {
    const dir = th.getAttribute('aria-sort') === 'descending' ? 'ascending' : 'descending';
    [...table.tHead.rows[0].cells].forEach((h) => h.setAttribute('aria-sort', 'none'));
    th.setAttribute('aria-sort', dir);
    applySort(table, index, dir);
  }

  tables.forEach((table) => {
    [...table.tHead.rows[0].cells].forEach((th, index) => {
      // Duell-kolonnen på /spillere holder avkrysningsbokser, ikke data.
      if (th.hasAttribute('data-nosort')) return;
      th.tabIndex = 0;
      th.addEventListener('click', () => sortBy(table, th, index));
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          sortBy(table, th, index);
        }
      });
    });
  });

  // Live-tabellen bytter ut radene sine ved hver polling og re-appliserer
  // gjeldende sortering med denne (modul 3).
  window.reapplySort = function (table) {
    const headers = [...table.tHead.rows[0].cells];
    const index = headers.findIndex((h) => {
      const s = h.getAttribute('aria-sort');
      return s === 'ascending' || s === 'descending';
    });
    if (index !== -1) applySort(table, index, headers[index].getAttribute('aria-sort'));
  };
})();

// Modul 2b: Filtrering av spillertabellen (/spillere), uten sidelasting.
(function () {
  'use strict';

  const table = document.getElementById('players-table');
  if (!table) return;

  const tbody = table.tBodies[0];
  const search = document.getElementById('filter-search');
  const position = document.getElementById('filter-position');
  const team = document.getElementById('filter-team');
  const price = document.getElementById('filter-price');
  const status = document.getElementById('filter-status');
  const reset = document.getElementById('filter-reset');
  const count = document.getElementById('filter-count');
  const empty = document.getElementById('players-empty');
  const emptyReset = document.getElementById('players-empty-reset');

  function applyFilters() {
    const filters = {
      q: search.value.trim().toLowerCase(),
      pos: position.value,
      team: team.value,
      maxPrice: parseFloat(price.value),
      status: status.value,
    };
    let shown = 0;
    const total = tbody.rows.length;

    for (const row of tbody.rows) {
      const ok = rowMatchesFilters(row.dataset, filters);
      row.hidden = !ok;
      if (ok) shown++;
    }
    count.textContent = 'Viser ' + shown + ' av ' + total + ' spillere';
    if (empty) empty.hidden = shown !== 0;
  }

  search.addEventListener('input', applyFilters);
  position.addEventListener('change', applyFilters);
  team.addEventListener('change', applyFilters);
  price.addEventListener('input', applyFilters);
  status.addEventListener('change', applyFilters);
  reset.addEventListener('click', () => {
    search.value = '';
    position.value = '';
    team.value = '';
    price.value = '';
    status.value = '';
    applyFilters();
  });
  if (emptyReset) emptyReset.addEventListener('click', () => reset.click());

  // Krysslenker (v1.7.1): /spillere?sok=Haaland prefyller søket.
  const preSearch = queryParam(location.search, 'sok');
  if (preSearch) search.value = preSearch;
  const prePos = queryParam(location.search, 'pos');
  if (prePos) position.value = prePos;

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
  const playersCount = document.getElementById('live-count-players');
  const matchesCount = document.getElementById('live-count-matches');
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
    // Radene er nye — legg dem i samme rekkefølge som brukerens valgte sortering.
    if (window.reapplySort) window.reapplySort(document.getElementById('live-players'));
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
    if (playersCount) playersCount.textContent = live.myPlayers.length;
    if (matchesCount) matchesCount.textContent = live.matches.length;
    leaguesRoot.innerHTML = live.leagues
      .map(function (l) {
        return (
          '<section class="card"><h2><span class="h2-title">' + escapeHtml(l.name) + '</span><span class="dim">' + l.top.length + '</span></h2><div class="table-scroll"><table class="data"><thead><tr><th class="num">#</th><th>Lag</th><th class="num">GW</th><th class="num">Totalt</th></tr></thead><tbody>' +
          l.top
            .map(function (r) {
              return '<tr' + (r.me ? ' class="row-me"' : '') + '><td class="num">' + r.rank + '</td><td>' + escapeHtml(r.name) + '</td><td class="num">' + r.gw + '</td><td class="num">' + r.total + '</td></tr>';
            })
            .join('') +
          '</tbody></table></div></section>'
        );
      })
      .join('');
    for (const box of leaguesRoot.querySelectorAll('.table-scroll')) {
      initEdgeFades(box, 'table-fade');
    }
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

// Delt med testene (test/app-client.test.js): klient-speilet av planlegger-
// reglene. Serveren (validateScenario i scenarios.js) er alltid fasit —
// dette er bare umiddelbar tilbakemelding i UI-et. ok: true/false/null
// (null = kan ikke avgjøres, f.eks. ukjent salgspris).
function plannerRules({ out, inn, bank, squad }) {
  if (!out || !inn) return [];
  const budsjettOk =
    out.sellPrice != null && inn.pris != null && bank != null
      ? out.sellPrice + bank >= inn.pris
      : null;
  const sammeKlubb = (squad || []).filter(
    (s) => s.lagKode != null && s.lagKode === inn.lagKode && s.id !== out.id,
  ).length;
  return [
    { kode: 'posisjon', ok: out.pos === inn.pos, tekst: 'Samme posisjon' },
    { kode: 'budsjett', ok: budsjettOk, tekst: 'Innenfor budsjett (salgspris + bank)' },
    { kode: 'klubbtak', ok: sammeKlubb + 1 <= 3, tekst: 'Maks 3 fra samme klubb' },
  ];
}

// Modul 7: Utvidbare rader (/overganger) — per-runde-detaljene for et bytte.
// Kantfaden kan først initieres når raden faktisk vises (skjulte bokser har
// ingen bredde å måle).
(function () {
  'use strict';
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-expand');
    if (!btn) return;
    const detail = btn.closest('tr')?.nextElementSibling;
    if (!detail || !detail.classList.contains('row-detail')) return;
    const show = detail.hidden;
    detail.hidden = !show;
    btn.setAttribute('aria-expanded', String(show));
    const icon = btn.querySelector('[aria-hidden]');
    if (icon) icon.textContent = show ? '−' : '+';
    if (show && !detail.dataset.fadeInit) {
      detail.dataset.fadeInit = '1';
      for (const box of detail.querySelectorAll('.table-scroll')) {
        initEdgeFades(box, 'table-fade');
      }
    }
  });
})();

// Modul 8: Hva hvis-planleggeren (/overganger). Datagrunnlaget hentes lazy
// ved første åpning — en sidevisning koster aldri payloaden. Reglene speiles
// med plannerRules(); serveren er fasit ved lagring.
(function () {
  'use strict';
  const root = document.getElementById('planner-root');
  if (!root) return;

  const POS = { 1: 'K', 2: 'F', 3: 'M', 4: 'A' };
  const STATUS = { a: 'Tilgjengelig', d: 'Tvilsom', i: 'Skadet', s: 'Utestengt', u: 'Utilgjengelig', n: 'Ikke i troppen' };
  const pris = (n) => (n == null ? '–' : (n / 10).toFixed(1));
  const tall = (n) => (n == null ? '–' : String(n));

  let data = null;
  let ut = null;
  let inn = null;

  // Deles av planleggeren og «egen kandidat»-søket i detaljradene.
  async function ensureData() {
    if (data) return data;
    const res = await fetch(root.dataset.endpoint);
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
    return data;
  }

  root.addEventListener('click', async (e) => {
    const load = e.target.closest('#planner-load');
    if (load) {
      load.disabled = true;
      load.textContent = 'Henter …';
      try {
        await ensureData();
        renderControls();
      } catch {
        load.disabled = false;
        load.textContent = 'Kunne ikke hente — prøv igjen';
      }
      return;
    }
    const hit = e.target.closest('li[data-id]');
    if (hit) {
      inn = data.players.find((p) => p.id === Number(hit.dataset.id)) ?? null;
      const search = document.getElementById('planner-search');
      if (search && inn) search.value = inn.navn;
      const box = document.getElementById('planner-hits');
      if (box) box.innerHTML = '';
      renderCompare();
    }
  });

  function renderControls() {
    root.innerHTML = [
      '<div class="planner-grid">',
      '<label>Ut av laget',
      '<select id="planner-out"><option value="">Velg spiller …</option>',
      data.squad
        .map((s) => `<option value="${s.id}">${escapeHtml(s.navn)} (${POS[s.pos] ?? '?'} · selges for ${pris(s.sellPrice)})</option>`)
        .join(''),
      '</select></label>',
      '<label>Inn i laget',
      '<input type="search" id="planner-search" placeholder="Søk spiller …" autocomplete="off">',
      '</label></div>',
      '<ul id="planner-hits" class="planner-hits"></ul>',
      '<div id="planner-compare"></div>',
    ].join('');
    document.getElementById('planner-out').addEventListener('change', (e) => {
      ut = data.squad.find((s) => s.id === Number(e.target.value)) ?? null;
      renderCompare();
    });
    document.getElementById('planner-search').addEventListener('input', (e) => {
      renderHits(e.target.value);
    });
  }

  function renderHits(q) {
    const box = document.getElementById('planner-hits');
    const query = q.trim().toLowerCase();
    if (query.length < 2) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = data.players
      .filter((p) => p.navn.toLowerCase().includes(query))
      .slice(0, 8)
      .map((p) => `<li data-id="${p.id}"><button type="button">${escapeHtml(p.navn)} <span class="dim">${escapeHtml(p.lag ?? '?')} · ${POS[p.pos] ?? '?'} · ${pris(p.pris)}</span></button></li>`)
      .join('');
  }

  function statusText(p) {
    const label = STATUS[p.status] ?? '–';
    return p.status === 'd' && p.sjanse != null ? `${label} (${p.sjanse} %)` : label;
  }

  function renderCompare() {
    const box = document.getElementById('planner-compare');
    if (!ut || !inn) {
      box.innerHTML = '';
      return;
    }
    const utSpiller = data.players.find((p) => p.id === ut.id) ?? {};
    const rad = (label, a, b) => `<tr><th>${label}</th><td class="num">${a}</td><td class="num">${b}</td></tr>`;
    const regler = plannerRules({ out: ut, inn, bank: data.bank, squad: data.squad });
    box.innerHTML = [
      '<div class="table-scroll"><table class="data compare">',
      `<thead><tr><th></th><th class="num">Ut: ${escapeHtml(ut.navn)}</th><th class="num">Inn: ${escapeHtml(inn.navn)}</th></tr></thead>`,
      '<tbody>',
      rad('Pris (£m)', pris(utSpiller.pris), pris(inn.pris)),
      rad('Salgspris (£m)', pris(ut.sellPrice), '–'),
      rad('Form', tall(utSpiller.form), tall(inn.form)),
      rad('Forventet poeng', tall(utSpiller.epNext), tall(inn.epNext)),
      rad('FDR neste 3', utSpiller.fdr3 == null ? '–' : utSpiller.fdr3.toFixed(1), inn.fdr3 == null ? '–' : inn.fdr3.toFixed(1)),
      rad('Eid av (%)', tall(utSpiller.eid), tall(inn.eid)),
      rad('Status', statusText(utSpiller), statusText(inn)),
      '</tbody></table></div>',
      '<ul class="rule-check">',
      regler
        .map((r) => `<li class="${r.ok === true ? 'ok' : r.ok === false ? 'brudd' : ''}">${r.ok === true ? '✓' : r.ok === false ? '✕' : '?'} ${escapeHtml(r.tekst)}</li>`)
        .join(''),
      '</ul>',
      `<p class="dim">Bank: ${pris(data.bank)} £m · reglene sjekkes endelig ved lagring.</p>`,
      '<div class="planner-save">',
      '<input id="planner-name" maxlength="60" placeholder="Navn (f.eks. Plan A)" aria-label="Navn på scenarioet">',
      `<input id="planner-event" type="number" min="1" max="38" value="${Number(data.event) || 1}" aria-label="Runde">`,
      '<button type="button" class="btn-link" id="planner-save-btn">Lagre som scenario</button>',
      '<span id="planner-save-msg" class="dim" role="status"></span>',
      '</div>',
    ].join('');
    for (const scroll of box.querySelectorAll('.table-scroll')) {
      initEdgeFades(scroll, 'table-fade');
    }
    document.getElementById('planner-save-btn').addEventListener('click', saveScenario);
  }

  async function saveScenario() {
    const msg = document.getElementById('planner-save-msg');
    const btn = document.getElementById('planner-save-btn');
    btn.disabled = true;
    msg.textContent = 'Lagrer …';
    try {
      const res = await fetch('/api/scenarier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.getElementById('planner-name').value,
          event: Number(document.getElementById('planner-event').value),
          moves: [{ out: ut.id, in: inn.id }],
        }),
      });
      if (res.status === 201) {
        window.location.reload(); // scenariolista rendres av serveren
        return;
      }
      const body = await res.json().catch(() => ({}));
      msg.textContent = (body.errors ?? []).map((e) => e.message).join(' ') || 'Kunne ikke lagre.';
    } catch {
      msg.textContent = 'Kunne ikke lagre — prøv igjen.';
    }
    btn.disabled = false;
  }

  // «Egen kandidat» i detaljradene: søk i samme spillerliste som
  // planleggeren (hentes ved behov), poengene hentes fra /api/alternativ.json.
  document.addEventListener('input', async (e) => {
    const input = e.target.closest('.alt-sok');
    if (!input) return;
    const hits = input.closest('.alt-egen').querySelector('.alt-hits');
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      hits.innerHTML = '';
      return;
    }
    try {
      await ensureData();
    } catch {
      hits.innerHTML = '<li class="dim">Kunne ikke hente spillerlisten — prøv igjen.</li>';
      return;
    }
    hits.innerHTML = data.players
      .filter((p) => p.navn.toLowerCase().includes(query))
      .slice(0, 6)
      .map((p) => `<li data-alt-id="${p.id}"><button type="button">${escapeHtml(p.navn)} <span class="dim">${escapeHtml(p.lag ?? '?')} · ${pris(p.pris)}</span></button></li>`)
      .join('');
  });

  document.addEventListener('click', async (e) => {
    const li = e.target.closest('li[data-alt-id]');
    if (!li) return;
    const box = li.closest('.alt-egen');
    const resultater = box.querySelector('.alt-resultater');
    const id = Number(li.dataset.altId);
    const navn = data?.players.find((p) => p.id === id)?.navn ?? `Spiller ${id}`;
    box.querySelector('.alt-hits').innerHTML = '';
    box.querySelector('.alt-sok').value = '';
    try {
      const res = await fetch(`/api/alternativ.json?spiller=${id}&fra=${box.dataset.fra}&til=${box.dataset.til}`);
      if (!res.ok) throw new Error(String(res.status));
      const r = await res.json();
      const delta = r.points - Number(box.dataset.innpoints);
      resultater.insertAdjacentHTML(
        'beforeend',
        `<li>${escapeHtml(navn)} — ${r.points} p (${delta > 0 ? '+' + delta : delta} mot ditt valg)</li>`,
      );
    } catch {
      resultater.insertAdjacentHTML('beforeend', '<li>Kunne ikke hente poengene — prøv igjen.</li>');
    }
  });

  // Slett-knappene i scenariolista (server-rendret, utenfor planner-root).
  document.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-scenario-delete]');
    if (!del) return;
    del.disabled = true;
    try {
      const res = await fetch(`/api/scenarier/${encodeURIComponent(del.dataset.scenarioDelete)}`, {
        method: 'DELETE',
      });
      if (res.status === 204) {
        del.closest('.scenario')?.remove();
        return;
      }
    } catch {
      // faller gjennom til re-aktivering
    }
    del.disabled = false;
  });
})();

// Modul 9: rival-valget paa /liga huskes (v1.6.0). Ren beslutningsfunksjon
// (testes i test/app-client.test.js) + init som lagrer valget i
// localStorage og redirecter EN gang naar siden aapnes uten ?rival=.
// Param i URL-en treffer alltid store-grenen, saa redirect kan aldri loope.
function rivalNavAction({ search, stored, validIds }) {
  const m = /[?&]rival=(\d+)/.exec(search || '');
  if (m) return { type: 'store', value: m[1] };
  if (stored && validIds.has(stored)) return { type: 'redirect', to: '/liga?rival=' + stored };
  if (stored) return { type: 'clear' };
  return { type: 'none' };
}

(function initRivalPicker() {
  const select = document.getElementById('rival-select');
  if (!select) return;
  const form = document.getElementById('rival-form');
  select.addEventListener('change', () => {
    if (form) form.submit();
  });

  let stored = null;
  try {
    stored = localStorage.getItem('fpl-rival');
  } catch {
    return; // localStorage utilgjengelig (privat modus) - dropdownen virker fortsatt
  }
  const validIds = new Set(Array.from(select.options).map((o) => o.value));
  const action = rivalNavAction({ search: location.search, stored, validIds });
  try {
    if (action.type === 'store') localStorage.setItem('fpl-rival', action.value);
    else if (action.type === 'clear') localStorage.removeItem('fpl-rival');
  } catch {
    return;
  }
  if (action.type === 'redirect') location.replace(action.to);
})();
