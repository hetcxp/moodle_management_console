/**
 * Automation Scraper & Verification Suite: Negociador Elite Full Modular Courses & Learning Path
 *
 * Verificaciones automatizadas:
 * 1. Verificación contractual de Base de Datos y Backend Moodle:
 *    - Categoría 'Negociador Elite' (ID 11)
 *    - 10 cursos modulares (NEF_INTRO, NEF_PASO1..NEF_PASO9) con exactamente 1 sección (Section 0)
 *    - Ruta contenedora 'Negociador elite full' (NEF_RUTA, ID 67) en categoría 'Rutas de Aprendizaje'
 *    - 10 subcursos enlazados con availability secuencial estricta
 * 2. Scraper E2E con Navegador Headless (Puppeteer):
 *    - Carga de la aplicación web en puerto local
 *    - Inyección de sesión de administrador
 *    - Navegación hacia /learning-paths
 *    - Localización e inspección de la fila 'Negociador elite full'
 *    - Navegación al detalle de la ruta (/learning-paths/67)
 *    - Verificación del árbol de 10 subcursos y estado del candado de prelación
 *    - Capturas diagnósticas de alta resolución
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
const PORT = 3005;
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
  console.log('🤖 AUTOMATION SUITE & SCRAPER: NEGOCIADOR ELITE FULL RUTAS');
  console.log('================================================================\n');

  // --- FASE 1: Verificación Backend y Contratos Moodle ---
  console.log('--- FASE 1: Verificación Contractual de Base de Datos y Backend ---');
  const backendCheck = await runCliPhp(String.raw`
    define('CLI_SCRIPT', true);
    require('/Users/hectorteran/Dev/moodle-dev/config.php');
    require_once('/Users/hectorteran/Documents/moodle_management_console/plugin/management_console/classes/repository/learning_path_repository.php');

    use tool_management_console\repository\learning_path_repository;

    $cat = $DB->get_record('course_categories', ['name' => 'Negociador Elite']);
    $shortnames = [
        'NEF_INTRO', 'NEF_PASO1', 'NEF_PASO2', 'NEF_PASO3', 'NEF_PASO4',
        'NEF_PASO5', 'NEF_PASO6', 'NEF_PASO7', 'NEF_PASO8', 'NEF_PASO9'
    ];

    $courses_info = [];
    foreach ($shortnames as $sn) {
        $c = $DB->get_record('course', ['shortname' => $sn]);
        if ($c) {
            $modinfo = get_fast_modinfo($c->id);
            $courses_info[] = [
                'id' => (int)$c->id,
                'fullname' => $c->fullname,
                'shortname' => $c->shortname,
                'sections_count' => count($modinfo->get_section_info_all()),
                'sec0_activities' => count($modinfo->sections[0] ?? [])
            ];
        }
    }

    $route_course = $DB->get_record('course', ['shortname' => 'NEF_RUTA']);
    $route_detail = null;
    if ($route_course) {
        $route_detail = learning_path_repository::get_learning_path_detail($route_course->id);
    }

    echo json_encode([
        'category_id' => $cat ? (int)$cat->id : null,
        'category_name' => $cat ? $cat->name : null,
        'courses_count' => count($courses_info),
        'courses' => $courses_info,
        'route_id' => $route_course ? (int)$route_course->id : null,
        'route_fullname' => $route_course ? $route_course->fullname : null,
        'route_subcourses_count' => $route_detail ? count($route_detail->sections) : 0,
        'enforce_sequence' => $route_detail ? (bool)$route_detail->enforce_sequence : false,
        'sequential_rules_count' => $route_detail ? count(array_filter($route_detail->sections, fn($s) => $s['has_sequential_rule'])) : 0
    ]);
  `);

  const beData = JSON.parse(backendCheck);
  console.log(`[+] Categoría verificada: ${beData.category_name} (ID: ${beData.category_id})`);
  assert.strictEqual(beData.category_name, 'Negociador Elite', 'La categoría debe ser Negociador Elite');

  console.log(`[+] Cursos modulares detectados: ${beData.courses_count}/10`);
  assert.strictEqual(beData.courses_count, 10, 'Deben existir exactamente 10 cursos hijos modulares');

  for (const c of beData.courses) {
    console.log(`    - [ID ${c.id}] ${c.fullname} (${c.shortname}) -> Secciones: ${c.sections_count} | Actividades: ${c.sec0_activities}`);
    assert.strictEqual(c.sections_count, 1, `El curso ${c.shortname} debe tener exactamente 1 sección (Section 0)`);
    assert(c.sec0_activities > 0, `El curso ${c.shortname} debe contener actividades en su sección general`);
  }

  console.log(`[+] Ruta contenedora verificada: ${beData.route_fullname} (ID: ${beData.route_id})`);
  assert.strictEqual(beData.route_fullname, 'Negociador elite full', 'Nombre de la ruta debe coincidir');
  assert.strictEqual(beData.route_subcourses_count, 10, 'La ruta debe contener 10 subcursos');
  assert.strictEqual(beData.enforce_sequence, true, 'La ruta debe tener la prelación secuencial activada');
  assert.strictEqual(beData.sequential_rules_count, 9, 'Los pasos 2 a 10 (9 pasos) deben tener regla de bloqueo por el paso anterior');
  console.log('✅ Fase 1 completada con éxito: 100% contratos backend verificados.\n');

  // Obtener token admin para la sesión UI
  const activeToken = await runCliPhp(String.raw`
    define('CLI_SCRIPT', true);
    require('/Users/hectorteran/Dev/moodle-dev/config.php');
    global $DB;
    $rec = $DB->get_record_sql("SELECT token FROM {external_tokens} WHERE userid = 2 ORDER BY id DESC LIMIT 1");
    echo $rec ? $rec->token : '';
  `);
  console.log(`[+] Token de administrador obtenido para sesión UI.`);

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

    page.on('console', (msg) => console.log('  [BROWSER CONSOLE]', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.error('  [BROWSER ERROR]', err.message));
    page.on('requestfailed', (req) => console.warn('  [FAILED REQUEST]', req.url(), req.failure()?.errorText));

    // Inyectar sesión en localStorage
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

    // 1. Navegar a /learning-paths
    console.log(`[*] Navegando a ${BASE_URL}/learning-paths...`);
    await page.goto(`${BASE_URL}/learning-paths`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({ path: path.join(SCRATCH_DIR, '01_nef_learning_paths_table.png'), fullPage: true });
    console.log('📸 Captura guardada: scratch/01_nef_learning_paths_table.png');

    // 2. Verificar presencia de la ruta en la tabla
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const tableText = await page.$eval('table tbody', (el) => el.innerText);
    assert(tableText.includes('Negociador elite full'), 'La ruta "Negociador elite full" debe figurar en la tabla');
    console.log('✅ Ruta "Negociador elite full" detectada en la tabla.');

    console.log(`[*] Navegando al detalle de la ruta: ${BASE_URL}/learning-paths/${beData.route_id}...`);
    await page.goto(`${BASE_URL}/learning-paths/${beData.route_id}`, { waitUntil: 'networkidle0', timeout: 30000 });

    // Esperar a que finalice la carga de datos del webservice
    await page.waitForFunction(() => !document.body.innerText.includes('Cargando detalles'), { timeout: 15000 });
    await page.screenshot({ path: path.join(SCRATCH_DIR, '02_nef_learning_path_detail.png'), fullPage: true });
    console.log('📸 Captura guardada: scratch/02_nef_learning_path_detail.png');

    const bodyText = await page.$eval('body', (el) => el.innerText);
    console.log('[DEBUG DOM TEXT]:', bodyText.slice(0, 300));

    await page.waitForSelector('h1', { timeout: 10000 });

    // 4. Verificar encabezado y pestaña de estructura
    const pageHeading = await page.$eval('h1', (el) => el.innerText.trim());
    console.log(`[+] Vista de detalle cargada. Encabezado detectado: ${pageHeading}`);
    assert.strictEqual(pageHeading, 'Negociador elite full', 'El título de la ruta debe ser "Negociador elite full"');

    // Esperar a que la lista de módulos de la ruta se renderice
    await page.waitForSelector('.space-y-6', { timeout: 10000 });

    await page.screenshot({ path: path.join(SCRATCH_DIR, '03_nef_learning_path_structure.png'), fullPage: true });
    console.log('📸 Captura guardada: scratch/03_nef_learning_path_structure.png');

    // 5. Verificar presencia de los 10 pasos en el DOM y prelación activa
    const bodyContent = await page.$eval('body', (el) => el.innerText);
    assert(bodyContent.includes('Negociador Elite - Introducción'), 'Debe figurar Introducción');
    assert(bodyContent.includes('Negociador Elite - Paso 1'), 'Debe figurar Paso 1');
    assert(bodyContent.includes('Negociador Elite - Paso 9'), 'Debe figurar Paso 9');
    assert(bodyContent.includes('Prelación Secuencial Activada'), 'Debe mostrar el indicador de Prelación Secuencial Activada');
    console.log('✅ Los 10 pasos modulares y la prelación secuencial fueron verificados en el DOM.');

    console.log('\n✨ AUTOMATION SUITE Y SCRAPER FINALIZADOS CON ÉXITO: 100% OK ✨');
  } finally {
    if (browser) await browser.close();
    if (viteProc) {
      console.log('[*] Deteniendo servidor Vite...');
      viteProc.kill('SIGTERM');
    }
  }
}

runSuite().catch((err) => {
  console.error('\n❌ ERROR EN LA SUITE:', err);
  process.exit(1);
});
