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
 * External service for competency courses and module links in tool_management_console.
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
use tool_management_console\repository\competency_repository;

/**
 * Competency courses external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class competency_courses extends external_api {
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
     * Describes the parameters for get_competency_courses.
     *
     * @return external_function_parameters
     */
    public static function get_competency_courses_parameters(): external_function_parameters {
        return new external_function_parameters([
            'competencyid'           => new external_value(PARAM_INT, 'Competency ID'),
            'includesubcompetencies' => new external_value(
                PARAM_BOOL,
                'Include courses from child subcompetencies',
                VALUE_DEFAULT,
                true
            ),
        ]);
    }

    /**
     * Get courses and activities linked to a competency.
     *
     * @param int $competencyid
     * @param bool $includesubcompetencies
     * @return array
     */
    public static function get_competency_courses(int $competencyid, bool $includesubcompetencies = true): array {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        $params = self::validate_parameters(self::get_competency_courses_parameters(), [
            'competencyid'           => $competencyid,
            'includesubcompetencies' => $includesubcompetencies,
        ]);

        $courses = competency_repository::get_competency_courses($params['competencyid']);
        $subcompetencycourses = [];
        if (!empty($params['includesubcompetencies'])) {
            $subcompetencycourses = competency_repository::get_subcompetencies_courses($params['competencyid']);
        }

        return [
            'courses'              => $courses,
            'subcompetencycourses' => $subcompetencycourses,
        ];
    }

    /**
     * Describes the return structure for get_competency_courses.
     *
     * @return external_single_structure
     */
    public static function get_competency_courses_returns(): external_single_structure {
        return new external_single_structure([
            'courses' => new external_multiple_structure(
                new external_single_structure([
                    'id'           => new external_value(PARAM_INT, 'Course ID'),
                    'fullname'     => new external_value(PARAM_TEXT, 'Course full name'),
                    'shortname'    => new external_value(PARAM_TEXT, 'Course short name'),
                    'idnumber'     => new external_value(PARAM_RAW, 'Course ID number'),
                    'visible'      => new external_value(PARAM_INT, 'Course visibility'),
                    'category'     => new external_value(PARAM_INT, 'Category ID'),
                    'categoryname' => new external_value(PARAM_TEXT, 'Category name'),
                    'ruleoutcome'  => new external_value(PARAM_INT, 'Rule outcome on completion'),
                    'sortorder'    => new external_value(PARAM_INT, 'Sort order in course'),
                    'timecreated'  => new external_value(PARAM_INT, 'Linked time timestamp'),
                    'activities'   => new external_multiple_structure(
                        new external_single_structure([
                            'id'          => new external_value(PARAM_INT, 'Module competency ID'),
                            'cmid'        => new external_value(PARAM_INT, 'Course module ID'),
                            'modname'     => new external_value(PARAM_TEXT, 'Module type name'),
                            'name'        => new external_value(PARAM_TEXT, 'Activity title'),
                            'ruleoutcome' => new external_value(PARAM_INT, 'Rule outcome on activity completion'),
                            'sortorder'   => new external_value(PARAM_INT, 'Sort order'),
                            'timecreated' => new external_value(PARAM_INT, 'Linked timestamp'),
                        ]),
                        'Linked activities within this course',
                        VALUE_DEFAULT,
                        []
                    ),
                ])
            ),
            'subcompetencycourses' => new external_multiple_structure(
                new external_single_structure([
                    'competencyid'       => new external_value(PARAM_INT, 'Subcompetency ID'),
                    'competencyname'     => new external_value(PARAM_TEXT, 'Subcompetency name'),
                    'competencyidnumber' => new external_value(PARAM_RAW, 'Subcompetency ID number'),
                    'courses'            => new external_multiple_structure(
                        new external_single_structure([
                            'id'           => new external_value(PARAM_INT, 'Course ID'),
                            'fullname'     => new external_value(PARAM_TEXT, 'Course full name'),
                            'shortname'    => new external_value(PARAM_TEXT, 'Course short name'),
                            'idnumber'     => new external_value(PARAM_RAW, 'Course ID number'),
                            'visible'      => new external_value(PARAM_INT, 'Course visibility'),
                            'category'     => new external_value(PARAM_INT, 'Category ID'),
                            'categoryname' => new external_value(PARAM_TEXT, 'Category name'),
                            'ruleoutcome'  => new external_value(PARAM_INT, 'Rule outcome on completion'),
                            'sortorder'    => new external_value(PARAM_INT, 'Sort order in course'),
                            'timecreated'  => new external_value(PARAM_INT, 'Linked time timestamp'),
                            'activities'   => new external_multiple_structure(
                                new external_single_structure([
                                    'id'          => new external_value(PARAM_INT, 'Module competency ID'),
                                    'cmid'        => new external_value(PARAM_INT, 'Course module ID'),
                                    'modname'     => new external_value(PARAM_TEXT, 'Module type name'),
                                    'name'        => new external_value(PARAM_TEXT, 'Activity title'),
                                    'ruleoutcome' => new external_value(PARAM_INT, 'Rule outcome on activity completion'),
                                    'sortorder'   => new external_value(PARAM_INT, 'Sort order'),
                                    'timecreated' => new external_value(PARAM_INT, 'Linked timestamp'),
                                ]),
                                'Linked activities within this course',
                                VALUE_DEFAULT,
                                []
                            ),
                        ]),
                        'Courses linked to this subcompetency',
                        VALUE_DEFAULT,
                        []
                    ),
                ]),
                'Courses grouped by child subcompetency',
                VALUE_DEFAULT,
                []
            ),
        ]);
    }

    /**
     * Describes the parameters for competency_course_action.
     *
     * @return external_function_parameters
     */
    public static function competency_course_action_parameters(): external_function_parameters {
        return new external_function_parameters([
            'action'       => new external_value(PARAM_ALPHANUMEXT, 'Action: add, remove, update_rule'),
            'competencyid' => new external_value(PARAM_INT, 'Competency ID'),
            'courseids'    => new external_multiple_structure(
                new external_value(PARAM_INT, 'Course ID'),
                'Array of course IDs'
            ),
            'ruleoutcome'  => new external_value(PARAM_INT, 'Rule outcome on completion (default 1)', VALUE_DEFAULT, 1),
        ]);
    }

    /**
     * Perform competency-course link actions (add, remove).
     *
     * @param string $action
     * @param int $competencyid
     * @param array $courseids
     * @param int $ruleoutcome
     * @return array
     */
    public static function competency_course_action(
        string $action,
        int $competencyid,
        array $courseids,
        int $ruleoutcome = 1
    ): array {
        global $USER;

        $context = context_system::instance();
        self::validate_context($context);
        self::check_manage_capability($context);
        \tool_management_console\license_manager::require_active_license();

        $params = self::validate_parameters(self::competency_course_action_parameters(), [
            'action'       => $action,
            'competencyid' => $competencyid,
            'courseids'    => $courseids,
            'ruleoutcome'  => $ruleoutcome,
        ]);

        return competency_repository::competency_course_action(
            (string)$params['action'],
            (int)$params['competencyid'],
            (array)$params['courseids'],
            (int)$params['ruleoutcome'],
            !empty($USER->id) ? (int)$USER->id : 0
        );
    }

    /**
     * Describes the return structure for competency_course_action.
     *
     * @return external_single_structure
     */
    public static function competency_course_action_returns(): external_single_structure {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message'       => new external_value(PARAM_TEXT, 'Status description message'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of records affected'),
        ]);
    }

    /**
     * Describes the parameters for get_course_available_activities.
     *
     * @return external_function_parameters
     */
    public static function get_course_available_activities_parameters(): external_function_parameters {
        return new external_function_parameters([
            'courseid'     => new external_value(PARAM_INT, 'Course ID'),
            'competencyid' => new external_value(PARAM_INT, 'Competency ID', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Get list of activities available in course to link to competency.
     *
     * @param int $courseid
     * @param int $competencyid
     * @return array
     */
    public static function get_course_available_activities(int $courseid, int $competencyid = 0): array {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        $params = self::validate_parameters(self::get_course_available_activities_parameters(), [
            'courseid'     => $courseid,
            'competencyid' => $competencyid,
        ]);

        $activities = competency_repository::get_course_available_activities($params['courseid'], $params['competencyid']);
        return ['activities' => $activities];
    }

    /**
     * Describes the return structure for get_course_available_activities.
     *
     * @return external_single_structure
     */
    public static function get_course_available_activities_returns(): external_single_structure {
        return new external_single_structure([
            'activities' => new external_multiple_structure(
                new external_single_structure([
                    'cmid'        => new external_value(PARAM_INT, 'Course module ID'),
                    'courseid'    => new external_value(PARAM_INT, 'Course ID'),
                    'modname'     => new external_value(PARAM_TEXT, 'Module name'),
                    'name'        => new external_value(PARAM_TEXT, 'Activity title'),
                    'visible'     => new external_value(PARAM_INT, 'Visibility (1 or 0)'),
                    'section'     => new external_value(PARAM_INT, 'Section number'),
                    'islinked'    => new external_value(PARAM_INT, '1 if linked to competency, 0 otherwise'),
                    'linkid'      => new external_value(PARAM_INT, 'Link ID if linked'),
                    'ruleoutcome' => new external_value(PARAM_INT, 'Rule outcome on completion'),
                ])
            ),
        ]);
    }

    /**
     * Describes the parameters for module_competency_action.
     *
     * @return external_function_parameters
     */
    public static function module_competency_action_parameters(): external_function_parameters {
        return new external_function_parameters([
            'action'       => new external_value(PARAM_ALPHANUMEXT, 'Action: add, remove, update_rule'),
            'competencyid' => new external_value(PARAM_INT, 'Competency ID'),
            'cmid'         => new external_value(PARAM_INT, 'Course module ID'),
            'ruleoutcome'  => new external_value(PARAM_INT, 'Rule outcome on completion (default 1)', VALUE_DEFAULT, 1),
        ]);
    }

    /**
     * Perform module-competency link actions (add, remove, update_rule).
     *
     * @param string $action
     * @param int $competencyid
     * @param int $cmid
     * @param int $ruleoutcome
     * @return array
     */
    public static function module_competency_action(
        string $action,
        int $competencyid,
        int $cmid,
        int $ruleoutcome = 1
    ): array {
        global $USER;

        $context = context_system::instance();
        self::validate_context($context);
        self::check_manage_capability($context);
        \tool_management_console\license_manager::require_active_license();

        $params = self::validate_parameters(self::module_competency_action_parameters(), [
            'action'       => $action,
            'competencyid' => $competencyid,
            'cmid'         => $cmid,
            'ruleoutcome'  => $ruleoutcome,
        ]);

        return competency_repository::module_competency_action(
            (string)$params['action'],
            (int)$params['competencyid'],
            (int)$params['cmid'],
            (int)$params['ruleoutcome'],
            !empty($USER->id) ? (int)$USER->id : 0
        );
    }

    /**
     * Describes the return structure for module_competency_action.
     *
     * @return external_single_structure
     */
    public static function module_competency_action_returns(): external_single_structure {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message'       => new external_value(PARAM_TEXT, 'Status description message'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of records affected'),
        ]);
    }
}
