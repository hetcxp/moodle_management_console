import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const TARGETS = [
  { id: 'lts', url: 'https://lts.academyfactory.online', env: '.env.lts' },
  { id: 'viasano', url: 'https://academiaviasano.online', env: '.env.viasano' },
  { id: 'mopcuy', url: 'https://mopcuy.academyfactory.online', env: '.env.mopcuy' },
  { id: 'cristalcash', url: 'https://cristalcash.academyfactory.online', env: '.env.cristalcash' },
  { id: 'byg', url: 'https://academiabyg.online', env: '.env.byg' },
  { id: 'goacademy', url: 'https://go-academy.online', env: '.env.goacademy' },
  { id: 'muller', url: 'https://academiamuller.online', env: '.env.muller' },
  { id: 'musk', url: 'https://campus.escuelamusk.com', env: '.env.musk' },
  { id: 'rasacademy', url: 'https://rasacademy.online', env: '.env.rasacademy' },
  { id: 'inspiringacademy', url: 'https://inspiringacademy.online', env: '.env.inspiringacademy' }
];

async function runDeployWorker(target) {
  return new Promise((resolve) => {
    const tStart = Date.now();
    console.log(`\n======================================================`);
    console.log(`>>> [SUBAGENTE LANZADO] Worker para: ${target.id.toUpperCase()} (${target.url})`);
    console.log(`======================================================`);

    const logFile = path.resolve(projectRoot, 'scratch', `deploy_worker_${target.id}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'w' });

    const child = spawn(
      'node',
      ['scripts/sync-moodle-plugins.js', '--url', target.url, '--confirm-target'],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          SKIP_BUILD: '1',
          CONFIRM_TARGET: '1'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (d) => {
      const msg = d.toString();
      stdoutData += msg;
      process.stdout.write(`[${target.id}] ${msg}`);
      logStream.write(msg);
    });

    child.stderr.on('data', (d) => {
      const msg = d.toString();
      stderrData += msg;
      process.stderr.write(`[${target.id}:ERR] ${msg}`);
      logStream.write(msg);
    });

    child.on('close', (code) => {
      logStream.end();
      const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
      const isSuccess = code === 0 && stdoutData.includes('COINCIDE') && !stdoutData.includes('ERROR DE PARIDAD');

      const report = {
        target: target.id,
        url: target.url,
        envFile: target.env,
        code,
        success: isSuccess,
        elapsedSec: parseFloat(elapsed),
        timestamp: new Date().toISOString()
      };

      const reportPath = path.resolve(projectRoot, 'scratch', `deploy_report_${target.id}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

      if (isSuccess) {
        console.log(`\n<<< [SUBAGENTE COMPLETADO] Worker ${target.id.toUpperCase()} finalizó con ÉXITO (${elapsed}s).`);
        resolve(report);
      } else {
        console.error(`\n<<< [SUBAGENTE ERROR] Worker ${target.id.toUpperCase()} falló (código ${code}, ${elapsed}s).`);
        resolve(report);
      }
    });
  });
}

// Pool runner con concurrencia controlada
async function pool(items, concurrency, fn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);

    if (concurrency <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

async function main() {
  const cliTargets = process.argv.slice(2);
  const targets = cliTargets.length > 0
    ? TARGETS.filter(t => cliTargets.includes(t.id) || cliTargets.includes(t.url))
    : TARGETS;

  console.log(`===============================================================`);
  console.log(`  ORQUESTADOR MULTIAGENTE: DESPLIEGUE MASIVO DE ENTORNOS`);
  console.log(`===============================================================`);
  console.log(`Instancias objetivo (${targets.length}): ${targets.map(t => t.id).join(', ')}`);
  console.log(`Concurrencia: 3 subagentes en paralelo`);
  console.log(`Versión a desplegar: 2026101601 (1.3.2)\n`);

  const tStart = Date.now();
  const results = await pool(targets, 3, runDeployWorker);
  const tTotal = ((Date.now() - tStart) / 1000).toFixed(1);

  console.log(`\n===============================================================`);
  console.log(`BALANCE GLOBAL DE DESPLIEGUE (${tTotal}s)`);
  console.log(`===============================================================`);

  let successCount = 0;
  let failCount = 0;

  console.log(
    'Instancia'.padEnd(18) +
    'URL'.padEnd(45) +
    'Duración'.padEnd(12) +
    'Estado'
  );
  console.log('-'.repeat(85));

  for (const r of results) {
    const statusText = r.success ? '✅ ACTUALIZADO (1.3.2)' : `❌ FALLÓ (código ${r.code})`;
    console.log(
      r.target.padEnd(18) +
      r.url.padEnd(45) +
      `${r.elapsedSec}s`.padEnd(12) +
      statusText
    );
    if (r.success) successCount++;
    else failCount++;
  }
  console.log('-'.repeat(85));
  console.log(`Resumen: ${successCount} exitosos, ${failCount} fallidos de ${results.length} totales.\n`);

  const consolidatedPath = path.resolve(projectRoot, 'scratch', 'deploy_consolidated_report.json');
  fs.writeFileSync(consolidatedPath, JSON.stringify({
    total: results.length,
    successCount,
    failCount,
    durationSec: parseFloat(tTotal),
    timestamp: new Date().toISOString(),
    results
  }, null, 2), 'utf8');

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error fatal en orquestador:', err);
  process.exit(1);
});
