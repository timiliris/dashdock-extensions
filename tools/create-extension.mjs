/** Development helper; Node is never required by the running dashboard. */
import {mkdir, lstat, realpath, readFile, writeFile, unlink, rmdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export async function createExtension(root, id, name) {
  if(!/^[a-z][a-z0-9_-]{0,63}$/.test(id) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(id)) throw new Error('Invalid id: use lowercase letters, numbers, hyphens or underscores.');
  name = name?.trim() || id.split(/[-_]/).map(word=>word[0].toUpperCase()+word.slice(1)).join(' ');
  if(!name || Buffer.byteLength(name)>100 || /[\x00-\x1f\x7f]/.test(name)) throw new Error('Name must contain 1–100 UTF-8 bytes.');
  const extensions = path.resolve(root,'extensions');
  const directoryInfo = await lstat(extensions);
  if(!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink() || path.resolve(await realpath(extensions)) !== extensions) throw new Error('Extensions directory must be a real directory.');
  const template=path.join(extensions,'hello');
  const templateInfo=await lstat(template);
  if(!templateInfo.isDirectory() || templateInfo.isSymbolicLink()) throw new Error('The hello template must be a real directory.');
  const files=['index.html','theme.js','i18n.js','manifest.json'];
  const contents=[];
  for(const file of files) {
    const target=path.join(template,file), info=await lstat(target);
    if(!info.isFile() || info.isSymbolicLink()) throw new Error('Template assets must be regular files.');
    contents.push(await readFile(target,'utf8'));
  }
  const manifest=JSON.parse(contents.pop());
  Object.assign(manifest,{id,name,version:'0.1.0',category:'examples',icon:'✦',permissions:[],tags:['custom']});
  manifest.description='Une extension personnelle à adapter. / A personal extension to customize.';
  manifest.translations={fr:{name,description:'Une extension personnelle à adapter.'},en:{name,description:'A personal extension to customize.'}};
  const directory=path.join(extensions,id);
  // mkdir is exclusive: an existing extension, including a symlink, is never overwritten.
  await mkdir(directory);
  const written=[];
  try {
    for(let i=0;i<3;i++) {await writeFile(path.join(directory,files[i]),contents[i],{encoding:'utf8',flag:'wx'});written.push(files[i]);}
    const guide='# '+name+'\n\nEdit index.html and i18n.js. The theme and language arrive automatically from DashDock.\n\nManifest permissions are empty by default. For configuration and service calls, follow ../../docs/extensions.md. Never include API keys in assets or config.\n';
    await writeFile(path.join(directory,'README.md'),guide,{encoding:'utf8',flag:'wx'});written.push('README.md');
    // Manifest last: partially created extensions cannot enter the catalogue.
    await writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{encoding:'utf8',flag:'wx'});written.push('manifest.json');
  } catch(error) {
    // Remove only our known files; never recursively remove unexpected user files.
    for(const file of written) await unlink(path.join(directory,file)).catch(()=>{});
    await rmdir(directory).catch(()=>{});
    throw error;
  }
  return directory;
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  if(args.length===0 || args[0]==='--help') {
    console.log('Usage: node tools/create-extension.mjs my-widget [--name "My widget"]\nCreates a bilingual, themed extension from the hello example. Existing folders are never overwritten.');
  } else if(args.length!==1 && !(args.length===3 && args[1]==='--name')) {
    console.error('Usage: node tools/create-extension.mjs my-widget [--name "My widget"]');process.exitCode=1;
  } else {
    const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
    try {console.log('Created: '+await createExtension(root,args[0],args[2]));console.log('Reload Extensions in DashDock; no build or server restart is required.');}
    catch(error){console.error(error.message);process.exitCode=1;}
  }
}
