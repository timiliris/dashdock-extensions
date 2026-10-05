const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(extension,config={},preview=false,loadFailure=false){
  const nodes=new Map(),events=new Map(),saves=[];let failing=false,interval,loadingFails=loadFailure;
  function node(tag='div') {return {tag,value:'',textContent:'',hidden:false,disabled:false,children:[],style:{},attributes:{},setAttribute(key,value){this.attributes[key]=value;},append(...values){this.children.push(...values);if(tag==='select'&&!this.value)this.value=values[0]?.value||'';},replaceChildren(...values){this.children=[];this.value=tag==='select'?'':this.value;this.append(...values);},focus(){}};}
  const $=id=>{if(!nodes.has(id))nodes.set(id,node(id==='category'?'select':'div'));return nodes.get(id);};
  const dash={config,preview,lang:'en',t:(fr,en)=>dash.lang==='en'?en:fr,start:async()=>{if(loadingFails)throw Error('read_failed');},save:async value=>{if(failing)throw Error('save_failed');saves.push(JSON.parse(JSON.stringify(value)));dash.config=value;}};
  vm.runInNewContext(fs.readFileSync(`extensions/${extension}/app.js`,'utf8'),{document:{getElementById:$,createElement:node,documentElement:{dataset:{}}},location:{search:`?view=${preview?'preview':'settings'}`},dash,TextEncoder,URL,URLSearchParams,crypto:{randomUUID:()=>String(saves.length)},Option:class{constructor(text,value){this.text=text;this.value=value;}},Date,Intl,addEventListener:(key,callback)=>events.set(key,callback),setInterval:callback=>interval=callback});
  return {$,dash,saves,events,interval:()=>interval(),fail:()=>failing=true,restoreLoad:()=>loadingFails=false};
}
async function submitBookmark(h,name,url,group=''){h.$('name').value=name;h.$('url').value=url;h.$('group').value=group;await h.$('form').onsubmit({preventDefault(){}});}
(async()=>{
  const b=harness('bookmarks');await tick();
  await submitBookmark(b,'My server','http://192.168.1.5:8080','Home');assert.equal(b.saves.length,1);assert.equal(b.saves[0].bookmarks[0].category,'Home');
  const link=b.$('links').children[0].children[0];assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');assert.equal(link.href,'http://192.168.1.5:8080/');
  await submitBookmark(b,'Unsafe','javascript:alert(1)');await submitBookmark(b,'Credentials','https://user:password@example.com/');assert.equal(b.saves.length,1,'unsafe URLs never saved');
  await submitBookmark(b,'Too long','https://example.com/'+ '🦆'.repeat(500));assert.equal(b.saves.length,1,'URL encoded bytes are bounded');
  b.$('search').value='missing';b.$('search').oninput();assert.equal(b.$('links').children.length,0);assert.equal(b.$('empty').textContent,'No matches.');
  b.$('search').value='';b.$('search').oninput();b.$('saved').children[0].children[1].onclick();assert.equal(b.$('name').value,'My server');await submitBookmark(b,'Changed','https://example.com/','Work');assert.equal(b.saves[1].bookmarks.length,1);assert.equal(b.saves[1].bookmarks[0].name,'Changed');
  await b.$('saved').children[0].children[2].onclick();assert.equal(b.saves[2].bookmarks.length,0);
  const many=harness('bookmarks',{bookmarks:Array.from({length:12},(_,i)=>({id:`b${i}`,name:`Bookmark ${i}`,url:`https://example.com/${i}`,category:'Work'}))});await tick();assert.equal(many.$('links').children.length,4);many.$('next').onclick();assert.match(many.$('count').textContent,/2\/3/);await submitBookmark(many,'Extra','https://example.com/');assert.equal(many.saves.length,0);assert.match(many.$('error').textContent,/12/);
  const budget=harness('bookmarks',{other:'x'.repeat(8100)});await tick();await submitBookmark(budget,'Label','https://example.com/');assert.equal(budget.saves.length,0);assert.match(budget.$('error').textContent,/too large/);
  const failed=harness('bookmarks');await tick();failed.fail();await submitBookmark(failed,'Keep draft','https://example.com/');assert.equal(failed.$('name').value,'Keep draft');assert.equal(failed.$('save').disabled,false);
  const p=harness('bookmarks',{},true);await tick();await submitBookmark(p,'Preview','https://example.com/');assert.equal(p.saves.length,0);assert.equal(p.$('save').disabled,true);
  const c=harness('countdown');await tick();assert.match(c.$('hint').textContent,/settings/);c.$('name').value='Launch';c.$('target').value='2030-01-15T14:30';await c.$('form').onsubmit({preventDefault(){}});assert.equal(c.saves.length,1);assert.equal(c.saves[0].target,new Date('2030-01-15T14:30').toISOString());assert.equal(c.$('title').textContent,'Launch');
  const past=harness('countdown',{name:'Done',target:'2020-01-01T00:00:00Z'});await tick();assert.equal(past.$('days').textContent,'00');assert.equal(past.$('seconds').textContent,'00');assert.equal(past.$('state').textContent,'Event reached');past.dash.lang='fr';past.events.get('dashdock:language')();assert.equal(past.$('state').textContent,'Événement atteint');
  c.$('target').value='2030-02-30T14:30';await c.$('form').onsubmit({preventDefault(){}});assert.equal(c.saves.length,1,'overflow dates rejected');c.$('target').value='invalid';await c.$('form').onsubmit({preventDefault(){}});assert.equal(c.saves.length,1);
  const cp=harness('countdown',{},true);await tick();cp.$('name').value='Preview';cp.$('target').value='2030-01-01T00:00';await cp.$('form').onsubmit({preventDefault(){}});assert.equal(cp.saves.length,0);
  for(const extension of ['bookmarks','countdown']){
    const blocked=harness(extension,{},false,true);await tick();assert.equal(blocked.$('save').disabled,true,'failed config reads disable writes');assert.equal(blocked.$('retry').hidden,false);
    await blocked.$('form').onsubmit({preventDefault(){}});assert.equal(blocked.saves.length,0);blocked.restoreLoad();await blocked.$('retry').onclick();assert.equal(blocked.$('save').disabled,false);assert.equal(blocked.$('retry').hidden,true);
  }
  const cf=harness('countdown');await tick();cf.fail();cf.$('name').value='Draft';cf.$('target').value='2030-01-01T12:00';cf.$('name').oninput();await cf.$('form').onsubmit({preventDefault(){}});assert.equal(cf.$('name').value,'Draft');cf.events.get('dashdock:context')();assert.equal(cf.$('name').value,'Draft','context updates preserve unsaved draft');
  console.log('PASS practical extensions: persistence, safe links, search, editing, deletion, pagination, limits, draft recovery, UTC dates, completed events, language and preview guards');
})().catch(error=>{console.error(error);process.exitCode=1;});
