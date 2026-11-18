const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
export const sources = [
  ['34399', 'Filmes'], ['1365', 'Ação'], ['6548', 'Comédia'], ['8711', 'Terror'],
  ['8883', 'Romance'], ['5763', 'Drama'], ['1492', 'Ficção científica'],
  ['783', 'Família'], ['6839', 'Documentário'], ['8933', 'Suspense'], ['7424', 'Anime']
];
export function parseCollection(html, genre) {
  const movies = new Map();
  for (const script of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const schema = JSON.parse(script[1]);
    for (const entry of schema.itemListElement || []) {
      const item = entry.item;
      const id = item?.url?.match(/\/title\/(\d+)/)?.[1];
      if (id && item['@type'] === 'Movie') movies.set(id, {id, title: item.name, genres: genre === 'Filmes' ? [] : [genre], image: '', url: `https://www.netflix.com/br/title/${id}`});
    }
  }
  for (const anchor of html.matchAll(/<a\b[^>]*data-uia="titleId-(\d+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const movie = movies.get(anchor[1]);
    const image = anchor[2].match(/background-image:url\((https:\/\/[^)]+)\)/)?.[1];
    if (movie && image) movie.image = decode(image);
  }
  return [...movies.values()];
}
export function mergeCollections(collections) {
  const merged = new Map();
  for (const collection of collections) for (const movie of collection) {
    const previous = merged.get(movie.id);
    merged.set(movie.id, previous ? {...previous, image: previous.image || movie.image, genres: [...new Set([...previous.genres, ...movie.genres])]} : movie);
  }
  return [...merged.values()].map(m => ({...m, genres: m.genres.length ? m.genres : ['Outros']}));
}
