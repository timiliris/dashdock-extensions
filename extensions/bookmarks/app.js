(() => {
  const $ = id => document.getElementById(id);
  const view = new URLSearchParams(location.search).get('view') || 'preview';
  document.documentElement.dataset.view = view;
  const preview = () => dash.preview || view === 'preview';
  let ready = false, busy = false, editing = null, page = 0;
  const bytes = value => new TextEncoder().encode(value).length;
  const sample = [{id:'demo',name:'DashDock',url:'https://github.com/timiliris/dashdock-extensions',category:'DashDock'}];
  function safeUrl(value) {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && bytes(url.href) <= 2000 ? url.href : ''; }
    catch (_) { return ''; }
  }
  function bookmarks() {
    const items = Array.isArray(dash.config.bookmarks) ? dash.config.bookmarks : preview() ? sample : [];
    return items.slice(0,12).filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.url === 'string' && safeUrl(item.url)).map(item => ({id:item.id,name:item.name.slice(0,80),url:safeUrl(item.url),category:typeof item.category === 'string' ? item.category.slice(0,40) : ''}));
  }
  function element(tag, text, className) {
    const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node;
  }
  function labels() {
    $('search').placeholder = dash.t('Rechercher un favori…', 'Search bookmarks…');
    $('search').setAttribute('aria-label', dash.t('Rechercher les favoris', 'Search bookmarks'));
    $('category').setAttribute('aria-label', dash.t('Filtrer par catégorie', 'Filter by category'));
    $('previous').setAttribute('aria-label', dash.t('Page précédente', 'Previous page'));
    $('next').setAttribute('aria-label', dash.t('Page suivante', 'Next page'));
    $('intro').textContent = preview() ? dash.t('Installez cette extension pour ajouter vos favoris.', 'Install this extension to add your bookmarks.') : dash.t('Ajoutez jusqu’à 12 raccourcis. Les liens s’ouvrent dans un nouvel onglet.', 'Add up to 12 shortcuts. Links open in a new tab.');
    $('name-label').textContent = dash.t('Nom', 'Name');
    $('url-label').textContent = dash.t('Adresse HTTP ou HTTPS', 'HTTP or HTTPS address');
    $('group-label').textContent = dash.t('Catégorie (facultatif)', 'Category (optional)');
    $('save').textContent = busy ? dash.t('Enregistrement…', 'Saving…') : editing ? dash.t('Enregistrer', 'Save') : dash.t('Ajouter un favori', 'Add bookmark');
    $('cancel').textContent = dash.t('Annuler', 'Cancel'); $('cancel').hidden = !editing;
    $('retry').textContent = dash.t('Réessayer', 'Retry');
    $('saved-heading').textContent = dash.t('Vos favoris', 'Your bookmarks');
    for (const id of ['name','url','group','save','cancel']) $(id).disabled = busy || !ready || preview();
  }
  function render() {
    labels(); const items = bookmarks(), chosen = $('category').value;
    $('category').replaceChildren(new Option(dash.t('Toutes les catégories', 'All categories'), ''));
    for (const group of [...new Set(items.map(item => item.category).filter(Boolean))].sort()) $('category').append(new Option(group, group));
    $('category').value = chosen;
    const query = $('search').value.trim().toLocaleLowerCase(dash.lang);
    const filtered = items.filter(item => (!$('category').value || item.category === $('category').value) && [item.name,item.category,new URL(item.url).host].join(' ').toLocaleLowerCase(dash.lang).includes(query));
    const totalPages = Math.max(1,Math.ceil(filtered.length/4)); page = Math.min(page,totalPages-1);
    $('links').replaceChildren();
    for (const item of filtered.slice(page*4,page*4+4)) {
      const li = element('li'), link = element('a'), badge = element('span',item.name.charAt(0).toLocaleUpperCase(dash.lang),'badge'), text = element('span',undefined,'link-text');
      link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      text.append(element('strong',item.name), element('small',item.category || new URL(item.url).host));
      link.append(badge,text,element('span','↗','arrow')); li.append(link); $('links').append(li);
    }
    $('empty').textContent = filtered.length ? '' : items.length ? dash.t('Aucun résultat.', 'No matches.') : dash.t('Ajoutez vos premiers favoris dans les réglages ⚙.', 'Add your first bookmarks in settings ⚙.');
    $('count').textContent = `${filtered.length} ${dash.t('favoris', 'bookmarks')}${totalPages > 1 ? ` · ${page+1}/${totalPages}` : ''}`;
    $('previous').hidden = $('next').hidden = totalPages === 1; $('previous').disabled = page===0; $('next').disabled = page===totalPages-1;
    $('saved').replaceChildren();
    for (const item of items) {
      const li = element('li'), text = element('div',undefined,'saved-text'); text.append(element('strong',item.name),element('small',new URL(item.url).host));
      const edit = element('button',dash.t('Modifier','Edit')), remove = element('button',dash.t('Supprimer','Delete'));
      edit.type = remove.type = 'button'; edit.disabled = remove.disabled = busy || !ready || preview();
      edit.onclick = () => { editing=item.id; $('name').value=item.name; $('url').value=item.url; $('group').value=item.category; labels(); $('name').focus(); };
      remove.setAttribute('aria-label', `${dash.t('Supprimer', 'Delete')} ${item.name}`);
      remove.onclick = () => persist(items.filter(row => row.id!==item.id));
      li.append(text,edit,remove); $('saved').append(li);
    }
  }
  function clearDraft() { editing=null; $('name').value=$('url').value=$('group').value=''; }
  async function persist(items, clear=false) {
    if (busy || !ready || preview()) return;
    const config = {...dash.config,bookmarks:items};
    if (bytes(JSON.stringify(config)) > 8192) { $('error').textContent=dash.t('Ces favoris sont trop volumineux. Raccourcissez les adresses ou les noms.', 'These bookmarks are too large. Shorten their addresses or names.');return; }
    busy=true; $('error').textContent=''; render();
    try { await dash.save(config); if (clear || !items.some(item=>item.id===editing)) clearDraft(); }
    catch (_) { $('error').textContent=dash.t('Enregistrement impossible. Votre saisie est conservée.', 'Could not save. Your draft has been kept.'); }
    finally {busy=false;render();}
  }
  $('form').onsubmit = async event => {
    event.preventDefault(); if (busy || !ready || preview()) return;
    const name=$('name').value.trim(), url=safeUrl($('url').value.trim()), category=$('group').value.trim(), items=bookmarks();
    if (!name || name.length>80 || !url || category.length>40) { $('error').textContent=dash.t('Indiquez un nom et une adresse HTTP(S) sans identifiants.', 'Enter a name and an HTTP(S) address without credentials.'); return; }
    if (!editing && items.length>=12) { $('error').textContent=dash.t('La limite de 12 favoris est atteinte.', 'The limit of 12 bookmarks has been reached.');return; }
    const item={id:editing || `link-${crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`}`,name,url,category};
    await persist(editing ? items.map(row=>row.id===editing?item:row) : [...items,item],true);
  };
  $('cancel').onclick=()=>{clearDraft();$('error').textContent='';render();};
  $('search').oninput=$('category').onchange=()=>{page=0;render();};
  $('previous').onclick=()=>{page--;render();}; $('next').onclick=()=>{page++;render();};
  addEventListener('dashdock:language',render); addEventListener('dashdock:context',render);
  async function initialize() {
    $('retry').hidden=true;$('error').textContent='';
    try {await dash.start();ready=true;render();}
    catch (_) {$('error').textContent=dash.t('Impossible de charger les favoris. Réessayez avant de les modifier.', 'Could not load bookmarks. Retry before editing them.');$('retry').hidden=false;}
  }
  $('retry').onclick=initialize;render();initialize();
})();
