import fs from 'fs';
import path from 'path';

/**
 * Loads key-value pairs from .env into process.env without overriding existing environment variables.
 * Falls back to sibling moodle_frontend/.env if credentials are not present.
 *
 * @param {string} projectRoot
 */
export function loadEnv(projectRoot) {
  const envPaths = [
    path.resolve(projectRoot, '.env'),
    path.resolve(projectRoot, '.env.lts'),
    path.resolve(projectRoot, '..', 'moodle_frontend', '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (key && process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
