import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer-core';
import { loadEnv } from './env-helper.js';
import { takeScreenshot, loginMoodle } from './automation-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Cargar variables de entorno desde .env si están disponibles
loadEnv(projectRoot);

// -------------------------------------------------------------
// Configuración y Parámetros
// -------------------------------------------------------------
const args = process.argv.slice(2);
const IS_CHECK_ONLY = args.includes('--check-only');
const IS_FORCE = args.includes('--force') || process.env.FORCE_INSTALL === '1';
const TARGET_PLUGIN = args.find((arg, i) => args[i - 1] === '--plugin') || null;

const CONFIG = {
  baseUrl: (process.env.MOODLE_URL || 'https://lts.academyfactory.online').replace(/\/+$/, ''),
  user: process.env.MOODLE_USER || 'hteran',
  pass: process.env.MOODLE_PASS,
  chromeExecutable: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: process.env.HEADLESS !== 'false'
};

if (!CONFIG.pass) {
  throw new Error('Variable de entorno MOODLE_PASS no configurada. Define MOODLE_PASS en .env o entorno.');
}

const scratchDir = path.resolve(projectRoot, 'scratch');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

// -------------------------------------------------------------
// Utilidades de Registro y Captura
// -------------------------------------------------------------
function logStep(step, total, message) {
  console.log(`\n[${step}/${total}] ${message}`);
}

// -------------------------------------------------------------
// 1. Descubrimiento y Parseo de Plugins Locales
// -------------------------------------------------------------
function getLocalPlugins() {
  const pluginsBaseDir = path.join(projectRoot, 'plugin');
  if (!fs.existsSync(pluginsBaseDir)) {
    throw new Error(`Directorio de plugins no encontrado: ${pluginsBaseDir}`);
  }

  const entries = fs.readdirSync(pluginsBaseDir, { withFileTypes: true });
  const plugins = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pluginDirName = entry.name;
    const versionFilePath = path.join(pluginsBaseDir, pluginDirName, 'version.php');

    if (!fs.existsSync(versionFilePath)) continue;

    const content = fs.readFileSync(versionFilePath, 'utf8');

    const componentMatch = content.match(/\$plugin->component\s*=\s*['"]([^'"]+)['"]/);
    const versionMatch = content.match(/\$plugin->version\s*=\s*([0-9]+)/);
    const releaseMatch = content.match(/\$plugin->release\s*=\s*['"]([^'"]+)['"]/);
    const requiresMatch = content.match(/\$plugin->requires\s*=\s*([0-9]+)/);

    if (!componentMatch || !versionMatch) {
      console.warn(`  ⚠️ Ignorando ${pluginDirName}: version.php inválido o incompleto.`);
      continue;
    }

    const component = componentMatch[1];
    if (TARGET_PLUGIN && pluginDirName !== TARGET_PLUGIN && component !== TARGET_PLUGIN) {
      continue;
    }

    plugins.push({
      dirName: pluginDirName,
      dirPath: path.join(pluginsBaseDir, pluginDirName),
      component,
      version: parseInt(versionMatch[1], 10),
      release: releaseMatch ? releaseMatch[1].trim() : 'N/A',
      requires: requiresMatch ? parseInt(requiresMatch[1], 10) : null
    });
  }

  return plugins;
}

// -------------------------------------------------------------
// 2. Scraper de Versiones Remotas (/admin/plugins.php)
// -------------------------------------------------------------
async function scrapeRemotePluginVersions(page, expectedComponents) {
  console.log(`  Navegando a ${CONFIG.baseUrl}/admin/plugins.php...`);
  await page.goto(`${CONFIG.baseUrl}/admin/plugins.php`, { waitUntil: 'networkidle2', timeout: 60000 });

  return await page.evaluate((components) => {
    const results = {};

    for (const comp of components) {
      // Buscar fila correspondiente al componente
      const row = document.querySelector(`tr[class*="name-${comp}"], tr[data-plugin="${comp}"]`);
      if (row) {
        const releaseEl = row.querySelector('.release, .version .release');
        const versionEl = row.querySelector('.versionnumber, .version .versionnumber');
        const displayNameEl = row.querySelector('.displayname');
        const statusEl = row.querySelector('.notes, .status');

        results[comp] = {
          installed: true,
          displayName: displayNameEl ? displayNameEl.innerText.trim() : comp,
          release: releaseEl ? releaseEl.innerText.trim() : '',
          version: versionEl ? parseInt(versionEl.innerText.trim(), 10) : null,
          statusText: statusEl ? statusEl.innerText.trim() : 'Instalado'
        };
      } else {
        results[comp] = {
          installed: false,
          displayName: comp,
          release: null,
          version: null,
          statusText: 'No instalado'
        };
      }
    }

    return results;
  }, expectedComponents);
}

