// Lightweight bridge/UI contract tests. Run: node extensions/server-status/verify.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
class Element {
  constructor() { this.children = []; this.value = ''; this.textContent = ''; this.style = {setProperty(){}}; this.dataset = {}; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute() {}
}
async function test(id, config, service, expected) {
  const nodes = new Map(); const handlers = new Map(); const calls = [];
  const get = key => { if (!nodes.has(key)) nodes.set(key, new Element()); return nodes.get(key); };
  const root = new Element();
  const context = {
    document:{getElementById:get,createElement:()=>new Element(),documentElement:root},
    addEventListener(type, handler) { if(!handlers.has(type)) handlers.set(type, []); handlers.get(type).push(handler); },
    dispatchEvent(event) { for(const handler of handlers.get(event.type)||[]) handler(event); },
    Event:class { constructor(type) { this.type = type; } },
    Option:class extends Element { constructor(text,value) { super(); this.textContent=text; this.value=value; } },
    URL, Date, setTimeout, clearTimeout, setInterval(){}, console
  };
  context.window = context;
  context.parent = {postMessage(message) {
    if(message.type !== 'dashdock:request') return;
    calls.push(message);
    const result = message.method === 'config.get' ? config : message.method === 'config.save' ? message.params.config : service[message.method];
    queueMicrotask(() => context.dispatchEvent({type:'message',source:context.parent,data:{type:'dashdock:response',requestId:message.requestId,result}}));
  }};
  vm.createContext(context);
  const directory = path.resolve(__dirname,'..',id);
  vm.runInContext(fs.readFileSync(path.join(directory,'bridge.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(directory,'app.js'),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(calls.some(call=>call.method === expected),id+' initial request');
  assert.equal(get('refresh').textContent,'Actualiser');
  context.dispatchEvent({type:'message',source:{},data:{type:'dashdock:theme',lang:'en'}});
  assert.equal(get('refresh').textContent,'Actualiser','untrusted sender ignored');
  context.dispatchEvent({type:'message',source:context.parent,data:{type:'dashdock:theme',lang:'en',theme:'light'}});
  assert.equal(get('refresh').textContent,'Refresh','English rerender');
  assert.equal(root.lang,'en');
  context.dispatchEvent({type:'message',source:context.parent,data:{type:'dashdock:context',preview:true,config}});
  const before = calls.length; await context.dash.save(config);
  assert.equal(calls.length,before,'preview config has no remote write');
  context.dispatchEvent({type:'message',source:context.parent,data:{type:'dashdock:context',preview:false,config}});
  await context.dash.save(config);
  assert.equal(calls.at(-1).method,'config.save','live config is persisted');
  if(id === 'news') {
    assert.equal(get('items').children[0].children[0].href,undefined,'unsafe news scheme ignored');
    assert.equal(get('items').children[1].children[0].rel,'noopener noreferrer');
    assert.equal(get('items').children[1].children[0].textContent,'<script>headline</script>','feed title stays text');
    assert.equal(get('updated').textContent,`Updated at ${new Date(1791122400 * 1000).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}`,'epoch seconds date');
  }
  if(id === 'weather') { assert.ok(get('condition').textContent.includes('Clear sky')); get('query').value='Paris'; await get('search').onsubmit({preventDefault(){}}); assert.equal(calls.at(-1).method,'weather.search'); assert.equal(calls.at(-1).params.lang,'en'); }
  if(id === 'server-status') { assert.equal(get('latency').textContent,'14 ms'); assert.equal(get('state').textContent,'Online'); assert.equal(get('checked').textContent,new Date(1791122400 * 1000).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'}),'epoch seconds date'); }
  console.log(`PASS ${id}: bridge, configuration, preview, fr/en, rendering`);
}
(async()=> {
  await test('server-status',{target:'home'},{'status.targets':[{id:'home',name:'Home',url:'http://home/'}],'status.check':{name:'Home',url:'http://home/',online:true,status_code:200,latency_ms:14,checked_at:1791122400}},'status.check');
  await test('weather',{city:'Paris',latitude:48.8,longitude:2.3},{'weather.current':{temperature:20,apparent_temperature:19,humidity:40,wind_speed:8,weather_code:0,time:'2026-10-04T16:00',timezone:'Europe/Paris'},'weather.search':[{name:'Paris',country:'France',latitude:48.8,longitude:2.3}]},'weather.current');
  await test('news',{feed:'bbc'},{'news.feeds':[{id:'bbc',name:'BBC',url:'https://example.com'}],'news.items':{name:'BBC',items:[{title:'Unsafe',url:'javascript:alert(1)'},{title:'<script>headline</script>',url:'https://example.com/story'}],updated_at:1791122400}},'news.items');
})().catch(error=>{ console.error(error); process.exitCode=1; });
