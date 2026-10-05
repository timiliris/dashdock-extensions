const t = (key,params) => window.WidgetI18n.t(key,params);
(() => {
  let shown = new Date(); shown.setDate(1);
  const calendar = document.getElementById('calendar');
  function render() {
    const today = new Date();
    document.getElementById('month').textContent = shown.toLocaleDateString(window.WidgetI18n.lang()==='fr'?'fr-FR':'en-GB', {month: 'long', year: 'numeric'});
    calendar.replaceChildren();
    for (const weekday of (window.WidgetI18n.lang()==='fr'?['Lu','Ma','Me','Je','Ve','Sa','Di']:['Mo','Tu','We','Th','Fr','Sa','Su'])) { const cell = document.createElement('div'); cell.className = 'weekday'; cell.textContent = weekday; calendar.append(cell); }
    const start = new Date(shown.getFullYear(), shown.getMonth(), 1);
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    for (let index = 0; index < 42; index++) {
      const date = new Date(start); date.setDate(start.getDate() + index);
      const current = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
      const cell = document.createElement('div'); cell.className = `day${date.getMonth() !== shown.getMonth() ? ' outside' : ''}${current ? ' today' : ''}`; cell.textContent = date.getDate(); cell.setAttribute('aria-label', date.toLocaleDateString(window.WidgetI18n.lang()==='fr'?'fr-FR':'en-GB', {dateStyle: 'full'})); if (current) cell.setAttribute('aria-current', 'date'); calendar.append(cell);
    }
  }
  document.getElementById('prev').onclick = () => { shown.setMonth(shown.getMonth() - 1); render(); };
  document.getElementById('next').onclick = () => { shown.setMonth(shown.getMonth() + 1); render(); };
  document.getElementById('today').onclick = () => { shown = new Date(); shown.setDate(1); render(); };
  document.addEventListener('dashdock:language',render);
  setInterval(render, 60000);
  render();
})();
