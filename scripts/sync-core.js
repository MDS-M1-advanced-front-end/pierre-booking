// Vendore le dépôt core partagé : copie son contenu dans packages/core.
// Usage : pnpm core:sync (l'URL du dépôt est dans le script "core:sync" de package.json)
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const repoUrl = process.argv[2];
if (!repoUrl) {
  console.error('Usage : node scripts/sync-core.js <url-du-depot-core>');
  process.exit(1);
}

const target = 'packages/core';
const excluded = new Set(['.git', '.github', 'node_modules', 'pnpm-lock.yaml']);
const tmp = mkdtempSync(join(tmpdir(), 'core-'));

try {
  execFileSync('git', ['clone', '--depth', '1', repoUrl, tmp], { stdio: 'inherit' });
  const commit = execFileSync('git', ['-C', tmp, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

  rmSync(target, { recursive: true, force: true });
  cpSync(tmp, target, {
    recursive: true,
    dereference: true,
    filter: (src) => !excluded.has(basename(src)),
  });
  // Trace de la version copiée, pour savoir quel commit du core est embarqué
  writeFileSync(join(target, 'CORE_VERSION'), `${repoUrl}\n${commit}\n`);

  console.log(`packages/core synchronisé sur ${commit}. Lancez pnpm install.`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
