const t = (key,params) => window.WidgetI18n.t(key,params);
(() => {
  let mode = 'work', remaining = 1500, deadline = null, statusKey = 'Prêt pour une session.';
  let focusMinutes=25, breakMinutes=5, touched=false, ready=false, saving=false, failed=false, loadFailed=false, config={};
  const text=(fr,en)=>WidgetI18n.lang()==='en'?en:fr;
  const settings=document.getElementById('duration-form'), saveButton=document.getElementById('save');
  const duration=()=> (mode==='work'?focusMinutes:breakMinutes)*60;
  const minutes=value=>Number.isInteger(value)&&value>=1&&value<=180;
  function settingsLabels() {
    document.getElementById('work').textContent=text(`Focus · ${focusMinutes} min`,`Focus · ${focusMinutes} min`);
    document.getElementById('break').textContent=text(`Pause · ${breakMinutes} min`,`Break · ${breakMinutes} min`);
    document.getElementById('settings-label').textContent=text('Durées du minuteur','Timer durations');
    document.getElementById('focus-label').textContent=text('Focus (min)','Focus (min)');
    document.getElementById('break-label').textContent=text('Pause (min)','Break (min)');
    saveButton.textContent=saving?text('Enregistrement…','Saving…'):failed||loadFailed?text('Réessayer','Retry'):text('Enregistrer','Save');
    saveButton.disabled=(!ready&&!loadFailed)||saving;
    document.getElementById('storage').textContent=loadFailed?text('Chargement impossible. Réessayez.','Unable to load settings. Try again.'):!ready?text('Chargement des réglages…','Loading settings…'):failed?text('Réglages non enregistrés. Réessayez.','Settings not saved. Try again.'):WidgetStore.preview()?text('Aperçu : réglages non enregistrés.','Preview: settings are not saved.'):touched?text('Nouvelles durées appliquées à la prochaine session.','New durations apply to the next session.'):text('Durées enregistrées. Minuteur réinitialisé au rechargement.','Durations saved. Timer resets when you reload.');
  }
  const clock = document.getElementById('clock'), toggle = document.getElementById('toggle'), status = document.getElementById('status');
  function setStatus(key) { statusKey=key;status.textContent=t(key); }
  document.addEventListener('dashdock:language',()=>{draw();setStatus(statusKey);settingsLabels();});
  document.addEventListener('dashdock:storage-context',settingsLabels);
  function draw() {
    clock.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
    toggle.textContent = deadline === null ? (remaining === 0 ? t("Recommencer") : t("Démarrer")) : t("Mettre en pause");
  }
  function reset() { touched=false;deadline = null; remaining = duration(); setStatus('Prêt pour une session.'); draw();settingsLabels(); }
  for (const id of ['work', 'break']) document.getElementById(id).onclick = () => {
    mode = id;
    for (const name of ['work', 'break']) document.getElementById(name).setAttribute('aria-pressed', String(name === id));
    reset();
  };
  toggle.onclick = () => {
    touched=true;
    if (deadline !== null) { remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); deadline = null; setStatus('Session en pause.'); }
    else { if (remaining === 0) remaining = duration(); deadline = Date.now() + remaining * 1000; setStatus(mode === 'work' ? 'Une chose à la fois.' : 'Prenez une respiration.'); }
    draw();
  };
  document.getElementById('reset').onclick = reset;
  settings.onsubmit=async event=>{
    event.preventDefault();if(!ready||saving) return;
    const work=Number(document.getElementById('focus-min').value), rest=Number(document.getElementById('break-min').value);
    if(!minutes(work)||!minutes(rest)) return;
    saving=true;failed=false;settingsLabels();
    try {
      config=await WidgetStore.save({...config,focusMinutes:work,breakMinutes:rest});
      focusMinutes=work;breakMinutes=rest;
      if(!touched) {remaining=duration();draw();}
    } catch {failed=true;} finally {saving=false;settingsLabels();}
  };
  async function load() {
    loadFailed=false;
    settingsLabels();
    try {
      config=await WidgetStore.get();
      if(minutes(config.focusMinutes)) focusMinutes=config.focusMinutes;
      if(minutes(config.breakMinutes)) breakMinutes=config.breakMinutes;
      document.getElementById('focus-min').value=focusMinutes;document.getElementById('break-min').value=breakMinutes;
      ready=true;if(!touched){remaining=duration();draw();}
    } catch {
      loadFailed=true;settingsLabels();return;
    }
    settingsLabels();
  }
  saveButton.addEventListener('click',event=>{if(!ready){event.preventDefault();load();}});
  load();
  draw();setStatus(statusKey);
  setInterval(() => { if (deadline === null) return; remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); if (remaining === 0) { deadline = null; setStatus(mode === 'work' ? 'Session terminée. Place à la pause !' : 'Pause terminée. Prêt à repartir ?'); } draw(); }, 250);
})();
