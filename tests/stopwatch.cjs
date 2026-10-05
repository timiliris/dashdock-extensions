const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const nodes=new Map(),handlers=new Map(),messages=[];let now=0;
const get=id=>{if(!nodes.has(id))nodes.set(id,{addEventListener(type,fn){this[type]=fn;}});return nodes.get(id);};
const parent={postMessage:message=>messages.push(message)};
const sandbox={document:{querySelector:get,documentElement:{},addEventListener(){}},window:{addEventListener:(type,fn)=>handlers.set(type,fn)},parent,navigator:{language:'en'},performance:{now:()=>now},requestAnimationFrame:()=>1,cancelAnimationFrame(){}};
vm.runInNewContext(fs.readFileSync('extensions/stopwatch/app.js','utf8'),sandbox);
assert.deepEqual(Array.from(messages[0].actions),['start','pause','reset']);
function action(command,args={},source=parent){handlers.get('message')({source,data:{type:'dashdock:action',requestId:'test',action:command,arguments:args}});return messages.at(-1);}
action('start',{},{});assert.equal(messages.length,1,'foreign commands ignored');
assert.equal(action('start').result.running,true);now=1000;
assert.equal(action('start').result.elapsed_ms,1000,'start is idempotent');now=1500;
assert.equal(action('pause').result.elapsed_ms,1500);now=3000;
assert.equal(action('pause').result.elapsed_ms,1500,'pause is idempotent');
assert.equal(action('start').result.running,true);now=3500;
assert.equal(action('pause').result.elapsed_ms,2000,'resume preserves elapsed time');
assert.equal(action('reset').result.elapsed_ms,0);assert.equal(get('#elapsed').textContent,'00:00.00');
assert.equal(action('remove').error,'unsupported_action');assert.equal(action('start',{arbitrary:true}).error,'invalid_arguments');
get('#toggle').click();assert.equal(get('#toggle').textContent,'Pause');get('#reset').click();assert.equal(get('#toggle').textContent,'Start');
console.log('PASS stopwatch: authenticated parent actions, idempotent start/pause/reset, elapsed time, unsupported actions, manual controls');
