(() => {
  const translations = {
    fr: {ready:'Prêt à démarrer',running:'Chronomètre en cours',paused:'En pause',start:'Démarrer',resume:'Reprendre',pause:'Pause',reset:'Remettre à zéro',note:'Le chronomètre se réinitialise au rechargement.'},
    en: {ready:'Ready when you are',running:'Stopwatch running',paused:'Paused',start:'Start',resume:'Resume',pause:'Pause',reset:'Reset',note:'The stopwatch resets when you reload.'}
  };
  let lang = navigator.language?.startsWith('fr') ? 'fr' : 'en';
  let saved = 0, started = null, frame = null;
  const elapsed = document.querySelector('#elapsed'), toggle = document.querySelector('#toggle'), reset = document.querySelector('#reset');
  const current = () => saved + (started === null ? 0 : performance.now() - started);
  function command(action) {
    if (action === 'start') { if (started === null) started = performance.now(); }
    else if (action === 'pause') { if (started !== null) { saved = current(); started = null; } }
    else if (action === 'reset') { saved = 0; started = null; }
    else throw new Error('unsupported_action');
    cancelAnimationFrame(frame); labels(); render();
    return {running:started !== null, elapsed_ms:Math.floor(current())};
  }
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
    command(started === null ? 'start' : 'pause');
  });
  reset.addEventListener('click', () => {
    command('reset');
  });
  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'dashdock:action') return;
    const {requestId,action,arguments:args} = event.data;
    if (typeof requestId !== 'string' || requestId.length > 100) return;
    let response;
    try {
      if (args && (typeof args !== 'object' || Array.isArray(args) || Object.keys(args).length)) throw new Error('invalid_arguments');
      response = {result:command(action)};
    } catch (error) { response = {error:error.message}; }
    parent.postMessage({type:'dashdock:action-result',requestId,...response},'*');
  });
  document.addEventListener('dashdock:language', event => {
    if (Object.hasOwn(translations,event.detail?.lang)) { lang = event.detail.lang; labels(); }
  });
  labels(); render();
  parent.postMessage({type:'dashdock:ready',actions:['start','pause','reset']},'*');
})();
