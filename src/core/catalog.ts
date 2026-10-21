import { z } from 'zod';
import { MAX_ROM, MAX_PATCH } from './patch';
const hex = (length: number) => z.string().regex(new RegExp(`^[a-fA-F0-9]{${length}}$`)).transform(s => s.toLowerCase());
export const hashesSchema = z.object({ crc32: hex(8), sha1: hex(40).optional(), sha256: hex(64).optional() });
export const identitySchema = z.object({
  id: z.string().min(1), name: z.string().min(1), region: z.string().min(1), revision: z.string().min(1),
  size: z.number().int().min(1).max(MAX_ROM), hashes: hashesSchema,
  evidence: z.string().min(1)
});
const githubUrl = z.string().url().refine(s => /^https:\/\/github\.com\/SeCaVa\/[A-Za-z0-9_.-]+(?:\/|$)/.test(s), 'Solo repositorios oficiales de SeCaVa');
export const releaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), version: z.string().min(1), publishedAt: z.string().date(),
  format: z.enum(['bps', 'ups']), bases: z.array(identitySchema).min(1),
  patch: z.object({ url: githubUrl, sha256: hex(64), size: z.number().int().min(18).max(MAX_PATCH),
    path: z.string().regex(/^(?:patches\/[a-f0-9]{64}\.(?:bps|ups)|demo\/sample\.(?:bps|ups))$/).optional() }),
  releaseUrl: githubUrl, output: z.object({ name: z.string().regex(/^[a-zA-Z0-9_.-]+$/), size: z.number().int().min(1).max(MAX_ROM), hashes: hashesSchema }),
  instructions: z.string(),
  // Explicit maintainer declaration; never infer a license from a public repo.
  redistribution: z.object({ allowed: z.literal(true), evidence: z.string().min(1) })
});
export const projectSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), number: z.number().int().positive(), name: z.string().min(1),
  description: z.string(), author: z.string().nullable(), credits: z.string(),
  image: z.string().regex(/^images\/[a-zA-Z0-9_/-]+\.(?:png|jpg|webp|svg)$/).optional(),
  platform: z.string(), status: z.enum(['active', 'outdated', 'experimental']),
  repository: githubUrl, instructions: z.string(), pendingReason: z.string().optional(),
  releases: z.array(releaseSchema),
  pendingReleases: z.array(releaseSchema.omit({ redistribution: true }).extend({ blockedReason: z.string() })).optional(),
  demo: z.boolean().optional()
});
export const catalogSchema = z.object({ schemaVersion: z.literal(1), projects: z.array(projectSchema) }).superRefine((c, ctx) => {
  if (new Set(c.projects.map(p => p.id)).size !== c.projects.length) ctx.addIssue({ code: 'custom', message: 'Proyectos duplicados' });
  if (new Set(c.projects.map(p => p.number)).size !== c.projects.length) ctx.addIssue({ code: 'custom', message: 'Números duplicados' });
  for (const p of c.projects) {
    if (new Set(p.releases.map(r => r.id)).size !== p.releases.length) ctx.addIssue({ code: 'custom', message: `Versiones duplicadas: ${p.id}` });
    for (const r of p.releases) {
      if (!r.patch.url.startsWith(p.repository + '/releases/download/')) ctx.addIssue({ code: 'custom', message: 'Parche ajeno al repositorio' });
      if (!r.releaseUrl.startsWith(p.repository + '/releases/tag/')) ctx.addIssue({ code: 'custom', message: 'Release ajena al repositorio' });
      for (const base of r.bases) if (!base.hashes.sha1 && !base.hashes.sha256) ctx.addIssue({ code: 'custom', message: `Falta SHA-1 o SHA-256 de ${base.id}` });
    }
  }
});
export type Catalog = z.infer<typeof catalogSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Release = z.infer<typeof releaseSchema>;
export type Fingerprint = { size: number; crc32: string; sha1: string; sha256: string };
export function matches(actual: Fingerprint, base: Release['bases'][number]): boolean {
  return actual.size === base.size && matchesHashes(actual, base.hashes);
}
export function matchesHashes(actual: Fingerprint, expected: z.infer<typeof hashesSchema>) {
  return (['crc32', 'sha1', 'sha256'] as const).every(k => !expected[k] || actual[k].toLowerCase() === expected[k]!.toLowerCase());
}
export function identify(actual: Fingerprint, catalog: Catalog) {
  return catalog.projects.flatMap(project => project.releases.filter(release => release.bases.some(b => matches(actual, b))).map(release => ({ project, release })));
}
