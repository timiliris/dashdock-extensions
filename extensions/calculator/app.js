const t = (key,params) => window.WidgetI18n.t(key,params);
// A small recursive-descent parser: no eval, Function, or code execution.
function calculate(source) {
  const text = source.replace(/\s/g, '').replace(/,/g, '.');
  if (!text || text.length > 120 || /[^0-9.+*/()eE-]/.test(text)) throw new Error(t("Expression invalide"));
  let index = 0;
  function primary() {
    if (text[index] === '+' || text[index] === '-') { const sign = text[index++] === '-' ? -1 : 1; return sign * primary(); }
    if (text[index] === '(') { index++; const value = sum(); if (text[index++] !== ')') throw new Error(t("Parenthèse manquante")); return value; }
    const match = text.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (!match) throw new Error(t("Nombre attendu"));
    index += match[0].length;
    return Number(match[0]);
  }
  function product() { let value = primary(); while (text[index] === '*' || text[index] === '/') { const operator = text[index++], right = primary(); if (operator === '/' && right === 0) throw new Error(t("Division par zéro")); value = operator === '*' ? value * right : value / right; } return value; }
  function sum() { let value = product(); while (text[index] === '+' || text[index] === '-') { const operator = text[index++], right = product(); value = operator === '+' ? value + right : value - right; } return value; }
  const result = sum();
  if (index !== text.length) throw new Error(t("Expression invalide"));
  if (!Number.isFinite(result)) throw new Error(t("Résultat hors limites"));
  return Number(result.toPrecision(12));
}
(() => {
  const input = document.getElementById('expression'), status = document.getElementById('status');
  document.addEventListener('dashdock:language',()=>{status.textContent=t('Entrée pour calculer · Échap pour effacer');});
  function run(action, key) {
    status.textContent = t("Entrée pour calculer · Échap pour effacer");
    if (action === 'clear') input.value = '';
    else if (action === 'back') input.value = input.value.slice(0, -1);
    else if (action === 'calculate') { try { input.value = String(calculate(input.value)); } catch (error) { status.textContent = error.message; } }
    else if (input.value.length < 120) { const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start; input.setRangeText(key, start, end, 'end'); }
    input.focus();
  }
  document.getElementById('keys').onclick = event => { const button = event.target.closest('button'); if (button) run(button.dataset.action, button.dataset.key); };
  document.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); run('calculate'); } else if (event.key === 'Escape') { event.preventDefault(); run('clear'); } });
})();
