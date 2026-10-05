import {readdir,readFile,writeFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const safe=p=>p.split('/').every(part=>/^[a-zA-Z0-9_.-]+$/.test(part)&&part!=='.'&&part!=='..');
async function files(directory,prefix='') {
  const output=[];
  for(const name of (await readdir(directory)).sort()){
    const filename=path.join(directory,name),relative=prefix+name,info=await lstat(filename);
    if(!safe(relative)||info.isSymbolicLink())throw Error('Unsafe asset: '+relative);
    if(info.isDirectory())output.push(...await files(filename,relative+'/'));
    else if(info.isFile()){const bytes=await readFile(filename);output.push({path:relative,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
    else throw Error('Unsupported asset: '+relative);
  }
  return output;
}
const extensions=[];
for(const id of (await readdir(path.join(root,'extensions'))).sort()) {
  if(!/^[a-zA-Z0-9_-]{1,64}$/.test(id))throw Error('Invalid ID: '+id);
  const directory=path.join(root,'extensions',id);
  if((await lstat(directory)).isSymbolicLink())throw Error('Symlink extension: '+id);
  const manifest=JSON.parse(await readFile(path.join(directory,'manifest.json'),'utf8'));
  const assets=await files(directory);
  if(manifest.id!==id||manifest.api_version!==1||!safe(manifest.entry)||!manifest.version||!manifest.name||!assets.some(file=>file.path===manifest.entry))throw Error('Invalid manifest: '+id);
  if((manifest.permissions||[]).some(p=>!['ai','weather','news','status','links','dashboard'].includes(p)))throw Error('Unknown permission: '+id);
  if(assets.length>64||assets.reduce((n,f)=>n+f.size,0)>2*1024*1024)throw Error('Package too large: '+id);
  extensions.push({manifest,files:assets});
}
const json=JSON.stringify({api_version:1,extensions},null,2)+'\n';
const target=path.join(root,'catalogue.json');
if(process.argv.includes('--check')){if(await readFile(target,'utf8')!==json)throw Error('Stale catalogue: run node tools/build-catalogue.mjs');}
else await writeFile(target,json);
console.log(`Catalogue verified: ${extensions.length} independent extensions.`);
