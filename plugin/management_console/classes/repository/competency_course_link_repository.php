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
 * Competency course link repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

/**
 * Repository specializing in linking competencies with courses.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class competency_course_link_repository {
    /**
     * Resuelve los IDs de cursos asociados directa e indirectamente a una competencia.
     *
     * @param int $competencyid Competency ID.
     * @param int $courseid Course ID.
     * @return array [$allcourseids, $relevantcourseids, $childids]
     */
    public static function resolve_competency_course_ids(int $competencyid, int $courseid = 0): array {
        global $DB;
        $directcourseids = $DB->get_fieldset_select(
            'competency_coursecomp',
            'DISTINCT courseid',
            'competencyid = :cid',
            ['cid' => $competencyid]
        ) ?: [];
        $childids = $DB->get_fieldset_select('competency', 'id', 'parentid = :cid', ['cid' => $competencyid]) ?: [];
        $subcourseids = [];
        if (!empty($childids)) {
            [$chsql, $chparams] = $DB->get_in_or_equal($childids, SQL_PARAMS_NAMED, 'ch');
            $subcourseids = $DB->get_fieldset_select(
                'competency_coursecomp',
                'DISTINCT courseid',
                "competencyid $chsql",
                $chparams
            ) ?: [];
        }
        $allcourseids = array_values(array_unique(array_merge($directcourseids, $subcourseids)));
        $relevantcourseids = ($courseid > 0)
            ? (in_array($courseid, $allcourseids) ? [$courseid] : [$courseid])
            : $allcourseids;

        return [$allcourseids, $relevantcourseids, $childids];
    }

    /**
     * Devuelve los cursos vinculados directamente a una competencia, incluyendo actividades mapeadas.
     *
     * @param int $competencyid Competency ID.
     * @return array List of courses.
     */
    public static function get_competency_courses(int $competencyid): array {
        global $DB;

        $sql = "
            SELECT cc.id, c.id AS courseid, c.fullname, c.shortname, c.idnumber, c.visible, c.category,
                   COALESCE(cat.name, '') AS categoryname,
                   cc.ruleoutcome, cc.sortorder, cc.timecreated
              FROM {competency_coursecomp} cc
              JOIN {course} c ON c.id = cc.courseid
         LEFT JOIN {course_categories} cat ON cat.id = c.category
             WHERE cc.competencyid = :competencyid
          ORDER BY cc.sortorder ASC, c.fullname ASC
        ";

        $records = $DB->get_records_sql($sql, ['competencyid' => $competencyid]);

        // Obtener actividades asociadas a la competencia en mdl_competency_modulecomp.
        $sqlmodules = "
            SELECT mc.id, mc.cmid, mc.ruleoutcome, mc.sortorder, mc.timecreated,
                   cm.course AS courseid, cm.module AS moduleid, m.name AS modname, cm.instance
              FROM {competency_modulecomp} mc
              JOIN {course_modules} cm ON cm.id = mc.cmid
              JOIN {modules} m ON m.id = cm.module
             WHERE mc.competencyid = :competencyid
          ORDER BY mc.sortorder ASC, mc.id ASC
        ";
        $modulerecords = $DB->get_records_sql($sqlmodules, ['competencyid' => $competencyid]);

        $modulesbycourse = [];
        $activitynames = competency_activity_link_repository::resolve_module_activity_names($modulerecords);
        foreach ($modulerecords as $mr) {
            $activityname = $activitynames[$mr->modname][$mr->instance] ?? '';
            if (empty($activityname)) {
                $activityname = ucfirst($mr->modname) . ' #' . $mr->instance;
            }

            $modulesbycourse[$mr->courseid][] = [
                'id'          => (int)$mr->id,
                'cmid'        => (int)$mr->cmid,
                'modname'     => (string)$mr->modname,
                'name'        => $activityname,
                'ruleoutcome' => (int)$mr->ruleoutcome,
                'sortorder'   => (int)$mr->sortorder,
                'timecreated' => (int)$mr->timecreated,
            ];
        }

        $courses = [];
        foreach ($records as $r) {
            $courses[] = [
                'id'           => (int)$r->courseid,
                'fullname'     => (string)$r->fullname,
                'shortname'    => (string)$r->shortname,
                'idnumber'     => (string)($r->idnumber ?? ''),
                'visible'      => (int)$r->visible,
                'category'     => (int)$r->category,
                'categoryname' => (string)($r->categoryname ?? ''),
                'ruleoutcome'  => (int)$r->ruleoutcome,
                'sortorder'    => (int)$r->sortorder,
                'timecreated'  => (int)$r->timecreated,
                'activities'   => $modulesbycourse[$r->courseid] ?? [],
            ];
        }

        return $courses;
    }

    /**
     * Devuelve los cursos y actividades vinculados a cada subcompetencia hija de una competencia principal.
     *
     * @param int $competencyid Competency ID.
     * @return array List of subcompetencies and their courses.
     */
    public static function get_subcompetencies_courses(int $competencyid): array {
        global $DB;

        // 1. Obtener subcompetencias hijas directas.
        $sqlchildren = "
            SELECT c.id, c.shortname, c.idnumber, c.description, c.parentid, c.sortorder
              FROM {competency} c
             WHERE c.parentid = :competencyid
          ORDER BY c.sortorder ASC, c.shortname ASC
        ";
        $children = $DB->get_records_sql($sqlchildren, ['competencyid' => $competencyid]);
        if (empty($children)) {
            return [];
        }

        $subcompids = array_map('intval', array_keys($children));
        [$insql, $params] = $DB->get_in_or_equal($subcompids, SQL_PARAMS_NAMED, 'sc');

        // 2. Obtener todos los cursos vinculados a cualquiera de las subcompetencias.
        $sqlcourses = "
            SELECT cc.id AS linkid, cc.competencyid, c.id AS courseid, c.fullname, c.shortname, c.idnumber, c.visible, c.category,
                   COALESCE(cat.name, '') AS categoryname,
                   cc.ruleoutcome, cc.sortorder, cc.timecreated
              FROM {competency_coursecomp} cc
              JOIN {course} c ON c.id = cc.courseid
         LEFT JOIN {course_categories} cat ON cat.id = c.category
             WHERE cc.competencyid $insql
          ORDER BY cc.sortorder ASC, c.fullname ASC
        ";
        $courserecords = $DB->get_records_sql($sqlcourses, $params);

        // 3. Obtener actividades asociadas a cualquiera de las subcompetencias.
        $sqlmodules = "
            SELECT mc.id, mc.competencyid, mc.cmid, mc.ruleoutcome, mc.sortorder, mc.timecreated,
                   cm.course AS courseid, cm.module AS moduleid, m.name AS modname, cm.instance
              FROM {competency_modulecomp} mc
              JOIN {course_modules} cm ON cm.id = mc.cmid
              JOIN {modules} m ON m.id = cm.module
             WHERE mc.competencyid $insql
          ORDER BY mc.sortorder ASC, mc.id ASC
        ";
        $modulerecords = $DB->get_records_sql($sqlmodules, $params);

        $modulesbysubcompcourse = [];
        $activitynames = competency_activity_link_repository::resolve_module_activity_names($modulerecords);
        foreach ($modulerecords as $mr) {
            $activityname = $activitynames[$mr->modname][$mr->instance] ?? '';
            if (empty($activityname)) {
                $activityname = ucfirst($mr->modname) . ' #' . $mr->instance;
            }

            $modulesbysubcompcourse[$mr->competencyid][$mr->courseid][] = [
                'id'          => (int)$mr->id,
                'cmid'        => (int)$mr->cmid,
                'modname'     => (string)$mr->modname,
                'name'        => $activityname,
                'ruleoutcome' => (int)$mr->ruleoutcome,
                'sortorder'   => (int)$mr->sortorder,
                'timecreated' => (int)$mr->timecreated,
            ];
        }

        $coursesbysubcomp = [];
        foreach ($courserecords as $cr) {
            $coursesbysubcomp[$cr->competencyid][] = [
                'id'           => (int)$cr->courseid,
                'fullname'     => (string)$cr->fullname,
                'shortname'    => (string)$cr->shortname,
                'idnumber'     => (string)($cr->idnumber ?? ''),
                'visible'      => (int)$cr->visible,
                'category'     => (int)$cr->category,
                'categoryname' => (string)($cr->categoryname ?? ''),
                'ruleoutcome'  => (int)$cr->ruleoutcome,
                'sortorder'    => (int)$cr->sortorder,
                'timecreated'  => (int)$cr->timecreated,
                'activities'   => $modulesbysubcompcourse[$cr->competencyid][$cr->courseid] ?? [],
            ];
        }

        $subcompetencycourses = [];
        foreach ($children as $child) {
            $subcompetencycourses[] = [
                'competencyid'       => (int)$child->id,
                'competencyname'     => (string)$child->shortname,
                'competencyidnumber' => (string)($child->idnumber ?? ''),
                'courses'            => $coursesbysubcomp[$child->id] ?? [],
            ];
        }

        return $subcompetencycourses;
    }

    /**
     * Acciones de vinculación entre competencias y cursos (add, remove, update_rule).
     *
     * @param string $action Action name (add, remove, update_rule).
     * @param int $competencyid Competency ID.
     * @param array $courseids Array of course IDs.
     * @param int $ruleoutcome Rule outcome value.
     * @param int $userid User ID performing action.
     * @return array Result array.
     */
    public static function competency_course_action(
        string $action,
        int $competencyid,
        array $courseids,
        int $ruleoutcome = 1,
        int $userid = 0
    ): array {
        global $DB;
        $competency = $DB->get_record('competency', ['id' => $competencyid], '*', MUST_EXIST);
        $now = time();
        $affected = 0;

        switch ($action) {
            case 'add':
                foreach ($courseids as $cid) {
                    $cid = (int)$cid;
                    if ($cid <= 0 || (defined('SITEID') && $cid == SITEID)) {
                        continue;
                    }
                    if (!$DB->record_exists('course', ['id' => $cid])) {
                        continue;
                    }
                    if (!$DB->record_exists('competency_coursecomp', ['competencyid' => $competency->id, 'courseid' => $cid])) {
                        $inserted = false;
                        if (class_exists('\core_competency\course_competency')) {
                            try {
                                $cc = new \core_competency\course_competency(0, (object)[
                                    'courseid'     => $cid,
                                    'competencyid' => $competency->id,
                                    'ruleoutcome'  => $ruleoutcome,
                                ]);
                                $cc->create();
                                $inserted = true;
                                $affected++;
                            } catch (\Exception $e) {
                                debugging('Course competency creation error: ' . $e->getMessage(), DEBUG_DEVELOPER);
                                $inserted = false;
                            }
                        }

                        if (!$inserted) {
                            $maxsort = (int)$DB->count_records('competency_coursecomp', ['courseid' => $cid]);
                            $record = new \stdClass();
                            $record->courseid     = $cid;
                            $record->competencyid = $competency->id;
                            $record->ruleoutcome  = $ruleoutcome;
                            $record->sortorder    = $maxsort;
                            $record->timecreated  = $now;
                            $record->timemodified = $now;
                            $record->usermodified = !empty($userid) ? $userid : 2;

                            $DB->insert_record('competency_coursecomp', $record);
                            $affected++;
                        }
                    }
                }

                return [
                    'success'       => true,
                    'message'       => "Se vincularon {$affected} curso(s) a la competencia.",
                    'affectedcount' => $affected,
                ];

            case 'remove':
                foreach ($courseids as $cid) {
                    $cid = (int)$cid;
                    if ($cid <= 0) {
                        continue;
                    }

                    // Limpiar vínculos en actividades del curso (mdl_competency_modulecomp).
                    try {
                        $cmids = $DB->get_fieldset_select('course_modules', 'id', 'course = :cid', ['cid' => $cid]);
                        if (!empty($cmids)) {
                            [$insql, $inparams] = $DB->get_in_or_equal($cmids, SQL_PARAMS_NAMED, 'cm');
                            $inparams['compid'] = $competency->id;
                            $DB->delete_records_select(
                                'competency_modulecomp',
                                "competencyid = :compid AND cmid $insql",
                                $inparams
                            );
                        }
                    } catch (\Exception $e) {
                        debugging('Error cleaning module competency records: ' . $e->getMessage(), DEBUG_DEVELOPER);
                    }

                    $deleted = false;
                    if (class_exists('\core_competency\course_competency')) {
                        try {
                            $cc = \core_competency\course_competency::get_record([
                                'courseid'     => $cid,
                                'competencyid' => $competency->id,
                            ]);
                            if ($cc) {
                                $cc->delete();
                                $deleted = true;
                                $affected++;
                            }
                        } catch (\Exception $e) {
                            debugging('Error deleting course competency: ' . $e->getMessage(), DEBUG_DEVELOPER);
                            $deleted = false;
                        }
                    }
                    if (!$deleted) {
                        $DB->delete_records('competency_coursecomp', [
                            'competencyid' => $competency->id,
                            'courseid'     => $cid,
                        ]);
                        $affected++;
                    }
                }

                return [
                    'success'       => true,
                    'message'       => "Se desvincularon {$affected} curso(s) de la competencia.",
                    'affectedcount' => $affected,
                ];

            case 'update_rule':
                foreach ($courseids as $cid) {
                    $cid = (int)$cid;
                    if ($cid <= 0) {
                        continue;
                    }
                    $updated = false;
                    if (class_exists('\core_competency\course_competency')) {
                        try {
                            $cc = \core_competency\course_competency::get_record([
                                'courseid'     => $cid,
                                'competencyid' => $competency->id,
                            ]);
                            if ($cc) {
                                $cc->set('ruleoutcome', $ruleoutcome);
                                $cc->update();
                                $updated = true;
                                $affected++;
                            }
                        } catch (\Exception $e) {
                            debugging('Error updating course competency rule: ' . $e->getMessage(), DEBUG_DEVELOPER);
                            $updated = false;
                        }
                    }
                    if (!$updated) {
                        $DB->set_field('competency_coursecomp', 'ruleoutcome', $ruleoutcome, [
                            'competencyid' => $competency->id,
                            'courseid'     => $cid,
                        ]);
                        $affected++;
                    }
                }

                return [
                    'success'       => true,
                    'message'       => "Regla de finalización del curso actualizada correctamente.",
                    'affectedcount' => $affected,
                ];

            default:
                return ['success' => false, 'message' => 'Acción no reconocida: ' . $action, 'affectedcount' => 0];
        }
    }
}
