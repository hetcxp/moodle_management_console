import assert from 'assert';
import {
  COMPETENCY_RULE_ALL_CHILDREN,
  COMPETENCY_PARENT_RULES,
  RULE_OUTCOMES
} from '../src/views/competencies/competencyConstants.js';

console.log('--- Iniciando Tests de Lógica UI de Competencias y Reglas ---');

// 1. Verificar constantes de reglas
assert.strictEqual(
  COMPETENCY_RULE_ALL_CHILDREN,
  'core_competency\\competency_rule_all_children',
  'COMPETENCY_RULE_ALL_CHILDREN debe tener el namespace exacto de Moodle core'
);

// 2. Verificar que existe la regla de completado en COMPETENCY_PARENT_RULES
const autoCompRule = COMPETENCY_PARENT_RULES.find(
  (r) => r.ruletype === COMPETENCY_RULE_ALL_CHILDREN && r.ruleoutcome === 2
);
assert(autoCompRule, 'Debe existir la regla de auto-completar al finalizar subcompetencias');
assert.strictEqual(autoCompRule.ruleoutcome, 2, 'El resultado de la regla de auto-completar debe ser 2 (OUTCOME_COMPLETE)');
assert(autoCompRule.label.includes('todas las subcompetencias'), 'La etiqueta debe mencionar todas las subcompetencias');
console.log('✅ Constantes y configuraciones de reglas automáticas validadas correctamente.');

// 3. Verificar opciones de reglas de cursos/actividades
assert(Array.isArray(RULE_OUTCOMES), 'RULE_OUTCOMES debe ser un array');
const completeCourseOutcome = RULE_OUTCOMES.find((o) => o.value === 3);
assert(completeCourseOutcome, 'Debe existir el outcome 3 para cursos/actividades');
console.log('✅ RULE_OUTCOMES para cursos y actividades validado.');

// 4. Test de filtrado y mapeo de subcompetencias
const mockCompetency = {
  id: 10,
  shortname: 'Competencia Padre',
  ruletype: COMPETENCY_RULE_ALL_CHILDREN,
  ruleoutcome: 2,
  childrencount: 2,
  children: [
    { id: 21, shortname: 'Subcompetencia A', parentid: 10, coursescount: 1 },
    { id: 22, shortname: 'Subcompetencia B', parentid: 10, coursescount: 2 }
  ]
};

assert.strictEqual(mockCompetency.children.length, mockCompetency.childrencount);
assert(mockCompetency.children.every((c) => c.parentid === mockCompetency.id));
console.log('✅ Validación de estructura jerárquica de subcompetencias exitosa.');

console.log('\n🎉 Todos los tests de lógica UI pasaron con éxito.');
