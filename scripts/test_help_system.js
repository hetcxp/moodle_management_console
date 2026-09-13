#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { takeScreenshot } from './automation-helper.js';

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser'
].filter(Boolean);

function getChromeExecutable() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No se encontró ejecutable de Chrome/Chromium.');
}

// Parse CLI args
const args = process.argv.slice(2);
let phase = '1';
let headless = true;
let appUrl = process.env.APP_URL || 'http://localhost:3001';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--phase' && args[i + 1]) {
    phase = args[i + 1];
    i++;
  } else if (args[i] === '--no-headless' || args[i] === '--headful') {
    headless = false;
  } else if (args[i] === '--url' && args[i + 1]) {
    appUrl = args[i + 1];
    i++;
  }
}

const results = {
  timestamp: new Date().toISOString(),
  phase,
  appUrl,
  checks: [],
  passed: 0,
  failed: 0
};

function recordCheck(name, passed, details = '') {
  results.checks.push({ name, passed, details });
  if (passed) {
    results.passed++;
    console.log(`  ✅ PASS: ${name}`);
  } else {
    results.failed++;
    console.error(`  ❌ FAIL: ${name} (${details})`);
  }
}

async function setupPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (url.includes('server.php') || url.includes('webservice') || url.includes('/moodle/')) {
      const mockPayload = {
        is_siteadmin: 1,
        can_config_site: 1,
        can_view_courses: 1,
        can_create_courses: 1,
        can_update_courses: 1,
        can_delete_courses: 1,
        can_manage_categories: 1,
        can_view_users: 1,
        can_update_users: 1,
        can_delete_users: 1,
        can_view_cohorts: 1,
        can_view_competencies: 1,
        can_manage_competencies: 1,
        can_view_reports: 1,
        courses_total: 10,
        courses_active: 8,
        courses_inactive: 2,
        users_total: 20,
        users_active: 18,
        users_inactive: 2,
        categories_total: 5,
        cohorts_total: 3,
        cohorts_users_total: 12,
        competencies_total: 4,
        pending_reviews_total: 1,
        courses: [
          { id: 1, fullname: 'Curso de Prueba E2E', shortname: 'E2E101', category: 1, visible: 1 }
        ],
        categories: [
          { id: 1, name: 'Categoría General', parent: 0, coursecount: 1 }
        ],
        users: [
          { id: 2, username: 'admin', fullname: 'Administrador', email: 'admin@example.com', suspended: 0 }
        ],
        cohorts: [
          { id: 1, name: 'Cohort E2E', idnumber: 'C1', members_count: 5 }
        ],
        frameworks: [
          { id: 1, shortname: 'Marco E2E', competencies_count: 3 }
        ]
      };

      req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPayload)
      });
    } else {
      req.continue();
    }
  });

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('adminer_token', 'valid_test_token');
    localStorage.setItem('adminer_user', JSON.stringify({
      userid: 2,
      username: 'admin',
      fullname: 'Administrador'
    }));
    localStorage.setItem('adminer_token_date', String(Date.now()));
  });

  return page;
}

