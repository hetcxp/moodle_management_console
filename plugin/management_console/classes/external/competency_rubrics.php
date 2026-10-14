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
     * Helper to verify view capabilities.
     *
     * @param \context $context
     * @return void
     * @throws \moodle_exception
     */
    protected static function check_view_capability($context): void {
        if (is_siteadmin()) {
            return;
        }
        if (
            has_capability('moodle/competency:competencymanage', $context) ||
            has_capability('moodle/competency:competencyview', $context)
        ) {
            return;
        }
        throw new \moodle_exception('nopermissions', 'error', '', 'view competencies');
    }

    /**
     * Helper to verify manage capabilities.
     *
     * @param \context $context
     * @return void
     * @throws \required_capability_exception
     */
    protected static function check_manage_capability($context): void {
        if (is_siteadmin()) {
            return;
        }
        require_capability('moodle/competency:competencymanage', $context);
    }

    /**
     * Describes the parameters for get_rubric_templates.
     *
     * @return external_function_parameters
     */
    public static function get_rubric_templates_parameters(): external_function_parameters {
        return new external_function_parameters([
            'search'  => new external_value(PARAM_RAW, 'Search query', VALUE_DEFAULT, ''),
            'page'    => new external_value(PARAM_INT, 'Page number', VALUE_DEFAULT, 0),
            'perpage' => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 50),
        ]);
    }

    /**
     * Get paginated rubric templates with search.
     *
     * @param string $search
     * @param int $page
     * @param int $perpage
     * @return array
     */
    public static function get_rubric_templates(string $search = '', int $page = 0, int $perpage = 50): array {
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

    /**
     * Describes the return structure for get_rubric_templates.
     *
     * @return external_single_structure
     */
    public static function get_rubric_templates_returns(): external_single_structure {
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

    /**
     * Describes the parameters for rubric_template_action.
     *
     * @return external_function_parameters
     */
    public static function rubric_template_action_parameters(): external_function_parameters {
        return new external_function_parameters([
            'action'      => new external_value(PARAM_ALPHA, 'Action: create, update or delete'),
            'templateid'  => new external_value(PARAM_INT, 'Template ID (for delete or update)', VALUE_DEFAULT, 0),
            'name'        => new external_value(PARAM_TEXT, 'Rubric name (for create or update)', VALUE_DEFAULT, ''),
            'description' => new external_value(PARAM_RAW, 'Rubric description (for create or update)', VALUE_DEFAULT, ''),
            'criteria'    => new external_value(PARAM_RAW, 'Criteria JSON (for create or update)', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Perform rubric template actions (create, update, delete).
     *
     * @param string $action
     * @param int $templateid
     * @param string $name
     * @param string $description
     * @param string $criteria
     * @return array
     */
    public static function rubric_template_action(
        string $action,
        int $templateid = 0,
        string $name = '',
        string $description = '',
        string $criteria = ''
    ): array {
        global $USER;
        $context = context_system::instance();
        self::validate_context($context);
        self::check_manage_capability($context);
        \tool_management_console\license_manager::require_active_license();

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

    /**
     * Describes the return structure for rubric_template_action.
     *
     * @return external_single_structure
     */
    public static function rubric_template_action_returns(): external_single_structure {
        return new external_single_structure([
            'success'    => new external_value(PARAM_INT, '1 on success'),
            'templateid' => new external_value(PARAM_INT, 'Affected template ID'),
        ]);
    }
}
