const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'../extensions/habit-tracker'),model=require(path.join(root,'model.js'));
const habit={id:'walk',name:'Walk',days:['2026-03-27','2026-03-28','2026-03-29']};
assert.equal(model.day(new Date(2026,2,29,23,59)),'2026-03-29');
assert.equal(model.shift('2026-03-29',1),'2026-03-30');assert.equal(model.shift('2026-10-25',1),'2026-10-26');assert.equal(model.shift('2024-02-28',1),'2024-02-29');assert(!model.validDate('2026-02-30'));
assert.equal(model.streak(habit,'2026-03-29'),3);assert.equal(model.streak(habit,'2026-03-30'),3);assert.equal(model.streak(habit,'2026-03-31'),0);
assert.deepEqual(model.mutate({habits:[habit]},{type:'toggle',id:'walk'},'2026-03-30').habits[0].days,['2026-03-27','2026-03-28','2026-03-29','2026-03-30']);
assert.deepEqual(model.mutate({habits:[habit]},{type:'toggle',id:'walk'},'2026-03-29').habits[0].days,['2026-03-27','2026-03-28']);
const days=Array.from({length:100},(_,i)=>model.shift('2026-10-05',-i));
const maximum=model.normalize({habits:Array.from({length:8},(_,i)=>({id:'h-'+i,name:'😀'.repeat(60),days:[...days,'bad','2027-01-01',days[0]]}))},'2026-10-05');
assert.equal(maximum.habits.length,6);assert.equal(maximum.habits[0].days.length,60);assert.equal(model.streak(maximum.habits[0],'2026-10-05'),60);assert(Buffer.byteLength(JSON.stringify(maximum),'utf8')<8192);
assert.equal(model.normalize({habits:[habit,habit]},'2026-03-30').habits.length,1);
assert.equal(model.mutate({habits:[habit]},{type:'remove',id:'walk'},'2026-03-30').habits.length,0);
class Element{
  constructor(){this.children=[];this.dataset={};this.value='';this.hidden=false;this.textContent='';}
  append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}replaceChildren(...nodes){this.children=[];this.append(...nodes);}setAttribute(k,v){this[k]=v;}remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}
}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function harness({preview=false,loadFails=false,saveFails=false,config={habits:[habit]}}={}){
  const elements=new Map(),listeners=new Map(),calls=[];let failLoad=loadFails,failSave=saveFails;
  const dash={lang:'en',preview,config,t:(fr,en)=>en,start:async()=>{if(failLoad)throw Error('load');return dash.config;},request:async method=>{calls.push(method);return {config:dash.config};},save:async next=>{calls.push('save');if(failSave)throw Error('save');dash.config=next;}};
  const context={HabitModel:model,dash,document:{documentElement:{dataset:{}},getElementById:id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement:()=>new Element()},location:{search:preview?'?view=preview':'?view=settings'},URLSearchParams,TextEncoder,Date,Math,setInterval:()=>{},addEventListener:(name,fn)=>listeners.set(name,fn)};
  vm.runInNewContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
  return {elements,dash,calls,emit:name=>listeners.get(name)?.(),loadOk:()=>{failLoad=false;},saveOk:()=>{failSave=false;}};
}
(async()=>{
  let h=harness({loadFails:true});await flush();assert(h.elements.get('add').disabled);assert(!h.elements.get('retry').hidden);h.elements.get('new-name').value='Read';await h.elements.get('add-form').onsubmit({preventDefault(){}});await flush();assert.equal(h.calls.length,0);
  h.loadOk();await h.elements.get('retry').onclick();assert(!h.elements.get('add').disabled);
  h=harness({saveFails:true});await flush();h.elements.get('new-name').value='Read';h.elements.get('add-form').onsubmit({preventDefault(){}});await flush();assert.equal(h.elements.get('new-name').value,'Read');assert.equal(h.dash.config.habits.length,1);assert(h.elements.get('error').textContent.includes('Could not save'));
  h.saveOk();h.elements.get('add-form').onsubmit({preventDefault(){}});await flush();assert.equal(h.dash.config.habits.length,2);assert.equal(h.elements.get('new-name').value,'');
  const input=h.elements.get('editors').children[0].children[0];input.value='Draft name';input.oninput();h.dash.config={habits:[{...h.dash.config.habits[0],name:'Remote name'},h.dash.config.habits[1]]};h.emit('dashdock:context');assert.equal(input.value,'Draft name');
  h=harness({preview:true});await flush();h.elements.get('new-name').value='Preview habit';h.elements.get('add-form').onsubmit({preventDefault(){}});await flush();assert.deepEqual(h.calls,[]);assert.equal(h.elements.get('editors').children.length,3);
  // A later broadcast must win over an older save response.
  const handlers=new Map(),sent=[],parent={postMessage:m=>sent.push(m)},bridge={window:{},parent,addEventListener:(name,fn)=>handlers.set(name,fn),dispatchEvent(){},Event:class{},document:{documentElement:{dataset:{},style:{setProperty(){}}}},setTimeout:()=>1,clearTimeout(){},Date,Map,Promise,URL};
  vm.runInNewContext(fs.readFileSync(path.join(root,'bridge.js'),'utf8'),bridge);bridge.dash=bridge.window.dash;
  const saving=bridge.dash.save({habits:[{id:'old',name:'Old',days:[]}]});handlers.get('message')({source:parent,data:{type:'dashdock:config',config:{habits:[{id:'new',name:'New',days:[]}]}}});handlers.get('message')({source:parent,data:{type:'dashdock:response',requestId:sent[0].requestId,result:{habits:[{id:'old',name:'Old',days:[]}]}}});await saving;assert.equal(bridge.dash.config.habits[0].id,'new');
  console.log('Habit tracker: local dates, DST boundaries, rollover, streaks, bounds, Unicode budget, load/write failures, drafts, preview and broadcast ordering passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
