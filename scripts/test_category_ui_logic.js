import assert from 'assert';

console.log('--- Iniciando Tests Headless de Lógica UI (Sorting & Filtering) ---\n');

// Mock data similar a la de AdminerApi.getCategoryDetail
const mockData = {
  name: 'Categoría Principal',
  courses: [
    { id: 101, fullname: 'Curso de React', shortname: 'React101', visible: 1 },
    { id: 102, fullname: 'Curso de Angular', shortname: 'Ang101', visible: 0 },
    { id: 103, fullname: 'Avanzado de Vue', shortname: 'Vue201', visible: 1 }
  ],
  subcategories: [
    { id: 10, name: 'Frontend', coursecount: 3, visible: 1 },
    { id: 11, name: 'Backend', coursecount: 5, visible: 0 },
    { id: 12, name: 'DevOps', coursecount: 2, visible: 1 }
  ]
};

function applyCoursesLogic(data, courseSearch, courseVisibility, courseSort, courseDir) {
  let filtered = (data.courses || []).filter(c => {
    const matchesSearch = c.fullname.toLowerCase().includes(courseSearch.toLowerCase()) || 
                          c.shortname.toLowerCase().includes(courseSearch.toLowerCase());
    const matchesVis = courseVisibility === '-1' || String(c.visible) === courseVisibility;
    return matchesSearch && matchesVis;
  });

  filtered.sort((a, b) => {
    let valA = a[courseSort];
    let valB = b[courseSort];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return courseDir === 'ASC' ? -1 : 1;
    if (valA > valB) return courseDir === 'ASC' ? 1 : -1;
    return 0;
  });
  return filtered;
}

function applySubcatsLogic(data, subcatSearch, subcatVisibility, subcatSort, subcatDir) {
  let filtered = (data.subcategories || []).filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(subcatSearch.toLowerCase());
    const matchesVis = subcatVisibility === '-1' || String(c.visible) === subcatVisibility;
    return matchesSearch && matchesVis;
  });

  filtered.sort((a, b) => {
    let valA = a[subcatSort];
    let valB = b[subcatSort];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return subcatDir === 'ASC' ? -1 : 1;
    if (valA > valB) return subcatDir === 'ASC' ? 1 : -1;
    return 0;
  });
  return filtered;
}

try {
  // Test 1: Filtrado de cursos por texto
  console.log('Test 1: Filtrado de cursos por texto ("React")');
  let result = applyCoursesLogic(mockData, 'React', '-1', 'fullname', 'ASC');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 101);
  console.log('✅ Pasó\n');

  // Test 2: Filtrado de cursos por visibilidad
  console.log('Test 2: Filtrado de cursos ocultos ("0")');
  result = applyCoursesLogic(mockData, '', '0', 'fullname', 'ASC');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].fullname, 'Curso de Angular');
  console.log('✅ Pasó\n');

  // Test 3: Ordenamiento de subcategorías por nombre ASC
  console.log('Test 3: Ordenamiento de subcategorías por nombre ASC');
  result = applySubcatsLogic(mockData, '', '-1', 'name', 'ASC');
  assert.strictEqual(result[0].name, 'Backend'); // B
  assert.strictEqual(result[1].name, 'DevOps');  // D
  assert.strictEqual(result[2].name, 'Frontend'); // F
  console.log('✅ Pasó\n');

  // Test 4: Ordenamiento de subcategorías por coursecount DESC
  console.log('Test 4: Ordenamiento de subcategorías por coursecount DESC');
  result = applySubcatsLogic(mockData, '', '-1', 'coursecount', 'DESC');
  assert.strictEqual(result[0].name, 'Backend'); // 5
  assert.strictEqual(result[1].name, 'Frontend'); // 3
  assert.strictEqual(result[2].name, 'DevOps'); // 2
  console.log('✅ Pasó\n');

  console.log('🎉 Todos los tests de lógica UI pasaron satisfactoriamente.');
} catch (err) {
  console.error('❌ Error en el test:', err.message);
  process.exit(1);
}
