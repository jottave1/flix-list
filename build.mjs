import {mkdir, cp, rm} from 'node:fs/promises';
const output = new URL('./dist/', import.meta.url);
await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
for (const file of ['index.html','styles.css','app.js','core.js','sw.js','manifest.webmanifest','icon.svg','catalog.json']) await cp(new URL(`./${file}`,import.meta.url), new URL(file,output), {recursive:true});
console.log('Flix List pronto em dist/.');
