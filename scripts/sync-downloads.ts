// Descargas acumuladas de los .bps/.ups de todas las releases de cada repositorio (histórico de GitHub).
// Si la API falla, no se escribe nada y la web oculta el contador en vez de mostrar un número falso.
import { readFile, writeFile } from 'node:fs/promises';
import { catalogSchema } from '../src/core/catalog';
const catalog = catalogSchema.parse(JSON.parse(await readFile('catalog/projects.json', 'utf8')));
const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'secava-parcheador' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
type Asset = { name: string; download_count: number; browser_download_url: string };
const out = { updatedAt: new Date().toISOString(), total: 0, projects: {} as Record<string, number>, releases: {} as Record<string, number> };
try {
  for (const project of catalog.projects) {
    if (project.demo) continue;
    const repo = project.repository.replace('https://github.com/', '');
    const assets: Asset[] = [];
    for (let page = 1; ; page++) {
      const response = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`, { headers, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`${repo}: HTTP ${response.status}`);
      const releases = await response.json() as { assets: Asset[] }[];
      for (const r of releases) assets.push(...r.assets.filter(a => /\.(bps|ups)$/i.test(a.name)));
      if (releases.length < 100) break;
    }
    const byUrl = new Map(assets.map(a => [a.browser_download_url.toLowerCase(), a.download_count]));
    out.projects[project.id] = assets.reduce((n, a) => n + a.download_count, 0);
    out.total += out.projects[project.id];
    for (const release of project.releases) {
      const n = byUrl.get(release.patch.url.toLowerCase());
      if (n !== undefined) out.releases[release.id] = n;
    }
  }
  await writeFile('public/descargas.json', JSON.stringify(out, null, 2));
  console.log(`Descargas acumuladas: ${out.total.toLocaleString('es-ES')}.`);
} catch (error) {
  console.warn(`AVISO: no se pudieron leer las descargas (${error instanceof Error ? error.message : error}). La web no mostrará el contador.`);
}
