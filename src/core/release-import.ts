import { catalogSchema, releaseSchema, type Project, type Catalog } from './catalog';
import { z } from 'zod';
export const manifestSchema = z.object({ schemaVersion: z.literal(1), projectId: z.string(), release: releaseSchema });
export type GitHubRelease = { html_url: string; tag_name: string; published_at: string; draft: boolean; prerelease: boolean; assets: { name: string; browser_download_url: string; size: number; digest?: string | null }[] };
export function validateManifest(input: unknown, project: Project, published: GitHubRelease) {
  const manifest = manifestSchema.parse(input), r = manifest.release;
  if (manifest.projectId !== project.id || r.releaseUrl !== published.html_url || r.version !== published.tag_name || r.publishedAt !== published.published_at.slice(0,10)) throw new Error('El manifiesto no corresponde a esta Release.');
  const asset = published.assets.find(a => a.browser_download_url === r.patch.url);
  if (!asset || asset.size !== r.patch.size || !asset.name.toLowerCase().endsWith(`.${r.format}`)) throw new Error('El parche no es un archivo BPS/UPS de esta Release.');
  if (asset.digest && asset.digest !== `sha256:${r.patch.sha256}`) throw new Error('El SHA-256 de GitHub difiere del manifiesto.');
  if (published.prerelease && project.status !== 'experimental') throw new Error('Una prerelease requiere un proyecto marcado experimental.');
  // Apply the same strong hash, repository and uniqueness constraints as manual edits.
  const candidate: Catalog = { schemaVersion: 1, projects: [{ ...project, releases: [r] }] };
  catalogSchema.parse(candidate);
  return r;
}
