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
 * Rubric repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

defined('MOODLE_INTERNAL') || die();

use context_system;
use core_text;
use grading_manager;
use gradingform_controller;
use gradingform_rubric_controller;
use moodle_exception;
use stdClass;

/**
 * Repository class for managing site-wide shared rubric templates.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class rubric_repository {

    /**
     * Get paginated rubric templates with criteria and levels.
     *
     * @param string $search Search query
     * @param int $page Page offset
     * @param int $perpage Number of items per page
     * @return array Array with total and templates list
     */
    public static function get_templates(string $search = '', int $page = 0, int $perpage = 50): array {
        global $DB;

        $syscontext = context_system::instance();
        $params = [
            'contextid' => $syscontext->id,
            'method'    => 'rubric',
            'component' => 'core_grading',
        ];

        $where = "gd.method = :method AND ga.component = :component AND ga.contextid = :contextid";

        if (!empty($search)) {
            $tokens = preg_split('/\s+/', trim($search));
            $searchconditions = [];
            $i = 0;
            foreach ($tokens as $token) {
                if (empty($token)) {
                    continue;
                }
                $pname1 = 'token_n_' . $i;
                $pname2 = 'token_d_' . $i++;
                $escaped = '%' . $DB->sql_like_escape(core_text::strtolower($token)) . '%';
                $params[$pname1] = $escaped;
                $params[$pname2] = $escaped;
                $searchconditions[] = "(" . $DB->sql_like('LOWER(gd.name)', ':' . $pname1, false) .
                    " OR " . $DB->sql_like('LOWER(gd.description)', ':' . $pname2, false) . ")";
            }
            if (!empty($searchconditions)) {
                $where .= " AND " . implode(' AND ', $searchconditions);
            }
        }

        $countsql = "SELECT COUNT(gd.id)
                       FROM {grading_definitions} gd
                       JOIN {grading_areas} ga ON gd.areaid = ga.id
                      WHERE $where";
        $total = (int)$DB->count_records_sql($countsql, $params);

        $fromandwhere = "FROM {grading_definitions} gd
                         JOIN {grading_areas} ga ON gd.areaid = ga.id
                    LEFT JOIN {user} u ON gd.usercreated = u.id
                        WHERE $where
                     ORDER BY gd.timemodified DESC, gd.name ASC";

        $fields = "gd.id, gd.areaid, gd.name, gd.description, gd.descriptionformat,
                   gd.status, gd.copiedfromid, gd.timecreated, gd.timemodified,
                   gd.usercreated, gd.usermodified,
                   u.firstname, u.lastname";

        $records = $DB->get_records_sql("SELECT $fields $fromandwhere", $params, $page * $perpage, $perpage);

        $templates = [];
        if (!empty($records)) {
            $defids = array_keys($records);
            list($insql, $inparams) = $DB->get_in_or_equal($defids, SQL_PARAMS_NAMED);

            // Fetch criteria for all selected definitions in batch.
            $criteriasql = "SELECT c.id, c.definitionid, c.sortorder, c.description, c.descriptionformat
                              FROM {gradingform_rubric_criteria} c
                             WHERE c.definitionid $insql
                          ORDER BY c.definitionid ASC, c.sortorder ASC";
            $criteriarecords = $DB->get_records_sql($criteriasql, $inparams);

            // Fetch levels for all criteria.
            $levelsbycriteria = [];
            if (!empty($criteriarecords)) {
                $critids = array_keys($criteriarecords);
                list($critinsql, $critinparams) = $DB->get_in_or_equal($critids, SQL_PARAMS_NAMED);
                $levelssql = "SELECT l.id, l.criterionid, l.score, l.definition, l.definitionformat
                                FROM {gradingform_rubric_levels} l
                               WHERE l.criterionid $critinsql
                            ORDER BY l.criterionid ASC, l.score ASC";
                $levelrecords = $DB->get_records_sql($levelssql, $critinparams);
                foreach ($levelrecords as $lvl) {
                    $levelsbycriteria[$lvl->criterionid][] = [
                        'id'               => (int)$lvl->id,
                        'score'            => (float)$lvl->score,
                        'definition'       => (string)$lvl->definition,
                        'definitionformat' => (int)$lvl->definitionformat,
                    ];
                }
            }

            // Group criteria by definition.
            $criteriabydef = [];
            foreach ($criteriarecords as $crit) {
                $critlevels = $levelsbycriteria[$crit->id] ?? [];
                $criteriabydef[$crit->definitionid][] = [
                    'id'                => (int)$crit->id,
                    'sortorder'         => (int)$crit->sortorder,
                    'description'       => (string)$crit->description,
                    'descriptionformat' => (int)$crit->descriptionformat,
                    'levels'            => $critlevels,
                ];
            }

            foreach ($records as $row) {
                $critlist = $criteriabydef[$row->id] ?? [];
                $maxscore = 0.0;
                foreach ($critlist as $crit) {
                    $critmax = 0.0;
                    foreach ($crit['levels'] as $lvl) {
                        if ($lvl['score'] > $critmax) {
                            $critmax = (float)$lvl['score'];
                        }
                    }
                    $maxscore += $critmax;
                }

                $author = 'Moodle';
                if (!empty($row->firstname) || !empty($row->lastname)) {
                    $author = trim($row->firstname . ' ' . $row->lastname);
                }

                $templates[] = [
                    'id'                => (int)$row->id,
                    'areaid'            => (int)$row->areaid,
                    'name'              => (string)$row->name,
                    'description'       => (string)$row->description,
                    'descriptionformat' => (int)$row->descriptionformat,
                    'status'            => (int)$row->status,
                    'criteria_count'    => count($critlist),
                    'max_score'         => (float)$maxscore,
                    'author_name'       => $author,
                    'timecreated'       => (int)$row->timecreated,
                    'timemodified'      => (int)$row->timemodified,
                    'criteria'          => $critlist,
                ];
            }
        }

        return [
            'total'     => $total,
            'templates' => $templates,
        ];
    }

    /**
     * Execute actions on rubric templates (create, delete).
     *
     * @param string $action Action name: 'create' or 'delete'
     * @param int $templateid Template definition ID (for delete)
     * @param string $name Rubric name (for create)
     * @param string $description Rubric description (for create)
     * @param string $criteria_json JSON string with criteria and levels
     * @param int $userid Current user ID
     * @return array Result array with success and templateid
     */
    public static function rubric_action(
        string $action,
        int $templateid = 0,
        string $name = '',
        string $description = '',
        string $criteria_json = '',
        int $userid = 0
    ): array {
        global $CFG, $DB;

        require_once($CFG->dirroot . '/grade/grading/lib.php');
        require_once($CFG->dirroot . '/grade/grading/form/rubric/lib.php');

        if ($action === 'delete') {
            if ($templateid <= 0) {
                throw new moodle_exception('invalidrecord', 'error', '', 'ID de plantilla no proporcionado');
            }

            $sql = "SELECT gd.*, ga.contextid, ga.component
                      FROM {grading_definitions} gd
                      JOIN {grading_areas} ga ON gd.areaid = ga.id
                     WHERE gd.id = :id AND gd.method = 'rubric'";
            $record = $DB->get_record_sql($sql, ['id' => $templateid]);

            if (!$record) {
                throw new moodle_exception('invalidrecord', 'error', '', 'Plantilla de rúbrica no encontrada');
            }

            if ($record->component !== 'core_grading') {
                throw new moodle_exception('nopermissions', 'error', '', 'Solo se permite eliminar plantillas del banco del sitio');
            }

            $manager = get_grading_manager($record->areaid);
            $controller = $manager->get_controller('rubric');
            $controller->delete_definition();

            // Clean up the shared area record.
            $DB->delete_records('grading_areas', ['id' => $record->areaid]);

            return [
                'success'    => 1,
                'templateid' => $templateid,
            ];
        }

        if ($action === 'create') {
            $name = trim($name);
            if (empty($name)) {
                throw new moodle_exception('invalidparameter', 'error', '', 'El nombre de la rúbrica es obligatorio');
            }

            $parsed_criteria = [];
            if (!empty($criteria_json)) {
                $decoded = json_decode($criteria_json, true);
                if (is_array($decoded)) {
                    $parsed_criteria = $decoded;
                }
            }

            if (empty($parsed_criteria)) {
                throw new moodle_exception('invalidparameter', 'error', '', 'La rúbrica debe contener al menos un criterio de evaluación');
            }

            $syscontext = context_system::instance();
            $manager = get_grading_manager($syscontext, 'core_grading', 'shared_rubric_builder');
            $newareaid = $manager->create_shared_area('rubric');

            $targetmanager = get_grading_manager($newareaid);
            $targetcontroller = $targetmanager->get_controller('rubric');

            $criteria_data = self::format_criteria_data($parsed_criteria, false);

            $newdef = new stdClass();
            $newdef->name = $name;
            $newdef->description = $description;
            $newdef->description_editor = [
                'text'   => $description,
                'format' => FORMAT_HTML,
            ];
            $newdef->status = gradingform_controller::DEFINITION_STATUS_READY;
            $newdef->rubric = [
                'options'  => gradingform_rubric_controller::get_default_options(),
                'criteria' => $criteria_data,
            ];

            $targetcontroller->update_definition($newdef, $userid > 0 ? $userid : null);
            $createddef = $targetcontroller->get_definition();

            return [
                'success'    => 1,
                'templateid' => (int)$createddef->id,
            ];
        }

        if ($action === 'update') {
            if ($templateid <= 0) {
                throw new moodle_exception('invalidrecord', 'error', '', 'ID de plantilla no proporcionado');
            }

            $sql = "SELECT gd.*, ga.contextid, ga.component
                      FROM {grading_definitions} gd
                      JOIN {grading_areas} ga ON gd.areaid = ga.id
                     WHERE gd.id = :id AND gd.method = 'rubric'";
            $record = $DB->get_record_sql($sql, ['id' => $templateid]);

            if (!$record) {
                throw new moodle_exception('invalidrecord', 'error', '', 'Plantilla de rúbrica no encontrada');
            }

            if ($record->component !== 'core_grading') {
                throw new moodle_exception('nopermissions', 'error', '', 'Solo se permite modificar plantillas del banco del sitio');
            }

            $name = trim($name);
            if (empty($name)) {
                throw new moodle_exception('invalidparameter', 'error', '', 'El nombre de la rúbrica es obligatorio');
            }

            $parsed_criteria = [];
            if (!empty($criteria_json)) {
                $decoded = json_decode($criteria_json, true);
                if (is_array($decoded)) {
                    $parsed_criteria = $decoded;
                }
            }

            if (empty($parsed_criteria)) {
                throw new moodle_exception('invalidparameter', 'error', '', 'La rúbrica debe contener al menos un criterio de evaluación');
            }

            $manager = get_grading_manager($record->areaid);
            $controller = $manager->get_controller('rubric');

            $criteria_data = self::format_criteria_data($parsed_criteria, true);

            $def = new stdClass();
            $def->name = $name;
            $def->description = $description;
            $def->description_editor = [
                'text'   => $description,
                'format' => FORMAT_HTML,
            ];
            $def->status = gradingform_controller::DEFINITION_STATUS_READY;
            $def->rubric = [
                'options'  => gradingform_rubric_controller::get_default_options(),
                'criteria' => $criteria_data,
            ];

            $controller->update_definition($def, $userid > 0 ? $userid : null);

            return [
                'success'    => 1,
                'templateid' => $templateid,
            ];
        }

        throw new moodle_exception('invalidaction', 'error', '', 'Acción no reconocida: ' . s($action));
    }

    /**
     * Format criteria and levels for gradingform_rubric_controller.
     *
     * @param array $parsed_criteria Array of criteria with levels
     * @param bool $preserve_existing_ids Whether to keep existing numeric IDs
     * @return array
     */
    private static function format_criteria_data(array $parsed_criteria, bool $preserve_existing_ids = false): array {
        $criteria_data = [];
        $critindex = 1;
        foreach ($parsed_criteria as $crit) {
            $is_existing_crit = $preserve_existing_ids && !empty($crit['id']) && is_numeric($crit['id']) && (int)$crit['id'] > 0;
            $crit_key = $is_existing_crit ? (int)$crit['id'] : ('NEWID' . $critindex++);
            $levels_data = [];
            $lvlindex = 1;

            $rawlevels = $crit['levels'] ?? [];
            if (empty($rawlevels)) {
                $rawlevels = [
                    ['score' => 0, 'definition' => 'No cumple'],
                    ['score' => 10, 'definition' => 'Cumple']
                ];
            }

            foreach ($rawlevels as $lvl) {
                $is_existing_lvl = $preserve_existing_ids && !empty($lvl['id']) && is_numeric($lvl['id']) && (int)$lvl['id'] > 0;
                $lvl_key = $is_existing_lvl ? (int)$lvl['id'] : ('NEWID' . ($critindex * 100 + $lvlindex++));
                $levels_data[$lvl_key] = [
                    'score'            => (float)($lvl['score'] ?? 0),
                    'definition'       => (string)($lvl['definition'] ?? ''),
                    'definitionformat' => FORMAT_HTML,
                ];
            }

            $criteria_data[$crit_key] = [
                'sortorder'         => (int)($crit['sortorder'] ?? ($critindex - 1)),
                'description'       => (string)($crit['description'] ?? ''),
                'descriptionformat' => FORMAT_HTML,
                'levels'            => $levels_data,
            ];
        }
        return $criteria_data;
    }
}
