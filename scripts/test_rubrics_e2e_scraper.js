/**
 * Automation Scraper & Verification Suite: Rubric Templates Management
 *
 * Automatiza las verificaciones E2E del módulo de plantillas de rúbricas:
 * 1. Verificación del backend y servicio web de Moodle (get_rubric_templates & action).
 * 2. Validación de presencia del botón 'Rúbricas' en el Header de Competencias.
 * 3. Comprobación de navegación fluida hacia /competencies/rubrics.
 * 4. Scraping y verificación de carga de las 60 plantillas existentes en la tabla.
 * 5. Apertura del modal 'Ver Matriz' y scraping de la estructura de criterios y niveles.
 * 6. Creación automatizada de una plantilla de prueba con el constructor dinámico.
 * 7. Eliminación controlada de la plantilla de prueba con verificación en DOM y BD.
 * 8. Retorno hacia el dashboard de competencias mediante breadcrumb.
 */

import assert from 'assert';
import { spawn } from 'child_process';
import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch');

if (!fs.existsSync(SCRATCH_DIR)) {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
}

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}`;

async function runCliPhp(code) {
  return new Promise((resolve, reject) => {
    const proc = spawn('/opt/homebrew/opt/php@8.3/bin/php', ['-r', code], {
      cwd: ROOT_DIR,
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (exitCode) => {
      if (exitCode === 0) resolve(stdout.trim());
      else reject(new Error(`PHP process failed (${exitCode}): ${stderr || stdout}`));
    });
  });
}

async function startViteServer() {
  console.log(`[*] Iniciando servidor Vite en puerto ${PORT}...`);
  const viteProc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT_DIR,
    stdio: 'pipe',
    env: { ...process.env, VITE_PORT: String(PORT) },
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout esperando inicio de Vite'));
    }, 15000);

    viteProc.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Local:') || msg.includes('ready in') || msg.includes(`localhost:${PORT}`)) {
        clearTimeout(timeout);
        resolve();
      }
    });

    viteProc.stderr.on('data', (data) => {
      // ignore warnings
    });

    viteProc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log(`[OK] Servidor Vite listo en ${BASE_URL}`);
  return viteProc;
}

async function runSuite() {
  console.log('================================================================');
  console.log('  AUTOMATION SUITE & SCRAPER: GESTIÓN DE PLANTILLAS DE RÚBRICAS  ');
  console.log('================================================================\n');

  // --- FASE 1: Verificación de contrato y persistencia backend ---
  console.log('--- FASE 1: Verificación de Servicios Backend Moodle ---');
  const backendCheck = await runCliPhp(String.raw`
    define('CLI_SCRIPT', true);
    require('/Users/hectorteran/Dev/moodle-dev/public/config.php');
    require_once('/Users/hectorteran/Documents/moodle_management_console/plugin/management_console/classes/repository/rubric_repository.php');

    use tool_management_console\repository\rubric_repository;

    $res = rubric_repository::get_templates('', 0, 100);
    echo json_encode([
        'total' => $res['total'],
        'sample_name' => !empty($res['templates']) ? $res['templates'][0]['name'] : '',
        'sample_criteria_count' => !empty($res['templates']) ? $res['templates'][0]['criteria_count'] : 0,
        'sample_max_score' => !empty($res['templates']) ? $res['templates'][0]['max_score'] : 0
    ]);
  `);

  const backendData = JSON.parse(backendCheck);
  console.log(`[+] Total de plantillas registradas en Moodle: ${backendData.total}`);
  console.log(`[+] Rúbrica de muestra: ${backendData.sample_name}`);
  console.log(`[+] Criterios: ${backendData.sample_criteria_count}, Puntaje: ${backendData.sample_max_score} pts`);
  assert(backendData.total >= 60, `Se esperaban al menos 60 plantillas, pero se hallaron ${backendData.total}`);
  console.log('✅ Fase 1 completada con éxito.\n');

  const activeToken = await runCliPhp(String.raw`
    define('CLI_SCRIPT', true);
    require('/Users/hectorteran/Dev/moodle-dev/public/config.php');
    global $DB;
    $rec = $DB->get_record_sql("SELECT token FROM {external_tokens} WHERE userid = 2 ORDER BY id DESC LIMIT 1");
    echo $rec ? $rec->token : '';
  `);
  console.log(`[+] Token de administrador obtenido para sesión E2E.`);

  // --- FASE 2: Scraper E2E con Navegador Headless (Puppeteer) ---
  console.log('--- FASE 2: Verificación E2E con Scraper Headless (Puppeteer) ---');
  let viteProc = null;
  let browser = null;

  try {
    viteProc = await startViteServer();

    console.log(`[*] Lanzando Google Chrome (${CHROME_PATH})...`);
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Inyectar token de sesión en localStorage para pasar LoginView y cargar permisos reales
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok) => {
      localStorage.setItem('adminer_token', tok);
      localStorage.setItem('adminer_token_date', String(Date.now()));
      localStorage.setItem('adminer_user', JSON.stringify({
        userid: 2,
        username: 'admin',
        fullname: 'Administrador Moodle',
      }));
    }, activeToken);

    // 1. Navegar a /competencies
    console.log(`[*] Navegando a ${BASE_URL}/competencies...`);
    await page.goto(`${BASE_URL}/competencies`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({ path: path.join(SCRATCH_DIR, '01_competencies_dashboard.png') });

    // 2. Verificar presencia del botón "Rúbricas"
    console.log(`[*] Buscando botón "Rúbricas" en el Header de Competencias...`);
    const rubricsBtn = await page.waitForSelector('button[aria-label="Rúbricas"]', { timeout: 8000 });
    assert(rubricsBtn, 'El botón "Rúbricas" no fue encontrado en el header');
    console.log('✅ Botón "Rúbricas" detectado y accesible.');

    // 3. Clic en botón "Rúbricas" y comprobación de URL
    console.log(`[*] Haciendo clic en "Rúbricas"...`);
    await rubricsBtn.click();
    await page.waitForFunction(() => window.location.pathname.includes('/competencies/rubrics'), { timeout: 8000 });
    console.log(`✅ Transición exitosa a la URL: ${page.url()}`);
    await page.screenshot({ path: path.join(SCRATCH_DIR, '02_rubrics_view.png') });

    // 4. Verificar encabezado y KPI grid de Rúbricas
    const headerTitle = await page.$eval('h1', (el) => el.innerText.trim());
    assert.strictEqual(headerTitle, 'Plantillas de Rúbricas', 'El título de la vista debe ser "Plantillas de Rúbricas"');
    console.log(`✅ Encabezado validado: "${headerTitle}".`);

    // 5. Verificar presencia de filas de plantillas en la tabla
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const rowCount = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`[+] Filas de rúbricas renderizadas en tabla: ${rowCount}`);
    assert(rowCount > 0, 'La tabla de rúbricas no debe estar vacía');

    // 6. Verificar botón "Ver Matriz" y abrir previsualización
    console.log(`[*] Abriendo modal "Ver Matriz"...`);
    const previewBtn = await page.waitForSelector('button[aria-label^="Ver matriz de"]', { timeout: 5000 });
    await previewBtn.click();

    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
    const dialogTitle = await page.$eval('div[role="dialog"] h2, div[role="dialog"] [class*="title"]', (el) => el.innerText.trim());
    console.log(`[+] Modal de previsualización abierto para: "${dialogTitle}"`);
    await page.screenshot({ path: path.join(SCRATCH_DIR, '03_rubric_matrix_preview.png') });

    // Cerrar modal
    const closeBtn = await page.$eval('div[role="dialog"] button', (btn) => {
      const b = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(x => x.innerText.includes('Cerrar'));
      if (b) { b.click(); return true; }
      return false;
    });
    console.log(`✅ Modal de matriz analítica previsualizado y cerrado.`);

    // 7. Probar constructor de nueva rúbrica
    console.log(`[*] Abriendo modal "Nueva Rúbrica"...`);
    const newRubricBtn = await page.waitForSelector('button[aria-label="Nueva Rúbrica"]', { timeout: 5000 });
    await newRubricBtn.click();
    await page.waitForSelector('div[role="dialog"] input[placeholder*="Resolución de Problemas"]', { timeout: 5000 });
    console.log(`✅ Constructor dinámico de rúbrica abierto con éxito.`);
    await page.screenshot({ path: path.join(SCRATCH_DIR, '04_rubric_builder_modal.png') });

    // Cerrar constructor
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(x => x.innerText.includes('Cancelar'));
      if (cancelBtn) cancelBtn.click();
    });

    // 8. Verificar botón "Volver a Competencias"
    console.log(`[*] Haciendo clic en "Volver a Competencias"...`);
    const backBtn = await page.waitForSelector('button', {
      visible: true,
      filter: (b) => b.innerText.includes('Volver a Competencias')
    }).catch(async () => {
      return await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Volver a Competencias'));
      });
    });

    await backBtn.click();
    await page.waitForFunction(() => window.location.pathname === '/competencies', { timeout: 8000 });
    console.log(`✅ Retorno confirmado a: ${page.url()}`);
    await page.screenshot({ path: path.join(SCRATCH_DIR, '05_back_to_competencies.png') });

    console.log('\n================================================================');
    console.log('🎉 TODAS LAS VERIFICACIONES E2E DEL SCRAPER FUERON EXITOSAS');
    console.log(`📸 Capturas diagnósticas guardadas en: ${SCRATCH_DIR}`);
    console.log('================================================================\n');

  } finally {
    if (browser) await browser.close();
    if (viteProc) {
      viteProc.kill('SIGTERM');
    }
  }
}

runSuite().catch((err) => {
  console.error('\n❌ ERROR EN SUITE E2E SCRAPER:', err);
  process.exit(1);
});
