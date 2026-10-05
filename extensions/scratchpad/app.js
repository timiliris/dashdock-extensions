(() => {
  const $ = id => document.getElementById(id);
  const encoder = new TextEncoder();
  const dirty = new Set();
  let draft = {title: '', text: '', mono: false};
  let ready = false, saving = false, failed = false, loading = false, timer;
  const preview = () => dash.preview || document.documentElement.dataset.view === 'preview';
  const bytes = text => encoder.encode(text).length;
  function chunks(text) {
    const result = []; let chunk = '', size = 0;
    for (const character of text) {
      const length = bytes(character);
      if (size + length > 1800) { result.push(chunk); chunk = ''; size = 0; }
      chunk += character; size += length;
    }
    result.push(chunk);
    return result;
  }
  const configuration = value => ({title: value.title, chunks: chunks(value.text), mono: value.mono});
  function valid(value) {
    return bytes(value.text) <= 6000 && bytes(JSON.stringify(configuration(value))) <= 7800;
  }
  function adopt(config) {
    const incoming = {
      title: typeof config.title === 'string' ? config.title.slice(0, 80) : '',
      text: Array.isArray(config.chunks) ? config.chunks.filter(value => typeof value === 'string').join('') : (typeof config.text === 'string' ? config.text : ''),
      mono: config.mono === true
    };
    for (const field of ['title', 'text', 'mono']) if (!dirty.has(field)) draft[field] = incoming[field];
    if ($('text').value !== draft.text) $('text').value = draft.text;
    if ($('title').value !== draft.title) $('title').value = draft.title;
    $('mono').checked = draft.mono;
    render();
  }
  function render() {
    $('heading').textContent = draft.title || dash.t('Vos idées, ici', 'A place for your ideas');
    $('text-label').textContent = dash.t('Texte du bloc-notes', 'Scratchpad text');
    $('text').placeholder = dash.t('Une idée, une liste, quelque chose à retenir…', 'An idea, a list, something to remember…');
    $('text').className = draft.mono ? 'mono' : '';
    $('copy').textContent = dash.t('Copier', 'Copy');
    $('copy').disabled = !ready || !draft.text;
    $('counter').textContent = `${Array.from(draft.text).length} ${dash.t('caractères', 'characters')} · ${bytes(draft.text)} / 6000 ${dash.t('octets', 'bytes')}`;
    $('save-state').textContent = !ready ? dash.t('Chargement…', 'Loading…') : preview() ? dash.t('Aperçu · non enregistré', 'Preview · not saved') : failed ? dash.t('Non enregistré', 'Not saved') : saving ? dash.t('Sauvegarde…', 'Saving…') : dirty.size ? dash.t('À enregistrer…', 'Unsaved changes…') : dash.t('Enregistré', 'Saved');
    $('settings-heading').textContent = dash.t('Votre bloc-notes', 'Your scratchpad');
    $('title-label').textContent = dash.t('Titre à l’intérieur du widget', 'Heading inside the widget');
    $('title').placeholder = dash.t('Vos idées, ici', 'A place for your ideas');
    $('mono-label').textContent = dash.t('Police à chasse fixe', 'Monospaced text');
    $('settings-note').textContent = dash.t('Le texte se modifie directement dans le dashboard et se sauvegarde automatiquement. Jusqu’à 6000 octets de texte.', 'Edit directly on the dashboard. Changes save automatically. Up to 6000 bytes of text.');
    $('failure').hidden = !failed;
    $('failure-text').textContent = ready ? dash.t('Sauvegarde impossible. Votre brouillon reste ici : réessayez avant de fermer le widget.', 'Could not save. Your draft is still here: retry before closing the widget.') : dash.t('Impossible de charger vos notes. Réessayez pour éviter d’écraser un texte existant.', 'Could not load your notes. Retry before editing to protect existing text.');
    $('retry').textContent = dash.t('Réessayer', 'Retry');
    $('retry').disabled = saving || loading;
    for (const id of ['text', 'title', 'mono']) $(id).disabled = !ready;
  }
  function schedule(delay = 800) {
    clearTimeout(timer);
    if (!preview()) timer = setTimeout(flush, delay);
  }
  function edit(field, value) {
    const next = {...draft, [field]: value};
    if (!valid(next)) {
      if (field === 'mono') $(field).checked = draft[field];
      else $(field).value = draft[field];
      $('notice').textContent = dash.t('Limite atteinte. Raccourcissez le texte pour continuer.', 'Limit reached. Shorten the text to continue.');
      return;
    }
    draft = next; dirty.add(field); $('notice').textContent = '';
    render(); schedule();
  }
  async function flush() {
    clearTimeout(timer);
    if (!ready || saving || !dirty.size || preview()) return;
    const snapshot = {...draft};
    saving = true; failed = false; render();
    try {
      await dash.save(configuration(snapshot));
      for (const field of ['title', 'text', 'mono']) if (draft[field] === snapshot[field]) dirty.delete(field);
    } catch (_) { failed = true; }
    finally { saving = false; render(); }
    if (dirty.size && !failed) schedule(150);
  }
  async function initialize() {
    if (loading) return;
    loading = true; failed = false; render();
    try { await dash.start(); adopt(dash.config); ready = true; }
    catch (_) { failed = true; }
    finally { loading = false; render(); }
  }
  $('text').oninput = () => edit('text', $('text').value);
  $('title').oninput = () => edit('title', $('title').value);
  $('mono').onchange = () => edit('mono', $('mono').checked);
  $('text').onblur = flush;
  $('retry').onclick = () => ready ? flush() : initialize();
  $('text').onkeydown = event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); flush(); }
  };
  $('copy').onclick = async () => {
    $('text').focus(); $('text').select();
    let copied = false;
    try { copied = document.execCommand('copy') === true; } catch (_) { /* Selection remains usable in sandboxed browsers. */ }
    $('notice').textContent = copied ? dash.t('Texte copié.', 'Text copied.') : dash.t('Texte sélectionné. Appuyez sur Ctrl+C (⌘C sur Mac) pour le copier.', 'Text selected. Press Ctrl+C (⌘C on Mac) to copy it.');
  };
  addEventListener('dashdock:context', () => { if (ready) adopt(dash.config); });
  addEventListener('dashdock:language', render);
  render(); initialize();
})();
