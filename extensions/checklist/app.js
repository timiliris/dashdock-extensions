const t = (key,params) => window.WidgetI18n.t(key,params);
(() => {
  const tasks = [], list = document.getElementById('tasks'), input = document.getElementById('task'), form=document.getElementById('form'), note=document.getElementById('storage');
  let ready=false, dirty=false, saving=false, failed=false, config={}, writes=Promise.resolve();
  const text=(fr,en)=>WidgetI18n.lang()==='en'?en:fr;
  function storageStatus() {
    note.textContent=!ready?failed?text('Chargement impossible. Réessayez.','Unable to load tasks. Try again.'):text('Chargement des tâches…','Loading tasks…'):failed?text('Échec de sauvegarde. Réessayez.','Save failed. Try again.'):saving?text('Enregistrement…','Saving…'):WidgetStore.preview()?text('Aperçu : tâches non enregistrées.','Preview: tasks are not saved.'):text('Tâches enregistrées pour ce widget.','Tasks saved for this widget.');
    document.getElementById('retry').hidden=!failed;
  }
  function save() {
    dirty=true;saving=true;failed=false;storageStatus();
    const snapshot=tasks.map(task=>({...task}));
    const write=writes.then(()=>WidgetStore.save({...config,tasks:snapshot}));
    writes=write.catch(()=>{}); const settled=writes;
    write.then(()=>{if(writes===settled) {saving=false;dirty=false;failed=false;storageStatus();}}).catch(()=>{if(writes===settled){saving=false;failed=true;storageStatus();}});
  }
  document.addEventListener('dashdock:language',render);
  function render() {
    list.replaceChildren();
    tasks.forEach(task => {
      const row = document.createElement('li'), label = document.createElement('label'), check = document.createElement('input'), text = document.createElement('span'), remove = document.createElement('button');
      row.className = 'task'; check.type = 'checkbox'; check.checked = task.done; text.textContent = task.text; remove.textContent = '×'; remove.setAttribute('aria-label', t('removeTask',{text:task.text}));
      check.onchange = () => { task.done = check.checked; updateCount(); save(); };
      remove.onclick = () => { tasks.splice(tasks.indexOf(task), 1); render(); save(); input.focus(); };
      label.append(check, text); row.append(label, remove); list.append(row);
    });
    updateCount();storageStatus();
  }
  function updateCount() {
    const done = tasks.filter(task => task.done).length;
    document.getElementById('count').textContent = tasks.length ? t('completed',{done,count:tasks.length}) : t('Votre liste est vide.');
    document.getElementById('clear').disabled = !ready || done === 0;
    input.disabled=!ready || tasks.length>=16;form.querySelector('button').disabled=input.disabled;
    if(tasks.length>=16) document.getElementById('count').textContent+=text(' · Limite de 16 tâches',' · 16-task limit');
    document.getElementById('retry').textContent=text('Réessayer','Retry');
  }
  async function load() {
    ready=false;failed=false;render();
    try {
      config=await WidgetStore.get();
      tasks.splice(0,tasks.length,...(Array.isArray(config.tasks)?config.tasks:[]).filter(task=>typeof task?.text==='string'&&task.text.trim()).slice(0,16).map(task=>({text:task.text.slice(0,100),done:task.done===true})));
      ready=true;
    } catch {failed=true;storageStatus();return;}
    render();
  }
  document.addEventListener('dashdock:storage-context',storageStatus);
  form.onsubmit = event => { event.preventDefault(); const value = input.value.trim(); if (!ready || !value || tasks.length>=16) return; tasks.push({text:value.slice(0,100),done:false}); input.value='';render();save();list.scrollTop=list.scrollHeight;input.focus(); };
  document.getElementById('clear').onclick = () => {for(let index=tasks.length-1;index>=0;index--) if(tasks[index].done) tasks.splice(index,1);render();save();};
  document.getElementById('retry').onclick=()=>ready&&dirty?save():load();
  load();
})();
