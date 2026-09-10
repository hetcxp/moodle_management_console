import fs from 'fs';
import path from 'path';

/**
 * Captura una captura de pantalla diagnóstica de la página Puppeteer.
 *
 * @param {import('puppeteer-core').Page} page
 * @param {string} prefix Prefijo del nombre de archivo.
 * @param {string} [scratchDir] Directorio de destino para la captura.
 */
export async function takeScreenshot(page, prefix, scratchDir = path.resolve(process.cwd(), 'scratch')) {
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const filePath = path.join(scratchDir, `${prefix}_${Date.now()}.png`);
  try {
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  📸 Captura diagnóstica guardada: ${filePath}`);
  } catch (err) {
    console.warn(`  ⚠️ No se pudo guardar la captura: ${err.message}`);
  }
}

/**
 * Autentica una sesión de Moodle con reintentos y soporte de sesión existente.
 *
 * @param {import('puppeteer-core').Page} page
 * @param {object} [config] Parámetros de conexión (baseUrl, user, pass).
 */
export async function loginMoodle(page, config = {}) {
  const baseUrl = (config.baseUrl || process.env.MOODLE_URL || 'https://lts.academyfactory.online').replace(/\/+$/, '');
  const user = config.user || process.env.MOODLE_USER || 'hteran';
  const pass = config.pass || process.env.MOODLE_PASS;

  if (!pass) {
    throw new Error('Variable de entorno MOODLE_PASS no configurada para la autenticación.');
  }

  console.log(`  Autenticando en ${baseUrl}/login/index.php como '${user}'...`);
  await page.goto(`${baseUrl}/login/index.php`, { waitUntil: 'networkidle2', timeout: 60000 });

  // Si ya hay sesión activa
  if (!page.url().includes('/login/index.php')) {
    console.log('  Sesión previamente establecida.');
    return;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.waitForSelector('#username', { timeout: 10000 });
    await page.evaluate(() => {
      const u = document.querySelector('#username');
      const p = document.querySelector('#password');
      if (u) u.value = '';
      if (p) p.value = '';
    });
    await page.type('#username', user, { delay: 20 });
    await page.type('#password', pass, { delay: 20 });

    await Promise.all([
      page.click('#loginbtn'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
    ]);

    if (!page.url().includes('/login/index.php')) {
      console.log('  Autenticación exitosa.');
      return;
    }
    console.warn(`  Reintentando login (intento ${attempt}/3)...`);
  }

  const errorMsg = await page.evaluate(() => {
    const err = document.querySelector('.loginerrors, .alert-danger');
    return err ? err.innerText.trim() : 'Error desconocido de credenciales';
  });
  throw new Error(`Fallo de autenticación en Moodle tras reintentos: ${errorMsg}`);
}
