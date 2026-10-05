(() => {
  const translations = {
    fr: {ready:'Prêt à démarrer',running:'Chronomètre en cours',paused:'En pause',start:'Démarrer',resume:'Reprendre',pause:'Pause',reset:'Remettre à zéro',note:'Le chronomètre se réinitialise au rechargement.'},
    en: {ready:'Ready when you are',running:'Stopwatch running',paused:'Paused',start:'Start',resume:'Resume',pause:'Pause',reset:'Reset',note:'The stopwatch resets when you reload.'}
  };
  let lang = navigator.language?.startsWith('fr') ? 'fr' : 'en';
  let saved = 0, started = null, frame = null;
  const elapsed = document.querySelector('#elapsed'), toggle = document.querySelector('#toggle'), reset = document.querySelector('#reset');
  const current = () => saved + (started === null ? 0 : performance.now() - started);
  function labels() {
    const t = translations[lang];
    document.documentElement.lang = lang;
    document.querySelector('#status').textContent = started !== null ? t.running : saved > 0 ? t.paused : t.ready;
    toggle.textContent = started !== null ? t.pause : saved > 0 ? t.resume : t.start;
    reset.textContent = t.reset;
    reset.disabled = started === null && saved === 0;
    document.querySelector('#note').textContent = t.note;
  }
  function render() {
    const centiseconds = Math.floor(current() / 10), seconds = Math.floor(centiseconds / 100);
    elapsed.textContent = String(Math.floor(seconds / 60)).padStart(2,'0') + ':' + String(seconds % 60).padStart(2,'0') + '.' + String(centiseconds % 100).padStart(2,'0');
    if (started !== null) frame = requestAnimationFrame(render);
  }
  toggle.addEventListener('click', () => {
    if (started === null) started = performance.now();
    else { saved = current(); started = null; }
    cancelAnimationFrame(frame); labels(); render();
  });
  reset.addEventListener('click', () => {
    cancelAnimationFrame(frame); saved = 0; started = null; labels(); render();
  });
  document.addEventListener('dashdock:language', event => {
    if (Object.hasOwn(translations,event.detail?.lang)) { lang = event.detail.lang; labels(); }
  });
  labels(); render();
})();
