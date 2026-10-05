(() => {
  const $ = id => document.getElementById(id);
  let targets = [], latest = null, busy = false, ready = false;
  const preview = () => dash.preview || document.documentElement.dataset.view === 'preview';
  function render() {
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
    try { latest = await dash.request('status.check', {target:dash.config.target}); $('error').textContent = latest.error || ''; }
    catch (error) { latest = null; $('error').textContent = error.message; }
    finally { busy = false; render(); }
  }
  $('refresh').onclick = check;
  $('apply').onclick = async () => { try { await dash.save({target:$('target').value}); latest = null; await check(); } catch (error) { $('error').textContent = error.message; } };
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
  addEventListener('dashdock:context', ()=>{render();if(document.documentElement.dataset.view==='widget')check();});
  render();
  (async () => { await dash.start(); try { targets = await dash.request('status.targets'); ready = true; render(); await check(); } catch(error) { $('error').textContent = error.message; } })();
  setInterval(check, 60000);
})();
