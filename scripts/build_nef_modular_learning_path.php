<?php
// Automation script: Build NEF Modular Courses & Learning Path
// Package: tool_management_console
// Deterministic DAG execution for Course 55 modularization.

define('CLI_SCRIPT', true);

$moodle_config = '/Users/hectorteran/Dev/moodle-dev/config.php';
if (!file_exists($moodle_config)) {
    fwrite(STDERR, "Moodle config not found at $moodle_config\n");
    exit(1);
}
require($moodle_config);

require_once($CFG->dirroot . '/backup/util/includes/restore_includes.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/format/lib.php');
require_once(__DIR__ . '/../plugin/management_console/classes/repository/learning_path_repository.php');

use tool_management_console\repository\learning_path_repository;

$admin = $DB->get_record('user', ['id' => 2]);
if (!$admin) {
    fwrite(STDERR, "Admin user (ID 2) not found\n");
    exit(1);
}

echo "===============================================================\n";
echo "🚀 INICIANDO CONSTRUCCIÓN MODULAR NEF Y RUTA DE APRENDIZAJE\n";
echo "===============================================================\n\n";

// 1. Obtener o crear Categoría 'Negociador Elite'
$catname = 'Negociador Elite';
$cat = $DB->get_record('course_categories', ['name' => $catname]);
if (!$cat) {
    $newcat = \core_course_category::create([
        'name' => $catname,
        'parent' => 0,
        'visible' => 1,
        'description' => 'Cursos modulares del programa Negociador Elite'
    ]);
    $categoryid = (int)$newcat->id;
    echo "📁 Categoría creada: $catname (ID: $categoryid)\n";
} else {
    $categoryid = (int)$cat->id;
    echo "📁 Categoría existente: $catname (ID: $categoryid)\n";
}

// 2. Verificar o preparar plantilla de backup
$template_dir = $CFG->dataroot . '/temp/backup/nef_template';
if (!is_dir($template_dir) || !file_exists($template_dir . '/moodle_backup.xml')) {
    echo "📦 Descomprimiendo plantilla en $template_dir...\n";
    @mkdir($template_dir, 0777, true);
    $fs = get_file_storage();
    $files = $fs->get_area_files(context_user::instance(2)->id, 'user', 'backup', false, 'id DESC', false);
    if (empty($files)) {
        fwrite(STDERR, "No se encontró archivo de backup de usuario para extraer\n");
        exit(1);
    }
    $f = reset($files);
    $hash = $f->get_contenthash();
    $archive_path = $CFG->dataroot . '/filedir/' . substr($hash, 0, 2) . '/' . substr($hash, 2, 2) . '/' . $hash;
    exec("tar -xzf " . escapeshellarg($archive_path) . " -C " . escapeshellarg($template_dir), $out, $ret);
    if ($ret !== 0) {
        fwrite(STDERR, "Error al descomprimir archivo $archive_path\n");
        exit(1);
    }
    echo "✅ Plantilla preparada.\n";
} else {
    echo "✅ Plantilla disponible en $template_dir\n";
}

