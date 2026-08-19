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
