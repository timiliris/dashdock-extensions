const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(provider,{preview=false,settings=false,request}={}){
 class Node{constructor(){this.children=[];this.textContent='';this.style={};this.hidden=false;this.value='';this.handlers={};this.disabled=false;}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}get firstChild(){return this.children[0];}setAttribute(name,value){this[name]=value;}addEventListener(name,fn){this.handlers[name]=fn;}}
 const nodes=new Map(),events={},calls=[];const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
 const dash={lang:'en',preview,config:{zone:'a'.repeat(32)},t:(fr,en)=>en,start:async()=>({}),save:async config=>{dash.config=config;},request:async(method,params)=>{calls.push({method,params});return request?request(method,params):{};}};
 const context={dash,document:{getElementById:get,createElement:()=>new Node(),body:{classList:{add(){}}},hidden:false},location:{search:settings?'?view=settings':''},URLSearchParams,addEventListener:(name,fn)=>events[name]=fn,setInterval:()=>1,clearInterval(){},Date};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extensions',provider,'app.js'),'utf8'),context);
 return {nodes,get,calls,dash,events};
}
function deferred(){let resolve;return {promise:new Promise(r=>resolve=r),resolve:v=>resolve(v)};}
(async()=>{
 for(const provider of ['cloudflare','crowdsec']){const h=harness(provider,{preview:true});await tick();assert.equal(h.calls.length,0);assert.equal(h.get('demo').hidden,false);assert.equal(h.get('demo').textContent,'Preview · demo data');assert.equal(h.get('content').children[0].children.length,3);}
 const missing=harness('crowdsec',{request:()=>{throw Error('provider_not_configured');}});await tick();assert.equal(missing.get('error').textContent,'Set up the connection in settings.');assert.equal(missing.get('content').children[0].children[0].textContent,'Connect your service');
 const zero=harness('crowdsec',{request:()=>({total:0,bans:0,other:0,decisions:[],checked_at:123})});await tick();assert.equal(zero.get('content').children[1].children[0].textContent,'No active local decisions.');assert.equal(zero.get('demo').hidden,true);
 const denied=harness('cloudflare',{request:()=>{throw Error('provider_auth_failed');}});await tick();assert.match(denied.get('error').textContent,/Key rejected/);
 const sheet=harness('cloudflare',{settings:true,request:()=>({zones:[{id:'a'.repeat(32),name:'example.com'}]})});await tick();assert.equal(sheet.get('zone').hidden,false);sheet.get('zone').value='a'.repeat(32);await sheet.get('zone').handlers.change();assert.equal(sheet.dash.config.zone,'a'.repeat(32));assert.equal(sheet.calls.length,1,'settings do not fetch private DNS details');
 const old=deferred();let count=0;const race=harness('cloudflare',{request:(method)=>method==='cloudflare.zones'?{zones:[{id:'a'.repeat(32),name:'example.com'}]}:++count===1?old.promise:{name:'current.example',status:'active',total:2,proxied:1,records:[],checked_at:100}});await tick();race.events['dashdock:context']();await tick();old.resolve({name:'stale.example',status:'active',total:1,proxied:1,records:[],checked_at:50});await tick();assert.equal(race.get('heading').textContent,'current.example');
 const tail=harness('tailscale',{preview:true});await tick();assert.equal(tail.calls.length,0);assert.equal(tail.get('devices').children.length,3);tail.get('search').value='linux';tail.get('search').handlers.input();assert.equal(tail.get('devices').children.length,1);assert.equal(tail.get('devices').children[0].children[0].children[0].textContent,'homelab');
 const wrong=harness('tailscale',{request:()=>{throw Error('provider_wrong_key_type');}});await tick();assert.match(wrong.get('error').textContent,/not a tskey-auth/);assert.equal(wrong.get('search').hidden,true);
 const empty=harness('tailscale',{request:()=>({total:0,authorized:0,pending:0,devices:[],checked_at:100})});await tick();assert.equal(empty.get('devices').children[0].textContent,'No devices in this tailnet.');
 console.log('PASS Tailscale: preview isolation, searchable inventory, wrong key type, true empty tailnet');
 console.log('PASS Cloudflare/CrowdSec: preview isolation, setup/auth errors, true empty result, settings save, stale response protection');
})().catch(error=>{console.error(error);process.exitCode=1;});
