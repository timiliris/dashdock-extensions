(() => {
  const $=id=>document.getElementById(id), view=new URLSearchParams(location.search).get('view') || 'preview';
  document.documentElement.dataset.view=view;
  const preview=()=>dash.preview || view==='preview';
  const demoTarget=new Date(Date.now()+7*86400000+3*3600000).toISOString();
  let ready=false,busy=false,dirty=false;
  function event() {
    const config=dash.config;
    if(typeof config.target==='string' && typeof config.name==='string' && config.name.trim() && Number.isFinite(Date.parse(config.target))) return {name:config.name.slice(0,100),target:new Date(config.target)};
    return preview()?{name:dash.t('Prochain événement','Next event'),target:new Date(demoTarget)}:null;
  }
  function localInput(date) {
    const pad=value=>String(value).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function renderTimer() {
    const current=event(),remaining=current?Math.max(0,Math.ceil((current.target.getTime()-Date.now())/1000)):null;
    $('state').textContent=!current?dash.t('À configurer','Set up your event'):remaining===0?dash.t('Événement atteint','Event reached'):dash.t('À venir','Upcoming');
    $('state').className=remaining===0?'pill complete':'pill';
    $('title').textContent=current?.name || dash.t('Votre prochain rendez-vous','Your next milestone');
    $('date').textContent=current?new Intl.DateTimeFormat(dash.lang==='fr'?'fr-FR':'en-GB',{dateStyle:'medium',timeStyle:'short'}).format(current.target):'';
    const values=remaining===null?['—','—','—','—']:[Math.floor(remaining/86400),Math.floor(remaining/3600)%24,Math.floor(remaining/60)%60,remaining%60];
    ['days','hours','minutes','seconds'].forEach((id,index)=>$(id).textContent=remaining===null?'—':String(values[index]).padStart(2,'0'));
    $('days-label').textContent=dash.t('jours','days');$('hours-label').textContent=dash.t('heures','hours');$('minutes-label').textContent=dash.t('min','min');$('seconds-label').textContent=dash.t('sec','sec');
    $('hint').textContent=!current?dash.t('Choisissez une date dans les réglages ⚙.','Choose a date in settings ⚙.'):remaining===0?dash.t('Le grand moment est arrivé.','The moment has arrived.'):dash.t('Chaque seconde vous rapproche.','Getting closer every second.');
  }
  function render(syncDraft=false) {
    renderTimer();
    $('intro').textContent=preview()?dash.t('Installez l’extension pour choisir votre événement.','Install this extension to choose your event.'):dash.t('La date est sauvegardée : le compte à rebours continue après un redémarrage.','The date is saved: the countdown continues after a restart.');
    $('name-label').textContent=dash.t('Nom de l’événement','Event name');$('target-label').textContent=dash.t('Date et heure','Date and time');
    const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
    $('timezone').textContent=dash.t('Heure locale de votre navigateur : ','Your browser’s local time: ')+zone;
    $('save').textContent=busy?dash.t('Enregistrement…','Saving…'):dash.t('Enregistrer l’événement','Save event');
    $('retry').textContent=dash.t('Réessayer','Retry');
    for(const id of ['name','target','save'])$(id).disabled=!ready||busy||preview();
    if(syncDraft && !dirty){const current=event();$('name').value=current?.name||'';$('target').value=current?localInput(current.target):'';}
  }
  $('name').oninput=$('target').oninput=()=>{dirty=true;};
  $('form').onsubmit=async e=>{
    e.preventDefault();if(!ready||busy||preview())return;
    const name=$('name').value.trim(),value=$('target').value,date=new Date(value);
    // datetime-local is converted once to UTC; reject overflow dates and DST gaps rather than silently changing the event.
    if(!name||name.length>100||!value||!Number.isFinite(date.getTime())||localInput(date)!==value){$('error').textContent=dash.t('Indiquez un nom et une date locale valide.','Enter a name and a valid local date.');return;}
    busy=true;$('error').textContent='';render();
    try{await dash.save({...dash.config,name,target:date.toISOString()});dirty=false;}
    catch(_){$('error').textContent=dash.t('Enregistrement impossible. Votre saisie est conservée.','Could not save. Your draft has been kept.');}
    finally{busy=false;render(true);}
  };
  addEventListener('dashdock:language',()=>render());addEventListener('dashdock:context',()=>render(true));
  async function initialize(){
    $('retry').hidden=true;$('error').textContent='';
    try{await dash.start();ready=true;render(true);}
    catch(_){$('error').textContent=dash.t('Impossible de charger l’événement. Réessayez avant de le modifier.','Could not load the event. Retry before editing it.');$('retry').hidden=false;}
  }
  $('retry').onclick=initialize;render();initialize();setInterval(renderTimer,1000);
})();
