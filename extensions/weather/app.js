(() => {
  const $ = id => document.getElementById(id);
  let latest = null, results = [], busy = false, searching = false;
  const conditions = {
    0:['Ciel dégagé','Clear sky','☀'],1:['Principalement dégagé','Mainly clear','☀'],2:['Partiellement nuageux','Partly cloudy','⛅'],3:['Couvert','Overcast','☁'],45:['Brouillard','Fog','🌫'],48:['Brouillard givrant','Rime fog','🌫'],51:['Bruine légère','Light drizzle','🌦'],53:['Bruine','Drizzle','🌦'],55:['Bruine dense','Dense drizzle','🌧'],56:['Bruine verglaçante','Freezing drizzle','🌧'],57:['Bruine verglaçante dense','Dense freezing drizzle','🌧'],61:['Pluie légère','Light rain','🌧'],63:['Pluie','Rain','🌧'],65:['Forte pluie','Heavy rain','🌧'],66:['Pluie verglaçante','Freezing rain','🌧'],67:['Forte pluie verglaçante','Heavy freezing rain','🌧'],71:['Neige légère','Light snow','❄'],73:['Neige','Snow','❄'],75:['Forte neige','Heavy snow','❄'],77:['Grains de neige','Snow grains','❄'],80:['Averses légères','Light showers','🌦'],81:['Averses','Showers','🌧'],82:['Fortes averses','Heavy showers','🌧'],85:['Averses de neige','Snow showers','❄'],86:['Fortes averses de neige','Heavy snow showers','❄'],95:['Orage','Thunderstorm','⛈'],96:['Orage avec grêle','Thunderstorm with hail','⛈'],99:['Orage avec forte grêle','Thunderstorm with heavy hail','⛈']
  };
  function number(value) { return typeof value === 'number' ? value.toLocaleString(dash.lang, {maximumFractionDigits:1}) : '—'; }
  function render() {
    $('city').textContent = dash.config.city || dash.t('Votre météo', 'Your weather');
    $('refresh').textContent = dash.t('Actualiser', 'Refresh'); $('refresh').disabled = busy || !Number.isFinite(dash.config.latitude);
    $('label').textContent = dash.t('Choisir une ville', 'Choose a city'); $('query').placeholder = dash.t('Bruxelles, Paris…', 'Brussels, London…');
    $('query').setAttribute('aria-label', dash.t('Nom de la ville', 'City name'));
    $('find').textContent = searching ? '…' : dash.t('Rechercher', 'Search'); $('find').disabled = searching;
    $('temperature').textContent = latest ? `${number(latest.temperature)} °C` : '—';
    const code = conditions[latest?.weather_code];
    $('condition').textContent = busy ? dash.t('Chargement…', 'Loading…') : latest ? code ? `${code[2]} ${dash.t(code[0], code[1])}` : dash.t('Conditions inconnues','Unknown conditions') : dash.t('Recherchez votre ville pour commencer.', 'Search for your city to get started.');
    $('feels').textContent = latest ? `${dash.t('Ressenti','Feels like')} ${number(latest.apparent_temperature)} °C` : '';
    $('humidity').textContent = latest ? `${dash.t('Humidité','Humidity')} ${number(latest.humidity)} %` : '';
    $('wind').textContent = latest ? `${dash.t('Vent','Wind')} ${number(latest.wind_speed)} km/h` : '';
    $('updated').textContent = latest?.time ? `${latest.time.replace('T',' · ')} · ${latest.timezone || ''} · Open-Meteo` : 'Open-Meteo';
    $('note').textContent = dash.preview ? dash.t('Aperçu : ville non enregistrée.', 'Preview: city is not saved.') : dash.t('Météo actualisée toutes les 15 minutes.', 'Weather updates every 15 minutes.');
    $('results').replaceChildren();
    for (const city of results) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = `${city.name}${city.country ? ` · ${city.country}` : ''}`;
      button.onclick = async () => { try { await dash.save({city:city.name,latitude:city.latitude,longitude:city.longitude}); results = []; await refresh(); } catch(error) { $('error').textContent = error.message; } };
      $('results').append(button);
    }
  }
  async function refresh() {
    if (busy || !Number.isFinite(dash.config.latitude) || !Number.isFinite(dash.config.longitude)) return;
    busy = true; $('error').textContent = ''; render();
    try { latest = await dash.request('weather.current',{latitude:dash.config.latitude,longitude:dash.config.longitude,lang:dash.lang}); }
    catch(error) { latest = null; $('error').textContent = error.message; }
    finally { busy = false; render(); }
  }
  $('search').onsubmit = async event => {
    event.preventDefault(); const query = $('query').value.trim(); if (!query || searching) return;
    searching = true; $('error').textContent = ''; render();
    try { results = await dash.request('weather.search',{query,lang:dash.lang}); if (!results.length) $('error').textContent = dash.t('Aucune ville trouvée.', 'No cities found.'); }
    catch(error) { $('error').textContent = error.message; }
    finally { searching = false; render(); }
  };
  $('refresh').onclick = refresh; addEventListener('dashdock:language',render); addEventListener('dashdock:context',()=>{render();if(document.documentElement.dataset.view==='widget')refresh();});
  render(); (async () => { await dash.start(); render(); await refresh(); })(); setInterval(refresh,900000);
})();
