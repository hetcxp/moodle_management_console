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

/**
 * Portable resolver for Chrome/Chromium binary.
 *
 * @returns {string} Absolute path to executable
 */
export function getChromeExecutable() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium'
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    'No se encontró ejecutable de Chrome/Chromium. Configura CHROME_BIN o CHROME_PATH en tu entorno.'
  );
}

/**
 * Portable resolver for PHP CLI binary.
 *
 * @returns {string} Absolute path to PHP binary
 */
export function getPhpExecutable() {
  const candidates = [
    process.env.PHP_BIN,
    process.env.PHP_PATH,
    '/opt/homebrew/opt/php@8.3/bin/php',
    '/opt/homebrew/opt/php/bin/php',
    '/opt/homebrew/bin/php',
    '/usr/local/bin/php',
    '/usr/bin/php'
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    'No se encontró ejecutable de PHP. Configura PHP_BIN o PHP_PATH en tu entorno.'
  );
}
