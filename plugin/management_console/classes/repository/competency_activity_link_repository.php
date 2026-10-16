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
 * Competency activity link repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

/**
 * Repository specializing in linking competencies with course module activities.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class competency_activity_link_repository {
    /**
     * Resuelve en lote los nombres de actividades por módulo e instancia para evitar N+1 queries.
     *
     * @param array $records Objetos que contienen propiedades modname e instance.
     * @return array Mapa asociativo [modname => [instance_id => name]]
     */
    public static function resolve_module_activity_names(array $records): array {
        global $DB;
        $instancesbymod = [];
        foreach ($records as $r) {
            if (!empty($r->modname) && !empty($r->instance)) {
                $instancesbymod[$r->modname][] = (int)$r->instance;
            }
        }

        $names = [];
        foreach ($instancesbymod as $modname => $instances) {
            $uniqueinstances = array_values(array_unique($instances));
            if (empty($uniqueinstances)) {
                continue;
            }
            try {
                [$insql, $inparams] = $DB->get_in_or_equal($uniqueinstances, SQL_PARAMS_NAMED, 'inst');
                $items = $DB->get_records_select_menu($modname, "id $insql", $inparams, '', 'id, name');
                if (!empty($items)) {
                    foreach ($items as $instid => $name) {
                        $names[$modname][$instid] = (string)$name;
                    }
                }
            } catch (\Exception $e) {
                debugging("AdminerApi batch module name error for $modname: " . $e->getMessage(), DEBUG_DEVELOPER);
            }
        }
        return $names;
    }

    /**
     * Obtiene las actividades disponibles en un curso para vincular a una competencia.
     *
     * @param int $courseid Course ID.
     * @param int $competencyid Competency ID.
     * @return array List of available course activities.
     */
    public static function get_course_available_activities(int $courseid, int $competencyid = 0): array {
        global $DB;

        $sql = "
            SELECT cm.id AS cmid, cm.course, m.name AS modname, cm.instance, cm.visible, cm.section
              FROM {course_modules} cm
              JOIN {modules} m ON m.id = cm.module
             WHERE cm.course = :courseid
          ORDER BY cm.section ASC, cm.id ASC
        ";
        $records = $DB->get_records_sql($sql, ['courseid' => $courseid]);

        $linkedcmids = [];
        if ($competencyid > 0) {
            $linked = $DB->get_records('competency_modulecomp', ['competencyid' => $competencyid], '', 'cmid, ruleoutcome, id');
            foreach ($linked as $l) {
                $linkedcmids[$l->cmid] = [
                    'id'          => (int)$l->id,
                    'ruleoutcome' => (int)$l->ruleoutcome,
                ];
            }
        }

        $activities = [];
        $activitynames = self::resolve_module_activity_names($records);
        foreach ($records as $r) {
            $name = $activitynames[$r->modname][$r->instance] ?? '';
            if (empty($name)) {
                $name = ucfirst($r->modname) . ' #' . $r->instance;
            }

            $islinked = isset($linkedcmids[$r->cmid]);
            $activities[] = [
                'cmid'        => (int)$r->cmid,
                'courseid'    => (int)$r->course,
                'modname'     => (string)$r->modname,
                'name'        => $name,
                'visible'     => (int)$r->visible,
                'section'     => (int)$r->section,
                'islinked'    => $islinked ? 1 : 0,
                'linkid'      => $islinked ? $linkedcmids[$r->cmid]['id'] : 0,
                'ruleoutcome' => $islinked ? $linkedcmids[$r->cmid]['ruleoutcome'] : 0,
            ];
        }

        return $activities;
    }

    /**
     * Acciones de vinculación entre competencias y módulos de actividad (add, remove, update_rule).
     *
     * @param string $action Action name (add, remove, update_rule).
     * @param int $competencyid Competency ID.
     * @param int $cmid Course module ID.
     * @param int $ruleoutcome Rule outcome value.
     * @param int $userid User ID performing action.
     * @return array Result array.
     */
    public static function module_competency_action(
        string $action,
        int $competencyid,
        int $cmid,
        int $ruleoutcome = 1,
        int $userid = 0
    ): array {
        global $DB;
        $competency = $DB->get_record('competency', ['id' => $competencyid], '*', MUST_EXIST);
        $cm = $DB->get_record('course_modules', ['id' => $cmid], '*', MUST_EXIST);
        $now = time();

        switch ($action) {
            case 'add':
                if (!$DB->record_exists('competency_modulecomp', ['competencyid' => $competency->id, 'cmid' => $cm->id])) {
                    $inserted = false;
                    if (class_exists('\core_competency\course_module_competency')) {
                        try {
                            $mc = new \core_competency\course_module_competency(0, (object)[
                                'cmid'         => $cm->id,
                                'competencyid' => $competency->id,
                                'ruleoutcome'  => $ruleoutcome,
                            ]);
                            $mc->create();
                            $inserted = true;
                        } catch (\Exception $e) {
                            debugging('Error creating module competency: ' . $e->getMessage(), DEBUG_DEVELOPER);
                            $inserted = false;
                        }
                    }

                    if (!$inserted) {
                        $maxsort = (int)$DB->count_records('competency_modulecomp', ['cmid' => $cm->id]);
                        $record = new \stdClass();
                        $record->cmid         = $cm->id;
                        $record->competencyid = $competency->id;
                        $record->ruleoutcome  = $ruleoutcome;
                        $record->sortorder    = $maxsort;
                        $record->timecreated  = $now;
                        $record->timemodified = $now;
                        $record->usermodified = !empty($userid) ? $userid : 2;

                        $DB->insert_record('competency_modulecomp', $record);
                    }
                }

                return [
                    'success'       => true,
                    'message'       => 'Actividad vinculada exitosamente a la competencia.',
                    'affectedcount' => 1,
                ];

            case 'remove':
                $deleted = false;
                if (class_exists('\core_competency\course_module_competency')) {
                    try {
                        $mc = \core_competency\course_module_competency::get_record([
                            'cmid'         => $cm->id,
                            'competencyid' => $competency->id,
                        ]);
                        if ($mc) {
                            $mc->delete();
                            $deleted = true;
                        }
                    } catch (\Exception $e) {
                        debugging('Error deleting module competency: ' . $e->getMessage(), DEBUG_DEVELOPER);
                        $deleted = false;
                    }
                }

                if (!$deleted) {
                    $DB->delete_records('competency_modulecomp', [
                        'competencyid' => $competency->id,
                        'cmid'         => $cm->id,
                    ]);
                }

                return [
                    'success'       => true,
                    'message'       => 'Actividad desvinculada de la competencia.',
                    'affectedcount' => 1,
                ];

            case 'update_rule':
                $updated = false;
                if (class_exists('\core_competency\course_module_competency')) {
                    try {
                        $mc = \core_competency\course_module_competency::get_record([
                            'cmid'         => $cm->id,
                            'competencyid' => $competency->id,
                        ]);
                        if ($mc) {
                            $mc->set('ruleoutcome', $ruleoutcome);
                            $mc->update();
                            $updated = true;
                        }
                    } catch (\Exception $e) {
                        debugging('Error updating module competency rule: ' . $e->getMessage(), DEBUG_DEVELOPER);
                        $updated = false;
                    }
                }

                if (!$updated) {
                    $DB->set_field('competency_modulecomp', 'ruleoutcome', $ruleoutcome, [
                        'competencyid' => $competency->id,
                        'cmid'         => $cm->id,
                    ]);
                }

                return [
                    'success'       => true,
                    'message'       => 'Regla de actividad actualizada exitosamente.',
                    'affectedcount' => 1,
                ];

            default:
                return ['success' => false, 'message' => 'Acción no reconocida: ' . $action, 'affectedcount' => 0];
        }
    }
}
