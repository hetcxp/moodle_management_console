import assert from 'assert';

const MOODLE_URL = process.env.MOODLE_URL;
const TOKEN = process.env.MOODLE_TOKEN;
const IS_CONFIRMED = process.argv.includes('--confirm-target') || process.env.CONFIRM_TARGET === '1';

if (!MOODLE_URL) {
  console.error('ERROR: MOODLE_URL no configurada.');
  process.exit(1);
}

if (!TOKEN || TOKEN === 'tu_token_aqui') {
  console.error('ERROR: MOODLE_TOKEN válido requerido para la prueba.');
  process.exit(1);
}

if (!IS_CONFIRMED) {
  console.error('ERROR: Mutación de cursos bloqueada. Debes incluir --confirm-target.');
  console.error('Uso: node scripts/headless_test_move.js --confirm-target');
  process.exit(1);
}

async function callMoodleApi(wsfunction, params = {}) {
  const url = new URL(`${MOODLE_URL}/webservice/rest/server.php`);
  url.searchParams.append('wstoken', TOKEN);
  url.searchParams.append('wsfunction', wsfunction);
  url.searchParams.append('moodlewsrestformat', 'json');

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((val, idx) => {
        url.searchParams.append(`${key}[${idx}]`, val);
      });
    } else {
      url.searchParams.append(key, value);
    }
  }

  const response = await fetch(url.toString(), { method: 'POST' });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
  const data = await response.json();
  if (data.exception) throw new Error(`Moodle exception: ${data.message}`);
  return data;
}

async function runTest() {
  console.log('--- Iniciando Prueba Headless: Mover Curso y Restaurar ---\n');
  try {
    const categoriesRes = await callMoodleApi('tool_management_console_get_categories_flat');
    const categories = categoriesRes.categories;
    if (categories.length < 2) {
      console.log('No hay suficientes categorías para probar (se necesitan al menos 2).');
      process.exit(0);
    }

    // Buscamos un curso en la primera categoría
    let courseToMove = null;
    let originalCategory = null;
    let targetCategory = null;

    for (let cat of categories) {
      const detail = await callMoodleApi('tool_management_console_get_category_detail', { categoryid: cat.id });
      if (detail.courses && detail.courses.length > 0) {
        courseToMove = detail.courses[0];
        originalCategory = cat;
        targetCategory = categories.find(c => c.id !== cat.id);
        break;
      }
    }

    if (!courseToMove) {
      console.log('No se encontraron cursos en ninguna categoría para probar el movimiento.');
      process.exit(0);
    }

    console.log(`📌 Curso seleccionado: ${courseToMove.fullname} (ID: ${courseToMove.id})`);
    console.log(`📁 Categoría original: ${originalCategory.name} (ID: ${originalCategory.id})`);
    console.log(`📁 Categoría destino: ${targetCategory.name} (ID: ${targetCategory.id})\n`);

    // 1. Mover el curso
    console.log(`1️⃣  Moviendo curso a categoría destino...`);
    await callMoodleApi('tool_management_console_course_action', {
      action: 'move',
      'courseids': [courseToMove.id],
      categoryid: targetCategory.id
    });
    console.log(`✅ Curso movido exitosamente.`);

    // 2. Verificar que ya no está en la categoría original
    const detailOriginal = await callMoodleApi('tool_management_console_get_category_detail', { categoryid: originalCategory.id });
    const isStillThere = detailOriginal.courses.some(c => c.id === courseToMove.id);
    assert(!isStillThere, 'El curso sigue en la categoría original.');

    // 3. Verificar que está en la categoría destino
    const detailTarget = await callMoodleApi('tool_management_console_get_category_detail', { categoryid: targetCategory.id });
    const isAtTarget = detailTarget.courses.some(c => c.id === courseToMove.id);
    assert(isAtTarget, 'El curso no aparece en la categoría destino.');
    console.log(`✅ Verificación exitosa: El curso está ahora en el destino.`);

    // 4. Restaurar a la categoría original
    console.log(`\n2️⃣  Restaurando curso a su categoría original...`);
    await callMoodleApi('tool_management_console_course_action', {
      action: 'move',
      'courseids': [courseToMove.id],
      categoryid: originalCategory.id
    });
    console.log(`✅ Curso restaurado exitosamente.`);

    // 5. Verificación final
    const detailFinal = await callMoodleApi('tool_management_console_get_category_detail', { categoryid: originalCategory.id });
    const isRestored = detailFinal.courses.some(c => c.id === courseToMove.id);
    assert(isRestored, 'El curso no se restauró correctamente en su categoría original.');
    console.log(`✅ Verificación final exitosa: El curso volvió a su origen.`);
    
    console.log('\n🚀 Prueba Headless Finalizada Correctamente.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runTest();
