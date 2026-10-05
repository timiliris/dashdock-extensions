const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(preview=false){
  const nodes=new Map(),requests=[],saves=[];let fail=false, tracking=false;
  const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',disabled:false,children:[],setAttribute(){},append(option){this.children.push(option);if(!this.value)this.value=option.value;},replaceChildren(){this.children=[];this.value='';}});return nodes.get(id);};
  const dash={preview,config:{},lang:'en',t:(fr,en)=>en,start:async()=>{},safeUrl:url=>/^https?:\/\//.test(url),save:async config=>{saves.push(config);dash.config=config;},request:async(method,params)=>{requests.push({method,params});if(method==='status.targets')return [{id:'old',name:'Old'},{id:'new',name:'New'}];if(method==='status.create'){if(fail)throw Error('invalid_url');return {id:'new',name:params.name,url:params.url};}if(method==='status.tracking'){tracking=params.enabled;return {enabled:tracking,points:[]};}if(method==='status.history')return {enabled:tracking,points:tracking?[{checked_at:Math.floor(Date.now()/1000),online:false,latency_ms:null}]:[]};if(method==='status.check')return {name:'New',online:true,latency_ms:1};}};
  vm.runInNewContext(fs.readFileSync('extensions/server-status/app.js','utf8'),{document:{getElementById:node,documentElement:{dataset:{view:preview?'preview':'settings'}}},dash,addEventListener(){},setInterval(){},Option:class{constructor(text,value){this.text=text;this.value=value;}},Date});
  return {node,dash,requests,saves,fail:value=>fail=value};
}
(async()=>{
  const h=harness();await tick();assert.equal(h.node('create-service').disabled,false);
  h.node('service-name').value='My service';h.node('service-url').value='http://192.168.1.10:8080';
  await h.node('service-form').onsubmit({preventDefault(){}});
  assert.deepEqual(JSON.parse(JSON.stringify(h.requests.find(r=>r.method==='status.create').params)),{name:'My service',url:'http://192.168.1.10:8080'});
  assert.equal(h.requests.filter(r=>r.method==='status.targets').length,2,'catalogue refreshed after creation');assert.equal(h.saves[0].target,'new');assert.equal(h.node('service-name').value,'');assert.equal(h.node('state').textContent,'Online');
  h.node('tracking').checked=true;await h.node('tracking').onchange();assert.equal(h.node('history').hidden,false);assert.match(h.node('chart').innerHTML,/#fb7185/,'offline checks shown in red');assert.match(h.node('history-summary').textContent,/1 unavailable/);assert.match(h.node('history-empty').textContent,/Collecting/,'one real point does not invent a curve');h.node('tracking').checked=false;await h.node('tracking').onchange();assert.equal(h.node('history').hidden,true);
  h.node('service-name').value='Invalid';h.node('service-url').value='javascript:alert(1)';await h.node('service-form').onsubmit({preventDefault(){}});assert.equal(h.requests.filter(r=>r.method==='status.create').length,1,'invalid schemes rejected before creation');
  h.node('service-url').value='http://localhost';h.fail(true);await h.node('service-form').onsubmit({preventDefault(){}});assert.match(h.node('error').textContent,/not added/);assert.equal(h.node('service-name').value,'Invalid','draft retained after rejection');assert.equal(h.node('create-service').disabled,false);
  const p=harness(true);await tick();assert.equal(p.node('create-service').disabled,true);p.node('service-name').value='Preview';p.node('service-url').value='http://localhost';await p.node('service-form').onsubmit({preventDefault(){}});assert.equal(p.requests.filter(r=>r.method==='status.create').length,0,'preview cannot create services');
  p.dash.config.target='old';p.node('tracking').checked=true;await p.node('tracking').onchange();assert.equal(p.requests.filter(r=>r.method==='status.tracking').length,0,'preview cannot enable monitoring');
  console.log('PASS server status: create, reload targets, persist selection, check service, invalid URL, retry draft, preview guard');
})().catch(error=>{console.error(error);process.exitCode=1;});
