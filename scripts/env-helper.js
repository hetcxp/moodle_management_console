import fs from 'fs';
import path from 'path';

/**
 * Loads key-value pairs from .env into process.env without overriding existing environment variables.
 * Falls back to sibling moodle_frontend/.env if credentials are not present.
 *
 * @param {string} projectRoot
 */
export function loadEnv(projectRoot, targetUrl = null) {
  let siteEnv = null;
  if (targetUrl) {
    if (targetUrl.includes('viasano')) siteEnv = '.env.viasano';
    else if (targetUrl.includes('musk') || targetUrl.includes('escuelamusk')) siteEnv = '.env.musk';
    else if (targetUrl.includes('lts') || targetUrl.includes('academyfactory')) siteEnv = '.env.lts';
  }

  const envPaths = [
    ...(siteEnv ? [path.resolve(projectRoot, siteEnv)] : []),
    path.resolve(projectRoot, '.env'),
    path.resolve(projectRoot, '.env.lts'),
    path.resolve(projectRoot, '..', 'moodle_frontend', '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const isSiteFile = siteEnv && envPath.endsWith(siteEnv);
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (key && (process.env[key] === undefined || isSiteFile)) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
