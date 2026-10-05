'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const world=require('../extensions/world-clock/core.js'),units=require('../extensions/unit-converter/core.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} differs from ${b}`);
close(units.convert(1,'length','mi','m'),1609.344);close(units.convert(1,'mass','lb','g'),453.59237);
close(units.convert(32,'temperature','°F','°C'),0);close(units.convert(100,'temperature','°C','°F'),212);close(units.convert(0,'temperature','K','°C'),-273.15);
assert.equal(units.convert(-1,'temperature','K','°C'),null);assert.equal(units.convert(-500,'temperature','°F','K'),null);
close(units.convert(1,'storage','GiB','MiB'),1024);close(units.convert(1,'storage','GB','MB'),1000);
for(const category of Object.keys(units.groups)){const ids=Object.keys(units.groups[category].units);for(const from of ids)for(const to of ids){const initial=category==='temperature'?300:12.345;close(units.convert(units.convert(initial,category,from,to),category,to,from),initial);}}
assert.equal(units.parse(' -12,5 '),-12.5);assert.equal(units.parse('1.2e3'),1200);assert.equal(units.parse(',5'),0.5);
for(const text of ['1,234.56','1 234','1+2','Infinity','NaN','0x10','1e999',''])assert.equal(units.parse(text),null,text);
assert.equal(units.convert(1,'__proto__','m','km'),null);assert.equal(units.convert(Infinity,'length','m','km'),null);
assert.equal(units.normalize({category:'bad'}).category,'length');assert.equal(units.normalize({category:'temperature',from:'m'}).from,'°C');
assert.equal(world.validZone('Europe/Brussels'),true);assert.equal(world.validZone('Invalid/City'),false);
const before=world.clock(new Date('2026-03-08T06:59:00Z'),'America/New_York','en-GB','UTC'),after=world.clock(new Date('2026-03-08T07:00:00Z'),'America/New_York','en-GB','UTC');
assert.equal(before.time,'01:59');assert.equal(after.time,'03:00');
assert.equal(world.clock(new Date('2026-01-01T00:00:00Z'),'America/New_York','en-GB','UTC').offset,-1);
assert.equal(world.clock(new Date('2026-01-01T22:00:00Z'),'Asia/Tokyo','fr-FR','UTC').offset,1);
assert.equal(world.clock(new Date('2026-10-25T00:30:00Z'),'Europe/Brussels','en-GB','UTC').time,'02:30');
assert.equal(world.clock(new Date('2026-10-25T01:30:00Z'),'Europe/Brussels','en-GB','UTC').time,'02:30');
assert.equal(world.normalize([{label:'Bad',zone:'Invalid/City'}]).length,4);assert.equal(world.normalize([{label:'Paris',zone:'Europe/Paris'}]).length,1);
function bridge(id,search='?view=widget'){
 const sent=[],listeners={},parent={postMessage:message=>sent.push(message)},context={URLSearchParams,TextEncoder,Date,Map,Promise,Object,JSON,Error,Event,location:{search},parent,setTimeout:()=>1,clearTimeout:()=>{},document:{documentElement:{dataset:{},style:{setProperty(){}}}},addEventListener:(type,fn)=>listeners[type]=fn,dispatchEvent:()=>{}};
 context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../extensions',id,'bridge.js'),'utf8'),context);
 const message=data=>listeners.message({source:parent,data}),reply=(request,result,error)=>message({type:'dashdock:response',requestId:request.requestId,result,error});return {dash:context.dash,sent,message,reply};
}
function app(id){
 const elements=new Map(),listeners={},timeouts=[];class Element{constructor(){this.value='';this.disabled=false;this.hidden=false;this.children=[];this.textContent='';}append(...children){this.children.push(...children);for(const child of children)if(child.id)elements.set(child.id,child);}replaceChildren(...children){this.children=[];this.append(...children);}setAttribute(){} }
 const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};let fail=true,saves=[];
 const dash={lang:'fr',preview:false,config:{},t:(fr)=>fr,start:async()=>{if(fail)throw Error('Unavailable');return {};},save:async value=>{saves.push(value);dash.config=value;}};
 const context={WorldClock:world,UnitConverter:units,dash,URLSearchParams,Date,Intl,Option:class extends Element{constructor(text,value){super();this.textContent=text;this.value=value;}},location:{search:'?view=settings'},document:{getElementById:get,createElement:()=>new Element(),body:new Element(),documentElement:{dataset:{}}},addEventListener:(type,fn)=>listeners[type]=fn,setInterval:()=>{},setTimeout:fn=>{timeouts.push(fn);return timeouts.length;},clearTimeout:()=>{}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../extensions',id,'app.js'),'utf8'),context);return {get,dash,saves,timeouts,success:()=>fail=false,listeners};
}
(async()=>{
 for(const id of ['world-clock','unit-converter']){
  const b=bridge(id),starting=b.dash.start();b.reply(b.sent.at(-1),null,'Unavailable');await assert.rejects(starting);
  const retry=b.dash.start();b.reply(b.sent.at(-1),{config:{value:'3'}});await retry;assert.equal(b.dash.config.value,'3');
  const save=b.dash.save({value:'4'});b.message({type:'dashdock:config',config:{value:'5'}});b.reply(b.sent.at(-1),{});await save;assert.equal(b.dash.config.value,'5','late save response must not replace newer context');
  await assert.rejects(b.dash.save({value:'é'.repeat(1001)}));await assert.rejects(b.dash.save({values:Array(101).fill(1)}));await assert.rejects(b.dash.save({a:'a'.repeat(2000),b:'a'.repeat(2000),c:'a'.repeat(2000),d:'a'.repeat(2000),e:'a'.repeat(500)}));
  const p=bridge(id,'?view=preview');await p.dash.save({value:'9'});assert.equal(p.sent.length,0,'preview must never persist');assert.equal(p.dash.config.value,'9');
  const a=app(id);await new Promise(setImmediate);const control=id==='world-clock'?'save':'value';assert.equal(a.get(control).disabled,true,'failed load must disable edits');assert.equal(a.get('retry').hidden,false);a.success();await a.get('retry').onclick();assert.equal(a.get(control).disabled,false,'retry restores editing');
 }
 const a=app('unit-converter');await new Promise(setImmediate);a.success();await a.get('retry').onclick();a.get('value').value='2,5';a.get('value').oninput();a.timeouts.at(-1)();await new Promise(setImmediate);assert.equal(a.saves.at(-1).value,'2,5');assert.match(a.get('result').textContent,/0,0025/);
 console.log('World clock and converter: units, affine temperatures, numeric inputs, DST, dates, config recovery, races and preview verified.');
})().catch(error=>{console.error(error);process.exitCode=1;});
