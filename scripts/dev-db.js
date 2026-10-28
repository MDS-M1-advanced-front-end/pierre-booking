// Lance la base de développement (compose.dev.yaml) et attend qu'elle soit prête.
// Usage : pnpm dev (voir package.json). Le port et les identifiants viennent de apps/backend/.env,
// comme pour le back : un seul fichier à régler si le port 5432 est déjà pris.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const envFile = 'apps/backend/.env';

execFileSync(
  'docker',
  [
    'compose',
    '-f',
    'compose.dev.yaml',
    ...(existsSync(envFile) ? ['--env-file', envFile] : []),
    'up',
    '-d',
    '--wait',
  ],
  { stdio: 'inherit' },
);
