(() => {
  const fonts = {system: 'system-ui, sans-serif', humanist: '"Trebuchet MS", "Segoe UI", sans-serif', mono: '"Cascadia Code", Consolas, monospace'};
  window.addEventListener('message', event => {
    if (event.source !== parent || !event.data || event.data.type !== 'dashdock:theme') return;
    const {theme, accent, font, colors, lang} = event.data;
    if (lang === 'fr' || lang === 'en') document.dispatchEvent(new CustomEvent('dashdock:language',{detail:{lang}}));
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    if (typeof accent === 'string' && /^#[a-f0-9]{6}$/i.test(accent)) {
      document.documentElement.style.setProperty('--accent', accent);
      const channels = [1, 3, 5].map(index => parseInt(accent.slice(index, index + 2), 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      document.documentElement.style.setProperty('--accent-text', luminance > 0.179 ? '#000000' : '#ffffff');
    }
    if (Object.hasOwn(fonts, font)) document.documentElement.style.setProperty('--font', fonts[font]);
    if (colors && typeof colors === 'object') {
      for (const key of ['bg', 'text', 'muted', 'surface', 'border']) {
        if (typeof colors[key] === 'string' && /^#[a-f0-9]{6}$/i.test(colors[key])) document.documentElement.style.setProperty(`--${key}`, colors[key]);
      }
    }
  });
  parent.postMessage({type: 'dashdock:ready'}, '*');
})();