// -------------------------------------------------------------
// 3. Empaquetado de Plugins en ZIP
// -------------------------------------------------------------
function packagePlugin(plugin) {
  console.log(`  Empaquetando ${plugin.component} (${plugin.dirName})...`);

  // Asegurar compilación de Vite
  console.log('  Ejecutando build de assets de frontend para Moodle (npm run build:moodle)...');
  execSync('npm run build:moodle', { cwd: projectRoot, stdio: 'inherit' });

  const zipPath = path.resolve(scratchDir, `${plugin.component}.zip`);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  const pluginsBaseDir = path.join(projectRoot, 'plugin');
  execSync(`cd "${pluginsBaseDir}" && zip -r "${zipPath}" "${plugin.dirName}" -x "*.DS_Store" "*__MACOSX*"`, {
    stdio: 'ignore'
  });

  if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size === 0) {
    throw new Error(`Error empaquetando ${plugin.component}: el ZIP no fue generado o está vacío.`);
  }

  const sizeKb = (fs.statSync(zipPath).size / 1024).toFixed(1);
  console.log(`  Paquete ZIP listo: ${zipPath} (${sizeKb} KB)`);
  return zipPath;
}

// -------------------------------------------------------------
// 4. Instalación Web mediante Puppeteer
// -------------------------------------------------------------
async function installPluginViaWeb(page, plugin, zipPath) {
  console.log(`\n  --- Desplegando ${plugin.component} vía /admin/tool/installaddon/index.php ---`);

  // 1. Acceder al instalador
  await page.goto(`${CONFIG.baseUrl}/admin/tool/installaddon/index.php`, {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // 2. Abrir Filepicker de Moodle
  console.log('  Abriendo selector de archivos Filepicker...');
  await page.waitForSelector('.fp-btn-choose', { visible: true, timeout: 30000 });
  await page.$eval('.fp-btn-choose', el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
  await new Promise(r => setTimeout(r, 1000));
  await page.click('.fp-btn-choose');

  // Esperar modal del filepicker
  await page.waitForSelector('.moodle-dialogue-bd, .fp-repo-upload, .fp-repo-area', { visible: true, timeout: 25000 });

  // Seleccionar repositorio "Subir un archivo"
  const uploadTab = await page.$('.fp-repo-upload, [data-repo-id]');
  if (uploadTab) {
    await uploadTab.click();
    await new Promise(r => setTimeout(r, 600));
  }

  // 3. Adjuntar ZIP
  console.log(`  Subiendo archivo: ${path.basename(zipPath)}...`);
  const fileInput = await page.waitForSelector('.fp-form-container input[type="file"], input[name="repo_upload_file"], input[type="file"]', {
    timeout: 15000
  });
  await fileInput.uploadFile(zipPath);

  // Clic en "Subir este archivo"
  await page.waitForSelector('.fp-upload-btn', { visible: true, timeout: 10000 });
  await page.evaluate(() => {
    document.querySelector('.fp-upload-btn').click();
  });

  // Esperar confirmación de carga y cierre de diálogo
  console.log('  Esperando que finalice la subida al draft...');
  await page.waitForFunction(() => {
    const hasItem = document.querySelector('.fp-file.fp-hascontextmenu') || document.querySelector('#id_zipfile')?.value;
    const isClosed = !document.querySelector('.moodle-dialogue-focused');
    return hasItem && isClosed;
  }, { timeout: 45000 });
  await new Promise(r => setTimeout(r, 1200));

  // 4. Enviar formulario de instalación
  console.log('  Enviando formulario de instalación...');
  const submitInstallBtn = await page.$('#id_submitbutton');
  await Promise.all([
    submitInstallBtn.click(),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 })
  ]);

  // 5. Pantalla de validación del paquete
  console.log(`  Evaluando validación de paquete en: ${page.url()}`);
  const validationError = await page.evaluate(() => {
    const danger = document.querySelector('.alert-danger, .validation-error');
    return danger ? danger.innerText.trim() : null;
  });

  if (validationError) {
    await takeScreenshot(page, `error_validacion_${plugin.component}`, scratchDir);
    throw new Error(`Validación de Moodle falló para ${plugin.component}: ${validationError}`);
  }

  // Botón de confirmación en la validación
  const confirmSelector = [
    'form.singlebutton button[type="submit"]',
    'form.singlebutton input[type="submit"]',
    'form[action*="installaddon"] button[type="submit"]',
    'input[name="installzipconfirm"] + input[type="submit"]',
    'input[name="installzipconfirm"] + button',
    'button.btn-primary',
    'input[value*="Continuar"]',
    'input[value*="Continue"]'
  ].join(', ');

  const confirmBtn = await page.waitForSelector(confirmSelector, { visible: true, timeout: 20000 }).catch(() => null);
  if (!confirmBtn) {
    await takeScreenshot(page, `fallo_confirmacion_${plugin.component}`, scratchDir);
    throw new Error(`No se encontró el botón de confirmación de instalación para ${plugin.component}.`);
  }

  const confirmText = await page.evaluate(el => el.innerText || el.value, confirmBtn);
  console.log(`  Confirmando validación mediante botón "${confirmText.trim()}"...`);

  await Promise.all([
    confirmBtn.click(),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 })
  ]);

  // 6. Actualización de Base de Datos y Pantallas Intermedias
  console.log('  Procesando actualización de base de datos...');
  let loopCount = 0;
  while (loopCount < 6) {
    loopCount++;
    const currentUrl = page.url();
    console.log(`  Paso migración BD (${loopCount}): ${currentUrl}`);

    if (currentUrl.includes('admin/index.php?cache=1') || currentUrl.includes('/admin/index.php#') || currentUrl.includes('/admin/plugins.php')) {
      console.log('  Llegada a pantalla final de Notificaciones/Plugins. Migración de BD completada.');
      break;
    }

    const progressHandle = await page.evaluateHandle(() => {
      const candidates = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"], .singlebutton input, .singlebutton button, a.btn, button'));
      // 1. Priorizar botón de actualización de base de datos
      const upgradeBtn = candidates.find(el => {
        const txt = (el.innerText || el.value || '').trim().toLowerCase();
        return (txt.includes('actualizar') && txt.includes('base de datos')) ||
               (txt.includes('upgrade') && txt.includes('database'));
      });
      if (upgradeBtn) return upgradeBtn;

      // 2. Botón de continuar
      const continueBtn = candidates.find(el => {
        const txt = (el.innerText || el.value || '').trim().toLowerCase();
        return txt.includes('continuar') || txt.includes('continue');
      });
      return continueBtn || null;
    });

    const progressBtn = progressHandle.asElement();

    if (progressBtn) {
      const btnText = await page.evaluate(el => el.value || el.innerText, progressBtn);
      console.log(`  Presionando botón de progreso: "${btnText.trim()}"...`);
      try {
        await Promise.all([
          progressBtn.click(),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 180000 }).catch(() => {})
        ]);
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.log(`  Navegación concluida o botón no interactivo (${err.message}).`);
        break;
      }
    } else {
      console.log('  No quedan pantallas pendientes de migración de BD.');
      break;
    }
  }

  // 7. Purgar Cachés de Moodle
  console.log('  Purgando cachés de Moodle (/admin/purgecaches.php)...');
  await page.goto(`${CONFIG.baseUrl}/admin/purgecaches.php`, { waitUntil: 'networkidle2', timeout: 60000 });
  const purgeBtn = await page.$(
    'form.mform input[type="submit"], #id_submitbutton, input[type="submit"][value*="Purgar"], input[type="submit"][value*="Purge"]'
  );
  if (purgeBtn) {
    await Promise.all([
      purgeBtn.click(),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
    ]);
    console.log('  Cachés purgadas correctamente.');
  }
}

