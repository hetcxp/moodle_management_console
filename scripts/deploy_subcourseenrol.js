import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { loadEnv } from '/Users/hectorteran/Documents/moodle_management_console/scripts/env-helper.js';
import { loginMoodle, takeScreenshot } from '/Users/hectorteran/Documents/moodle_management_console/scripts/automation-helper.js';

loadEnv('/Users/hectorteran/Documents/moodle_management_console');

const COMPONENT = 'local_subcourseenrol';
const EXPECTED_VERSION = 2026092100;
const EXPECTED_RELEASE = '2.1.2';
const ZIP_PATH = '/Users/hectorteran/Documents/moodle_subcourses_learning_plan/local_subcourseenrol_v2.1.2.zip';
const SCRATCH_DIR = '/Users/hectorteran/.gemini/antigravity-ide/brain/90e0020c-53e3-4ad3-a137-d2ca81a3d4a8/scratch';

if (!fs.existsSync(ZIP_PATH)) {
  console.error(`ERROR: Zip file not found at ${ZIP_PATH}`);
  process.exit(1);
}

const TARGET_SITES = process.argv.slice(2).length > 0
  ? process.argv.slice(2)
  : ['https://lts.academyfactory.online', 'https://campus.escuelamusk.com'];

async function deployToSite(baseUrl) {
  console.log(`\n===============================================================`);
  console.log(`  DESPLEGANDO A: ${baseUrl}`);
  console.log(`===============================================================`);

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(90000);

  try {
    // 1. Iniciar Sesión
    await loginMoodle(page, { baseUrl });

    // 2. Verificar versión actual
    console.log(`  [1/5] Verificando plugins en ${baseUrl}/admin/plugins.php...`);
    await page.goto(`${baseUrl}/admin/plugins.php`, { waitUntil: 'networkidle2', timeout: 60000 });

    const currentStatus = await page.evaluate((comp) => {
      const row = document.querySelector(`tr[class*="name-${comp}"], tr[data-plugin="${comp}"]`);
      if (row) {
        const releaseEl = row.querySelector('.release, .version .release');
        const versionEl = row.querySelector('.versionnumber, .version .versionnumber');
        return {
          installed: true,
          release: releaseEl ? releaseEl.innerText.trim() : '',
          version: versionEl ? parseInt(versionEl.innerText.trim(), 10) : null
        };
      }
      return { installed: false, release: null, version: null };
    }, COMPONENT);

    console.log(`  Estado previo en ${baseUrl}:`, currentStatus);

    if (currentStatus.installed && currentStatus.version >= EXPECTED_VERSION) {
      console.log(`  ✅ Ya se encuentra actualizado a la versión requerida (${currentStatus.version} / ${currentStatus.release}).`);
      await browser.close();
      return;
    }

    // 3. Subir ZIP en /admin/tool/installaddon/index.php
    console.log(`  [2/5] Accediendo al instalador de plugins...`);
    await page.goto(`${baseUrl}/admin/tool/installaddon/index.php`, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('  Abriendo selector de archivos Filepicker...');
    await page.waitForSelector('.fp-btn-choose', { visible: true, timeout: 30000 });
    await page.$eval('.fp-btn-choose', el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await new Promise(r => setTimeout(r, 1000));
    await page.click('.fp-btn-choose');

    await page.waitForSelector('.moodle-dialogue-bd, .fp-repo-upload, .fp-repo-area', { visible: true, timeout: 25000 });

    console.log('  Seleccionando repositorio "Subir un archivo"...');
    await page.evaluate(() => {
      const repos = Array.from(document.querySelectorAll('.fp-repo, .fp-repo-name, .nav-item'));
      const uploadRepo = repos.find(el => {
        const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
        return txt.includes('subir un archivo') || txt.includes('upload a file');
      });
      if (uploadRepo) uploadRepo.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    console.log(`  Subiendo archivo: ${path.basename(ZIP_PATH)}...`);
    const fileInput = await page.waitForSelector('.fp-form-container input[type="file"], input[name="repo_upload_file"], input[type="file"]', {
      timeout: 15000
    });
    await fileInput.uploadFile(ZIP_PATH);

    await page.waitForSelector('.fp-upload-btn', { visible: true, timeout: 10000 });
    await page.evaluate(() => {
      document.querySelector('.fp-upload-btn').click();
    });

    console.log('  Esperando confirmación de subida al draft...');
    await page.waitForFunction(() => {
      const hasItem = document.querySelector('.fp-file.fp-hascontextmenu') || document.querySelector('#id_zipfile')?.value;
      const isClosed = !document.querySelector('.moodle-dialogue-focused');
      return hasItem && isClosed;
    }, { timeout: 45000 });
    await new Promise(r => setTimeout(r, 1500));

    console.log('  Enviando formulario de instalación...');
    const submitInstallBtn = await page.$('#id_submitbutton');
    await Promise.all([
      submitInstallBtn.click(),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 })
    ]);

    // 4. Validar pantalla de validación
    console.log(`  [3/5] Pantalla de validación: ${page.url()}`);
    const validationError = await page.evaluate(() => {
      const danger = document.querySelector('.alert-danger, .validation-error');
      return danger ? danger.innerText.trim() : null;
    });

    if (validationError) {
      await takeScreenshot(page, `error_val_${COMPONENT}`, SCRATCH_DIR);
      throw new Error(`Validación de Moodle falló: ${validationError}`);
    }

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
      await takeScreenshot(page, `fallo_confirmacion_${COMPONENT}`, SCRATCH_DIR);
      throw new Error('No se encontró el botón de confirmación de instalación.');
    }

    const confirmText = await page.evaluate(el => el.innerText || el.value, confirmBtn);
    console.log(`  Confirmando validación mediante botón "${confirmText.trim()}"...`);

    await Promise.all([
      confirmBtn.click(),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 })
    ]);

    // 5. Migración de Base de Datos
    console.log('  [4/5] Procesando pasos de migración de Base de Datos...');
    let loopCount = 0;
    while (loopCount < 8) {
      loopCount++;
      const currentUrl = page.url();
      console.log(`    Paso migración BD (${loopCount}): ${currentUrl}`);

      if (currentUrl.includes('admin/index.php?cache=1') || currentUrl.includes('/admin/index.php#') || currentUrl.includes('/admin/plugins.php')) {
        console.log('    Llegada a pantalla final de Notificaciones/Plugins.');
        break;
      }

      await page.waitForFunction(() => document.readyState === 'complete' && !!document.body, { timeout: 30000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 3000));

      let progressBtn = null;
      for (let retry = 0; retry < 8; retry++) {
        const progressHandle = await page.evaluateHandle(() => {
          const candidates = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"], .singlebutton input, .singlebutton button, a.btn, button'));
          const upgradeBtn = candidates.find(el => {
            const txt = (el.value || el.innerText || el.textContent || '').trim().toLowerCase();
            return (txt.includes('actualizar') && (txt.includes('base de datos') || txt.includes('moodle'))) ||
                   (txt.includes('upgrade') && (txt.includes('database') || txt.includes('moodle')));
          });
          if (upgradeBtn) return upgradeBtn;

          const continueBtn = candidates.find(el => {
            const txt = (el.value || el.innerText || el.textContent || '').trim().toLowerCase();
            return txt.includes('continuar') || txt.includes('continue');
          });
          if (continueBtn) return continueBtn;

          const saveBtn = candidates.find(el => {
            const txt = (el.value || el.innerText || el.textContent || '').trim().toLowerCase();
            return txt.includes('guardar cambios') || txt.includes('save changes');
          });
          return saveBtn || null;
        });

        progressBtn = progressHandle.asElement();
        if (progressBtn) break;
        await new Promise(r => setTimeout(r, 2000));
      }

      if (progressBtn) {
        const btnText = await page.evaluate(el => el.value || el.innerText, progressBtn);
        console.log(`    Presionando botón de progreso: "${btnText.trim()}"...`);
        try {
          await Promise.all([
            progressBtn.click(),
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 180000 }).catch(() => {})
          ]);
          await new Promise(r => setTimeout(r, 3000));
        } catch (err) {
          console.log(`    Navegación concluida o botón no interactivo (${err.message}).`);
          break;
        }
      } else {
        console.log('    No quedan pantallas pendientes de migración de BD.');
        break;
      }
    }

    // 6. Purga de Cachés
    console.log(`  [5/5] Purgando cachés en ${baseUrl}/admin/purgecaches.php...`);
    try {
      await page.goto(`${baseUrl}/admin/purgecaches.php`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const purgeBtn = await page.waitForSelector(
        'form.mform input[type="submit"], #id_submitbutton, input[type="submit"][value*="Purgar"], input[type="submit"][value*="Purge"]',
        { timeout: 20000 }
      ).catch(() => null);
      if (purgeBtn) {
        await Promise.all([
          purgeBtn.click(),
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => {})
        ]);
        console.log('  Cachés purgadas exitosamente.');
      }
    } catch (e) {
      console.warn(`  Aviso al purgar cachés: ${e.message}`);
    }

    // 7. Verificación final
    console.log(`  Verificando resultado final en ${baseUrl}/admin/plugins.php...`);
    await page.goto(`${baseUrl}/admin/plugins.php`, { waitUntil: 'networkidle2', timeout: 60000 });
    const finalStatus = await page.evaluate((comp) => {
      const row = document.querySelector(`tr[class*="name-${comp}"], tr[data-plugin="${comp}"]`);
      if (row) {
        const releaseEl = row.querySelector('.release, .version .release');
        const versionEl = row.querySelector('.versionnumber, .version .versionnumber');
        return {
          installed: true,
          release: releaseEl ? releaseEl.innerText.trim() : '',
          version: versionEl ? parseInt(versionEl.innerText.trim(), 10) : null
        };
      }
      return { installed: false, release: null, version: null };
    }, COMPONENT);

    console.log(`  🎉 Resultado Final en ${baseUrl}:`, finalStatus);
    if (finalStatus.version !== EXPECTED_VERSION) {
      throw new Error(`Discrepancia de versión en ${baseUrl}: se esperaba ${EXPECTED_VERSION}, se obtuvo ${finalStatus.version}`);
    }

  } catch (error) {
    console.error(`  ❌ Error durante el despliegue en ${baseUrl}:`, error.message);
    await takeScreenshot(page, `error_despliegue_${baseUrl.replace(/[^a-zA-Z0-9]/g, '_')}`, SCRATCH_DIR);
    throw error;
  } finally {
    await browser.close();
  }
}

async function main() {
  for (const site of TARGET_SITES) {
    await deployToSite(site);
  }
  console.log('\n===============================================================');
  console.log('  ✅ DESPLIEGUE EN TODOS LOS SITIOS COMPLETADO CON ÉXITO');
  console.log('===============================================================');
}

main().catch(err => {
  console.error('\n❌ Proceso de despliegue fallido:', err);
  process.exit(1);
});