// 3. Especificación de los 10 cursos hijos modulares
$course_specs = [
    [
        'step' => 0,
        'source_section' => 1,
        'fullname' => 'Negociador Elite - Introducción',
        'shortname' => 'NEF_INTRO',
        'keep_general' => true
    ],
    [
        'step' => 1,
        'source_section' => 2,
        'fullname' => 'Negociador Elite - Paso 1: Ajustando el GPS',
        'shortname' => 'NEF_PASO1',
        'keep_general' => false
    ],
    [
        'step' => 2,
        'source_section' => 3,
        'fullname' => 'Negociador Elite - Paso 2: Persuadiendo al copiloto',
        'shortname' => 'NEF_PASO2',
        'keep_general' => false
    ],
    [
        'step' => 3,
        'source_section' => 4,
        'fullname' => 'Negociador Elite - Paso 3: Liderando el viaje',
        'shortname' => 'NEF_PASO3',
        'keep_general' => false
    ],
    [
        'step' => 4,
        'source_section' => 5,
        'fullname' => 'Negociador Elite - Paso 4: El idioma del éxito',
        'shortname' => 'NEF_PASO4',
        'keep_general' => false
    ],
    [
        'step' => 5,
        'source_section' => 6,
        'fullname' => 'Negociador Elite - Paso 5: Tu objeción me motiva',
        'shortname' => 'NEF_PASO5',
        'keep_general' => false
    ],
    [
        'step' => 6,
        'source_section' => 7,
        'fullname' => 'Negociador Elite - Paso 6: Ajustando cinturones',
        'shortname' => 'NEF_PASO6',
        'keep_general' => false
    ],
    [
        'step' => 7,
        'source_section' => 8,
        'fullname' => 'Negociador Elite - Paso 7: Ganar- Ganar',
        'shortname' => 'NEF_PASO7',
        'keep_general' => false
    ],
    [
        'step' => 8,
        'source_section' => 9,
        'fullname' => 'Negociador Elite - Paso 8: Arribando al destino',
        'shortname' => 'NEF_PASO8',
        'keep_general' => false
    ],
    [
        'step' => 9,
        'source_section' => 10,
        'fullname' => 'Negociador Elite - Paso 9: El premio',
        'shortname' => 'NEF_PASO9',
        'keep_general' => false
    ]
];

$created_course_ids = [];

// 4. Bucle determinista de creación de cursos
foreach ($course_specs as $spec) {
    $fn = $spec['fullname'];
    $sn = $spec['shortname'];
    $src_sec = $spec['source_section'];
    $keep_gen = $spec['keep_general'];

    echo "\n---------------------------------------------------------------\n";
    echo "🔨 Procesando: $fn ($sn) [Sección origen: $src_sec]\n";

    // Idempotencia: Si ya existe un curso previo con este shortname, eliminarlo
    $existing = $DB->get_record('course', ['shortname' => $sn]);
    if ($existing) {
        echo "   ♻️ Eliminando versión previa existente (ID {$existing->id})...\n";
        delete_course($existing->id, false);
    }

    // Clonar plantilla vía APFS copy-on-write
    $restore_folder_name = 'nef_restore_' . strtolower($sn) . '_' . time();
    $restore_folder_path = $CFG->dataroot . '/temp/backup/' . $restore_folder_name;
    exec('cp -c -R ' . escapeshellarg($template_dir) . ' ' . escapeshellarg($restore_folder_path), $cp_out, $cp_ret);
    if ($cp_ret !== 0) {
        exec('cp -R ' . escapeshellarg($template_dir) . ' ' . escapeshellarg($restore_folder_path));
    }

    // Crear registro de curso contenedor
    $newcourseid = \restore_dbops::create_new_course($fn, $sn, $categoryid);

    // Ejecutar restauración
    $rc = new \restore_controller(
        $restore_folder_name,
        $newcourseid,
        \backup::INTERACTIVE_NO,
        \backup::MODE_GENERAL,
        $admin->id,
        \backup::TARGET_NEW_COURSE
    );
    $rc->execute_precheck();
    $rc->execute_plan();
    $rc->destroy();
    fulldelete($restore_folder_path);

    $course = $DB->get_record('course', ['id' => $newcourseid]);
    $modinfo = get_fast_modinfo($newcourseid);
    $sec0 = $modinfo->get_section_info(0);
    $formatactions = \core_courseformat\formatactions::cm($course);

    // Si no debe conservar los elementos generales originales de Section 0, purgarlos antes de mover
    if (!$keep_gen) {
        $initial_sec0_cms = $modinfo->sections[0] ?? [];
        foreach ($initial_sec0_cms as $cmid) {
            $cm = $modinfo->cms[$cmid];
            if (in_array($cm->modname, ['qbank', 'book', 'forum'])) {
                course_delete_module($cmid);
            }
        }
    }

    // Mover actividades de la sección origen a Sección 0
    $target_cms = $modinfo->sections[$src_sec] ?? [];
    echo "   📦 Moviendo " . count($target_cms) . " actividades a Sección 0...\n";
    foreach ($target_cms as $cmid) {
        $formatactions->move_end_section($cmid, $sec0->id);
    }

    // Eliminar secciones 1 a 10
    echo "   🧹 Purgando secciones sobrantes 1..10...\n";
    for ($s = 10; $s >= 1; $s--) {
        course_delete_section($course, $s, true);
    }

    // Ajustar format_options a numsections = 0 (solo sección general visible)
    learning_path_repository::sync_numsections($newcourseid, 1);

    // Asegurar enablecompletion = 1, nombres definitivos y visibilidad
    $course->fullname = $fn;
    $course->shortname = $sn;
    $course->enablecompletion = 1;
    $course->visible = 1;
    $course->category = $categoryid;
    $DB->update_record('course', $course);

    rebuild_course_cache($newcourseid, true);

    $modinfo_final = get_fast_modinfo($newcourseid);
    $final_sec0_count = count($modinfo_final->sections[0] ?? []);
    echo "   ✅ Completado curso ID: $newcourseid | Actividades en Sección General: $final_sec0_count\n";

    $created_course_ids[] = $newcourseid;
}

