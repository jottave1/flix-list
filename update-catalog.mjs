import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {sources, parseCollection, mergeCollections} from './catalog-parser.mjs';
const collections = [];
const failures = [];
for (const [id, genre] of sources) {
  try {
    let html;
    if (process.argv.includes('--cached')) html = await readFile(new URL(`./.cache/${id}.html`, import.meta.url), 'utf8');
    else {
      const response = await fetch(`https://www.netflix.com/br/browse/genre/${id}`, {signal: AbortSignal.timeout(30000), headers: {'Accept-Language':'pt-BR,pt;q=0.9'}});
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      html = await response.text();
    }
    const movies = parseCollection(html, genre);
    if (movies.length < 10) throw Error('Página sem filmes suficientes; o formato pode ter mudado.');
    collections.push(movies);
    console.log(`${genre}: ${movies.length} filmes`);
  } catch (error) { failures.push(genre); console.error(`${genre}: ${error.message}`); }
}
// Never replace a working catalogue with a failed/partial retrieval.
if (failures.length) throw Error(`Catálogo preservado. Falha ao consultar: ${failures.join(', ')}`);
const movies = mergeCollections(collections);
if (movies.length < 100) throw Error('Catálogo incompleto. Arquivo anterior preservado.');

await writeFile(new URL('./catalog.json', import.meta.url), JSON.stringify({version:1, region:'BR', source:'Netflix — páginas públicas de filmes', sourceUrl:'https://www.netflix.com/br/browse/genre/34399', updatedAt:new Date().toISOString(), complete:false, movies}));
console.log(`Catálogo salvo: ${movies.length} filmes únicos.`);
