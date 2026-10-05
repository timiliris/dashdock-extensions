(() => {
  const $ = id => document.getElementById(id);
  let targets = [], latest = null, busy = false, ready = false, history = null, trackingBusy = false;
  const preview = () => dash.preview || document.documentElement.dataset.view === 'preview';
  function renderHistory() {
    const enabled = !!history?.enabled;
    $('history').hidden = !enabled;
    $('tracking').checked = enabled;
    $('tracking').disabled = busy || trackingBusy || !ready || !dash.config.target || preview();
    $('tracking-label').textContent = dash.t('Activer le suivi', 'Enable monitoring');
    $('tracking-description').textContent = dash.t('Une mesure par minute, conservée 24 h. Le suivi continue lorsque le dashboard est fermé et est partagé entre les widgets de ce service.', 'One check per minute, kept for 24 hours. Monitoring continues when the dashboard is closed and is shared across widgets for this service.');
    $('history-title').textContent = dash.t('Évolution de la latence', 'Latency over time');
    $('range').setAttribute('aria-label', dash.t('Période du graphique', 'Chart time range'));
    const time = Math.floor(Date.now()/1000), hours = Number($('range').value)||24, start = time-hours*3600;
    const points = (history?.points || []).filter(p => Number.isFinite(p.checked_at) && p.checked_at >= start && p.checked_at <= time);
    const plotStart = points.length > 1 ? Math.max(start,points[0].checked_at) : time-60;
    const max = Math.max(10,...points.filter(p=>p.online && Number.isFinite(p.latency_ms)).map(p=>p.latency_ms));
    let path = '', previous = null, marks = '';
    for(const p of points) {
      const x = Math.max(0,Math.min(360,(p.checked_at-plotStart)/Math.max(1,time-plotStart)*360)).toFixed(2);
      if(p.online && Number.isFinite(p.latency_ms)) {
        const y = (82-Math.min(1,p.latency_ms/max)*72).toFixed(2);
        path += `${previous && p.checked_at-previous.checked_at<=120 ? 'L' : 'M'}${x},${y} `;
        marks += `<circle cx="${x}" cy="${y}" r="2" fill="var(--accent)"/>`;
        previous=p;
      } else {marks+=`<line x1="${x}" x2="${x}" y1="10" y2="82" stroke="#fb7185" stroke-width="2"/>`; previous=null;}
    }
    $('chart').innerHTML = `<path d="M0,82H360 M0,46H360 M0,10H360" stroke="var(--border)" fill="none" stroke-dasharray="3 5"/><path d="${path}" stroke="var(--accent)" stroke-width="2" fill="none"/>${marks}`;
    const format = seconds => new Date(seconds*1000).toLocaleTimeString(dash.lang,{hour:'2-digit',minute:'2-digit'});
    $('chart-start').textContent = format(plotStart); $('chart-end').textContent = format(time); $('chart-max').textContent = `${max} ms`;
    $('history-empty').textContent = points.length < 2 ? dash.t('Collecte en cours · prochain relevé dans une minute', 'Collecting data · next check in one minute') : '';
    const offline = points.filter(p=>!p.online).length;
    const summary = points.length ? `${points.length} ${dash.t('relevés','checks')} · ${((points.length-offline)/points.length*100).toFixed(1)} % ${dash.t('réussis','successful')} · ${offline} ${dash.t('indisponibles','unavailable')}` : dash.t('Aucune mesure pour cette période','No checks in this time range');
    $('history-summary').textContent = summary;
    $('chart').setAttribute('aria-label', `${dash.t('Latence en millisecondes. Rouge : indisponibilité.','Latency in milliseconds. Red: unavailable.')} ${summary}`);
  }
  async function loadHistory() {
    const target=dash.config.target;
    if(!target) {history=null;renderHistory();return;}
    try {const result=await dash.request('status.history',{target,hours:Number($('range').value)||24});if(target===dash.config.target)history=result;}
    catch(error) {if(target===dash.config.target){history=null;$('error').textContent=error.message;}}
    renderHistory();
  }
  function render() {
    renderHistory();
    $('refresh').textContent = dash.t('Actualiser', 'Refresh');
    $('label').textContent = dash.t('Service à surveiller', 'Service to monitor');
    $('apply').textContent = dash.t('Choisir', 'Select');
    $('note').textContent = preview() ? dash.t('Aperçu : création de service désactivée.', 'Preview: service creation is disabled.') : dash.t('Ajoutez l’URL HTTP de votre service, puis choisissez le service à surveiller.', 'Add your service’s HTTP URL, then select the service to monitor.');
    $('create-title').textContent = dash.t('Ajouter un service', 'Add a service');
    $('service-name-label').textContent = dash.t('Nom du service', 'Service name');
    $('service-url-label').textContent = dash.t('Adresse HTTP ou HTTPS', 'HTTP or HTTPS address');
    $('create-service').textContent = busy ? dash.t('En cours…', 'Working…') : dash.t('Ajouter et surveiller', 'Add and monitor');
    for (const id of ['service-name','service-url','create-service']) $(id).disabled = busy || !ready || preview();
    const chosen = $('target').value || dash.config.target;
    $('target').replaceChildren();
    if (!targets.length) { const option = new Option(dash.t('Aucun service configuré', 'No configured services'), ''); $('target').append(option); }
    for (const target of targets) $('target').append(new Option(target.name, target.id));
    if (chosen) $('target').value = chosen;
    $('apply').disabled = busy || !targets.length;
    $('refresh').disabled = busy || !dash.config.target;
    $('name').textContent = latest?.name || dash.t('Disponibilité', 'Availability');
    $('state').textContent = busy ? dash.t('Vérification…', 'Checking…') : latest ? (latest.online ? dash.t('En ligne', 'Online') : dash.t('Indisponible', 'Unavailable')) : dash.t('Choisissez un service', 'Select a service');
    $('status').className = `status ${latest ? (latest.online ? 'online' : 'offline') : ''}`;
    $('latency').textContent = latest?.latency_ms != null ? `${latest.latency_ms} ms` : '—';
    $('code').textContent = latest?.status_code ? `HTTP ${latest.status_code}` : '';
    $('checked').textContent = latest?.checked_at ? new Date(typeof latest.checked_at === 'number' ? latest.checked_at * 1000 : latest.checked_at).toLocaleTimeString(dash.lang, {hour:'2-digit',minute:'2-digit'}) : '';
    $('endpoint').textContent = latest?.url || '';
  }
  async function check() {
    if (busy || !dash.config.target) return;
    busy = true; $('error').textContent = ''; render();
    const target = dash.config.target;
    try { const result = await dash.request('status.check', {target}); if(target === dash.config.target) {latest=result; $('error').textContent = latest.error || '';} }
    catch (error) { latest = null; $('error').textContent = error.message; }
    finally { busy = false; render(); await loadHistory(); }
  }
  $('range').onchange = loadHistory;
  $('tracking').onchange = async () => {
    if(trackingBusy || busy || preview() || !dash.config.target) {renderHistory();return;}
    const target=dash.config.target, enabled=$('tracking').checked;
    trackingBusy=true; $('error').textContent=''; renderHistory();
    try {const result=await dash.request('status.tracking',{target,enabled});if(target===dash.config.target)history=result;}
    catch(error){$('error').textContent=error.message;}
    finally {trackingBusy=false; await loadHistory(); render();}
  };
  $('refresh').onclick = check;
  $('apply').onclick = async () => { try { await dash.save({target:$('target').value}); latest = null; history = null; await check(); } catch (error) { $('error').textContent = error.message; } };
  $('service-form').onsubmit = async event => {
    event.preventDefault();
    if (busy || !ready || preview()) return;
    const name = $('service-name').value.trim(), url = $('service-url').value.trim();
    if (!name || !dash.safeUrl(url)) { $('error').textContent = dash.t('Indiquez un nom et une adresse HTTP ou HTTPS valide.', 'Enter a name and a valid HTTP or HTTPS address.'); return; }
    busy = true; $('error').textContent = ''; render();
    let created = false;
    try {
      const service = await dash.request('status.create', {name,url});
      created = true;
      targets = await dash.request('status.targets');
      $('target').value = service.id;
      await dash.save({target:service.id});
      latest = null; $('service-name').value = ''; $('service-url').value = '';
    } catch (error) {
      $('error').textContent = created ? dash.t('Service ajouté, mais sa sélection a échoué. Actualisez les réglages et choisissez-le dans la liste.', 'Service added, but selection failed. Refresh settings and select it from the list.') : dash.t('Service non ajouté. Vérifiez le nom, l’adresse et votre autorisation.', 'Service was not added. Check the name, address and your permission.');
    } finally { busy = false; render(); }
    if (!$('error').textContent) await check();
  };
  addEventListener('dashdock:language', render);
  addEventListener('dashdock:monitoring', loadHistory);
  addEventListener('dashdock:context', async ()=>{
    if(ready && dash.config.target && !targets.some(target=>target.id===dash.config.target)) {
      try {targets=await dash.request('status.targets');} catch(error) {$('error').textContent=error.message;}
    }
    if(dash.config.target) $('target').value=dash.config.target;
    history=null; render(); if(ready) {if(document.documentElement.dataset.view==='widget')check();else loadHistory();}
  });
  render();
  (async () => { await dash.start(); try { targets = await dash.request('status.targets'); ready = true; render(); await check(); } catch(error) { $('error').textContent = error.message; } })();
  setInterval(check, 60000);
})();
