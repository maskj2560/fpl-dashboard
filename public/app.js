// Nedtelling til neste deadline. Leser ISO-tidspunkt fra data-deadline.
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
