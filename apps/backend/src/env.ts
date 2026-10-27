// Charge apps/backend/.env dans process.env, sans écraser une variable déjà définie dans le shell.
// À importer en premier (main.ts, data-source.ts) : les modules lisent process.env à leur évaluation.
try {
  process.loadEnvFile();
} catch {
  // Pas de .env : valeurs par défaut.
}