// -------------------------------------------------------------
// Función Principal
// -------------------------------------------------------------
(async () => {
  console.log('===============================================================');
  console.log('  MOODLE PLUGIN VERSION SCRAPER & SYNCHRONIZER');
  console.log('===============================================================');
  console.log(`Destino: ${CONFIG.baseUrl}`);
  console.log(`Usuario: ${CONFIG.user}`);
  console.log(`Modo:    ${IS_CHECK_ONLY ? 'Auditoría (--check-only)' : IS_FORCE ? 'Instalación Forzada (--force)' : 'Sincronización Automática'}`);
  if (TARGET_PLUGIN) console.log(`Filtro:  ${TARGET_PLUGIN}`);

  // 1. Descubrir plugins locales
  logStep(1, 4, 'Descubriendo plugins locales en ./plugin...');
  const localPlugins = getLocalPlugins();
  if (localPlugins.length === 0) {
    console.error('❌ No se encontraron plugins locales válidos.');
    process.exit(1);
  }

  for (const p of localPlugins) {
    console.log(`  • ${p.component.padEnd(25)} -> Versión: ${p.version} | Release: ${p.release} (${p.dirName})`);
  }

  // 2. Inicializar Browser Puppeteer
  logStep(2, 4, 'Conectando a Moodle LTS y scrapeando versiones instaladas...');
  const browser = await puppeteer.launch({
    executablePath: CONFIG.chromeExecutable,
    headless: CONFIG.headless ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  let syncNeeded = false;
  const pluginsToInstall = [];

  try {
    await loginMoodle(page, CONFIG);

    const components = localPlugins.map(p => p.component);
    const remoteData = await scrapeRemotePluginVersions(page, components);

    console.log('\n--- TABLA DE PARIDAD DE VERSIONES ---');
    console.log(
      'Componente'.padEnd(25) +
      'Versión Local'.padEnd(26) +
      'Versión Remota'.padEnd(26) +
      'Estado'
    );
    console.log('-'.repeat(90));

    for (const p of localPlugins) {
      const remote = remoteData[p.component];
      const localStr = `${p.version} (${p.release})`;
      const remoteStr = remote && remote.installed ? `${remote.version} (${remote.release})` : 'NO INSTALADO';

      const isMatch = remote && remote.installed && remote.version === p.version && remote.release === p.release;

      let status = '';
      if (!remote || !remote.installed) {
        status = '🔴 FALTA EN REMOTO';
        syncNeeded = true;
        pluginsToInstall.push(p);
      } else if (!isMatch) {
        status = '🟡 DISCREPANCIA (DESACTUALIZADO)';
        syncNeeded = true;
        pluginsToInstall.push(p);
      } else if (IS_FORCE) {
        status = '🔄 FORZANDO REINSTALACIÓN';
        syncNeeded = true;
        pluginsToInstall.push(p);
      } else {
        status = '🟢 AL DÍA';
      }

      console.log(
        p.component.padEnd(25) +
        localStr.padEnd(26) +
        remoteStr.padEnd(26) +
        status
      );
    }
    console.log('-'.repeat(90));

    // Si es solo auditoría
    if (IS_CHECK_ONLY) {
      if (syncNeeded) {
        console.log('\n⚠️ [AUDITORÍA] Existen discrepancias entre el entorno local y el servidor remoto.');
        process.exitCode = 1;
      } else {
        console.log('\n✅ [AUDITORÍA] Todos los plugins coinciden estrictamente con el servidor remoto.');
        process.exitCode = 0;
      }
      await browser.close();
      return;
    }

    // Si no hay discrepancias y no se forzó
    if (!syncNeeded) {
      console.log('\n✅ Todos los plugins ya coinciden con la versión remota. No se requieren acciones.');
      await browser.close();
      return;
    }

    // 3. Ejecutar Empaquetado e Instalación Web
    logStep(3, 4, `Iniciando despliegue web de ${pluginsToInstall.length} plugin(s)...`);

    for (const plugin of pluginsToInstall) {
      const zipPath = packagePlugin(plugin);
      await installPluginViaWeb(page, plugin, zipPath);
    }

    // 4. Quality Gate de Verificación Final
    logStep(4, 4, 'Quality Gate: Verificando que las versiones remotas ahora coincidan exactamente...');
    const postRemoteData = await scrapeRemotePluginVersions(page, components);

    let allVerified = true;
    console.log('\n--- RESULTADO DE LA VERIFICACIÓN POST-INSTALACIÓN ---');
    for (const p of localPlugins) {
      const post = postRemoteData[p.component];
      const matches = post && post.installed && post.version === p.version && post.release === p.release;

      console.log(
        `• ${p.component.padEnd(25)}: ` +
        `Local = [${p.version} / ${p.release}] | ` +
        `Remoto = [${post?.version} / ${post?.release}] ` +
        `=> ${matches ? '✅ COINCIDE' : '❌ ERROR DE PARIDAD'}`
      );

      if (!matches) {
        allVerified = false;
      }
    }

    if (!allVerified) {
      await takeScreenshot(page, 'quality_gate_failed');
      throw new Error('Quality Gate fallido: una o más versiones remotas no coinciden con las locales tras la instalación.');
    }

    console.log('\n🎉 ¡ÉXITO TOTAL! Todos los plugins fueron instalados, actualizados y verificados.');
    process.exitCode = 0;

  } catch (err) {
    console.error(`\n❌ Error fatal: ${err.message}`);
    if (browser) {
      await takeScreenshot(page, 'error_fatal', scratchDir);
    }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
