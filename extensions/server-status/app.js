(() => {
  const $ = id => document.getElementById(id);
  let targets = [], latest = null, busy = false;
  function render() {
    $('refresh').textContent = dash.t('Actualiser', 'Refresh');
    $('label').textContent = dash.t('Service à surveiller', 'Service to monitor');
    $('apply').textContent = dash.t('Choisir', 'Select');
    $('note').textContent = dash.preview ? dash.t('Aperçu : réglages non enregistrés.', 'Preview: settings are not saved.') : dash.t('Les services sont déclarés par votre administrateur.', 'Services are configured by your administrator.');
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
  addEventListener('dashdock:language', render);
  addEventListener('dashdock:context', ()=>{render();if(document.documentElement.dataset.view==='widget')check();});
  render();
  (async () => { await dash.start(); try { targets = await dash.request('status.targets'); render(); await check(); } catch(error) { $('error').textContent = error.message; } })();
  setInterval(check, 60000);
})();
