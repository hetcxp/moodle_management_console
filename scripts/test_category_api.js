import assert from 'assert';

const MOODLE_URL = process.env.MOODLE_URL;
const TOKEN = process.env.MOODLE_TOKEN;
const IS_CONFIRMED = process.argv.includes('--confirm-target') || process.env.CONFIRM_TARGET === '1';

if (!MOODLE_URL) {
  console.error('ERROR: MOODLE_URL no configurada. Especifica MOODLE_URL en el entorno.');
  process.exit(1);
}

if (!TOKEN || TOKEN === 'tu_token_aqui') {
  console.error('ERROR: MOODLE_TOKEN válido requerido para la prueba.');
  process.exit(1);
}

if (!IS_CONFIRMED) {
  console.error('ERROR: Mutación de categorías y cursos bloqueada por seguridad. Se requiere el flag --confirm-target.');
  console.error('Uso: MOODLE_URL=<url> MOODLE_TOKEN=<token> node scripts/test_category_api.js --confirm-target');
  process.exit(1);
}

// Función auxiliar para llamar a la API de Moodle
async function callMoodleApi(wsfunction, params = {}) {
  const url = new URL(`${MOODLE_URL}/webservice/rest/server.php`);
  url.searchParams.append('wstoken', TOKEN);
  url.searchParams.append('wsfunction', wsfunction);
  url.searchParams.append('moodlewsrestformat', 'json');

  // Añadir parámetros (simplificado para strings/números; arrays requieren un formato específico como param[0]=val)
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((val, idx) => {
        url.searchParams.append(`${key}[${idx}]`, val);
      });
    } else {
      url.searchParams.append(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (data.exception) {
    throw new Error(`Moodle exception: ${data.message}`);
  }
  return data;
}

async function runTests() {
  console.log('--- Iniciando Tests Headless de Category API ---\n');

  try {
    // Necesitamos un ID de categoría de prueba. Asumimos 1 (generalmente existe).
    const testCategoryId = process.env.TEST_CATEGORY_ID || 1;
    
    // 1. Test de Métricas (Recursivas si aplica)
    console.log(`1. Test: Obtener detalles de la categoría (ID: ${testCategoryId})`);
    const categoryDetail = await callMoodleApi('tool_management_console_get_category_detail', { categoryid: testCategoryId });
    
    assert(categoryDetail, 'La respuesta de get_category_detail es nula');
    assert(typeof categoryDetail.name === 'string', 'La categoría debe tener un nombre');
    assert(Array.isArray(categoryDetail.courses), 'Debe retornar un array de cursos');
    assert(Array.isArray(categoryDetail.subcategories), 'Debe retornar un array de subcategorías');
    
    const initialCourseCount = categoryDetail.courses.length;
    console.log(`✅ Detalles obtenidos. Cursos: ${initialCourseCount}, Subcategorías: ${categoryDetail.subcategories.length}`);

    // Si hay cursos, probamos acciones masivas (hide/show)
    if (initialCourseCount > 0) {
      const testCourseId = categoryDetail.courses[0].id;
      const initialVisibility = categoryDetail.courses[0].visible;
      const targetVisibility = initialVisibility === 1 ? 'hide' : 'show';

      // 2. Test de Acción Masiva: Hide/Show
      console.log(`2. Test: Acción masiva (${targetVisibility}) en curso ID: ${testCourseId}`);
      await callMoodleApi('tool_management_console_course_action', { 
        action: targetVisibility, 
        'courseids': [testCourseId] 
      });
      console.log(`✅ Acción enviada. Verificando estado...`);

      // Verificamos si cambió
      const updatedCategory = await callMoodleApi('tool_management_console_get_category_detail', { categoryid: testCategoryId });
      const updatedCourse = updatedCategory.courses.find(c => c.id === testCourseId);
      
      const expectedVisible = targetVisibility === 'hide' ? 0 : 1;
      assert.strictEqual(updatedCourse.visible, expectedVisible, `El curso no cambió su visibilidad a ${expectedVisible}`);
      console.log(`✅ Visibilidad actualizada correctamente a ${expectedVisible}.`);
      
      // Restauramos
      await callMoodleApi('tool_management_console_course_action', { 
        action: initialVisibility === 1 ? 'show' : 'hide', 
        'courseids': [testCourseId] 
      });
      console.log(`✅ Estado restaurado a ${initialVisibility}.`);
      
      // 3. Test de Movimiento (Si hay más de 1 categoría)
      const allCategories = await callMoodleApi('tool_management_console_get_categories_flat');
      const otherCategory = allCategories.categories.find(c => c.id != testCategoryId);
      
      if (otherCategory) {
        console.log(`3. Test: Mover curso ID: ${testCourseId} a categoría ID: ${otherCategory.id}`);
        await callMoodleApi('tool_management_console_course_action', {
          action: 'move',
          'courseids': [testCourseId],
          categoryid: otherCategory.id
        });
        
        // Verificar que ya no está en la original
        const afterMoveCategory = await callMoodleApi('tool_management_console_get_category_detail', { categoryid: testCategoryId });
        const isStillThere = afterMoveCategory.courses.some(c => c.id === testCourseId);
        assert(!isStillThere, 'El curso sigue en la categoría original tras moverlo');
        
        console.log(`✅ Curso movido exitosamente.`);
        
        // Restaurarlo
        await callMoodleApi('tool_management_console_course_action', {
          action: 'move',
          'courseids': [testCourseId],
          categoryid: testCategoryId
        });
        console.log(`✅ Curso restaurado a categoría original.`);
      } else {
        console.log('3. Test: Omitido (No hay otra categoría para mover)');
      }
    } else {
      console.log('Omitiendo tests de acciones masivas porque la categoría no tiene cursos.');
    }

    console.log('\n✅ Todos los tests finalizaron correctamente.');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error en los tests:', error.message);
    process.exit(1);
  }
}

runTests();
