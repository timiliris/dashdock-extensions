(() => {
  let sequence = 0, revision = 0;
  const pending = new Map();
  window.dash = {
    lang: 'fr', preview: false, config: {},
    t(fr, en) { return this.lang === 'en' ? en : fr; },
    request(method, params = {}) {
      const requestId = `service-${Date.now()}-${++sequence}`;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(this.t('Le service ne répond pas.', 'The service is not responding.'))); }, 30000);
        pending.set(requestId, {resolve, reject, timer});
        parent.postMessage({type: 'dashdock:request', requestId, method, params}, '*');
      });
    },
    async save(config) {
      const before = revision;
      const result = this.preview ? config : await this.request('config.save', {config});
      if (revision === before) this.config = result || config;
    },
    async start() {
      parent.postMessage({type: 'dashdock:ready', settings: true}, '*');
      const config = await this.request('config.get'); if (config && typeof config === 'object') this.config = config.config || config;
      return this.config;
    },
    safeUrl(url) { try { const value = new URL(url); return ['http:', 'https:'].includes(value.protocol) ? value.href : ''; } catch (_) { return ''; } }
  };
  addEventListener('message', event => {
    if (event.source !== parent || !event.data || typeof event.data !== 'object') return;
    const message = event.data;
    if (message.type === 'dashdock:response') {
      const task = pending.get(message.requestId);
      if (!task) return;
      clearTimeout(task.timer); pending.delete(message.requestId);
      if (message.error) task.reject(new Error(typeof message.error === 'string' ? message.error : message.error.message || 'Service error'));
      else task.resolve(message.result);
    } else if (message.type === 'dashdock:context' || message.type === 'dashdock:config') {
      if(message.type === 'dashdock:context')dash.preview = message.preview === true;
      if (message.config && typeof message.config === 'object') { revision++; dash.config = message.config; }
      dispatchEvent(new Event('dashdock:context'));
    } else if (message.type === 'dashdock:monitoring') {
      dispatchEvent(new Event('dashdock:monitoring'));
    } else if (message.type === 'dashdock:theme') {
      const root = document.documentElement;
      if (['fr', 'en'].includes(message.lang)) { dash.lang = message.lang; root.lang = message.lang; }
      if (['light', 'dark'].includes(message.theme)) root.dataset.theme = message.theme;
      const fonts = {system:'system-ui,sans-serif',humanist:'"Trebuchet MS","Segoe UI",sans-serif',mono:'"Cascadia Code",Consolas,monospace'};
      if (Object.hasOwn(fonts, message.font)) root.style.setProperty('--font', fonts[message.font]);
      if (message.colors) for (const key of ['bg','text','muted','surface','border']) if (/^#[a-f0-9]{6}$/i.test(message.colors[key] || '')) root.style.setProperty(`--${key}`, message.colors[key]);
      if (/^#[a-f0-9]{6}$/i.test(message.accent || '')) root.style.setProperty('--accent', message.accent);
      dispatchEvent(new Event('dashdock:language'));
    }
  });
})();
