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
 * External service for competency rubrics in tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\external;

defined('MOODLE_INTERNAL') || die();

use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use tool_management_console\repository\rubric_repository;

/**
 * Competency rubrics external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class competency_rubrics extends external_api {

    /**
     * Helper para verificar permisos de visualización.
     */
    protected static function check_view_capability($context) {
        if (is_siteadmin()) {
            return;
        }
        if (has_capability('moodle/competency:competencymanage', $context) ||
            has_capability('moodle/competency:competencyview', $context)) {
            return;
        }
        throw new \moodle_exception('nopermissions', 'error', '', 'view competencies');
    }

    /**
     * Helper para verificar permisos de gestión.
     */
    protected static function check_manage_capability($context) {
        if (is_siteadmin()) {
            return;
        }
        require_capability('moodle/competency:competencymanage', $context);
    }

    // ==========================================
    // 1. GET RUBRIC TEMPLATES
    // ==========================================
    public static function get_rubric_templates_parameters() {
        return new external_function_parameters([
            'search'  => new external_value(PARAM_RAW, 'Search query', VALUE_DEFAULT, ''),
            'page'    => new external_value(PARAM_INT, 'Page number', VALUE_DEFAULT, 0),
            'perpage' => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 50),
        ]);
    }

    public static function get_rubric_templates($search = '', $page = 0, $perpage = 50) {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        $params = self::validate_parameters(self::get_rubric_templates_parameters(), [
            'search'  => $search,
            'page'    => $page,
            'perpage' => $perpage,
        ]);

        return rubric_repository::get_templates(
            (string)$params['search'],
            (int)$params['page'],
            (int)$params['perpage']
        );
    }

    public static function get_rubric_templates_returns() {
        return new external_single_structure([
            'total'     => new external_value(PARAM_INT, 'Total count of rubric templates'),
            'templates' => new external_multiple_structure(
                new external_single_structure([
                    'id'                => new external_value(PARAM_INT, 'Template definition ID'),
                    'areaid'            => new external_value(PARAM_INT, 'Grading area ID'),
                    'name'              => new external_value(PARAM_TEXT, 'Rubric name'),
                    'description'       => new external_value(PARAM_RAW, 'Rubric description'),
                    'descriptionformat' => new external_value(PARAM_INT, 'Description format'),
                    'status'            => new external_value(PARAM_INT, 'Definition status'),
                    'criteria_count'    => new external_value(PARAM_INT, 'Number of criteria'),
                    'max_score'         => new external_value(PARAM_FLOAT, 'Calculated max score'),
                    'author_name'       => new external_value(PARAM_TEXT, 'Author user name'),
                    'timecreated'       => new external_value(PARAM_INT, 'Creation timestamp'),
                    'timemodified'      => new external_value(PARAM_INT, 'Modified timestamp'),
                    'criteria'          => new external_multiple_structure(
                        new external_single_structure([
                            'id'                => new external_value(PARAM_INT, 'Criterion ID'),
                            'sortorder'         => new external_value(PARAM_INT, 'Criterion sort order'),
                            'description'       => new external_value(PARAM_RAW, 'Criterion description'),
                            'descriptionformat' => new external_value(PARAM_INT, 'Criterion description format'),
                            'levels'            => new external_multiple_structure(
                                new external_single_structure([
                                    'id'                => new external_value(PARAM_INT, 'Level ID'),
                                    'score'             => new external_value(PARAM_FLOAT, 'Level score points'),
                                    'definition'        => new external_value(PARAM_RAW, 'Level description text'),
                                    'definitionformat'  => new external_value(PARAM_INT, 'Level definition format'),
                                ])
                            ),
                        ])
                    ),
                ])
            ),
        ]);
    }

    // ==========================================
    // 2. RUBRIC TEMPLATE ACTION (CREATE / UPDATE / DELETE)
    // ==========================================
    public static function rubric_template_action_parameters() {
        return new external_function_parameters([
            'action'      => new external_value(PARAM_ALPHA, 'Action: create, update or delete'),
            'templateid'  => new external_value(PARAM_INT, 'Template ID (for delete or update)', VALUE_DEFAULT, 0),
            'name'        => new external_value(PARAM_TEXT, 'Rubric name (for create or update)', VALUE_DEFAULT, ''),
            'description' => new external_value(PARAM_RAW, 'Rubric description (for create or update)', VALUE_DEFAULT, ''),
            'criteria'    => new external_value(PARAM_RAW, 'Criteria JSON (for create or update)', VALUE_DEFAULT, ''),
        ]);
    }

    public static function rubric_template_action($action, $templateid = 0, $name = '', $description = '', $criteria = '') {
        global $USER;
        $context = context_system::instance();
        self::validate_context($context);
        self::check_manage_capability($context);

        $params = self::validate_parameters(self::rubric_template_action_parameters(), [
            'action'      => $action,
            'templateid'  => $templateid,
            'name'        => $name,
            'description' => $description,
            'criteria'    => $criteria,
        ]);

        return rubric_repository::rubric_action(
            (string)$params['action'],
            (int)$params['templateid'],
            (string)$params['name'],
            (string)$params['description'],
            (string)$params['criteria'],
            !empty($USER->id) ? (int)$USER->id : 0
        );
    }

    public static function rubric_template_action_returns() {
        return new external_single_structure([
            'success'    => new external_value(PARAM_INT, '1 on success'),
            'templateid' => new external_value(PARAM_INT, 'Affected template ID'),
        ]);
    }
}
