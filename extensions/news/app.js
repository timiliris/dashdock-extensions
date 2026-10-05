(() => {
  const $ = id => document.getElementById(id);
  let feeds = [], latest = null, busy = false;
  function render() {
    $('refresh').textContent = dash.t('Actualiser','Refresh'); $('refresh').disabled = busy || !dash.config.feed;
    $('name').textContent = latest?.name || dash.t('Actualités','News');
    $('label').textContent = dash.t('Source des actualités','News source'); $('apply').textContent = dash.t('Choisir','Select'); $('apply').disabled = busy || !feeds.length;
    $('note').textContent = dash.preview ? dash.t('Aperçu : source non enregistrée.','Preview: source is not saved.') : dash.t('Flux définis par votre administrateur. Actualisation toutes les 10 minutes.','Feeds configured by your administrator. Updates every 10 minutes.');
    const chosen = $('feed').value || dash.config.feed; $('feed').replaceChildren();
    if (!feeds.length) $('feed').append(new Option(dash.t('Aucun flux configuré','No configured feeds'),''));
    for (const feed of feeds) $('feed').append(new Option(feed.name,feed.id));
    if(chosen) $('feed').value = chosen;
    $('items').replaceChildren();
    for(const item of latest?.items || []) {
      const li = document.createElement('li'); const url = dash.safeUrl(item.url);
      const title = document.createElement(url ? 'a' : 'strong'); title.textContent = item.title;
      if(url) { title.href = url; title.target = '_blank'; title.rel = 'noopener noreferrer'; }
      li.append(title);
      if(item.published) { const date = new Date(item.published); if(!Number.isNaN(date.getTime())) { const info = document.createElement('p'); info.textContent = date.toLocaleDateString(dash.lang,{day:'numeric',month:'short'}); li.append(info); } }
      if(item.summary) { const summary = document.createElement('p'); summary.textContent = item.summary.slice(0,180); li.append(summary); }
      $('items').append(li);
    }
    $('empty').textContent = busy ? dash.t('Chargement du flux…','Loading feed…') : !latest ? dash.t('Choisissez une source pour commencer.','Choose a source to get started.') : !latest.items?.length ? dash.t('Ce flux ne contient aucun article.','This feed has no articles.') : '';
    const timestamp = new Date(typeof latest?.updated_at === 'number' ? latest.updated_at * 1000 : latest?.updated_at);
    $('updated').textContent = latest?.updated_at && !Number.isNaN(timestamp.getTime()) ? `${dash.t('Actualisé à','Updated at')} ${timestamp.toLocaleTimeString(dash.lang,{hour:'2-digit',minute:'2-digit'})}` : '';
  }
  async function refresh() {
    if(busy || !dash.config.feed) return;
    busy = true; $('error').textContent = ''; render();
    try { latest = await dash.request('news.items',{feed:dash.config.feed}); }
    catch(error) { latest = null; $('error').textContent = error.message; }
    finally { busy = false; render(); }
  }
  $('refresh').onclick = refresh;
  $('apply').onclick = async () => { try { await dash.save({feed:$('feed').value}); latest = null; await refresh(); } catch(error) { $('error').textContent = error.message; } };
  addEventListener('dashdock:language',render); addEventListener('dashdock:context',()=>{render();if(document.documentElement.dataset.view==='widget')refresh();});
  render(); (async () => { await dash.start(); try { feeds = await dash.request('news.feeds'); render(); await refresh(); } catch(error) { $('error').textContent = error.message; } })(); setInterval(refresh,600000);
})();
