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
  const matchesBody = document.querySelector('#live-matches tbody');
  const leaguesRoot = document.getElementById('live-leagues');
  const totalEl = document.getElementById('live-total');
  const statusEl = document.getElementById('live-status');
  const updatedEl = document.getElementById('live-updated');
  const pulseEl = document.getElementById('live-pulse');

  function esc(s) {
    const d = document.createElement('span');
    d.textContent = s;
    return d.innerHTML;
  }

  function render(live) {
    if (totalEl) totalEl.textContent = live.totalLive == null ? '–' : live.totalLive;
    playersBody.innerHTML = live.myPlayers
      .map(function (p) {
        return (
          '<tr' + (p.onBench ? ' style="opacity:.55"' : '') + '><td><strong>' + esc(p.name) + '</strong>' +
          (p.isCaptain ? ' <b class="cap">C</b>' : '') + ' <span class="dim">' + esc(p.team) + '</span></td>' +
          '<td class="num">' + p.minutes + "'</td>" +
          '<td class="num">' + p.points + '</td>' +
          '<td class="num">' + (p.bonusEst > 0 ? '+' + p.bonusEst : '–') + '</td>' +
          '<td class="num"><strong>' + p.effective + '</strong></td></tr>'
        );
      })
      .join('');
    matchesBody.innerHTML = live.matches
      .map(function (m) {
        const status = m.finished ? 'Slutt' : m.started ? m.minutes + "'" : 'Ikke startet';
        const score = m.homeScore == null ? '–' : m.homeScore + ' – ' + m.awayScore;
        return '<tr><td>' + esc(m.home) + ' – ' + esc(m.away) + '</td><td class="num">' + score + '</td><td>' + status + '</td></tr>';
      })
      .join('');
    leaguesRoot.innerHTML = live.leagues
      .map(function (l) {
        return (
          '<section class="card"><h2>' + esc(l.name) + '</h2><div class="table-scroll"><table class="data"><thead><tr><th class="num">#</th><th>Lag</th><th class="num">GW</th><th class="num">Totalt</th></tr></thead><tbody>' +
          l.top
            .map(function (r) {
              return '<tr' + (r.me ? ' class="row-me"' : '') + '><td class="num">' + r.rank + '</td><td>' + esc(r.name) + '</td><td class="num">' + r.gw + '</td><td class="num">' + r.total + '</td></tr>';
            })
            .join('') +
          '</tbody></table></div></section>'
        );
      })
      .join('');
    statusEl.textContent = live.anyLive ? 'Kamper pågår' : 'Ingen kamper pågår akkurat nå';
    updatedEl.textContent = 'Sist oppdatert ' + new Date().toLocaleTimeString('nb-NO');
    pulseEl.classList.toggle('pulse-on', live.anyLive);
    return live.anyLive;
  }

  let anyLive = render(JSON.parse(dataEl.textContent));

  async function poll() {
    try {
      const res = await fetch('/api/live.json');
      if (!res.ok) return;
      anyLive = render(await res.json());
      if (!anyLive) clearInterval(timer);
    } catch {
      // Nettverksglipp — prøver igjen neste tick.
    }
  }

  // Poll KUN mens kamper pågår — aldri utenfor kampvinduer.
  let timer = null;
  if (anyLive) timer = setInterval(poll, 60000);
})();