// 5. Crear la Ruta de Aprendizaje Contenedora: 'Negociador elite full'
echo "\n===============================================================\n";
echo "🛣️ CONSTRUYENDO RUTA DE APRENDIZAJE: 'Negociador elite full'\n";
echo "===============================================================\n";

$lp_fullname = 'Negociador elite full';
$lp_shortname = 'NEF_RUTA';

// Verificar si ya existe ruta previa con este shortname
$existing_lp = $DB->get_record('course', ['shortname' => $lp_shortname]);
if ($existing_lp) {
    echo "♻️ Eliminando ruta previa con shortname $lp_shortname (ID {$existing_lp->id})...\n";
    delete_course($existing_lp->id, false);
}

// Crear curso contenedor mediante el repositorio de la consola
$lp_courseid = learning_path_repository::create_learning_path($lp_fullname, $lp_shortname, time());
echo "📦 Curso contenedor de Ruta creado: $lp_fullname (ID: $lp_courseid, Shortname: $lp_shortname)\n";

// Enlazar los 10 subcursos en orden secuencial con prelación estricta
echo "🔗 Enlazando " . count($created_course_ids) . " subcursos con prelación secuencial estricta...\n";
learning_path_repository::update_structure($lp_courseid, $created_course_ids, true);

// Asegurar que cada subcurso mod_subcourse tenga completioncourse = 1
$subcourses = $DB->get_records('subcourse', ['course' => $lp_courseid]);
foreach ($subcourses as $sc) {
    $sc->completioncourse = 1;
    $DB->update_record('subcourse', $sc);
}

rebuild_course_cache($lp_courseid, true);

// 6. Verificación Binaria de la Estructura
echo "\n===============================================================\n";
echo "🔍 VERIFICACIÓN CONTRACTUAL DE LA RUTA DE APRENDIZAJE\n";
echo "===============================================================\n";

$detail = learning_path_repository::get_learning_path_detail($lp_courseid);
echo "Nombre de Ruta: {$detail->fullname} ({$detail->shortname})\n";
echo "Total Secciones en Ruta: " . count($detail->sections) . "\n";
echo "Prelación Secuencial Activa: " . ($detail->enforce_sequence ? 'SÍ' : 'NO') . "\n\n";

$all_ok = true;
foreach ($detail->sections as $sec) {
    $has_rule = $sec['has_sequential_rule'] ? '🔒 [Bloqueado por anterior]' : '🔓 [Inicial / Libre]';
    echo " - Sección {$sec['section']}: {$sec['subcourse_fullname']} (Curso Ref: {$sec['subcourse_course_id']}) {$has_rule}\n";
    if ($sec['section'] > 1 && !$sec['has_sequential_rule']) {
        $all_ok = false;
    }
}

if (!$all_ok) {
    fwrite(STDERR, "\n❌ Error: Falló la verificación de reglas de prelación secuencial.\n");
    exit(1);
}

echo "\n✨ RUTA DE APRENDIZAJE Y 10 CURSOS MODULARES CREADOS EXITOSAMENTE ✨\n";
echo "ID Contenedor: $lp_courseid\n";
exit(0);