async function runE2E() {
  console.log(`\n======================================================`);
  console.log(`🚀 Iniciando E2E Help System — Fase: ${phase}`);
  console.log(`🌐 Target: ${appUrl} | Headless: ${headless}`);
  console.log(`======================================================\n`);

  const browser = await puppeteer.launch({
    executablePath: getChromeExecutable(),
    headless: headless ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await setupPage(browser);

  try {
    // ----------------------------------------------------
    // FASE 1: Core UI, Atajos de Teclado, Portal & Embebido
    // ----------------------------------------------------
    if (phase === '1' || phase === 'all') {
      console.log('\n--- Ejecutando Aserciones Fase 1 (Core) ---');
      await page.goto(appUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      await page.waitForSelector('#help-button', { timeout: 10000 });

      // 1. Presencia de #help-button en DOM
      const helpBtn = await page.$('#help-button');
      recordCheck('Fase 1: Presencia de #help-button en Header', !!helpBtn);

      // 2. Click abre el drawer lateral
      if (helpBtn) {
        await helpBtn.click();
        await new Promise(r => setTimeout(r, 400));
        const isDrawerOpen = await page.evaluate(() => {
          const aside = document.querySelector('aside[role="dialog"]');
          return aside && !aside.classList.contains('translate-x-full');
        });
        recordCheck('Fase 1: Click en #help-button abre el drawer', !!isDrawerOpen);

        // 3. Foco inicial dentro del drawer (close button)
        const focusedInDrawer = await page.evaluate(() => {
          const aside = document.querySelector('aside[role="dialog"]');
          return aside && aside.contains(document.activeElement);
        });
        recordCheck('Fase 1: Foco confinado dentro del drawer', !!focusedInDrawer);

        // 4. Tecla Escape cierra y restaura foco a #help-button
        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 400));
        const isClosed = await page.evaluate(() => {
          const aside = document.querySelector('aside[role="dialog"]');
          return aside && aside.classList.contains('translate-x-full');
        });
        recordCheck('Fase 1: Tecla Escape cierra el drawer', !!isClosed);

        const restoredFocus = await page.evaluate(() => {
          return document.activeElement && document.activeElement.id === 'help-button';
        });
        recordCheck('Fase 1: Escape restaura el foco a #help-button', !!restoredFocus);
      }

      // 5. Atajo de teclado '?' fuera de inputs
      await page.keyboard.press('?');
      await new Promise(r => setTimeout(r, 400));
      const openedByShortcut = await page.evaluate(() => {
        const aside = document.querySelector('aside[role="dialog"]');
        return aside && !aside.classList.contains('translate-x-full');
      });
      recordCheck('Fase 1: Atajo global ? abre el drawer', !!openedByShortcut);
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 300));

      // 6. Viewport móvil (375px) -> drawer full-width
      await page.setViewport({ width: 375, height: 667 });
      await page.keyboard.press('?');
      await new Promise(r => setTimeout(r, 400));
      const isFullWidthMobile = await page.evaluate(() => {
        const aside = document.querySelector('aside[role="dialog"]');
        if (!aside) return false;
        const rect = aside.getBoundingClientRect();
        return Math.abs(rect.width - 375) < 5;
      });
      recordCheck('Fase 1: Drawer full-width en viewport 375px', isFullWidthMobile);
      await page.keyboard.press('Escape');
      await page.setViewport({ width: 1280, height: 800 });

      // 7. Modo embebido en Moodle
      console.log('\n--- Ejecutando Aserciones Fase 1 (Modo Embebido) ---');
      const embeddedPage = await browser.newPage();
      await embeddedPage.setViewport({ width: 1280, height: 800 });
      await embeddedPage.setRequestInterception(true);
      embeddedPage.on('request', req => {
        if (req.url().includes('server.php') || req.url().includes('webservice') || req.url().includes('/moodle/')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ is_siteadmin: 1 })
          });
        } else {
          req.continue();
        }
      });

      await embeddedPage.evaluateOnNewDocument(() => {
        window.MANAGEMENT_CONSOLE_CONFIG = {
          embedded: true,
          token: 'mock_embedded_token',
          user: { userid: 2, username: 'admin', fullname: 'Administrador' }
        };
      });

      await embeddedPage.goto(appUrl, { waitUntil: 'networkidle0' });
      await embeddedPage.waitForSelector('#help-button', { timeout: 10000 });

      // Tecla ? no debe abrirlo en embebido
      await embeddedPage.keyboard.press('?');
      await new Promise(r => setTimeout(r, 300));
      const keptClosedInEmbedded = await embeddedPage.evaluate(() => {
        const aside = document.querySelector('aside[role="dialog"]');
        return !aside || aside.classList.contains('translate-x-full');
      });
      recordCheck('Fase 1 Embebido: Atajo ? desactivado en embedded', keptClosedInEmbedded);

      // Botón sí debe abrirlo
      const embeddedBtn = await embeddedPage.$('#help-button');
      if (embeddedBtn) {
        await embeddedBtn.click();
        await new Promise(r => setTimeout(r, 400));
        const openedByBtnInEmbedded = await embeddedPage.evaluate(() => {
          const aside = document.querySelector('aside[role="dialog"]');
          return aside && !aside.classList.contains('translate-x-full');
        });
        recordCheck('Fase 1 Embebido: Botón abre el drawer', !!openedByBtnInEmbedded);
      }
      await embeddedPage.close();
    }

    // ----------------------------------------------------
    // FASE 2: Contenido — Dashboard & Cursos
    // ----------------------------------------------------
    if (phase === '2' || phase === 'all') {
      console.log('\n--- Ejecutando Aserciones Fase 2 (Dashboard & Cursos) ---');
      await page.goto(`${appUrl}/`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#help-button', { timeout: 10000 });

      const helpBtn = await page.$('#help-button');
      if (helpBtn) await helpBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const dashboardTitleFound = await page.evaluate(() => {
        const aside = document.querySelector('aside[role="dialog"]');
        return aside && (aside.textContent.includes('Panel de Control') || aside.textContent.includes('dashboard'));
      });
      recordCheck('Fase 2: Título y viewId de Dashboard coinciden', !!dashboardTitleFound);

      const noTechnicalRoles = await page.evaluate(() => {
        const aside = document.querySelector('aside[role="dialog"]');
        return aside && !aside.textContent.includes('moodle/');
      });
      recordCheck('Fase 2: Sin capabilities técnicas crudas (moodle/)', !!noTechnicalRoles);

      // Cerrar y navegar a /courses
      await page.keyboard.press('Escape');
      await page.goto(`${appUrl}/courses`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#help-button', { timeout: 10000 });
      await new Promise(r => setTimeout(r, 400));

      const coursesHelpBtn = await page.$('#help-button');
      if (coursesHelpBtn) await coursesHelpBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const coursesContentOk = await page.evaluate(() => {
        const aside = document.querySelector('aside[role="dialog"]');
        return aside && (aside.textContent.includes('Cursos') || aside.textContent.includes('courses'));
      });
      recordCheck('Fase 2: Vista /courses actualiza contenido del drawer', !!coursesContentOk);
      await page.keyboard.press('Escape');
    }

    // ----------------------------------------------------
    // FASE 3: Contenido — Categorías & Cohorts
    // ----------------------------------------------------
    if (phase === '3' || phase === 'all') {
      console.log('\n--- Ejecutando Aserciones Fase 3 (Categorías & Cohorts) ---');
      await page.goto(`${appUrl}/categories`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#help-button', { timeout: 10000 });
      const catBtn = await page.$('#help-button');
      if (catBtn) await catBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const catOk = await page.evaluate(() => {
        const aside = document.querySelector('aside[role="dialog"]');
        return aside && (aside.textContent.includes('Categorías') || aside.textContent.includes('categories'));
      });
      recordCheck('Fase 3: Vista /categories detecta viewId categories', !!catOk);
      await page.keyboard.press('Escape');

      await page.goto(`${appUrl}/cohorts`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#help-button', { timeout: 10000 });
      const cohortBtn = await page.$('#help-button');
      if (cohortBtn) await cohortBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const cohortOk = await page.evaluate(() => {
        const aside = document.querySelector('aside[role="dialog"]');
        return aside && (aside.textContent.includes('Cohorts') || aside.textContent.includes('cohorts'));
      });
      recordCheck('Fase 3: Vista /cohorts detecta viewId cohorts', !!cohortOk);
      await page.keyboard.press('Escape');
    }

    // ----------------------------------------------------
    // FASE 4: Contenido — Usuarios & Detalle
    // ----------------------------------------------------
    if (phase === '4' || phase === 'all') {
      console.log('\n--- Ejecutando Aserciones Fase 4 (Usuarios & Detalle) ---');
      await page.goto(`${appUrl}/users`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#help-button', { timeout: 10000 });
      const userBtn = await page.$('#help-button');
      if (userBtn) await userBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const userOk = await page.evaluate(() => {
        const aside = document.querySelector('aside[role="dialog"]');
        return aside && (aside.textContent.includes('Usuarios') || aside.textContent.includes('users'));
      });
      recordCheck('Fase 4: Vista /users detecta viewId users', !!userOk);
      await page.keyboard.press('Escape');
    }

    // ----------------------------------------------------
    // FASE 5: Contenido — Competencias & Reportes
    // ----------------------------------------------------
    if (phase === '5' || phase === 'all') {
      console.log('\n--- Ejecutando Aserciones Fase 5 (Competencias & Reportes) ---');
      await page.goto(`${appUrl}/competencies`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#help-button', { timeout: 10000 });
      const compBtn = await page.$('#help-button');
      if (compBtn) await compBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const compOk = await page.evaluate(() => {
        const aside = document.querySelector('aside[role="dialog"]');
        return aside && (aside.textContent.includes('Competencias') || aside.textContent.includes('competencies'));
      });
      recordCheck('Fase 5: Vista /competencies detecta viewId competencies', !!compOk);
      await page.keyboard.press('Escape');

      await page.goto(`${appUrl}/reports`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#help-button', { timeout: 10000 });
      const repBtn = await page.$('#help-button');
      if (repBtn) await repBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const repOk = await page.evaluate(() => {
        const aside = document.querySelector('aside[role="dialog"]');
        return aside && (aside.textContent.includes('Reportes') || aside.textContent.includes('reports'));
      });
      recordCheck('Fase 5: Vista /reports detecta viewId reports', !!repOk);
      await page.keyboard.press('Escape');
    }

  } catch (err) {
    console.error(`  💥 Excepción durante la ejecución E2E: ${err.message}`);
    await takeScreenshot(page, `help_e2e_phase_${phase}_error`);
    recordCheck(`Ejecución E2E Fase ${phase}`, false, err.message);
  } finally {
    const scratchDir = path.resolve(process.cwd(), 'scratch');
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
    const reportPath = path.join(scratchDir, `help_e2e_report_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📋 Reporte de pruebas guardado en: ${reportPath}`);
    console.log(`📊 Resumen: ${results.passed} PASSED, ${results.failed} FAILED\n`);

    await browser.close();
  }

  if (results.failed > 0) {
    process.exit(1);
  }
}

runE2E().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
