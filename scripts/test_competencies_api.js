import assert from 'assert';

const MOODLE_URL = process.env.MOODLE_URL || 'http://localhost/moodle';
const TOKEN = process.env.MOODLE_TOKEN || 'tu_token_aqui';

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

  const response = await fetch(url.toString(), {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (data.exception) {
    throw new Error(`Moodle exception [${data.errorcode}]: ${data.message}`);
  }
  return data;
}

async function runCompetencyTests() {
  console.log('--- Iniciando Tests Headless de Competencies API ---\n');

  try {
    // 1. Test: Obtener escalas
    console.log('1. Test: Obtener escalas del sistema (local_adminer_get_scales)');
    const scalesRes = await callMoodleApi('local_adminer_get_scales');
    assert(scalesRes && Array.isArray(scalesRes.scales), 'Debe retornar un array de escalas');
    assert(scalesRes.scales.length > 0, 'Debe haber al menos 1 escala en el sistema');
    const defaultScale = scalesRes.scales.find((s) => s.isdefault === 1);
    assert(defaultScale, 'Debe identificar una escala por defecto con isdefault=1');
    console.log(`✅ Escalas obtenidas: ${scalesRes.scales.length}. Escala por defecto: ${defaultScale.name} (ID: ${defaultScale.id})`);

    // 2. Test: Obtener KPIs iniciales
    console.log('\n2. Test: Obtener KPIs de competencias (local_adminer_get_competency_kpis)');
    const kpisInitial = await callMoodleApi('local_adminer_get_competency_kpis');
    assert(typeof kpisInitial.total_frameworks === 'number', 'KPI total_frameworks debe ser numérico');
    assert(typeof kpisInitial.pending_reviews === 'number', 'KPI pending_reviews debe ser numérico');
    console.log(`✅ KPIs obtenidos: ${kpisInitial.total_frameworks} marcos, ${kpisInitial.total_competencies} competencias, ${kpisInitial.pending_reviews} revisiones pendientes`);

    // 3. Test: Crear Marco de Competencias
    console.log('\n3. Test: Crear nuevo marco de competencias (local_adminer_competency_framework_action - create)');
    const testFrameworkName = `Test Framework ${Date.now()}`;
    const testFrameworkCode = `TEST-FW-${Date.now()}`;
    const createFwRes = await callMoodleApi('local_adminer_competency_framework_action', {
      action: 'create',
      shortname: testFrameworkName,
      idnumber: testFrameworkCode,
      description: 'Marco creado para pruebas automatizadas',
      scaleid: defaultScale.id,
      visible: 1,
    });
    assert(createFwRes.success === true, 'La creación del marco debe ser exitosa');
    const frameworkId = createFwRes.affectedcount;
    assert(frameworkId > 0, 'Debe retornar el ID del nuevo marco');
    console.log(`✅ Marco creado exitosamente con ID: ${frameworkId}`);

    // 4. Test: Consultar lista paginada y verificar presencia
    console.log('\n4. Test: Verificar presencia en lista paginada (local_adminer_get_competency_frameworks)');
    const listRes = await callMoodleApi('local_adminer_get_competency_frameworks', {
      search: testFrameworkCode,
    });
    assert(listRes && Array.isArray(listRes.frameworks), 'Debe retornar array de frameworks');
    const foundFw = listRes.frameworks.find((f) => f.id === frameworkId);
    assert(foundFw, 'El marco recién creado debe encontrarse en la búsqueda');
    assert.strictEqual(foundFw.shortname, testFrameworkName, 'El nombre debe coincidir');
    assert.strictEqual(foundFw.visible, 1, 'El marco debe ser visible inicialmente');
    console.log(`✅ Marco encontrado en listado con nombre: "${foundFw.shortname}" y visible: ${foundFw.visible}`);

    // 5. Test: Conmutar Visibilidad (toggle_visibility)
    console.log('\n5. Test: Conmutar visibilidad a oculto (local_adminer_competency_framework_action - toggle_visibility)');
    const toggleRes = await callMoodleApi('local_adminer_competency_framework_action', {
      action: 'toggle_visibility',
      frameworkid: frameworkId,
    });
    assert(toggleRes.success === true, 'El toggle de visibilidad debe ser exitoso');
    assert.strictEqual(toggleRes.affectedcount, 0, 'La nueva visibilidad debe ser 0 (oculto)');

    // Restaurar a visible
    const toggleBackRes = await callMoodleApi('local_adminer_competency_framework_action', {
      action: 'toggle_visibility',
      frameworkid: frameworkId,
    });
    assert.strictEqual(toggleBackRes.affectedcount, 1, 'La visibilidad restaurada debe ser 1 (visible)');
    console.log('✅ Visibilidad alternada y restaurada correctamente.');

    // 6. Test: Crear Competencias de Nivel 1
    console.log('\n6. Test: Crear competencias de Nivel 1 (local_adminer_competency_action - create)');
    const comp1Name = `Competencia 1 - ${Date.now()}`;
    const comp1Code = `COMP-1-${Date.now()}`;
    const createComp1 = await callMoodleApi('local_adminer_competency_action', {
      action: 'create',
      frameworkid: frameworkId,
      shortname: comp1Name,
      idnumber: comp1Code,
      description: 'Descripción de competencia 1 de prueba',
    });
    assert(createComp1.success === true, 'Creación de competencia 1 debe ser exitosa');
    const comp1Id = createComp1.affectedcount;
    assert(comp1Id > 0, 'Debe retornar ID de competencia 1');

    const comp2Name = `Competencia 2 - ${Date.now()}`;
    const createComp2 = await callMoodleApi('local_adminer_competency_action', {
      action: 'create',
      frameworkid: frameworkId,
      shortname: comp2Name,
      idnumber: `COMP-2-${Date.now()}`,
      description: 'Descripción de competencia 2 de prueba',
    });
    assert(createComp2.success === true, 'Creación de competencia 2 debe ser exitosa');
    const comp2Id = createComp2.affectedcount;
    console.log(`✅ 2 competencias creadas con IDs: ${comp1Id}, ${comp2Id}`);

    // 7. Test: Editar Competencia
    console.log('\n7. Test: Editar competencia (local_adminer_competency_action - edit)');
    const updatedComp1Name = `${comp1Name} (Actualizada)`;
    const editCompRes = await callMoodleApi('local_adminer_competency_action', {
      action: 'edit',
      competencyid: comp1Id,
      shortname: updatedComp1Name,
      idnumber: comp1Code,
      description: 'Descripción actualizada',
    });
    assert(editCompRes.success === true, 'Edición de competencia debe ser exitosa');
    console.log('✅ Competencia actualizada exitosamente.');

    // 8. Test: Detalle del Marco y verificación de competencias
    console.log('\n8. Test: Obtener detalle del marco (local_adminer_get_competency_framework_detail)');
    const detailRes = await callMoodleApi('local_adminer_get_competency_framework_detail', {
      frameworkid: frameworkId,
    });
    assert(detailRes && detailRes.id === frameworkId, 'El ID del detalle debe coincidir');
    assert.strictEqual(detailRes.competenciescount, 2, 'El marco debe contener exactamente 2 competencias');
    assert(Array.isArray(detailRes.competencies), 'Debe retornar el array de competencias');
    const comp1Detail = detailRes.competencies.find((c) => c.id === comp1Id);
    assert(comp1Detail, 'La competencia 1 debe existir en el detalle');
    assert.strictEqual(comp1Detail.shortname, updatedComp1Name, 'El nombre actualizado debe persistir');
    assert.strictEqual(comp1Detail.parentid, 0, 'La competencia debe ser de Nivel 1 (parentid = 0)');
    assert(typeof comp1Detail.coursescount === 'number', 'coursescount debe ser numérico');
    console.log(`✅ Detalle verificado. Competencias de Nivel 1 en el marco: ${detailRes.competenciescount}`);

    // 9. Test: Vincular Competencia con Cursos (local_adminer_competency_course_action - add)
    console.log('\n9. Test: Vincular competencia con cursos (local_adminer_competency_course_action - add)');
    const coursesRes = await callMoodleApi('local_adminer_get_courses', { perpage: 5 });
    const availableCourses = coursesRes?.courses || [];
    if (availableCourses.length > 0) {
      const targetCourseIds = availableCourses.slice(0, 2).map((c) => c.id);
      const linkRes = await callMoodleApi('local_adminer_competency_course_action', {
        action: 'add',
        competencyid: comp1Id,
        courseids: targetCourseIds,
      });
      assert(linkRes.success === true, 'La vinculación debe ser exitosa');
      assert.strictEqual(linkRes.affectedcount, targetCourseIds.length, 'Debe vincular todos los cursos solicitados');

      // Consultar cursos vinculados
      const linkedRes = await callMoodleApi('local_adminer_get_competency_courses', {
        competencyid: comp1Id,
      });
      assert(linkedRes && Array.isArray(linkedRes.courses), 'Debe retornar array de cursos');
      assert.strictEqual(linkedRes.courses.length, targetCourseIds.length, 'El número de cursos vinculados debe coincidir');
      console.log(`✅ ${linkedRes.courses.length} curso(s) vinculados a la competencia ${comp1Id} exitosamente.`);

      // Verificar que get_competency_framework_detail refleja coursescount
      const detailWithCourses = await callMoodleApi('local_adminer_get_competency_framework_detail', {
        frameworkid: frameworkId,
      });
      const comp1WithCourses = detailWithCourses.competencies.find((c) => c.id === comp1Id);
      assert.strictEqual(comp1WithCourses.coursescount, targetCourseIds.length, 'coursescount debe actualizarse');
      console.log(`✅ coursescount actualizado en detalle de marco: ${comp1WithCourses.coursescount}`);

      // Desvincular cursos (local_adminer_competency_course_action - remove)
      console.log('\n10. Test: Desvincular cursos de la competencia (local_adminer_competency_course_action - remove)');
      const unlinkRes = await callMoodleApi('local_adminer_competency_course_action', {
        action: 'remove',
        competencyid: comp1Id,
        courseids: targetCourseIds,
      });
      assert(unlinkRes.success === true, 'La desvinculación debe ser exitosa');
      assert.strictEqual(unlinkRes.affectedcount, targetCourseIds.length, 'Debe desvincular todos los cursos');

      const linkedAfterUnlink = await callMoodleApi('local_adminer_get_competency_courses', {
        competencyid: comp1Id,
      });
      assert.strictEqual(linkedAfterUnlink.courses.length, 0, 'No deben quedar cursos vinculados');
      console.log('✅ Cursos desvinculados correctamente.');
    } else {
      console.log('⚠️ No hay cursos disponibles para testear vinculación.');
    }

    // 11. Test: Eliminar una Competencia
    console.log('\n11. Test: Eliminar una competencia (local_adminer_competency_action - delete)');
    const delCompRes = await callMoodleApi('local_adminer_competency_action', {
      action: 'delete',
      competencyid: comp2Id,
    });
    assert(delCompRes.success === true, 'Eliminación de competencia debe ser exitosa');

    const detailAfterDel = await callMoodleApi('local_adminer_get_competency_framework_detail', {
      frameworkid: frameworkId,
    });
    assert.strictEqual(detailAfterDel.competenciescount, 1, 'Debe quedar 1 competencia tras la eliminación');
    console.log('✅ Competencia eliminada y conteo actualizado correctamente.');

    // 12. Test: Limpieza (Eliminar Marco de Prueba)
    console.log('\n12. Test: Limpieza de datos - Eliminar marco (local_adminer_competency_framework_action - delete)');
    const delFwRes = await callMoodleApi('local_adminer_competency_framework_action', {
      action: 'delete',
      frameworkid: frameworkId,
    });
    assert(delFwRes.success === true, 'Eliminación del marco debe ser exitosa');
    console.log('✅ Marco de prueba y registros vinculados eliminados correctamente.');

    console.log('\n🎉 Todos los tests headless de Competencies API finalizaron con éxito.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error en los tests:', err.message);
    process.exit(1);
  }
}

runCompetencyTests();
