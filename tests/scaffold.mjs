import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createExtension} from '../tools/create-extension.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'dashdock-scaffold-'));
try {
  await mkdir(path.join(root,'extensions','hello'),{recursive:true});
  for(const file of ['index.html','theme.js','i18n.js']) await writeFile(path.join(root,'extensions','hello',file),'template');
  await writeFile(path.join(root,'extensions','hello','manifest.json'),JSON.stringify({id:'hello',entry:'index.html',api_version:1}));
  const directory=await createExtension(root,'mon-widget','Mon widget');
  const manifest=JSON.parse(await readFile(path.join(directory,'manifest.json'),'utf8'));
  assert.equal(manifest.id,'mon-widget');assert.equal(manifest.translations.en.name,'Mon widget');assert.deepEqual(manifest.permissions,[]);
  assert.equal(await readFile(path.join(directory,'index.html'),'utf8'),'template');
  for(const id of ['../secret','../hello','Hello','CON','a/b','a'.repeat(65)]) await assert.rejects(createExtension(root,id));
  await assert.rejects(createExtension(root,'long','é'.repeat(51)));
  await assert.rejects(createExtension(root,'mon-widget','Replace'),{code:'EEXIST'});
  assert.equal(JSON.parse(await readFile(path.join(directory,'manifest.json'),'utf8')).name,'Mon widget');
  assert.deepEqual((await readdir(path.join(root,'extensions'))).sort(),['hello','mon-widget']);
  console.log('PASS scaffold: bilingual themed files, identifiers, UTF-8 limits, no overwrite');
} finally {
  const resolved=path.resolve(root);
  assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert.ok(path.basename(resolved).startsWith('dashdock-scaffold-'));
  await rm(resolved,{recursive:true,force:true});
}
