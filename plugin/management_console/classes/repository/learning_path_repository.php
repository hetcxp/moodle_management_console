<?php
// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Learning path repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

defined('MOODLE_INTERNAL') || die();

use stdClass;
use moodle_exception;

/**
 * Learning path repository class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class learning_path_repository {

    /**
     * Obtiene o crea la categoría de rutas de aprendizaje.
     * Lee el ajuste configurable 'tool_management_console_lp_category_name'.
     *
     * @return int ID de la categoría.
     */
    public static function get_or_create_lp_category(): int {
        global $DB;
        $catname = get_config('tool_management_console', 'tool_management_console_lp_category_name');
        if (empty($catname)) {
            $catname = 'Rutas de Aprendizaje';
        }

        $cat = $DB->get_record('course_categories', ['name' => $catname]);
        if ($cat) {
            return (int)$cat->id;
        }

        if (class_exists('\core_course_category')) {
            $newcat = \core_course_category::create([
                'name' => $catname,
                'parent' => 0,
                'visible' => 1
            ]);
            return (int)$newcat->id;
        }

        $catrecord = new stdClass();
        $catrecord->name = $catname;
        $catrecord->parent = 0;
        $catrecord->visible = 1;
        $catrecord->sortorder = 999;
        $catrecord->timemodified = time();
        $catrecord->depth = 1;
        $id = $DB->insert_record('course_categories', $catrecord);
        $DB->set_field('course_categories', 'path', '/' . $id, ['id' => $id]);
        return (int)$id;
    }

    /**
     * Lista los cursos contenedor en la categoría de rutas con métricas.
     *
     * @param array $params Parámetros de búsqueda, orden y paginación.
     * @return array Lista de stdClass con las rutas.
     */
    public static function get_learning_paths(array $params): array {
        global $DB;

        $lp_categoryid = self::get_or_create_lp_category();

        $page = isset($params['page']) ? (int)$params['page'] : 0;
        $perpage = isset($params['perpage']) ? (int)$params['perpage'] : 20;
        $search = trim($params['search'] ?? '');

        $where = "c.category = :lpcategory AND c.id <> 1";
        $sqlparams = ['lpcategory' => $lp_categoryid];

        if (!empty($search)) {
            $where .= " AND (" . $DB->sql_like('c.fullname', ':search1', false, false) .
                      " OR " . $DB->sql_like('c.shortname', ':search2', false, false) . ")";
            $sqlparams['search1'] = '%' . $search . '%';
            $sqlparams['search2'] = '%' . $search . '%';
        }

        // Subcourse module count
        $submodule_id = (int)$DB->get_field('modules', 'id', ['name' => 'subcourse']);

        $sql = "
            SELECT c.id, c.fullname, c.shortname, c.visible, c.startdate, c.timecreated,
                   COALESCE(sc.subcourse_count, 0) AS subcourse_count,
                   COALESCE(enr.enrolled_count, 0) AS enrolled_count,
                   COALESCE(coh.cohort_count, 0) AS cohort_count
              FROM {course} c
         LEFT JOIN (
                SELECT cm.course, COUNT(cm.id) AS subcourse_count
                  FROM {course_modules} cm
                 WHERE cm.module = :submoduleid AND cm.deletioninprogress = 0
              GROUP BY cm.course
         ) sc ON sc.course = c.id
         LEFT JOIN (
                SELECT e.courseid, COUNT(DISTINCT ue.userid) AS enrolled_count
                  FROM {enrol} e
                  JOIN {user_enrolments} ue ON ue.enrolid = e.id
                  JOIN {user} u ON u.id = ue.userid
                 WHERE ue.status = 0 AND u.deleted = 0
              GROUP BY e.courseid
         ) enr ON enr.courseid = c.id
         LEFT JOIN (
                SELECT e.courseid, COUNT(DISTINCT e.customint1) AS cohort_count
                  FROM {enrol} e
                 WHERE e.enrol = 'cohort'
              GROUP BY e.courseid
         ) coh ON coh.courseid = c.id
             WHERE $where
          ORDER BY c.startdate DESC, c.id DESC
        ";

        $sqlparams['submoduleid'] = $submodule_id;

        $limitfrom = $page * $perpage;
        $records = $DB->get_records_sql($sql, $sqlparams, $limitfrom, $perpage);

        $result = [];
        if ($records) {
            foreach ($records as $r) {
                $result[] = (object)[
                    'id'              => (int)$r->id,
                    'fullname'        => $r->fullname,
                    'shortname'       => $r->shortname,
                    'visible'         => (int)$r->visible,
                    'startdate'       => (int)$r->startdate,
                    'timecreated'     => (int)$r->timecreated,
                    'subcourse_count' => (int)$r->subcourse_count,
                    'enrolled_count'  => (int)$r->enrolled_count,
                    'cohort_count'    => (int)$r->cohort_count,
                ];
            }
        }

        return $result;
    }

    /**
     * Obtiene el detalle de una ruta de aprendizaje (secciones, subcursos, disponibilidades, cohortes).
     *
     * @param int $courseid ID del curso contenedor.
     * @return stdClass Detalle de la ruta.
     * @throws moodle_exception Si el curso no existe o no pertenece a la categoría LP.
     */
    public static function get_learning_path_detail(int $courseid): stdClass {
        global $DB;

        $lp_categoryid = self::get_or_create_lp_category();
        $course = $DB->get_record('course', ['id' => $courseid]);
        if (!$course || (int)$course->category !== $lp_categoryid) {
            throw new moodle_exception('invalidcourseid', 'error');
        }

        $submodule_id = (int)$DB->get_field('modules', 'id', ['name' => 'subcourse']);

        // Secciones y módulos asociados
        $sql_sections = "
            SELECT cs.id AS sectionid, cs.section, cs.name AS sectionname, cs.summary,
                   cm.id AS cmid, cm.availability, cm.completion,
                   s.id AS subcourseid, s.refcourse AS subcourse_course_id,
                   subc.fullname AS subcourse_fullname, subc.shortname AS subcourse_shortname
              FROM {course_sections} cs
         LEFT JOIN {course_modules} cm ON cm.course = cs.course AND cm.section = cs.id AND cm.module = :submoduleid AND cm.deletioninprogress = 0
         LEFT JOIN {subcourse} s ON s.id = cm.instance
         LEFT JOIN {course} subc ON subc.id = s.refcourse
             WHERE cs.course = :courseid AND cs.section > 0
          ORDER BY cs.section ASC
        ";

        $section_records = $DB->get_records_sql($sql_sections, [
            'courseid'    => $courseid,
            'submoduleid' => $submodule_id
        ]);

        $sections = [];
        $has_sequential_rules = false;

        if ($section_records) {
            foreach ($section_records as $sec) {
                $avail = $sec->availability;
                $has_rule = false;
                if (!empty($avail)) {
                    $decoded = json_decode($avail, true);
                    if (!empty($decoded['c'])) {
                        $has_rule = true;
                        $has_sequential_rules = true;
                    }
                }

                $sections[] = [
                    'section'              => (int)$sec->section,
                    'section_id'           => (int)$sec->sectionid,
                    'section_name'         => $sec->sectionname ?? '',
                    'cm_id'                => $sec->cmid ? (int)$sec->cmid : null,
                    'subcourse_id'         => $sec->subcourseid ? (int)$sec->subcourseid : null,
                    'subcourse_course_id'  => $sec->subcourse_course_id ? (int)$sec->subcourse_course_id : null,
                    'subcourse_fullname'   => $sec->subcourse_fullname ?? null,
                    'subcourse_shortname'  => $sec->subcourse_shortname ?? null,
                    'availability'         => $avail,
                    'has_sequential_rule'  => $has_rule,
                ];
            }
        }

        // Cohortes asignadas al contenedor
        $sql_cohorts = "
            SELECT e.id AS enrolid, e.customint1 AS cohortid, coh.name AS cohortname,
                   COUNT(DISTINCT ue.userid) AS membercount
              FROM {enrol} e
              JOIN {cohort} coh ON coh.id = e.customint1
         LEFT JOIN {user_enrolments} ue ON ue.enrolid = e.id AND ue.status = 0
             WHERE e.courseid = :courseid AND e.enrol = 'cohort'
          GROUP BY e.id, e.customint1, coh.name
        ";
        $cohort_records = $DB->get_records_sql($sql_cohorts, ['courseid' => $courseid]);
        $cohorts = [];
        if ($cohort_records) {
            $cohorts = array_values(array_map(function($c) {
                return [
                    'enrol_id'     => (int)$c->enrolid,
                    'cohort_id'    => (int)$c->cohortid,
                    'name'         => $c->cohortname,
                    'member_count' => (int)$c->membercount,
                ];
            }, $cohort_records));
        }

        // Matriz de progreso
        $sql_users = "
            SELECT DISTINCT u.id, u.firstname, u.lastname, u.email
              FROM {enrol} e
              JOIN {user_enrolments} ue ON ue.enrolid = e.id
              JOIN {user} u ON u.id = ue.userid
             WHERE e.courseid = :courseid AND ue.status = 0 AND u.deleted = 0
          ORDER BY u.lastname ASC, u.firstname ASC
             LIMIT 100
        ";
        $users = $DB->get_records_sql($sql_users, ['courseid' => $courseid]);

        $cm_ids = array_filter(array_column($sections, 'cm_id'));
        $completions = [];
        if (!empty($cm_ids) && !empty($users)) {
            list($in_cms, $cm_params) = $DB->get_in_or_equal($cm_ids, SQL_PARAMS_NAMED, 'cm');
            list($in_users, $user_params) = $DB->get_in_or_equal(array_keys($users), SQL_PARAMS_NAMED, 'usr');
            $comp_params = array_merge($cm_params, $user_params);

            $sql_comp = "
                SELECT cmc.id, cmc.coursemoduleid, cmc.userid, cmc.completionstate
                  FROM {course_modules_completion} cmc
                 WHERE cmc.coursemoduleid $in_cms AND cmc.userid $in_users
            ";
            $comp_records = $DB->get_records_sql($sql_comp, $comp_params);
            if ($comp_records) {
                foreach ($comp_records as $cr) {
                    $completions[$cr->userid][$cr->coursemoduleid] = (int)$cr->completionstate;
                }
            }
        }

        $progress_matrix = [];
        if ($users) {
            foreach ($users as $u) {
                $user_progress = [
                    'user_id'   => (int)$u->id,
                    'fullname'  => $u->firstname . ' ' . $u->lastname,
                    'email'     => $u->email,
                    'modules'   => []
                ];
                foreach ($sections as $s) {
                    if ($s['cm_id']) {
                        $state = $completions[$u->id][$s['cm_id']] ?? 0;
                        $user_progress['modules'][] = [
                            'cm_id'           => $s['cm_id'],
                            'completionstate' => $state
                        ];
                    }
                }
                $progress_matrix[] = $user_progress;
            }
        }

        // Usuarios matriculados en la ruta
        $sql_enrolled_users = "
            SELECT ue.id AS userenrolid, u.id, u.firstname, u.lastname, u.email,
                   ue.status, ue.timecreated, e.enrol AS enrolmethod
              FROM {user} u
              JOIN {user_enrolments} ue ON ue.userid = u.id
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE e.courseid = :courseid AND u.deleted = 0
          ORDER BY u.lastname ASC, u.firstname ASC
        ";
        $enrolled_user_records = $DB->get_records_sql($sql_enrolled_users, ['courseid' => $courseid]);
        $enrolled_users = [];
        if ($enrolled_user_records) {
            foreach ($enrolled_user_records as $eur) {
                $uid = (int)$eur->id;
                if (!isset($enrolled_users[$uid])) {
                    $enrolled_users[$uid] = [
                        'id'           => $uid,
                        'fullname'     => $eur->firstname . ' ' . $eur->lastname,
                        'email'        => $eur->email,
                        'status'       => (int)$eur->status,
                        'enrol_method' => $eur->enrolmethod,
                        'timecreated'  => (int)$eur->timecreated,
                    ];
                } else if ($eur->enrolmethod === 'manual') {
                    $enrolled_users[$uid]['enrol_method'] = 'manual';
                }
            }
        }

        $detail = new stdClass();
        $detail->id = (int)$course->id;
        $detail->fullname = $course->fullname;
        $detail->shortname = $course->shortname;
        $detail->visible = (int)$course->visible;
        $detail->startdate = (int)$course->startdate;
        $detail->enddate = (int)$course->enddate;
        $detail->summary = $course->summary;
        $detail->sections = $sections;
        $detail->enforce_sequence = $has_sequential_rules;
        $detail->cohorts = $cohorts;
        $detail->users = array_values($enrolled_users);
        $detail->progress_matrix = $progress_matrix;

        return $detail;
    }

    /**
     * Crea un curso contenedor para la ruta de aprendizaje.
     *
     * @param string $fullname Nombre completo.
     * @param string $shortname Nombre corto.
     * @param int $startdate Fecha inicio timestamp.
     * @return int ID del curso creado.
     */
    public static function create_learning_path(string $fullname, string $shortname, int $startdate): int {
        global $DB, $CFG;

        $categoryid = self::get_or_create_lp_category();

        $coursedata = new stdClass();
        $coursedata->fullname = $fullname;
        $coursedata->shortname = $shortname;
        $coursedata->category = $categoryid;
        $coursedata->format = 'topics';
        $coursedata->visible = 1;
        $coursedata->enablecompletion = 1;
        $coursedata->numsections = 1;
        $coursedata->startdate = $startdate > 0 ? $startdate : time();

        if (file_exists($CFG->dirroot . '/course/lib.php')) {
            require_once($CFG->dirroot . '/course/lib.php');
        }

        if (function_exists('create_course')) {
            $newcourse = create_course($coursedata);
            $courseid = (int)$newcourse->id;
        } else {
            $coursedata->timecreated = time();
            $coursedata->timemodified = time();
            $courseid = (int)$DB->insert_record('course', $coursedata);
        }

        self::sync_numsections($courseid, 1);

        return $courseid;
    }

    /**
     * Sincroniza la cantidad de secciones format=topics en mdl_course_format_options.
     *
     * @param int $courseid ID del curso.
     * @param int $count Cantidad de secciones.
     */
    public static function sync_numsections(int $courseid, int $count): void {
        global $DB;
        $count = max(1, $count);
        $record = $DB->get_record('course_format_options', [
            'courseid' => $courseid,
            'format'   => 'topics',
            'sectionid'=> 0,
            'name'     => 'numsections'
        ]);

        if ($record) {
            $record->value = (string)$count;
            $DB->update_record('course_format_options', $record);
        } else {
            $newrec = new stdClass();
            $newrec->courseid = $courseid;
            $newrec->format = 'topics';
            $newrec->sectionid = 0;
            $newrec->name = 'numsections';
            $newrec->value = (string)$count;
            $DB->insert_record('course_format_options', $newrec);
        }
    }

    /**
     * Sincroniza secciones, módulos mod_subcourse y reglas de prelación availability.
     *
     * @param int $courseid ID del curso contenedor.
     * @param array $subcourse_ids IDs de los cursos hijos en orden secuencial.
     * @param bool $enforce_sequence Si true, inyecta regla availability JSON secuencial.
     */
    public static function update_structure(int $courseid, array $subcourse_ids, bool $enforce_sequence): void {
        global $DB, $CFG;

        if (file_exists($CFG->dirroot . '/mod/subcourse/lib.php')) {
            require_once($CFG->dirroot . '/mod/subcourse/lib.php');
        }

        $submodule_id = (int)$DB->get_field('modules', 'id', ['name' => 'subcourse']);
        $total = count($subcourse_ids);
        self::sync_numsections($courseid, max(1, $total));

        // Obtener o crear secciones necesarias
        $previous_cm_id = null;
        for ($i = 0; $i < $total; $i++) {
            $section_num = $i + 1;
            $refcourse_id = (int)$subcourse_ids[$i];

            // 1. Obtener o crear section
            $section = $DB->get_record('course_sections', ['course' => $courseid, 'section' => $section_num]);
            if (!$section) {
                $newsec = new stdClass();
                $newsec->course = $courseid;
                $newsec->section = $section_num;
                $newsec->name = 'Paso ' . $section_num;
                $newsec->summary = '';
                $newsec->summaryformat = FORMAT_HTML;
                $newsec->visible = 1;
                $newsec->sequence = '';
                $newsec->timemodified = time();
                $section_id = (int)$DB->insert_record('course_sections', $newsec);
            } else {
                $section_id = (int)$section->id;
            }

            // 2. Obtener o crear subcourse instance
            $refcourse = $DB->get_record('course', ['id' => $refcourse_id]);
            $subc_name = $refcourse ? $refcourse->fullname : ('Subcurso ' . $refcourse_id);

            $cm = $DB->get_record('course_modules', [
                'course'  => $courseid,
                'section' => $section_id,
                'module'  => $submodule_id,
                'deletioninprogress' => 0
            ]);

            if ($cm) {
                $cm_id = (int)$cm->id;
                // Actualizar instancia subcourse
                $subcourse = $DB->get_record('subcourse', ['id' => $cm->instance]);
                if ($subcourse) {
                    $subcourse->refcourse = $refcourse_id;
                    $subcourse->name = $subc_name;
                    $subcourse->completioncourse = 1;
                    $subcourse->timemodified = time();
                    $DB->update_record('subcourse', $subcourse);
                }
            } else {
                $subcourse = new stdClass();
                $subcourse->course = $courseid;
                $subcourse->name = $subc_name;
                $subcourse->refcourse = $refcourse_id;
                $subcourse->intro = '';
                $subcourse->introformat = FORMAT_HTML;
                $subcourse->completioncourse = 1;
                $subcourse->timecreated = time();
                $subcourse->timemodified = time();
                $subcourse_id = (int)$DB->insert_record('subcourse', $subcourse);

                $newcm = new stdClass();
                $newcm->course = $courseid;
                $newcm->module = $submodule_id;
                $newcm->instance = $subcourse_id;
                $newcm->section = $section_id;
                $newcm->visible = 1;
                $newcm->completion = 2; // Track completion when conditions met
                $newcm->completionview = 0;
                $newcm->added = time();
                $cm_id = (int)$DB->insert_record('course_modules', $newcm);
            }

            // Actualizar grade item del subcurso si la función existe
            if (function_exists('subcourse_grade_item_update')) {
                $sc_record = $DB->get_record('subcourse', ['id' => $cm ? $cm->instance : $subcourse_id]);
                if ($sc_record) {
                    subcourse_grade_item_update($sc_record);
                }
            }

            // Sincronizar campo sequence en course_sections para renderizado nativo en Moodle
            $DB->set_field('course_sections', 'sequence', (string)$cm_id, ['id' => $section_id]);

            // 3. Availability rules
            if ($enforce_sequence && $previous_cm_id !== null) {
                $availability = json_encode([
                    'op'    => '&',
                    'c'     => [
                        [
                            'type' => 'completion',
                            'cm'   => (int)$previous_cm_id,
                            'e'    => 1
                        ]
                    ],
                    'showc' => [true]
                ]);
                $DB->set_field('course_modules', 'availability', $availability, ['id' => $cm_id]);
            } else {
                $DB->set_field('course_modules', 'availability', null, ['id' => $cm_id]);
            }

            $previous_cm_id = $cm_id;
        }

        // Eliminar módulos sobrantes y limpiar secuencias en secciones mayores a $total
        $sql_excess = "
            SELECT cm.id
              FROM {course_modules} cm
              JOIN {course_sections} cs ON cs.id = cm.section
             WHERE cm.course = :courseid AND cs.section > :totalsec
        ";
        $excess_cms = $DB->get_records_sql($sql_excess, ['courseid' => $courseid, 'totalsec' => $total]);
        if ($excess_cms) {
            foreach ($excess_cms as $ecm) {
                $DB->set_field('course_modules', 'deletioninprogress', 1, ['id' => $ecm->id]);
            }
        }

        $excess_sections = $DB->get_records_select('course_sections', 'course = :courseid AND section > :totalsec', [
            'courseid' => $courseid,
            'totalsec' => $total,
        ]);
        if ($excess_sections) {
            foreach ($excess_sections as $esec) {
                $DB->set_field('course_sections', 'sequence', '', ['id' => $esec->id]);
            }
        }

        if (function_exists('rebuild_course_cache')) {
            rebuild_course_cache($courseid, true);
        }
    }

    /**
     * Verifica si un curso tiene estudiantes matriculados activos o suspendidos.
     *
     * @param int $courseid ID del curso.
     * @return bool True si hay usuarios inscritos.
     */
    public static function has_enrolled_users(int $courseid): bool {
        global $DB;
        $sql = "
            SELECT COUNT(ue.id)
              FROM {enrol} e
              JOIN {user_enrolments} ue ON ue.enrolid = e.id
              JOIN {user} u ON u.id = ue.userid
             WHERE e.courseid = :courseid AND u.deleted = 0
        ";
        return (int)$DB->count_records_sql($sql, ['courseid' => $courseid]) > 0;
    }

    /**
     * Oculta el curso contenedor (visible = 0).
     *
     * @param int $courseid ID del curso.
     */
    public static function hide_learning_path(int $courseid): void {
        global $DB;
        $DB->set_field('course', 'visible', 0, ['id' => $courseid]);
        if (function_exists('rebuild_course_cache')) {
            rebuild_course_cache($courseid, true);
        }
    }

    /**
     * Elimina físicamente el curso contenedor si no tiene estudiantes matriculados.
     * Si tiene estudiantes matriculados, solo lo oculta como salvaguarda.
     *
     * @param int $courseid ID del curso.
     */
    public static function delete_learning_path(int $courseid): void {
        global $DB, $CFG;

        if (self::has_enrolled_users($courseid)) {
            self::hide_learning_path($courseid);
            return;
        }

        if (file_exists($CFG->dirroot . '/course/lib.php')) {
            require_once($CFG->dirroot . '/course/lib.php');
        }

        if (function_exists('delete_course')) {
            delete_course($courseid, false);
        } else {
            $DB->delete_records('course', ['id' => $courseid]);
            $DB->delete_records('course_modules', ['course' => $courseid]);
            $DB->delete_records('course_sections', ['course' => $courseid]);
        }
    }

    /**
     * Busca cursos del catálogo excluyendo la categoría de Rutas y cursos excluidos.
     *
     * @param array $params Parámetros de búsqueda.
     * @param int $lp_categoryid ID de la categoría de rutas.
     * @param array $exclude_ids IDs a excluir.
     * @return array Cursos encontrados.
     */
    public static function search_available_courses(array $params, int $lp_categoryid, array $exclude_ids = []): array {
        global $DB;

        $search = trim($params['search'] ?? '');
        $page = isset($params['page']) ? (int)$params['page'] : 0;
        $perpage = isset($params['perpage']) ? (int)$params['perpage'] : 20;

        $where = "c.id <> 1 AND c.category <> :lpcat";
        $sqlparams = ['lpcat' => $lp_categoryid];

        if (!empty($exclude_ids)) {
            list($inexclude, $exparams) = $DB->get_in_or_equal($exclude_ids, SQL_PARAMS_NAMED, 'exc', false);
            $where .= " AND c.id $inexclude";
            $sqlparams = array_merge($sqlparams, $exparams);
        }

        if (!empty($search)) {
            $where .= " AND (" . $DB->sql_like('c.fullname', ':search1', false, false) .
                      " OR " . $DB->sql_like('c.shortname', ':search2', false, false) . ")";
            $sqlparams['search1'] = '%' . $search . '%';
            $sqlparams['search2'] = '%' . $search . '%';
        }

        $sql = "
            SELECT c.id, c.fullname, c.shortname, c.visible, cc.name AS categoryname
              FROM {course} c
              JOIN {course_categories} cc ON cc.id = c.category
             WHERE $where
          ORDER BY c.fullname ASC
        ";

        $limitfrom = $page * $perpage;
        $records = $DB->get_records_sql($sql, $sqlparams, $limitfrom, $perpage);

        $items = [];
        if ($records) {
            foreach ($records as $r) {
                $items[] = [
                    'id'           => (int)$r->id,
                    'fullname'     => $r->fullname,
                    'shortname'    => $r->shortname,
                    'visible'      => (int)$r->visible,
                    'categoryname' => $r->categoryname,
                ];
            }
        }

        $total = $DB->count_records_sql("SELECT COUNT(c.id) FROM {course} c WHERE $where", $sqlparams);

        return [
            'items' => $items,
            'total' => (int)$total,
            'page'  => $page,
            'perpage' => $perpage
        ];
    }

    /**
     * Comprueba si mod_subcourse y local_subcourseenrol están instalados y habilitados.
     *
     * @return array Array con ['is_ready' => bool, 'missing' => string[]].
     */
    public static function check_dependencies(): array {
        global $DB;
        $missing = [];

        if (class_exists('\core_plugin_manager')) {
            $pm = \core_plugin_manager::instance();
            $subcourse = $pm->get_plugin_info('mod_subcourse');
            if (!$subcourse || !$subcourse->is_enabled()) {
                $missing[] = 'mod_subcourse';
            }
            $subenrol = $pm->get_plugin_info('local_subcourseenrol');
            if (!$subenrol || $subenrol->is_enabled() === false) {
                $missing[] = 'local_subcourseenrol';
            }
        } else {
            // Verificación directa en base de datos
            $has_subcourse = $DB->record_exists('modules', ['name' => 'subcourse']);
            if (!$has_subcourse) {
                $missing[] = 'mod_subcourse';
            }
            $has_subenrol = $DB->record_exists('config_plugins', ['plugin' => 'local_subcourseenrol']);
            if (!$has_subenrol) {
                $missing[] = 'local_subcourseenrol';
            }
        }

        return [
            'is_ready' => empty($missing),
            'missing'  => $missing,
        ];
    }
}
