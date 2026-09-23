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
 * External service for learning paths in tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\external;

defined('MOODLE_INTERNAL') || die();

use context_course;
use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use tool_management_console\repository\learning_path_repository;
use moodle_exception;
use stdClass;

/**
 * Learning paths external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class learning_paths extends external_api {

    // ------------------------------------------------------------------------
    // 1. check_dependencies
    // ------------------------------------------------------------------------
    public static function check_dependencies_parameters() {
        return new external_function_parameters([]);
    }

    public static function check_dependencies() {
        self::validate_context(context_system::instance());
        return learning_path_repository::check_dependencies();
    }

    public static function check_dependencies_returns() {
        return new external_single_structure([
            'is_ready' => new external_value(PARAM_BOOL, 'True if dependencies are met'),
            'missing'  => new external_multiple_structure(new external_value(PARAM_TEXT, 'Missing plugin component name')),
        ]);
    }

    // ------------------------------------------------------------------------
    // 2. get_learning_paths
    // ------------------------------------------------------------------------
    public static function get_learning_paths_parameters() {
        return new external_function_parameters([
            'page'    => new external_value(PARAM_INT, 'Page index', VALUE_DEFAULT, 0),
            'perpage' => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 20),
            'search'  => new external_value(PARAM_TEXT, 'Search term', VALUE_DEFAULT, ''),
        ]);
    }

    public static function get_learning_paths($page = 0, $perpage = 20, $search = '') {
        $params = self::validate_parameters(self::get_learning_paths_parameters(), [
            'page'    => $page,
            'perpage' => $perpage,
            'search'  => $search,
        ]);

        self::validate_context(context_system::instance());

        global $DB;
        $items = learning_path_repository::get_learning_paths($params);

        $lp_categoryid = learning_path_repository::get_or_create_lp_category();
        $where = "category = :lpcat AND id <> 1";
        $sqlparams = ['lpcat' => $lp_categoryid];
        if (!empty($params['search'])) {
            $where .= " AND (" . $DB->sql_like('fullname', ':search1', false, false) .
                      " OR " . $DB->sql_like('shortname', ':search2', false, false) . ")";
            $sqlparams['search1'] = '%' . $params['search'] . '%';
            $sqlparams['search2'] = '%' . $params['search'] . '%';
        }
        $total = $DB->count_records_select('course', $where, $sqlparams);

        return [
            'items'   => $items,
            'total'   => (int)$total,
            'page'    => (int)$params['page'],
            'perpage' => (int)$params['perpage'],
        ];
    }

    public static function get_learning_paths_returns() {
        return new external_single_structure([
            'items' => new external_multiple_structure(new external_single_structure([
                'id'              => new external_value(PARAM_INT, 'Course id'),
                'fullname'        => new external_value(PARAM_TEXT, 'Full name'),
                'shortname'       => new external_value(PARAM_TEXT, 'Short name'),
                'visible'         => new external_value(PARAM_INT, 'Visible status (0 or 1)'),
                'startdate'       => new external_value(PARAM_INT, 'Start timestamp'),
                'timecreated'     => new external_value(PARAM_INT, 'Time created timestamp'),
                'subcourse_count' => new external_value(PARAM_INT, 'Number of subcourses'),
                'enrolled_count'  => new external_value(PARAM_INT, 'Number of enrolled users'),
                'cohort_count'    => new external_value(PARAM_INT, 'Number of assigned cohorts'),
            ])),
            'total'   => new external_value(PARAM_INT, 'Total count'),
            'page'    => new external_value(PARAM_INT, 'Current page index'),
            'perpage' => new external_value(PARAM_INT, 'Items per page'),
        ]);
    }

    // ------------------------------------------------------------------------
    // 3. get_learning_path_detail
    // ------------------------------------------------------------------------
    public static function get_learning_path_detail_parameters() {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'Container course ID'),
        ]);
    }

    public static function get_learning_path_detail($courseid) {
        $params = self::validate_parameters(self::get_learning_path_detail_parameters(), [
            'courseid' => $courseid,
        ]);

        $context = context_course::instance($params['courseid']);
        self::validate_context($context);

        return (array)learning_path_repository::get_learning_path_detail($params['courseid']);
    }

    public static function get_learning_path_detail_returns() {
        return new external_single_structure([
            'id'               => new external_value(PARAM_INT, 'Course ID'),
            'fullname'         => new external_value(PARAM_TEXT, 'Course fullname'),
            'shortname'        => new external_value(PARAM_TEXT, 'Course shortname'),
            'visible'          => new external_value(PARAM_INT, 'Course visibility'),
            'startdate'        => new external_value(PARAM_INT, 'Start date timestamp'),
            'enddate'          => new external_value(PARAM_INT, 'End date timestamp'),
            'summary'          => new external_value(PARAM_RAW, 'Course summary', VALUE_OPTIONAL),
            'enforce_sequence' => new external_value(PARAM_BOOL, 'Sequential rules active'),
            'sections'         => new external_multiple_structure(new external_single_structure([
                'section'             => new external_value(PARAM_INT, 'Section number'),
                'section_id'          => new external_value(PARAM_INT, 'Course section DB ID'),
                'section_name'        => new external_value(PARAM_TEXT, 'Section title'),
                'cm_id'               => new external_value(PARAM_INT, 'Course module ID', VALUE_OPTIONAL, null, NULL_ALLOWED),
                'subcourse_id'        => new external_value(PARAM_INT, 'Subcourse instance ID', VALUE_OPTIONAL, null, NULL_ALLOWED),
                'subcourse_course_id' => new external_value(PARAM_INT, 'Child course ID', VALUE_OPTIONAL, null, NULL_ALLOWED),
                'subcourse_fullname'  => new external_value(PARAM_TEXT, 'Child course fullname', VALUE_OPTIONAL, null, NULL_ALLOWED),
                'subcourse_shortname' => new external_value(PARAM_TEXT, 'Child course shortname', VALUE_OPTIONAL, null, NULL_ALLOWED),
                'availability'        => new external_value(PARAM_RAW, 'Availability JSON', VALUE_OPTIONAL, null, NULL_ALLOWED),
                'has_sequential_rule' => new external_value(PARAM_BOOL, 'Has sequential rule'),
            ])),
            'cohorts'          => new external_multiple_structure(new external_single_structure([
                'enrol_id'     => new external_value(PARAM_INT, 'Enrol instance ID'),
                'cohort_id'    => new external_value(PARAM_INT, 'Cohort ID'),
                'name'         => new external_value(PARAM_TEXT, 'Cohort name'),
                'member_count' => new external_value(PARAM_INT, 'Enrolled members count'),
            ])),
            'users'            => new external_multiple_structure(new external_single_structure([
                'id'           => new external_value(PARAM_INT, 'User ID'),
                'fullname'     => new external_value(PARAM_TEXT, 'User full name'),
                'email'        => new external_value(PARAM_TEXT, 'User email'),
                'status'       => new external_value(PARAM_INT, 'Enrolment status (0=active, 1=suspended)'),
                'enrol_method' => new external_value(PARAM_TEXT, 'Enrol method: manual, cohort, etc.'),
                'timecreated'  => new external_value(PARAM_INT, 'Enrolment timestamp', VALUE_OPTIONAL, 0),
            ]), 'Enrolled users list', VALUE_OPTIONAL),
            'progress_matrix'  => new external_multiple_structure(new external_single_structure([
                'user_id'  => new external_value(PARAM_INT, 'User ID'),
                'fullname' => new external_value(PARAM_TEXT, 'User full name'),
                'email'    => new external_value(PARAM_TEXT, 'User email'),
                'modules'  => new external_multiple_structure(new external_single_structure([
                    'cm_id'           => new external_value(PARAM_INT, 'Module ID'),
                    'completionstate' => new external_value(PARAM_INT, 'Completion state (0, 1, 2)'),
                ])),
            ])),
        ]);
    }

    // ------------------------------------------------------------------------
    // 4. search_courses_for_path
    // ------------------------------------------------------------------------
    public static function search_courses_for_path_parameters() {
        return new external_function_parameters([
            'search'          => new external_value(PARAM_TEXT, 'Search query', VALUE_DEFAULT, ''),
            'exclude_path_id' => new external_value(PARAM_INT, 'Learning path course ID to exclude already added subcourses', VALUE_DEFAULT, 0),
            'page'            => new external_value(PARAM_INT, 'Page index', VALUE_DEFAULT, 0),
            'perpage'         => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 20),
        ]);
    }

    public static function search_courses_for_path($search = '', $exclude_path_id = 0, $page = 0, $perpage = 20) {
        $params = self::validate_parameters(self::search_courses_for_path_parameters(), [
            'search'          => $search,
            'exclude_path_id' => $exclude_path_id,
            'page'            => $page,
            'perpage'         => $perpage,
        ]);

        self::validate_context(context_system::instance());

        global $DB;
        $lp_categoryid = learning_path_repository::get_or_create_lp_category();

        $exclude_ids = [];
        if ($params['exclude_path_id'] > 0) {
            $exclude_ids[] = (int)$params['exclude_path_id'];
            // Obtener subcursos ya enlazados en este contenedor
            $submodule_id = (int)$DB->get_field('modules', 'id', ['name' => 'subcourse']);
            $sql = "
                SELECT s.refcourse
                  FROM {course_modules} cm
                  JOIN {subcourse} s ON s.id = cm.instance
                 WHERE cm.course = :courseid AND cm.module = :submoduleid AND cm.deletioninprogress = 0
            ";
            $linked = $DB->get_fieldset_sql($sql, [
                'courseid'    => $params['exclude_path_id'],
                'submoduleid' => $submodule_id
            ]);
            if ($linked) {
                $exclude_ids = array_merge($exclude_ids, array_map('intval', $linked));
            }
        }

        return learning_path_repository::search_available_courses($params, $lp_categoryid, array_unique($exclude_ids));
    }

    public static function search_courses_for_path_returns() {
        return new external_single_structure([
            'items' => new external_multiple_structure(new external_single_structure([
                'id'           => new external_value(PARAM_INT, 'Course ID'),
                'fullname'     => new external_value(PARAM_TEXT, 'Fullname'),
                'shortname'    => new external_value(PARAM_TEXT, 'Shortname'),
                'visible'      => new external_value(PARAM_INT, 'Visibility'),
                'categoryname' => new external_value(PARAM_TEXT, 'Category name'),
            ])),
            'total'   => new external_value(PARAM_INT, 'Total courses count'),
            'page'    => new external_value(PARAM_INT, 'Page index'),
            'perpage' => new external_value(PARAM_INT, 'Items per page'),
        ]);
    }

    // ------------------------------------------------------------------------
    // 5. create_learning_path
    // ------------------------------------------------------------------------
    public static function create_learning_path_parameters() {
        return new external_function_parameters([
            'fullname'  => new external_value(PARAM_TEXT, 'Learning path course fullname'),
            'shortname' => new external_value(PARAM_TEXT, 'Learning path course shortname'),
            'startdate' => new external_value(PARAM_INT, 'Course start timestamp', VALUE_DEFAULT, 0),
        ]);
    }

    public static function create_learning_path($fullname, $shortname, $startdate = 0) {
        $params = self::validate_parameters(self::create_learning_path_parameters(), [
            'fullname'  => $fullname,
            'shortname' => $shortname,
            'startdate' => $startdate,
        ]);

        $syscontext = context_system::instance();
        self::validate_context($syscontext);
        require_capability('moodle/course:create', $syscontext);

        $courseid = learning_path_repository::create_learning_path($params['fullname'], $params['shortname'], $params['startdate']);

        return [
            'id'        => $courseid,
            'fullname'  => $params['fullname'],
            'shortname' => $params['shortname'],
        ];
    }

    public static function create_learning_path_returns() {
        return new external_single_structure([
            'id'        => new external_value(PARAM_INT, 'Created course ID'),
            'fullname'  => new external_value(PARAM_TEXT, 'Course fullname'),
            'shortname' => new external_value(PARAM_TEXT, 'Course shortname'),
        ]);
    }

    // ------------------------------------------------------------------------
    // 6. update_learning_path_structure
    // ------------------------------------------------------------------------
    public static function update_learning_path_structure_parameters() {
        return new external_function_parameters([
            'courseid'             => new external_value(PARAM_INT, 'Container course ID'),
            'subcourse_course_ids' => new external_multiple_structure(new external_value(PARAM_INT, 'Child course ID')),
            'enforce_sequence'     => new external_value(PARAM_INT, 'Enforce sequential rules (1/0)', VALUE_DEFAULT, 0),
        ]);
    }

    public static function update_learning_path_structure($courseid, $subcourse_course_ids, $enforce_sequence = 0) {
        $params = self::validate_parameters(self::update_learning_path_structure_parameters(), [
            'courseid'             => $courseid,
            'subcourse_course_ids' => $subcourse_course_ids,
            'enforce_sequence'     => $enforce_sequence,
        ]);

        $context = context_course::instance($params['courseid']);
        self::validate_context($context);
        require_capability('moodle/course:update', $context);

        learning_path_repository::update_structure(
            $params['courseid'],
            $params['subcourse_course_ids'],
            (bool)$params['enforce_sequence']
        );

        return ['success' => true];
    }

    public static function update_learning_path_structure_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'True on success'),
        ]);
    }

    // ------------------------------------------------------------------------
    // 7. delete_learning_path
    // ------------------------------------------------------------------------
    public static function delete_learning_path_parameters() {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'Container course ID'),
        ]);
    }

    public static function delete_learning_path($courseid) {
        $params = self::validate_parameters(self::delete_learning_path_parameters(), [
            'courseid' => $courseid,
        ]);

        $context = context_course::instance($params['courseid']);
        self::validate_context($context);
        require_capability('moodle/course:delete', $context);

        $has_students = learning_path_repository::has_enrolled_users($params['courseid']);
        if ($has_students) {
            learning_path_repository::hide_learning_path($params['courseid']);
            return [
                'success'      => true,
                'action_taken' => 'hidden',
            ];
        }

        learning_path_repository::delete_learning_path($params['courseid']);
        return [
            'success'      => true,
            'action_taken' => 'deleted',
        ];
    }

    public static function delete_learning_path_returns() {
        return new external_single_structure([
            'success'      => new external_value(PARAM_BOOL, 'Operation succeeded'),
            'action_taken' => new external_value(PARAM_ALPHA, 'hidden or deleted'),
        ]);
    }

    // ------------------------------------------------------------------------
    // 8. manage_learning_path_enrolments
    // ------------------------------------------------------------------------
    public static function manage_learning_path_enrolments_parameters() {
        return new external_function_parameters([
            'courseid'  => new external_value(PARAM_INT, 'Container course ID'),
            'action'    => new external_value(PARAM_ALPHA, 'Action: assign or remove'),
            'cohortids' => new external_multiple_structure(new external_value(PARAM_INT, 'Cohort ID'), 'Cohort IDs', VALUE_DEFAULT, []),
            'userids'   => new external_multiple_structure(new external_value(PARAM_INT, 'User ID'), 'User IDs', VALUE_DEFAULT, []),
        ]);
    }

    public static function manage_learning_path_enrolments($courseid, $action, $cohortids = [], $userids = []) {
        global $DB, $CFG;

        $params = self::validate_parameters(self::manage_learning_path_enrolments_parameters(), [
            'courseid'  => $courseid,
            'action'    => $action,
            'cohortids' => $cohortids,
            'userids'   => $userids,
        ]);

        $context = context_course::instance($params['courseid']);
        self::validate_context($context);
        require_capability('moodle/course:enrolreview', $context);

        $course = $DB->get_record('course', ['id' => $params['courseid']], '*', MUST_EXIST);
        $enrolplugin = enrol_get_plugin('cohort');

        if (!empty($params['cohortids']) && $enrolplugin) {
            $studentrole = $DB->get_record('role', ['shortname' => 'student'], 'id', IGNORE_MULTIPLE);
            $roleid = $studentrole ? (int)$studentrole->id : 5;

            foreach ($params['cohortids'] as $cohortid) {
                if ($params['action'] === 'assign') {
                    $instance = $DB->get_record('enrol', [
                        'enrol'      => 'cohort',
                        'courseid'   => $course->id,
                        'customint1' => $cohortid
                    ]);
                    if (!$instance) {
                        $instanceid = $enrolplugin->add_instance($course, [
                            'customint1' => $cohortid,
                            'roleid'     => $roleid,
                            'status'     => ENROL_INSTANCE_ENABLED
                        ]);
                    }
                    if (function_exists('enrol_cohort_sync')) {
                        require_once($CFG->dirroot . '/enrol/cohort/locallib.php');
                        $trace = new \null_progress_trace();
                        enrol_cohort_sync($trace, $course->id);
                        $trace->finished();
                    }
                } else if ($params['action'] === 'remove') {
                    $instance = $DB->get_record('enrol', [
                        'enrol'      => 'cohort',
                        'courseid'   => $course->id,
                        'customint1' => $cohortid
                    ]);
                    if ($instance) {
                        $enrolplugin->delete_instance($instance);
                    }
                }
            }
        }

        // Matrícula manual directa para usuarios
        if (!empty($params['userids'])) {
            $manualplugin = enrol_get_plugin('manual');
            $instance = $DB->get_record('enrol', ['enrol' => 'manual', 'courseid' => $course->id]);
            if (!$instance && $manualplugin) {
                $instanceid = $manualplugin->add_instance($course);
                $instance = $DB->get_record('enrol', ['id' => $instanceid]);
            }

            if ($instance && $manualplugin) {
                $studentrole = $DB->get_record('role', ['shortname' => 'student'], 'id', IGNORE_MULTIPLE);
                $roleid = $studentrole ? (int)$studentrole->id : 5;

                foreach ($params['userids'] as $userid) {
                    if ($params['action'] === 'assign') {
                        $manualplugin->enrol_user($instance, $userid, $roleid);
                    } else if ($params['action'] === 'remove') {
                        $manualplugin->unenrol_user($instance, $userid);

                        // Desmatricular también de los subcursos hijos si estuviera matriculado manualmente
                        $submodule_id = (int)$DB->get_field('modules', 'id', ['name' => 'subcourse']);
                        if ($submodule_id) {
                            $subcourses = $DB->get_records_sql("
                                SELECT s.refcourse
                                  FROM {course_modules} cm
                                  JOIN {subcourse} s ON s.id = cm.instance
                                 WHERE cm.course = :courseid AND cm.module = :submoduleid AND cm.deletioninprogress = 0
                            ", ['courseid' => $course->id, 'submoduleid' => $submodule_id]);
                            if ($subcourses) {
                                foreach ($subcourses as $sc) {
                                    $subcourseid = (int)$sc->refcourse;
                                    $submanual = $DB->get_record('enrol', ['enrol' => 'manual', 'courseid' => $subcourseid]);
                                    if ($submanual) {
                                        $manualplugin->unenrol_user($submanual, $userid);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return [
            'success' => true,
            'message' => 'Enrolments processed successfully',
        ];
    }

    public static function manage_learning_path_enrolments_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Operation succeeded'),
            'message' => new external_value(PARAM_TEXT, 'Status message'),
        ]);
    }
}
