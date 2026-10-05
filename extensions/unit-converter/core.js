(function(root){
  'use strict';
  const groups={
    length:{fr:'Longueur',en:'Length',units:{mm:0.001,cm:0.01,m:1,km:1000,in:0.0254,ft:0.3048,yd:0.9144,mi:1609.344}},
    mass:{fr:'Masse',en:'Mass',units:{mg:0.000001,g:0.001,kg:1,t:1000,oz:0.028349523125,lb:0.45359237}},
    temperature:{fr:'Température',en:'Temperature',units:{'°C':1,'°F':1,K:1}},
    storage:{fr:'Stockage',en:'Storage',units:{B:1,kB:1000,MB:1e6,GB:1e9,TB:1e12,KiB:1024,MiB:1048576,GiB:1073741824,TiB:1099511627776}}
  };
  function parse(value){if(typeof value!=='string')return null;const clean=value.trim().replace(/[\u00a0\u202f]/g,' ');if(!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d{1,3})?$/.test(clean))return null;const number=Number(clean.replace(',','.'));return Number.isFinite(number)?number:null;}
  function convert(value,category,from,to){const group=Object.hasOwn(groups,category)?groups[category]:null;if(!group||!Object.hasOwn(group.units,from)||!Object.hasOwn(group.units,to)||!Number.isFinite(value))return null;let result;if(category==='temperature'){const c=from==='°F'?(value-32)*5/9:from==='K'?value-273.15:value;if(c< -273.15-1e-10)return null;result=to==='°F'?c*9/5+32:to==='K'?c+273.15:c;}else result=value*group.units[from]/group.units[to];return Number.isFinite(result)?(Object.is(result,-0)?0:result):null;}
  function normalize(config){const category=Object.hasOwn(groups,config?.category)?config.category:'length',units=Object.keys(groups[category].units);return {category,from:units.includes(config?.from)?config.from:units[category==='length'?2:0],to:units.includes(config?.to)?config.to:units[category==='length'?3:1],value:typeof config?.value==='string'&&config.value.length<=100?config.value:'1'};}
  function format(value,locale){return new Intl.NumberFormat(locale,{maximumSignificantDigits:10}).format(value);}
  const api={groups,parse,convert,normalize,format};if(typeof module!=='undefined')module.exports=api;else root.UnitConverter=api;
})(globalThis);
