(() => {
  const $=id=>document.getElementById(id),model=HabitModel,view=new URLSearchParams(location.search).get('view')||'preview';
  document.documentElement.dataset.view=view;
  const preview=()=>dash.preview||view==='preview';
  let ready=false,busy=false,page=0,demo=null;
  const drafts=new Map();
  function config(){return model.normalize(preview()?(demo||{habits:[{id:'walk',name:dash.t('Marcher 20 minutes','Walk for 20 minutes'),days:[model.day()]},{id:'read',name:dash.t('Lire quelques pages','Read a few pages'),days:[]}]}):dash.config);}
  function button(text,click){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=click;b.disabled=busy||!ready;return b;}
  function render(){
    const current=config(),today=model.day(),done=current.habits.filter(h=>h.days.includes(today)).length;
    $('heading').textContent=dash.t('Un jour à la fois','One day at a time');$('summary').textContent=dash.t('Vos habitudes du jour','Your habits today');$('progress').textContent=`${done}/${current.habits.length}`;
    $('habits').replaceChildren();page=Math.min(page,Math.max(0,Math.ceil(current.habits.length/3)-1));
    if(!current.habits.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=dash.t('Ajoutez votre première habitude dans les réglages ⚙.','Add your first habit in settings ⚙.');$('habits').append(empty);}
    for(const habit of current.habits.slice(page*3,page*3+3)){
      const row=document.createElement('div');row.className='habit';
      const checked=habit.days.includes(today),check=button(checked?'✓':'○',()=>save({type:'toggle',id:habit.id}));check.className='check';check.setAttribute('aria-pressed',String(checked));check.setAttribute('aria-label',dash.t('Cocher aujourd’hui : ','Check today: ')+habit.name);
      const details=document.createElement('div'),name=document.createElement('div');name.className='habit-name';const title=document.createElement('strong');title.textContent=habit.name;title.title=habit.name;
      const streak=document.createElement('span');streak.className='streak';const count=model.streak(habit,today);streak.textContent=dash.t(`${count} j de suite`,`${count} day streak`);streak.title=dash.t('Dates consécutives cochées jusqu’à aujourd’hui ou hier (maximum 60).','Consecutive checked dates ending today or yesterday (maximum 60).');name.append(title,streak);
      const week=document.createElement('div');week.className='week';week.setAttribute('aria-label',dash.t('Sept derniers jours','Last seven days'));
      for(let offset=-6;offset<=0;offset++){const key=model.shift(today,offset),marked=habit.days.includes(key),bar=document.createElement('span');bar.className='day'+(marked?' done':'');bar.title=key+' · '+(marked?dash.t('Fait','Done'):dash.t('Non coché','Unchecked'));week.append(bar);}
      details.append(name,week);row.append(check,details);$('habits').append(row);
    }
    const pages=Math.max(1,Math.ceil(current.habits.length/3));$('previous').hidden=$('next').hidden=$('page').hidden=pages===1;$('previous').disabled=page===0;$('next').disabled=page>=pages-1;$('page').textContent=`${page+1} / ${pages}`;$('previous').setAttribute('aria-label',dash.t('Page précédente','Previous page'));$('next').setAttribute('aria-label',dash.t('Page suivante','Next page'));
    $('local-date').textContent=dash.t('Date du navigateur : ','Browser date: ')+today;
    $('settings-heading').textContent=dash.t('Vos habitudes','Your habits');$('intro').textContent=dash.t('Jusqu’à 6 habitudes. Les cases utilisent la date locale de ce navigateur.','Up to 6 habits. Checkmarks use this browser’s local date.');$('name-label').textContent=dash.t('Nouvelle habitude (60 caractères)','New habit (60 characters)');$('add').textContent=busy?dash.t('Enregistrement…','Saving…'):dash.t('Ajouter une habitude','Add habit');$('new-name').disabled=$('add').disabled=!ready||busy||current.habits.length>=6;
    $('retention').textContent=preview()?dash.t('Aperçu temporaire : rien n’est sauvegardé.','Temporary preview: nothing is saved.'):dash.t('Historique limité aux 60 dernières dates locales.','History is limited to the last 60 local dates.');$('retry').textContent=dash.t('Réessayer','Retry');
    // Keep input nodes and unsaved edits during configuration broadcasts and midnight refreshes.
    for(const node of Array.from($('editors').children))if(!current.habits.some(h=>h.id===node.dataset.id)){node.remove();drafts.delete(node.dataset.id);}
    for(const habit of current.habits){let row=Array.from($('editors').children).find(n=>n.dataset.id===habit.id);
      if(!row){row=document.createElement('div');row.className='editor';row.dataset.id=habit.id;const input=document.createElement('input');input.maxLength=120;input.value=habit.name;input.setAttribute('aria-label',dash.t('Nom de l’habitude','Habit name'));input.oninput=()=>drafts.set(habit.id,input.value);
        row.append(input,button(dash.t('Enregistrer','Save'),()=>save({type:'rename',id:habit.id,name:input.value})),button(dash.t('Supprimer','Remove'),()=>save({type:'remove',id:habit.id})));$('editors').append(row);}
      if(!drafts.has(habit.id))row.children[0].value=habit.name;
      Array.from(row.children).forEach(n=>n.disabled=busy||!ready);
      row.children[1].textContent=dash.t('Enregistrer','Save');row.children[2].textContent=dash.t('Supprimer','Remove');
    }
  }
  async function save(action){
    if(!ready||busy)return;
    if(action.name!==undefined&&(!action.name.trim()||Array.from(action.name.trim()).length>60)){$('error').textContent=dash.t('Choisissez un nom de 1 à 60 caractères.','Choose a name from 1 to 60 characters.');return;}
    busy=true;$('error').textContent='';render();
    try{
      // Re-read before applying an operation so changes from the settings/widget peer are preserved.
      if(!preview()){const loaded=await dash.request('config.get');dash.config=loaded.config||loaded;}
      const next=model.mutate(config(),action);
      if(new TextEncoder().encode(JSON.stringify(next)).length>8192)throw Error('configuration_too_large');
      if(preview())demo=next;else await dash.save(next);
      if(action.type==='add')$('new-name').value='';if(action.type==='rename')drafts.delete(action.id);
    }catch(_){$('error').textContent=dash.t('Enregistrement impossible. Votre saisie est conservée ; réessayez.','Could not save. Your draft is kept; try again.');}
    finally{busy=false;render();}
  }
  $('add-form').onsubmit=event=>{event.preventDefault();save({type:'add',id:'h-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),name:$('new-name').value});};
  $('previous').onclick=()=>{page--;render();};$('next').onclick=()=>{page++;render();};
  addEventListener('dashdock:language',render);addEventListener('dashdock:context',render);
  async function initialize(){ready=false;$('retry').hidden=true;$('error').textContent='';render();try{await dash.start();ready=true;render();}catch(_){$('error').textContent=dash.t('Chargement impossible. Réessayez avant de modifier vos habitudes.','Could not load habits. Retry before editing.');$('retry').hidden=false;}}
  $('retry').onclick=initialize;render();initialize();setInterval(render,60000);
})();
