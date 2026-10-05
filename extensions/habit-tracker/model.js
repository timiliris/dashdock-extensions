(() => {
  const pad=n=>String(n).padStart(2,'0');
  const day=(date=new Date())=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  function shift(key,amount) {
    const [y,m,d]=key.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d+amount));
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth()+1)}-${pad(date.getUTCDate())}`;
  }
  const validDate=key=>typeof key==='string' && /^\d{4}-\d{2}-\d{2}$/.test(key) && shift(key,0)===key;
  function normalize(config,today=day()) {
    const seen=new Set(),oldest=shift(today,-59);
    return {habits:(Array.isArray(config?.habits)?config.habits:[]).filter(h=>h&&typeof h.id==='string'&&/^[a-z0-9-]{1,32}$/.test(h.id)&&typeof h.name==='string'&&h.name.trim()&&!seen.has(h.id)&&(seen.add(h.id),true)).slice(0,6).map(h=>({id:h.id,name:Array.from(h.name.trim()).slice(0,60).join(''),days:[...new Set((Array.isArray(h.days)?h.days:[]).filter(d=>validDate(d)&&d>=oldest&&d<=today))].sort().slice(-60)}))};
  }
  function streak(habit,today=day()) {
    const days=new Set(habit.days);let cursor=days.has(today)?today:shift(today,-1),count=0;
    while(days.has(cursor)&&count<60){count++;cursor=shift(cursor,-1);}return count;
  }
  function mutate(config,action,today=day()) {
    const next=normalize(config,today),habit=next.habits.find(h=>h.id===action.id);
    if(action.type==='toggle'&&habit)habit.days=habit.days.includes(today)?habit.days.filter(d=>d!==today):[...habit.days,today].sort();
    if(action.type==='remove')next.habits=next.habits.filter(h=>h.id!==action.id);
    if(action.type==='rename'&&habit&&action.name.trim())habit.name=Array.from(action.name.trim()).slice(0,60).join('');
    if(action.type==='add'&&next.habits.length<6&&action.name.trim()&&!habit)next.habits.push({id:action.id,name:Array.from(action.name.trim()).slice(0,60).join(''),days:[]});
    return next;
  }
  const model={day,shift,validDate,normalize,streak,mutate};
  if(typeof module!=='undefined'&&module.exports)module.exports=model;else window.HabitModel=model;
})();
