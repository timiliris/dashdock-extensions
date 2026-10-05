const PROVIDER='cloudflare';
(() => {
  const CF=PROVIDER==='cloudflare',$=id=>document.getElementById(id),t=(fr,en)=>dash.t(fr,en);
  const settings=new URLSearchParams(location.search).get('view')==='settings';if(settings)document.body.classList.add('settings-view');
  let data=null,zones=[],busy=false,ready=false,generation=0,timer;
  const demoCF={name:'example.com',status:'active',paused:false,plan:'Free',total:8,proxied:5,records:[{name:'example.com',type:'A',proxied:true,ttl:1},{name:'www.example.com',type:'CNAME',proxied:true,ttl:1}]};
  const demoCS={total:12,bans:10,other:2,decisions:[{value:'192.0.2.14',type:'ban',scenario:'crowdsecurity/ssh-bf',duration:'2h',scope:'Ip'},{value:'198.51.100.8',type:'ban',scenario:'crowdsecurity/http-bf',duration:'4h',scope:'Ip'}]};
  function el(tag,text,cls){const e=document.createElement(tag);e.textContent=String(text??'');if(cls)e.className=cls;return e;}
  function error(code){const messages={provider_not_configured:t('Connexion à configurer dans les réglages.','Set up the connection in settings.'),provider_auth_failed:t('Clé refusée : vérifiez les droits côté serveur.','Key rejected: check server-side permissions.'),provider_rate_limited:t('Limite API atteinte. Réessayez dans une minute.','API rate limit reached. Retry in a minute.'),provider_invalid_url:t('Adresse CrowdSec invalide ou inaccessible pour des raisons de sécurité.','Invalid or unsafe CrowdSec address.'),provider_response_too_large:t('Réponse trop volumineuse. Réduisez les décisions locales.','Response too large. Reduce local decisions.'),provider_invalid_response:t('Réponse API non reconnue.','Unrecognized API response.'),provider_unavailable:t('Serveur inaccessible. Vérifiez l’adresse et la connexion.','Server unavailable. Check the address and connection.')};$('error').textContent=messages[code]||t('Impossible de charger. Réessayez.','Unable to load. Please retry.');}
  function render(){
    $('title').textContent=CF?'Cloudflare':'CrowdSec';$('refresh').textContent=t('Actualiser','Refresh');$('connect').textContent=t('Vérifier la connexion','Check connection');$('heading').textContent=CF?(data?.name||t('Zones et DNS','Zones and DNS')):t('Décisions actives · LAPI','Active decisions · LAPI');
    $('help').textContent=t('Connexion configurée par l’administrateur. Les clés restent sur le serveur DashDock.','Administrator-managed connection. Keys stay on the DashDock server.');
    $('demo').hidden=!dash.preview;$('demo').textContent=t('Aperçu · données fictives','Preview · demo data');
    $('zone-label').textContent=t('Zone à afficher','Zone to display');
    $('scope').textContent=CF?t('Jeton limité aux zones souhaitées : Zone Read et DNS Read. Liste limitée à 200 zones, aperçu de 10 enregistrements.','Token scoped to your zones: Zone Read and DNS Read. Up to 200 zones and a preview of 10 records.'):t('API locale ou distante (HTTPS conseillé). Décisions du moteur et ajouts manuels uniquement, hors listes communautaires. Aperçu de 20 décisions.','Local or remote API (HTTPS recommended). Engine and manual decisions only, excluding community lists. Preview of 20 decisions.');
    $('refresh').disabled=busy||!ready;$('connect').disabled=busy||!ready;$('zone').disabled=busy||!ready;
    const root=$('content');root.replaceChildren();$('updated').textContent='';
    if(!data){const box=el('div','','empty');box.append(el('strong',busy?t('Connexion…','Connecting…'):t('Connectez votre service','Connect your service')),el('p',CF?t('Suivez vos domaines et leurs enregistrements DNS. Ouvrez les réglages pour choisir une zone.','Monitor domains and DNS records. Open settings to select a zone.'):t('Affichez les décisions de votre serveur CrowdSec. Ouvrez les réglages pour connecter son API.','Display your CrowdSec server’s decisions. Open settings to connect its API.')));root.append(box);return;}
    const metrics=el('div','','metrics');
    const items=CF?[[data.total,'DNS','DNS'],[data.proxied,'Proxifiés','Proxied'],[data.paused?t('Pause','Paused'):data.status==='active'?t('Actif','Active'):data.status,'Zone','Zone']]:[[data.total,'Actives','Active'],[data.bans,'Blocages','Bans'],[data.other,'Autres','Other']];
    for(const [value,fr,en] of items){const box=el('div','','metric');const strong=el('strong',value);if(typeof value==='string')strong.style.fontSize='16px';box.append(strong,el('span',t(fr,en)));metrics.append(box);}root.append(metrics);
    const list=el('div','','records');for(const item of CF?data.records:data.decisions){const row=el('div','','row'),detail=el('div');detail.append(el('strong',CF?item.name:item.value),el('small',CF?item.type:(item.scenario||item.scope)));row.append(detail,el('span',CF?(item.proxied?t('Proxifié','Proxied'):t('DNS seul','DNS only')):item.type+' · '+item.duration,'tag'));list.append(row);}
    if(!(CF?data.records:data.decisions).length)list.append(el('p',CF?t('Aucun enregistrement DNS.','No DNS records.'):t('Aucune décision locale active.','No active local decisions.'),'muted'));root.append(list);
    $('updated').textContent=dash.preview?t('Exemple sans connexion API','Example without API connection'):t('Relevé à ','Checked at ')+new Date(data.checked_at*1000).toLocaleTimeString(dash.lang==='en'?'en-GB':'fr-FR',{hour:'2-digit',minute:'2-digit'})+t(' · actualisation 60 s',' · refresh every 60 s');
  }
  async function load(){if(!ready)return;const at=++generation;busy=true;$('error').textContent='';render();
    try {
      let resultData=null;
      if(dash.preview){resultData=CF?demoCF:demoCS;if(CF)zones=[{id:'demo',name:'example.com'}];}
      else if(CF){
        const result=await dash.request('cloudflare.zones');if(at!==generation)return;zones=result.zones;
        if(settings){resultData=null;}else{const selected=zones.find(z=>z.id===dash.config.zone);if(selected)resultData=await dash.request('cloudflare.zone',{zone:selected.id});else resultData=null;}
      }else{resultData=await dash.request('crowdsec.decisions');}
      if(at!==generation)return;data=resultData;
      if(CF){$('zone').replaceChildren(el('option',t('Choisir une zone','Choose a zone')));$('zone').firstChild.value='';for(const z of zones){const option=el('option',z.name);option.value=z.id;$('zone').append(option);}$('zone').value=dash.preview?'demo':dash.config.zone||'';$('zone').hidden=!settings||!zones.length;$('zone-label').hidden=$('zone').hidden;
        if(!zones.length)$('error').textContent=t('Aucune zone accessible avec ce jeton.','No zones accessible with this token.');
      }
    }catch(e){if(at===generation){data=null;error(e.message);}}
    finally{if(at===generation){busy=false;render();}}
  }
  function setup(){const root=$('setup');root.replaceChildren();root.append(el('h3',t('Configuration serveur (.env)','Server configuration (.env)')));for(const key of CF?['DASHDOCK_CLOUDFLARE_TOKEN']:['DASHDOCK_CROWDSEC_URL','DASHDOCK_CROWDSEC_BOUNCER_KEY'])root.append(el('code',key+'=…'));root.append(el('p',CF?t('Créez un jeton API Cloudflare avec les permissions de lecture puis recréez le conteneur.','Create a Cloudflare API token with read permissions, then recreate the container.'):t('Créez la clé sur votre serveur avec : cscli bouncers add dashdock. URL racine sans /v1, par exemple http://host.docker.internal:8081 ou https://crowdsec.example.com. Recréez ensuite le conteneur.','Create the key on your server: cscli bouncers add dashdock. Root URL without /v1, e.g. http://host.docker.internal:8081 or https://crowdsec.example.com. Then recreate the container.'),'muted'));}
  $('zone').addEventListener('change',async()=>{const value=$('zone').value;busy=true;render();try{await dash.save({...dash.config,zone:value});$('error').textContent=t('Zone enregistrée.','Zone saved.');}catch(e){error(e.message);}finally{busy=false;render();}});
  $('refresh').addEventListener('click',load);$('connect').addEventListener('click',load);
  addEventListener('dashdock:context',()=>{if(ready&&!settings)load();});addEventListener('dashdock:language',()=>{setup();render();});
  async function start(){try{await dash.start();ready=true;setup();await load();timer=setInterval(()=>{if(!document.hidden&&!settings&&!busy)load();},60000);}catch(e){error(e.message);$('content').replaceChildren(el('p',t('Configuration indisponible. Rechargez le widget.','Configuration unavailable. Reload the widget.'),'muted'));}}
  addEventListener('pagehide',()=>clearInterval(timer));setup();render();start();
})();