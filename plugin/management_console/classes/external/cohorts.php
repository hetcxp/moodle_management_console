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
 * External service for cohorts in tool_management_console.
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
use tool_management_console\repository\cohort_repository;

/**
 * Cohorts external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class cohorts extends external_api {

    public static function get_cohorts_parameters() {
        return new external_function_parameters([
            'page'    => new external_value(PARAM_INT, 'Page index', VALUE_DEFAULT, 0),
            'perpage' => new external_value(PARAM_INT, 'Cohorts per page', VALUE_DEFAULT, 50),
            'sort'    => new external_value(PARAM_ALPHA, 'Sort field', VALUE_DEFAULT, 'name'),
            'dir'     => new external_value(PARAM_ALPHA, 'Sort direction', VALUE_DEFAULT, 'ASC'),
            'search'  => new external_value(PARAM_TEXT, 'Search query', VALUE_DEFAULT, ''),
            'filters' => new external_value(PARAM_RAW, 'JSON encoded filters string', VALUE_DEFAULT, '{}'),
        ]);
    }

    public static function get_cohorts($page = 0, $perpage = 50, $sort = 'name', $dir = 'ASC', $search = '', $filters = '{}') {
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/cohort:view', $context);

        $params = self::validate_parameters(self::get_cohorts_parameters(), [
            'page'    => $page,
            'perpage' => $perpage,
            'sort'    => $sort,
            'dir'     => $dir,
            'search'  => $search,
            'filters' => $filters,
        ]);

        list($records, $totalcount) = cohort_repository::get_cohorts_filtered($params);

        $cohort_ids = array_keys($records);
        $progress_map = cohort_repository::get_cohorts_progress_map($cohort_ids);

        $cohorts = [];
        foreach ($records as $r) {
            $progress = 0;
            if ($r->memberscount > 0 && $r->coursescount > 0) {
                $progress = isset($progress_map[$r->id]) ? (int)$progress_map[$r->id] : 0;
            }

            $cohorts[] = [
                'id'           => (int)$r->id,
                'name'         => (string)$r->name,
                'idnumber'     => (string)($r->idnumber ?? ''),
                'description'  => (string)($r->description ?? ''),
                'memberscount' => (int)$r->memberscount,
                'coursescount' => (int)($r->coursescount ?? 0),
                'progress'     => $progress,
            ];
        }

        return [
            'totalcount' => $totalcount,
            'page'       => (int)$params['page'],
            'perpage'    => (int)$params['perpage'],
            'cohorts'    => $cohorts,
        ];
    }

    public static function get_cohorts_returns() {
        return new external_single_structure([
            'totalcount' => new external_value(PARAM_INT, 'Total cohorts count'),
            'page'       => new external_value(PARAM_INT, 'Current page index'),
            'perpage'    => new external_value(PARAM_INT, 'Items per page'),
            'cohorts'    => new external_multiple_structure(
                new external_single_structure([
                    'id'           => new external_value(PARAM_INT, 'Cohort ID'),
                    'name'         => new external_value(PARAM_TEXT, 'Cohort name'),
                    'idnumber'     => new external_value(PARAM_TEXT, 'ID number'),
                    'description'  => new external_value(PARAM_RAW, 'Description'),
                    'memberscount' => new external_value(PARAM_INT, 'Number of users in cohort'),
                    'coursescount' => new external_value(PARAM_INT, 'Number of linked courses'),
                    'progress'     => new external_value(PARAM_INT, 'Average progress percentage', VALUE_OPTIONAL),
                ])
            ),
        ]);
    }

    public static function cohort_action_parameters() {
        return new external_function_parameters([
            'action'      => new external_value(PARAM_ALPHA, 'Action: create, edit, delete'),
            'cohortid'    => new external_value(PARAM_INT, 'Cohort ID for edit/delete', VALUE_DEFAULT, 0),
            'name'        => new external_value(PARAM_TEXT, 'Cohort name', VALUE_DEFAULT, ''),
            'idnumber'    => new external_value(PARAM_TEXT, 'ID number', VALUE_DEFAULT, ''),
            'description' => new external_value(PARAM_RAW, 'Description', VALUE_DEFAULT, ''),
        ]);
    }

    public static function cohort_action($action, $cohortid = 0, $name = '', $idnumber = '', $description = '') {
        global $CFG;
        require_once($CFG->dirroot . '/cohort/lib.php');
        
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/cohort:manage', $context);

        $params = self::validate_parameters(self::cohort_action_parameters(), [
            'action'      => $action,
            'cohortid'    => $cohortid,
            'name'        => $name,
            'idnumber'    => $idnumber,
            'description' => $description,
        ]);

        $act = $params['action'];
        $affected = 0;

        $transaction = $DB->start_delegated_transaction();
        try {
            switch ($act) {
                case 'create':
                    if (empty($params['name'])) {
                        $transaction->allow_commit();
                        return ['success' => false, 'message' => 'Cohort name is required', 'affectedcount' => 0];
                    }
                    $data = new \stdClass();
                    $data->name = $params['name'];
                    $data->idnumber = $params['idnumber'];
                    $data->description = clean_text($params['description'], FORMAT_HTML);
                    $data->descriptionformat = FORMAT_HTML;
                    $data->contextid = $context->id;
                    
                    $id = cohort_add_cohort($data);
                    $transaction->allow_commit();
                    return [
                        'success'       => true,
                        'message'       => 'Cohort created successfully with ID ' . $id,
                        'affectedcount' => 1,
                    ];

                case 'edit':
                    if (empty($params['cohortid']) || empty($params['name'])) {
                        $transaction->allow_commit();
                        return ['success' => false, 'message' => 'cohortid and name are required', 'affectedcount' => 0];
                    }
                    $data = new \stdClass();
                    $data->id = $params['cohortid'];
                    $data->name = $params['name'];
                    $data->idnumber = $params['idnumber'];
                    $data->description = clean_text($params['description'], FORMAT_HTML);
                    $data->descriptionformat = FORMAT_HTML;
                    $data->contextid = $context->id;
                    
                    cohort_update_cohort($data);
                    $transaction->allow_commit();
                    return [
                        'success'       => true,
                        'message'       => 'Cohort updated successfully',
                        'affectedcount' => 1,
                    ];

                case 'delete':
                    if (empty($params['cohortid'])) {
                        $transaction->allow_commit();
                        return ['success' => false, 'message' => 'cohortid is required', 'affectedcount' => 0];
                    }
                    $cohort = cohort_repository::get_cohort($params['cohortid']);
                    if ($cohort) {
                        cohort_delete_cohort($cohort);
                        $affected = 1;
                    }
                    break;
                    
                default:
                    $transaction->allow_commit();
                    return ['success' => false, 'message' => 'Unknown action: ' . $act, 'affectedcount' => 0];
            }
            $transaction->allow_commit();
            \tool_management_console\cache_manager::invalidate_kpis('cohort_kpis');
        } catch (\Exception $e) {
            $transaction->rollback($e);
            return ['success' => false, 'message' => $e->getMessage(), 'affectedcount' => 0];
        }

        return [
            'success'       => true,
            'message'       => "Action {$act} executed successfully.",
            'affectedcount' => $affected,
        ];
    }

    public static function cohort_action_returns() {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message'       => new external_value(PARAM_TEXT, 'Status description message'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of records affected'),
        ]);
    }

    public static function get_cohort_detail_parameters() {
        return new external_function_parameters([
            'cohortid' => new external_value(PARAM_INT, 'Cohort ID'),
        ]);
    }

    public static function get_cohort_detail($cohortid) {
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/cohort:view', $context);

        $params = self::validate_parameters(self::get_cohort_detail_parameters(), [
            'cohortid' => $cohortid,
        ]);

        $cohort = cohort_repository::get_cohort_strict($params['cohortid']);

        // Cursos sincronizados
        $courses_records = cohort_repository::get_cohort_synced_courses($cohort->id);

        // Miembros de la cohorte
        $members_records = cohort_repository::get_cohort_members($cohort->id);

        $member_ids = array_keys($members_records);
        $progress_data = cohort_repository::get_cohort_members_progress_data($member_ids, array_values($courses_records));

        $members = [];
        $course_count = count($courses_records);

        foreach ($members_records as $u) {
            $user_course_progress = [];
            $total_progress = 0;
            
            foreach ($courses_records as $c) {
                $prog_val = $progress_data[$u->id][$c->id] ?? 0;
                $total_progress += $prog_val;
                
                $user_course_progress[] = [
                    'courseid' => (int)$c->id,
                    'progress' => $prog_val
                ];
            }
            
            $progress = $course_count > 0 ? (int)round($total_progress / $course_count) : 0;
            
            $members[] = [
                'id' => (int)$u->id,
                'fullname' => fullname($u),
                'email' => (string)$u->email,
                'lastaccess' => (int)$u->lastaccess,
                'suspended' => (int)$u->suspended,
                'progress' => $progress,
                'course_progresses' => $user_course_progress
            ];
        }

        $courses = [];
        $member_count = count($members_records);
        foreach ($courses_records as $c) {
            $course_total_progress = 0;
            foreach ($members_records as $u) {
                $course_total_progress += ($progress_data[$u->id][$c->id] ?? 0);
            }
            $course_progress = $member_count > 0 ? (int)round($course_total_progress / $member_count) : 0;

            $courses[] = [
                'id' => (int)$c->id,
                'fullname' => (string)$c->fullname,
                'shortname' => (string)$c->shortname,
                'enrolid' => (int)$c->enrolid,
                'enrolledcount' => (int)($c->enrolledcount ?? 0),
                'progress' => $course_progress,
            ];
        }

        $overall_progress = ($course_count > 0 && $member_count > 0)
            ? (int)round(array_sum(array_column($members, 'progress')) / $member_count)
            : 0;

        return [
            'id' => (int)$cohort->id,
            'name' => (string)$cohort->name,
            'idnumber' => (string)$cohort->idnumber,
            'description' => (string)$cohort->description,
            'progress' => $overall_progress,
            'members' => $members,
            'courses' => $courses
        ];
    }

    public static function get_cohort_detail_returns() {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Cohort ID'),
            'name' => new external_value(PARAM_TEXT, 'Cohort name'),
            'idnumber' => new external_value(PARAM_TEXT, 'ID number'),
            'description' => new external_value(PARAM_RAW, 'Description'),
            'progress' => new external_value(PARAM_INT, 'Average progress percentage', VALUE_OPTIONAL),
            'members' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'User ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'User fullname'),
                    'email' => new external_value(PARAM_TEXT, 'User email'),
                    'lastaccess' => new external_value(PARAM_INT, 'User lastaccess time'),
                    'suspended' => new external_value(PARAM_INT, 'Is user suspended'),
                    'progress' => new external_value(PARAM_INT, 'Progress percentage', VALUE_OPTIONAL),
                    'course_progresses' => new external_multiple_structure(
                        new external_single_structure([
                            'courseid' => new external_value(PARAM_INT, 'Course ID'),
                            'progress' => new external_value(PARAM_INT, 'Progress percentage')
                        ]),
                        'List of course progress percentages for this user',
                        VALUE_OPTIONAL
                    ),
                ])
            ),
            'courses' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Course ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'Course fullname'),
                    'shortname' => new external_value(PARAM_TEXT, 'Course shortname'),
                    'enrolid' => new external_value(PARAM_INT, 'Enrol instance ID'),
                    'enrolledcount' => new external_value(PARAM_INT, 'Enrolled users count'),
                    'progress' => new external_value(PARAM_INT, 'Average course progress for cohort members', VALUE_OPTIONAL),
                ])
            ),
        ]);
    }

    public static function get_cohorts_kpis_parameters() {
        return new external_function_parameters([]);
    }

    public static function get_cohorts_kpis() {
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/cohort:view', $context);

        return cohort_repository::get_kpis();
    }

    public static function get_cohorts_kpis_returns() {
        return new external_single_structure([
            'total_cohorts'  => new external_value(PARAM_INT, 'Total cohorts'),
            'total_members'  => new external_value(PARAM_INT, 'Total members across all cohorts'),
            'avg_members'    => new external_value(PARAM_FLOAT, 'Average members per cohort'),
            'empty_cohorts'  => new external_value(PARAM_INT, 'Cohorts without members'),
            'synced_courses' => new external_value(PARAM_INT, 'Cohorts linked to courses'),
        ]);
    }
}
