const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness({preview = false, config = {}, loadFailure = false} = {}) {
  const nodes = new Map(), events = new Map(), timers = new Map(), saves = [];
  let sequence = 0, fail = false, defer = false, pending, startFail = loadFailure;
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {value: '', textContent: '', checked: false, disabled: false, hidden: false, className: '', focus() {this.focused = true;}, select() {this.selected = true;}});
    return nodes.get(id);
  };
  const dash = {
    preview, config, lang: 'en', t: (fr, en) => en,
    async start() {if (startFail) throw Error('offline');},
    async save(value) {
      saves.push(JSON.parse(JSON.stringify(value)));
      if (defer) await new Promise((resolve, reject) => { pending = {resolve, reject}; });
      if (fail) throw Error('offline');
      dash.config = value;
    }
  };
  vm.runInNewContext(fs.readFileSync('extensions/scratchpad/app.js', 'utf8'), {
    document: {getElementById: node, documentElement: {dataset: {view: preview ? 'preview' : 'widget'}}, execCommand: () => false},
    dash, TextEncoder,
    addEventListener: (name, callback) => events.set(name, callback),
    setTimeout: callback => {const id = ++sequence; timers.set(id, callback); return id;},
    clearTimeout: id => timers.delete(id)
  });
  return {
    node, dash, saves, events, timers,
    edit(text) {node('text').value = text; node('text').oninput();},
    runTimer() {const timer = [...timers.entries()][0]; if (timer) {timers.delete(timer[0]); return timer[1]();}},
    fail(value) {fail = value;}, defer(value) {defer = value;}, loadFail(value) {startFail = value;},
    resolve() {pending.resolve();}, reject() {pending.reject(Error('offline'));}
  };
}
const text = config => config.chunks.join('');
(async () => {
  const h = harness(); await tick();
  assert.equal(h.node('text').disabled, false);
  h.edit('First'); h.edit('Latest');
  assert.equal(h.saves.length, 0, 'typing does not save each keystroke');
  assert.equal(h.timers.size, 1, 'one debounce timer');
  await h.runTimer(); assert.equal(text(h.saves[0]), 'Latest'); assert.equal(h.node('save-state').textContent, 'Saved');

  h.defer(true); h.edit('Saving'); const firstSave = h.runTimer(); await tick();
  h.edit('Newer draft');
  h.dash.config = h.saves.at(-1); h.events.get('dashdock:context')();
  assert.equal(h.node('text').value, 'Newer draft', 'own broadcast cannot overwrite edits made during saving');
  await h.runTimer(); assert.equal(h.saves.length, 2, 'overlapping save waits for current save');
  h.resolve(); await firstSave; h.defer(false); await h.runTimer();
  assert.equal(text(h.saves.at(-1)), 'Newer draft');

  h.fail(true); h.edit('Keep me'); await h.runTimer();
  assert.equal(h.node('failure').hidden, false); assert.equal(h.node('text').value, 'Keep me');
  assert.equal(h.timers.size, 0, 'failed saves do not spin automatic retries');
  h.fail(false); await h.node('retry').onclick();
  assert.equal(h.node('failure').hidden, true); assert.equal(text(h.saves.at(-1)), 'Keep me');

  h.defer(true); h.edit('Older pending draft'); const failedSave = h.runTimer(); await tick();
  h.edit('Newest draft survives failure'); h.reject(); await failedSave;
  assert.equal(h.node('text').value, 'Newest draft survives failure');
  h.defer(false); await h.node('retry').onclick();
  assert.equal(text(h.saves.at(-1)), 'Newest draft survives failure', 'retry saves the newest draft after an older request fails');

  const unicode = '🌍'.repeat(1500); h.edit(unicode); await h.runTimer();
  const saved = h.saves.at(-1);
  assert.equal(text(saved), unicode);
  assert.equal(Buffer.byteLength(text(saved)), 6000);
  assert.ok(saved.chunks.every(chunk => Buffer.byteLength(chunk) <= 1800));
  assert.ok(saved.chunks.every(chunk => !/[\uD800-\uDBFF]$/.test(chunk) && !/^[\uDC00-\uDFFF]/.test(chunk)));
  assert.ok(Buffer.byteLength(JSON.stringify(saved)) <= 7800);
  h.edit(unicode + 'a'); assert.equal(h.node('text').value, unicode, 'over-budget input restores the previous complete draft');
  assert.match(h.node('notice').textContent, /Limit reached/);
  h.edit('\u0000'.repeat(1400)); assert.equal(h.node('text').value, unicode, 'JSON escaping counts toward the configuration budget');
  const reloaded = harness({config: saved}); await tick(); assert.equal(reloaded.node('text').value, unicode, 'segmented text reloads intact');

  h.node('title').value = 'My ideas'; h.node('title').oninput();
  h.node('mono').checked = true; h.node('mono').onchange(); await h.runTimer();
  assert.equal(h.saves.at(-1).title, 'My ideas'); assert.equal(h.saves.at(-1).mono, true); assert.equal(h.node('text').className, 'mono');
  h.dash.config = {chunks: ['External note'], title: 'Other heading', mono: false}; h.events.get('dashdock:context')();
  assert.equal(h.node('text').value, 'External note', 'clean widget follows updates from its settings peer');
  await h.node('copy').onclick(); assert.equal(h.node('text').selected, true); assert.match(h.node('notice').textContent, /Ctrl\+C/, 'copy remains possible when sandbox blocks automatic copying');

  const p = harness({preview: true}); await tick(); p.edit('Preview only'); await p.node('text').onblur();
  assert.equal(p.saves.length, 0); assert.equal(p.timers.size, 0); assert.match(p.node('save-state').textContent, /Preview/);
  const unloaded = harness({loadFailure: true, config: {chunks: ['Existing note']}}); await tick();
  assert.equal(unloaded.node('text').disabled, true, 'cannot overwrite data that failed to load');
  assert.equal(unloaded.node('failure').hidden, false);
  unloaded.loadFail(false); await unloaded.node('retry').onclick(); assert.equal(unloaded.node('text').value, 'Existing note');

  h.edit('Keyboard save'); let prevented = false;
  h.node('text').onkeydown({ctrlKey: true, key: 's', preventDefault() {prevented = true;}}); await tick();
  assert.equal(prevented, true); assert.equal(text(h.saves.at(-1)), 'Keyboard save');
  console.log('PASS scratchpad: debounce, serialized saves, broadcast races, retained drafts and retry, UTF-8 and JSON bounds, persistence, settings, copy fallback, preview, loading failure, keyboard save');
})().catch(error => {console.error(error); process.exitCode = 1;});
