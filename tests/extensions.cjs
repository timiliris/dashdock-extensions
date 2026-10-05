/* Stateful widgets: persistence, failed saves, preview and active timer continuity. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(name,initial={}) {
  const nodes=new Map(),handlers=new Map(),intervals=[],saved=[];let lang='fr',preview=false,failSave=false,now=1000;
  class Node {
    constructor(){this.children=[];this.attributes={};this.textContent='';this.value='';this.disabled=false;this.hidden=false;this.checked=false;this.listeners={};}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=nodes;}
    setAttribute(key,value){this.attributes[key]=value;}
    focus(){}
    querySelector(){return this.children[0] || (this.children[0]=new Node());}
    addEventListener(type,handler){(this.listeners[type]??=[]).push(handler);}
  }
  const get=id=>{if(!nodes.has(id)) nodes.set(id,new Node());return nodes.get(id);};
  const on=(type,handler)=>{(handlers.get(type)||handlers.set(type,[]).get(type)).push(handler);};
  const emit=(type,detail={})=>(handlers.get(type)||[]).forEach(handler=>handler({type,detail}));
  const document={getElementById:get,createElement:()=>new Node(),addEventListener:on};
  const sandbox={document,window:{WidgetI18n:{t:(key,params={})=>key.replace(/\{(\w+)\}/g,(_,name)=>params[name]||''),lang:()=>lang}},
    WidgetStore:{get:async()=>structuredClone(initial),save:async config=>{if(failSave) throw new Error('offline');saved.push(structuredClone(config));return structuredClone(config);},preview:()=>preview},
    setInterval:callback=>intervals.push(callback),Date:{now:()=>now},console};
  sandbox.WidgetI18n=sandbox.window.WidgetI18n;
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,`../extensions/${name}/app.js`),'utf8'),sandbox);
  return {get,saved,emit,intervals,setLang:value=>{lang=value;emit('dashdock:language');},setPreview:value=>{preview=value;emit('dashdock:storage-context');},setFailure:value=>{failSave=value;},advance:value=>{now+=value;intervals.forEach(fn=>fn());}};
}
const event={preventDefault(){}};
async function checklist() {
  const h=harness('checklist',{tasks:[{text:'Persisted',done:true}],custom:'preserved'});await tick();
  assert.equal(h.get('tasks').children.length,1);assert.equal(h.get('task').disabled,false);
  h.get('task').value='Second';h.get('form').onsubmit(event);await tick();
  assert.deepEqual(h.saved.at(-1),{tasks:[{text:'Persisted',done:true},{text:'Second',done:false}],custom:'preserved'});
  h.setLang('en');assert.equal(h.get('tasks').children.length,2,'language preserves tasks');
  h.get('clear').onclick();await tick();assert.equal(h.saved.at(-1).tasks.length,1);
  h.setFailure(true);h.get('task').value='Offline change';h.get('form').onsubmit(event);await tick();
  assert.equal(h.get('retry').hidden,false);assert.match(h.get('storage').textContent,/Save failed/);
  h.setFailure(false);h.get('retry').onclick();await tick();assert.equal(h.saved.at(-1).tasks.at(-1).text,'Offline change');
  assert.equal(h.get('retry').hidden,true);h.setPreview(true);assert.match(h.get('storage').textContent,/Preview/);
  for(let i=0;i<30;i++){h.get('task').value='😀'.repeat(100);h.get('form').onsubmit(event);}await tick();
  const config=h.saved.at(-1);assert.equal(config.tasks.length,16);assert.ok(Buffer.byteLength(JSON.stringify(config))<=8192);
  assert.equal(h.get('task').disabled,true);
  console.log('PASS checklist: per-widget config, ordered writes, retry, preview, language, UTF-8 limit');
}
async function focus() {
  const h=harness('focus',{focusMinutes:40,breakMinutes:8,custom:'preserved'});await tick();
  assert.equal(h.get('clock').textContent,'40:00');h.get('toggle').onclick();h.advance(10000);assert.equal(h.get('clock').textContent,'39:50');
  h.setLang('en');assert.equal(h.get('clock').textContent,'39:50');assert.equal(h.get('break').textContent,'Break · 8 min');
  h.get('focus-min').value='12';h.get('break-min').value='3';await h.get('duration-form').onsubmit(event);
  assert.deepEqual(h.saved.at(-1),{focusMinutes:12,breakMinutes:3,custom:'preserved'});
  assert.equal(h.get('clock').textContent,'39:50','saving new durations leaves active timer unchanged');h.advance(1000);assert.equal(h.get('clock').textContent,'39:49');
  h.get('reset').onclick();assert.equal(h.get('clock').textContent,'12:00');
  h.get('break').onclick();assert.equal(h.get('clock').textContent,'03:00');
  h.get('focus-min').value='181';await h.get('duration-form').onsubmit(event);assert.equal(h.saved.length,1,'reject overlarge durations');
  h.get('focus-min').value='10';h.setFailure(true);await h.get('duration-form').onsubmit(event);assert.match(h.get('storage').textContent,/not saved/);
  assert.equal(h.get('save').textContent,'Retry');h.setFailure(false);await h.get('duration-form').onsubmit(event);assert.equal(h.saved.at(-1).focusMinutes,10);
  h.setPreview(true);assert.match(h.get('storage').textContent,/Preview/);
  console.log('PASS focus: restored durations, timer continuity, input bounds, save retry, preview');
}
async function store() {
  const messages=[],handlers=new Map(),timers=new Map(),events=[];
  const parent={postMessage:message=>messages.push(message)};
  const sandbox={parent,window:{},addEventListener:(type,handler)=>handlers.set(type,handler),document:{dispatchEvent:event=>events.push(event)},
    Event:class{constructor(type){this.type=type;}},setTimeout:callback=>{const id=timers.size+1;timers.set(id,callback);return id;},clearTimeout:id=>timers.delete(id)};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../extensions/checklist/store.js'),'utf8'),sandbox);
  const sdk=sandbox.window.WidgetStore,receive=(data,source=parent)=>handlers.get('message')({source,data});
  const reading=sdk.get(), request=messages.at(-1);assert.equal(request.method,'config.get');
  receive({type:'dashdock:response',requestId:request.requestId,result:{tasks:['spoof']}},{});
  assert.equal(timers.size,1,'foreign replies do not resolve requests');
  receive({type:'dashdock:response',requestId:request.requestId,result:{tasks:[]}});assert.deepEqual(await reading,{tasks:[]});assert.equal(timers.size,0);
  receive({type:'dashdock:context',preview:true});assert.equal(sdk.preview(),true);assert.equal(events[0].type,'dashdock:storage-context');
  const saving=sdk.save({tasks:[]});assert.equal(messages.at(-1).method,'config.save');assert.deepEqual(JSON.parse(JSON.stringify(messages.at(-1).params)),{config:{tasks:[]}});
  receive({type:'dashdock:response',requestId:messages.at(-1).requestId,error:'invalid_config'});await assert.rejects(saving,/invalid_config/);
  const timeout=sdk.get();timers.values().next().value();await assert.rejects(timeout,/request_timeout/);
  assert.equal(fs.readFileSync(path.join(__dirname,'../extensions/focus/store.js'),'utf8'),fs.readFileSync(path.join(__dirname,'../extensions/checklist/store.js'),'utf8'));
  console.log('PASS widget store: parent source validation, config RPC, preview, errors, timeout');
}
(async()=>{await checklist();await focus();await store();})().catch(error=>{console.error(error);process.exitCode=1;});
