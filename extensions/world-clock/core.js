(function(root){
  'use strict';
  const defaults=[{label:'Bruxelles',zone:'Europe/Brussels'},{label:'New York',zone:'America/New_York'},{label:'Tokyo',zone:'Asia/Tokyo'},{label:'Sydney',zone:'Australia/Sydney'}];
  function validZone(zone){try{if(typeof zone!=='string'||zone.length>100)return false;new Intl.DateTimeFormat('en',{timeZone:zone}).format();return true;}catch(_){return false;}}
  function normalize(rows){if(!Array.isArray(rows)||rows.length<1||rows.length>4)return defaults.map(row=>({...row}));return rows.every(row=>row&&typeof row.label==='string'&&row.label.trim()&&row.label.length<=60&&validZone(row.zone))?rows.map(row=>({label:row.label.trim(),zone:row.zone})):defaults.map(row=>({...row}));}
  function dayNumber(date,zone){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const value=key=>Number(parts.find(part=>part.type===key).value);return Date.UTC(value('year'),value('month')-1,value('day'))/86400000;}
  function clock(date,zone,locale,localZone){return {time:new Intl.DateTimeFormat(locale,{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date),date:new Intl.DateTimeFormat(locale,{timeZone:zone,weekday:'short',day:'numeric',month:'short'}).format(date),offset:dayNumber(date,zone)-dayNumber(date,localZone)};}
  const api={defaults,validZone,normalize,clock};if(typeof module!=='undefined')module.exports=api;else root.WorldClock=api;
})(globalThis);
