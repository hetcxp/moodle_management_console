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
 * External service for courses in tool_management_console.
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
use tool_management_console\repository\course_repository;
use stdClass;

/**
 * Courses external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class courses extends external_api {

    public static function get_courses_parameters() {
        return new external_function_parameters([
            'page'       => new external_value(PARAM_INT, 'Page index starting from 0', VALUE_DEFAULT, 0),
            'perpage'    => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 20),
            'sort'       => new external_value(PARAM_ALPHA, 'Sort field', VALUE_DEFAULT, 'timecreated'),
            'dir'        => new external_value(PARAM_ALPHA, 'Sort direction ASC or DESC', VALUE_DEFAULT, 'DESC'),
            'search'     => new external_value(PARAM_TEXT, 'Search query text', VALUE_DEFAULT, ''),
            'category'   => new external_value(PARAM_INT, 'Category filter id', VALUE_DEFAULT, 0),
            'visibility' => new external_value(PARAM_INT, 'Visibility filter -1:all, 1:visible, 0:hidden', VALUE_DEFAULT, -1),
            'filters'    => new external_value(PARAM_RAW, 'JSON encoded filters string', VALUE_DEFAULT, '{}'),
        ]);
    }

    public static function get_courses($page = 0, $perpage = 20, $sort = 'timecreated', $dir = 'DESC', $search = '', $category = 0, $visibility = -1, $filters = '{}') {
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/course:view', $context);

        $params = self::validate_parameters(self::get_courses_parameters(), [
            'page'       => $page,
            'perpage'    => $perpage,
            'sort'       => $sort,
            'dir'        => $dir,
            'search'     => $search,
            'category'   => $category,
            'visibility' => $visibility,
            'filters'    => $filters,
        ]);
        $params['perpage'] = min(max(1, $params['perpage']), 200);

        list($records, $totalcount, $kpis) = course_repository::get_courses_filtered($params);

        $courses = [];
        foreach ($records as $r) {
            $progress = 0;
            $enrolled = (int)$r->enrolledcount;
            $completed = (int)$r->completedcount;
            if ($enrolled > 0) {
                $progress = round(($completed / $enrolled) * 100);
            }

            $courses[] = [
                'id'               => (int)$r->id,
                'fullname'         => (string)$r->fullname,
                'shortname'        => (string)$r->shortname,
                'visible'          => (int)$r->visible,
                'timecreated'      => (int)$r->timecreated,
                'startdate'        => (int)$r->startdate,
                'enddate'          => (int)$r->enddate,
                'category'         => (int)$r->category,
                'categoryname'     => (string)$r->categoryname,
                'enrolledcount'    => $enrolled,
                'completedcount'   => $completed,
                'cohortscount'     => (int)$r->cohortscount,
                'competenciescount'=> (int)($r->competenciescount ?? 0),
                'progress_percent' => (int)$progress,
            ];
        }

        return [
            'totalcount' => $totalcount,
            'page'       => (int)$params['page'],
            'perpage'    => (int)$params['perpage'],
            'courses'    => $courses,
            'kpis'       => $kpis,
        ];
    }

    public static function get_courses_returns() {
        return new external_single_structure([
            'totalcount' => new external_value(PARAM_INT, 'Total count of courses matching filter'),
            'page'       => new external_value(PARAM_INT, 'Current page index'),
            'perpage'    => new external_value(PARAM_INT, 'Items per page'),
            'courses'    => new external_multiple_structure(
                new external_single_structure([
                    'id'               => new external_value(PARAM_INT, 'Course ID'),
                    'fullname'         => new external_value(PARAM_TEXT, 'Full name'),
                    'shortname'        => new external_value(PARAM_TEXT, 'Short name'),
                    'visible'          => new external_value(PARAM_INT, '1: visible, 0: hidden'),
                    'timecreated'      => new external_value(PARAM_INT, 'Timestamp created'),
                    'startdate'        => new external_value(PARAM_INT, 'Start date', VALUE_DEFAULT, 0),
                    'enddate'          => new external_value(PARAM_INT, 'End date', VALUE_DEFAULT, 0),
                    'category'         => new external_value(PARAM_INT, 'Category ID'),
                    'categoryname'     => new external_value(PARAM_TEXT, 'Category name'),
                    'enrolledcount'    => new external_value(PARAM_INT, 'Number of enrolled active users'),
                    'completedcount'   => new external_value(PARAM_INT, 'Number of users who completed the course'),
                    'cohortscount'     => new external_value(PARAM_INT, 'Number of cohort enrolments'),
                    'competenciescount'=> new external_value(PARAM_INT, 'Number of competencies linked to the course', VALUE_DEFAULT, 0),
                    'progress_percent' => new external_value(PARAM_INT, 'Average completion percentage'),
                ])
            ),
            'kpis'       => new external_single_structure([
                'total_courses'  => new external_value(PARAM_INT, 'Total courses filtered'),
                'total_enrolled' => new external_value(PARAM_INT, 'Total enrolled in filtered courses'),
                'avg_progress'   => new external_value(PARAM_INT, 'Avg progress in filtered courses'),
                'empty_courses'  => new external_value(PARAM_INT, 'Number of empty courses'),
            ], 'KPIs for the current view', VALUE_OPTIONAL),
        ]);
    }

    public static function course_action_parameters() {
        return new external_function_parameters([
            'action'      => new external_value(PARAM_ALPHANUMEXT, 'Action: create, hide, show, delete, move, update, update_dates'),
            'courseids'   => new external_multiple_structure(new external_value(PARAM_INT, 'Course ID'), 'Array of course IDs', VALUE_DEFAULT, []),
            'categoryid'  => new external_value(PARAM_INT, 'Target category ID for move or create', VALUE_DEFAULT, 0),
            'fullname'    => new external_value(PARAM_TEXT, 'Course fullname for create or update', VALUE_DEFAULT, ''),
            'shortname'   => new external_value(PARAM_TEXT, 'Course shortname for create or update', VALUE_DEFAULT, ''),
            'summary'     => new external_value(PARAM_RAW, 'Course summary for create or update', VALUE_DEFAULT, ''),
            'visible'     => new external_value(PARAM_INT, 'Course visibility for create', VALUE_DEFAULT, 1),
            'startdate'   => new external_value(PARAM_INT, 'Course start date', VALUE_DEFAULT, 0),
            'enddate'     => new external_value(PARAM_INT, 'Course end date', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Execute course mutation actions (create, update, delete, etc.).
     *
     * @param string $action
     * @param array $courseids
     * @param int $categoryid
     * @param string $fullname
     * @param string $shortname
     * @param string $summary
     * @param int $visible
     * @param int $startdate
     * @param int $enddate
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function course_action($action, $courseids = [], $categoryid = 0, $fullname = '', $shortname = '', $summary = '', $visible = 1, $startdate = 0, $enddate = 0) {
        global $DB, $CFG;

        require_once($CFG->dirroot . '/course/lib.php');

        $context = context_system::instance();
        self::validate_context($context);

        $params = self::validate_parameters(self::course_action_parameters(), [
            'action'     => $action,
            'courseids'  => $courseids,
            'categoryid' => $categoryid,
            'fullname'   => $fullname,
            'shortname'  => $shortname,
            'summary'    => $summary,
            'visible'    => $visible,
            'startdate'  => $startdate,
            'enddate'    => $enddate,
        ]);

        $affected = 0;
        $act = $params['action'];

        $transaction = $DB->start_delegated_transaction();
        try {
            switch ($act) {
                case 'create':
                    $catcontext = \context_coursecat::instance($params['categoryid']);
                    require_capability('moodle/course:create', $catcontext);
                    if (empty($params['fullname']) || empty($params['shortname']) || empty($params['categoryid'])) {
                        $transaction->allow_commit();
                        return ['success' => false, 'message' => 'fullname, shortname and categoryid are required.', 'affectedcount' => 0];
                    }

                    $data = new \stdClass();
                    $data->fullname = $params['fullname'];
                    $data->shortname = $params['shortname'];
                    $data->summary = $params['summary'];
                    $data->category = $params['categoryid'];
                    $data->visible = $params['visible'];
                    
                    if ($params['startdate'] > 0) {
                        $data->startdate = $params['startdate'];
                    }
                    if ($params['enddate'] > 0) {
                        $data->enddate = $params['enddate'];
                    }
                    
                    $newcourse = create_course($data);
                    $transaction->allow_commit();
                    return [
                        'success' => true,
                        'message' => 'Course created successfully with ID ' . $newcourse->id,
                        'affectedcount' => 1,
                    ];

                case 'hide':
                    foreach ($params['courseids'] as $cid) {
                        if ($cid > 1) {
                            require_capability('moodle/course:visibility', \context_course::instance($cid));
                            course_change_visibility($cid, false);
                            $affected++;
                        }
                    }
                    break;

                case 'show':
                    foreach ($params['courseids'] as $cid) {
                        if ($cid > 1) {
                            require_capability('moodle/course:visibility', \context_course::instance($cid));
                            course_change_visibility($cid, true);
                            $affected++;
                        }
                    }
                    break;

                case 'delete':
                    foreach ($params['courseids'] as $cid) {
                        if ($cid > 1) {
                            require_capability('moodle/course:delete', \context_course::instance($cid));
                            $course = $DB->get_record('course', ['id' => $cid]);
                            if ($course) {
                                delete_course($course, false);
                                $affected++;
                            }
                        }
                    }
                    break;

                case 'move':
                    if (empty($params['categoryid'])) {
                        $transaction->allow_commit();
                        return ['success' => false, 'message' => 'categoryid is required to move courses.', 'affectedcount' => 0];
                    }
                    $targetcatctx = \context_coursecat::instance($params['categoryid']);
                    require_capability('moodle/category:manage', $targetcatctx);
                    
                    $validcids = [];
                    foreach ($params['courseids'] as $cid) {
                        if ($cid > 1) {
                            require_capability('moodle/course:update', \context_course::instance($cid));
                            $validcids[] = $cid;
                        }
                    }
                    
                    if (!empty($validcids)) {
                        if (move_courses($validcids, $params['categoryid'])) {
                            $affected = count($validcids);
                        }
                    }
                    break;

                case 'update':
                case 'update_dates':
                    foreach ($params['courseids'] as $cid) {
                        if ($cid > 1) {
                            require_capability('moodle/course:update', \context_course::instance($cid));
                            $course = $DB->get_record('course', ['id' => $cid]);
                            if ($course) {
                                $data = new \stdClass();
                                $data->id = $cid;
                                if (!empty($params['fullname'])) {
                                    $data->fullname = $params['fullname'];
                                }
                                if (!empty($params['shortname'])) {
                                    $data->shortname = $params['shortname'];
                                }
                                if ($params['categoryid'] > 0) {
                                    $data->category = $params['categoryid'];
                                }
                                if ($params['summary'] !== '') {
                                    $data->summary = $params['summary'];
                                }
                                $data->startdate = $params['startdate'] > 0 ? $params['startdate'] : 0;
                                $data->enddate = $params['enddate'] > 0 ? $params['enddate'] : 0;
                                update_course($data);
                                $affected++;
                            }
                        }
                    }
                    break;

                default:
                    $transaction->allow_commit();
                    return ['success' => false, 'message' => 'Unknown action: ' . $act, 'affectedcount' => 0];
            }

            $transaction->allow_commit();
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

    public static function course_action_returns() {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message'       => new external_value(PARAM_TEXT, 'Status description message'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of courses affected'),
        ]);
    }

    public static function get_course_detail_parameters() {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
        ]);
    }

    public static function get_course_detail($courseid) {
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/course:view', $context);

        $params = self::validate_parameters(self::get_course_detail_parameters(), [
            'courseid' => $courseid,
        ]);

        $course = course_repository::get_course_strict($params['courseid']);
        $enrolled_users = course_repository::get_course_enrolled_users_detail($course->id);
        $cohort_user_map = course_repository::get_course_user_cohort_map($course->id);
        $all_enrolments = course_repository::get_course_all_enrolments($course->id);

        $user_enrolments_map = [];
        foreach ($all_enrolments as $ue) {
            $user_enrolments_map[$ue->userid][] = [
                'method' => (string)$ue->method,
                'status' => (int)$ue->status,
                'timestart' => (int)$ue->timestart > 0 ? (int)$ue->timestart : (int)$ue->timecreated,
                'timeend' => (int)$ue->timeend
            ];
        }

        $user_roles_map = course_repository::get_course_user_roles_map($course->id);

        // Batch calculate completion progress for all enrolled users
        global $CFG;
        require_once($CFG->libdir . '/completionlib.php');
        $cinfo = new \completion_info($course);
        $trackable_activities = $cinfo->is_enabled() ? $cinfo->get_activities() : [];
        $total_activities = count($trackable_activities);

        $user_cm_completed = [];
        if ($total_activities > 0) {
            $user_cm_completed = course_repository::get_course_cm_completions(array_keys($trackable_activities));
        }

        $users = [];
        foreach ($enrolled_users as $u) {
            $progress_val = 0;
            if (!empty($u->timecompleted)) {
                $progress_val = 100;
            } else if ($total_activities > 0) {
                $completed = isset($user_cm_completed[$u->id]) ? (int)$user_cm_completed[$u->id] : 0;
                $progress_val = (int)round(($completed / $total_activities) * 100);
            }

            $users[] = [
                'id' => (int)$u->id,
                'fullname' => fullname($u),
                'email' => $u->email,
                'progress' => $progress_val,
                'status' => (int)$u->enrolstatus,
                'timestart' => (int)$u->timestart > 0 ? (int)$u->timestart : (int)$u->timecreated,
                'timeend' => (int)$u->timeend,
                'enrolments' => $user_enrolments_map[$u->id] ?? [],
                'cohortids' => isset($cohort_user_map[$u->id]) ? implode(',', $cohort_user_map[$u->id]) : '',
                'roles' => isset($user_roles_map[$u->id]) ? implode(',', $user_roles_map[$u->id]) : 'student'
            ];
        }

        $linked_cohorts = course_repository::get_course_linked_cohorts($course->id);

        $cohorts = [];
        foreach ($linked_cohorts as $c) {
            $enrolled = (int)$c->enrolledcount;
            $completed = (int)$c->completedcount;
            $progress = 0;
            if ($enrolled > 0) {
                $progress = round(($completed / $enrolled) * 100);
            }
            $cohorts[] = [
                'id' => (int)$c->id,
                'name' => (string)$c->name,
                'idnumber' => (string)$c->idnumber,
                'enrolid' => (int)$c->enrolid,
                'status' => (int)$c->enrolstatus,
                'timecreated' => (int)$c->timecreated,
                'enrolenddate' => (int)$c->enrolenddate,
                'groupid' => (int)$c->groupid,
                'progress' => $progress
            ];
        }

        $coursegroups = course_repository::get_course_groups_list($course->id);
        $categoryname = course_repository::get_course_category_name($course->category);
        $competencies = course_repository::get_course_competencies($course->id);

        return [
            'id' => (int)$course->id,
            'fullname' => $course->fullname,
            'shortname' => $course->shortname,
            'categoryname' => $categoryname,
            'timecreated' => (int)$course->timecreated,
            'startdate' => (int)$course->startdate,
            'enddate' => (int)$course->enddate,
            'users' => $users,
            'cohorts' => $cohorts,
            'coursegroups' => $coursegroups,
            'competencies' => $competencies
        ];
    }

    public static function get_course_detail_returns() {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Course ID'),
            'fullname' => new external_value(PARAM_TEXT, 'Course fullname'),
            'shortname' => new external_value(PARAM_TEXT, 'Course shortname'),
            'categoryname' => new external_value(PARAM_TEXT, 'Category name', VALUE_DEFAULT, ''),
            'timecreated' => new external_value(PARAM_INT, 'Time created', VALUE_DEFAULT, 0),
            'startdate' => new external_value(PARAM_INT, 'Start date', VALUE_DEFAULT, 0),
            'enddate' => new external_value(PARAM_INT, 'End date', VALUE_DEFAULT, 0),
            'users' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'User ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'User fullname'),
                    'email' => new external_value(PARAM_TEXT, 'User email'),
                    'progress' => new external_value(PARAM_INT, 'Progress percentage'),
                    'status' => new external_value(PARAM_INT, 'Enrolment status (0=active, 1=suspended)'),
                    'timestart' => new external_value(PARAM_INT, 'Enrolment start time'),
                    'timeend' => new external_value(PARAM_INT, 'Enrolment end time'),
                    'enrolments' => new external_multiple_structure(
                        new external_single_structure([
                            'method' => new external_value(PARAM_ALPHANUMEXT, 'Enrol method'),
                            'status' => new external_value(PARAM_INT, 'Enrol status'),
                            'timestart' => new external_value(PARAM_INT, 'Enrol timestart'),
                            'timeend' => new external_value(PARAM_INT, 'Enrol timeend'),
                        ])
                    ),
                    'cohortids' => new external_value(PARAM_TEXT, 'Cohort IDs (comma separated)', VALUE_DEFAULT, ''),
                    'roles' => new external_value(PARAM_TEXT, 'Roles (comma separated)', VALUE_DEFAULT, ''),
                ])
            ),

            'cohorts' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Cohort ID'),
                    'name' => new external_value(PARAM_TEXT, 'Cohort name'),
                    'idnumber' => new external_value(PARAM_TEXT, 'ID number'),
                    'enrolid' => new external_value(PARAM_INT, 'Enrol instance ID'),
                    'status' => new external_value(PARAM_INT, 'Enrolment status (0=active, 1=suspended)'),
                    'timecreated' => new external_value(PARAM_INT, 'Time created', VALUE_DEFAULT, 0),
                    'enrolenddate' => new external_value(PARAM_INT, 'Enrol end date', VALUE_DEFAULT, 0),
                    'groupid' => new external_value(PARAM_INT, 'Group ID', VALUE_DEFAULT, 0),
                    'progress' => new external_value(PARAM_INT, 'Progress percentage', VALUE_DEFAULT, 0),
                ])
            ),
            'coursegroups' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Group ID'),
                    'name' => new external_value(PARAM_TEXT, 'Group name'),
                ])
            ),
            'competencies' => new external_multiple_structure(
                new external_single_structure([
                    'id'                => new external_value(PARAM_INT, 'Competency ID'),
                    'linkid'            => new external_value(PARAM_INT, 'Course competency link ID', VALUE_DEFAULT, 0),
                    'shortname'         => new external_value(PARAM_TEXT, 'Competency short name'),
                    'idnumber'          => new external_value(PARAM_TEXT, 'Competency ID number', VALUE_DEFAULT, ''),
                    'description'       => new external_value(PARAM_RAW, 'Competency description', VALUE_DEFAULT, ''),
                    'parentid'          => new external_value(PARAM_INT, 'Parent competency ID', VALUE_DEFAULT, 0),
                    'parentname'        => new external_value(PARAM_TEXT, 'Parent competency name', VALUE_DEFAULT, ''),
                    'path'              => new external_value(PARAM_TEXT, 'Hierarchy path', VALUE_DEFAULT, ''),
                    'frameworkid'       => new external_value(PARAM_INT, 'Framework ID'),
                    'frameworkname'     => new external_value(PARAM_TEXT, 'Framework name'),
                    'frameworkidnumber' => new external_value(PARAM_TEXT, 'Framework ID number', VALUE_DEFAULT, ''),
                    'frameworkvisible'  => new external_value(PARAM_INT, 'Framework visibility', VALUE_DEFAULT, 1),
                    'ruleoutcome'       => new external_value(PARAM_INT, 'Rule outcome when course completed', VALUE_DEFAULT, 1),
                    'sortorder'         => new external_value(PARAM_INT, 'Sort order', VALUE_DEFAULT, 0),
                    'timecreated'       => new external_value(PARAM_INT, 'Time created', VALUE_DEFAULT, 0),
                    'enrolledcount'     => new external_value(PARAM_INT, 'Enrolled students count', VALUE_DEFAULT, 0),
                    'completedcount'    => new external_value(PARAM_INT, 'Students completed count', VALUE_DEFAULT, 0),
                    'progress'          => new external_value(PARAM_INT, 'Completion progress percentage', VALUE_DEFAULT, 0),
                    'activities'        => new external_multiple_structure(
                        new external_single_structure([
                            'id'          => new external_value(PARAM_INT, 'Module competency link ID'),
                            'cmid'        => new external_value(PARAM_INT, 'Course module ID'),
                            'modname'     => new external_value(PARAM_TEXT, 'Module type name'),
                            'name'        => new external_value(PARAM_TEXT, 'Activity name'),
                            'ruleoutcome' => new external_value(PARAM_INT, 'Rule outcome on activity completion'),
                            'sortorder'   => new external_value(PARAM_INT, 'Sort order', VALUE_DEFAULT, 0),
                            'timecreated' => new external_value(PARAM_INT, 'Time created', VALUE_DEFAULT, 0),
                        ]),
                        'Linked activities in this course',
                        VALUE_DEFAULT,
                        []
                    ),
                ]),
                'Competencies linked to course',
                VALUE_DEFAULT,
                []
            ),
        ]);
    }

    public static function course_cohort_action_parameters() {
        return new external_function_parameters([
            'action' => new external_value(PARAM_ALPHANUMEXT, 'add, remove, suspend, activate, set_group, set_expiration, message, sync'),
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
            'cohortids' => new external_multiple_structure(new external_value(PARAM_INT, 'Cohort ID'), 'Array of cohort IDs'),
            'groupid' => new external_value(PARAM_INT, 'Group ID', VALUE_DEFAULT, 0),
            'newgroupname' => new external_value(PARAM_TEXT, 'New group name if creating', VALUE_DEFAULT, ''),
            'timeend' => new external_value(PARAM_INT, 'Expiration time', VALUE_DEFAULT, 0),
            'message_text' => new external_value(PARAM_RAW, 'Message text', VALUE_DEFAULT, ''),
            'roleid' => new external_value(PARAM_INT, 'Role ID to assign (defaults to student)', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Perform cohort actions on a course (add, remove, suspend, etc.).
     *
     * @param string $action
     * @param int $courseid
     * @param array $cohortids
     * @param int $groupid
     * @param string $newgroupname
     * @param int $timeend
     * @param string $message_text
     * @param int $roleid
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function course_cohort_action($action, $courseid, $cohortids, $groupid = 0, $newgroupname = '', $timeend = 0, $message_text = '', $roleid = 0) {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/enrol/cohort/locallib.php');
        require_once($CFG->dirroot . '/group/lib.php');

        $context = context_system::instance();
        self::validate_context($context);

        $params = self::validate_parameters(self::course_cohort_action_parameters(), [
            'action' => $action,
            'courseid' => $courseid,
            'cohortids' => $cohortids,
            'groupid' => $groupid,
            'newgroupname' => $newgroupname,
            'timeend' => $timeend,
            'message_text' => $message_text,
            'roleid' => $roleid,
        ]);

        $coursecontext = \context_course::instance($params['courseid']);
        require_capability('moodle/course:enrolreview', $coursecontext);

        $course = $DB->get_record('course', ['id' => $params['courseid']], '*', MUST_EXIST);
        $enrolplugin = enrol_get_plugin('cohort');
        if (!$enrolplugin) {
            return ['success' => false, 'message' => 'Cohort enrol plugin is disabled.', 'affectedcount' => 0];
        }

        $affected = 0;
        $finalgroupid = $params['groupid'];

        $studentroleid = (int)\tool_management_console\repository\user_repository::get_role_id_by_shortname('student');
        if (!$studentroleid) {
            $studentroleid = (int)$DB->get_field('role', 'id', ['shortname' => 'student']);
        }
        $assignedroleid = !empty($params['roleid']) ? (int)$params['roleid'] : ($studentroleid ?: 5);

        $transaction = $DB->start_delegated_transaction();
        try {
            if (($params['action'] === 'add' || $params['action'] === 'set_group') && !empty($params['newgroupname'])) {
                require_capability('moodle/course:managegroups', $coursecontext);
                $newgroup = new \stdClass();
                $newgroup->courseid = $course->id;
                $newgroup->name = $params['newgroupname'];
                $finalgroupid = groups_create_group($newgroup);
            }

            foreach ($params['cohortids'] as $cohortid) {
                if ($params['action'] === 'add') {
                    $instance = $DB->get_record('enrol', ['enrol' => 'cohort', 'courseid' => $course->id, 'customint1' => $cohortid]);
                    if (!$instance) {
                        $enrolplugin->add_instance($course, [
                            'customint1' => $cohortid,
                            'customint2' => $finalgroupid,
                            'roleid'     => $assignedroleid,
                        ]);
                        
                        $instance = $DB->get_record('enrol', ['enrol' => 'cohort', 'courseid' => $course->id, 'customint1' => $cohortid]);
                        if ($instance && $params['timeend'] > 0) {
                            $DB->set_field('enrol', 'enrolenddate', $params['timeend'], ['id' => $instance->id]);
                        }
                        $affected++;
                    } else {
                        // Existing instance: repair missing role or update configuration.
                        $needs_sync = false;
                        if (empty($instance->roleid) || (int)$instance->roleid === 0) {
                            $DB->set_field('enrol', 'roleid', $assignedroleid, ['id' => $instance->id]);
                            $instance->roleid = $assignedroleid;
                            $needs_sync = true;
                        }
                        if ($finalgroupid > 0 && empty($instance->customint2)) {
                            $DB->set_field('enrol', 'customint2', $finalgroupid, ['id' => $instance->id]);
                        }
                        if ($params['timeend'] > 0) {
                            $DB->set_field('enrol', 'enrolenddate', $params['timeend'], ['id' => $instance->id]);
                            $DB->execute("UPDATE {user_enrolments} SET timeend = ? WHERE enrolid = ?", [$params['timeend'], $instance->id]);
                        }
                        if ($needs_sync) {
                            $trace = new \null_progress_trace();
                            enrol_cohort_sync($trace, $course->id);
                            $trace->finished();
                        }
                        $affected++;
                    }
                } else if ($params['action'] === 'remove') {
                    $instance = $DB->get_record('enrol', ['enrol' => 'cohort', 'courseid' => $course->id, 'customint1' => $cohortid]);
                    if ($instance) {
                        $enrolplugin->delete_instance($instance);
                        $affected++;
                    }
                } else if ($params['action'] === 'suspend' || $params['action'] === 'activate') {
                    $instance = $DB->get_record('enrol', ['enrol' => 'cohort', 'courseid' => $course->id, 'customint1' => $cohortid]);
                    if ($instance) {
                        $status = ($params['action'] === 'suspend') ? ENROL_INSTANCE_SUSPENDED : ENROL_INSTANCE_ENABLED;
                        $enrolplugin->update_status($instance, $status);
                        if ($params['action'] === 'activate' && (empty($instance->roleid) || (int)$instance->roleid === 0)) {
                            $DB->set_field('enrol', 'roleid', $assignedroleid, ['id' => $instance->id]);
                            $trace = new \null_progress_trace();
                            enrol_cohort_sync($trace, $course->id);
                            $trace->finished();
                        }
                        $affected++;
                    }
                } else if ($params['action'] === 'sync') {
                    $instance = $DB->get_record('enrol', ['enrol' => 'cohort', 'courseid' => $course->id, 'customint1' => $cohortid]);
                    if ($instance) {
                        if (empty($instance->roleid) || (int)$instance->roleid === 0) {
                            $DB->set_field('enrol', 'roleid', $assignedroleid, ['id' => $instance->id]);
                        }
                        $trace = new \null_progress_trace();
                        enrol_cohort_sync($trace, $course->id);
                        $trace->finished();
                        $affected++;
                    }
                } else if ($params['action'] === 'set_group') {
                    $instance = $DB->get_record('enrol', ['enrol' => 'cohort', 'courseid' => $course->id, 'customint1' => $cohortid]);
                    if ($instance) {
                        $DB->set_field('enrol', 'customint2', $finalgroupid, ['id' => $instance->id]);
                        $affected++;
                    }
                } else if ($params['action'] === 'set_expiration') {
                    $instance = $DB->get_record('enrol', ['enrol' => 'cohort', 'courseid' => $course->id, 'customint1' => $cohortid]);
                    if ($instance) {
                        $DB->set_field('enrol', 'enrolenddate', $params['timeend'], ['id' => $instance->id]);
                        $DB->execute("UPDATE {user_enrolments} SET timeend = ? WHERE enrolid = ?", [$params['timeend'], $instance->id]);
                        $affected++;
                    }
                } else if ($params['action'] === 'message') {
                    global $USER;
                    $instance = $DB->get_record('enrol', ['enrol' => 'cohort', 'courseid' => $course->id, 'customint1' => $cohortid]);
                    if ($instance && !empty($params['message_text'])) {
                        $users = $DB->get_records_menu('user_enrolments', ['enrolid' => $instance->id], '', 'userid, userid AS uid');
                        foreach ($users as $uid) {
                            $recipient = $DB->get_record('user', ['id' => $uid]);
                            if ($recipient) {
                                $message = new \core\message\message();
                                $message->courseid          = $course->id;
                                $message->component         = 'moodle';
                                $message->name              = 'instantmessage';
                                $message->userfrom          = $USER;
                                $message->userto            = $recipient;
                                $clean_msg = clean_text(substr($params['message_text'], 0, 65535), FORMAT_HTML);
                                $message->subject           = 'Mensaje';
                                $message->fullmessage       = $clean_msg;
                                $message->fullmessageformat = FORMAT_HTML;
                                $message->fullmessagehtml   = $clean_msg;
                                $message->smallmessage      = strip_tags($clean_msg);
                                message_send($message);
                                $affected++;
                            }
                        }
                    }
                }
            }
            $transaction->allow_commit();
        } catch (\Exception $e) {
            $transaction->rollback($e);
            return ['success' => false, 'message' => $e->getMessage(), 'affectedcount' => 0];
        }

        return [
            'success' => true,
            'message' => 'Cohorts updated.',
            'affectedcount' => $affected
        ];
    }

    public static function course_cohort_action_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success'),
            'message' => new external_value(PARAM_TEXT, 'Message'),
            'affectedcount' => new external_value(PARAM_INT, 'Affected count'),
        ]);
    }
    public static function course_user_action_parameters() {
        return new external_function_parameters([
            'action'   => new external_value(PARAM_ALPHANUMEXT, 'add, remove, suspend, activate, set_expiration, setgroup, message'),
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
            'userids'  => new external_multiple_structure(new external_value(PARAM_INT, 'User ID')),
            'timeend'  => new external_value(PARAM_INT, 'Expiration time', VALUE_DEFAULT, 0),
            'groupid'  => new external_value(PARAM_INT, 'Group ID', VALUE_DEFAULT, 0),
            'newgroupname' => new external_value(PARAM_TEXT, 'New group name', VALUE_DEFAULT, ''),
            'message_text' => new external_value(PARAM_RAW, 'Message text', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Perform user actions within a course (enrol, suspend, group assignment, etc.).
     *
     * @param string $action
     * @param int $courseid
     * @param array $userids
     * @param int $timeend
     * @param int $groupid
     * @param string $newgroupname
     * @param string $message_text
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function course_user_action($action, $courseid, $userids, $timeend = 0, $groupid = 0, $newgroupname = '', $message_text = '') {
        global $DB, $CFG;
        require_once($CFG->dirroot.'/group/lib.php');
        $context = context_system::instance();
        self::validate_context($context);
        
        $params = self::validate_parameters(self::course_user_action_parameters(), [
            'action' => $action, 'courseid' => $courseid, 'userids' => $userids,
            'timeend' => $timeend, 'groupid' => $groupid, 'newgroupname' => $newgroupname, 'message_text' => $message_text
        ]);

        $coursecontext = \context_course::instance($params['courseid']);
        require_capability('enrol/manual:enrol', $coursecontext);
        
        $enrol = enrol_get_plugin('manual');
        if (!$enrol) {
            return ['success' => false, 'message' => 'Manual enrolment plugin disabled'];
        }
        
        $instances = enrol_get_instances($params['courseid'], true);
        $manualinstance = null;
        foreach ($instances as $instance) {
            if ($instance->enrol === 'manual') {
                $manualinstance = $instance;
                break;
            }
        }
        
        if (!$manualinstance && in_array($params['action'], ['add', 'remove', 'suspend', 'activate', 'set_expiration'])) {
             return ['success' => false, 'message' => 'No manual enrolment instance found for course'];
        }
        
        $affected = 0;
        $roleid = $DB->get_field('role', 'id', ['shortname' => 'student']);

        $targetgroupid = $params['groupid'];

        $transaction = $DB->start_delegated_transaction();
        try {
            if ($params['action'] === 'setgroup' && $targetgroupid === 0 && !empty($params['newgroupname'])) {
                $newgroup = new \stdClass();
                $newgroup->courseid = $params['courseid'];
                $newgroup->name = $params['newgroupname'];
                $targetgroupid = groups_create_group($newgroup);
            }
            
            foreach ($params['userids'] as $uid) {
                if ($params['action'] === 'add') {
                    $enrol->enrol_user($manualinstance, $uid, $roleid);
                    $affected++;
                } else if ($params['action'] === 'remove') {
                    $enrol->unenrol_user($manualinstance, $uid);
                    $affected++;
                } else if ($params['action'] === 'suspend') {
                    $enrol->update_user_enrol($manualinstance, $uid, ENROL_USER_SUSPENDED);
                    $affected++;
                } else if ($params['action'] === 'activate') {
                    $enrol->update_user_enrol($manualinstance, $uid, ENROL_USER_ACTIVE);
                    $affected++;
                } else if ($params['action'] === 'set_expiration') {
                    $enrol->update_user_enrol($manualinstance, $uid, NULL, NULL, $params['timeend']);
                    $affected++;
                } else if ($params['action'] === 'setgroup') {
                    if ($targetgroupid > 0) {
                        if (groups_add_member($targetgroupid, $uid)) {
                            $affected++;
                        }
                    }
                } else if ($params['action'] === 'message') {
                    global $USER;
                    $recipient = $DB->get_record('user', ['id' => $uid]);
                    if ($recipient && !empty($params['message_text'])) {
                        $message = new \core\message\message();
                        $message->courseid          = $params['courseid'];
                        $message->component         = 'moodle';
                        $message->name              = 'instantmessage';
                        $message->userfrom          = $USER;
                        $message->userto            = $recipient;
                        $clean_msg = clean_text(substr($params['message_text'], 0, 65535), FORMAT_HTML);
                        $message->subject           = 'Mensaje';
                        $message->fullmessage       = $clean_msg;
                        $message->fullmessageformat = FORMAT_HTML;
                        $message->fullmessagehtml   = $clean_msg;
                        $message->smallmessage      = strip_tags($clean_msg);
                        message_send($message);
                        $affected++;
                    }
                }
            }
            $transaction->allow_commit();
        } catch (\Exception $e) {
            $transaction->rollback($e);
            return ['success' => false, 'message' => $e->getMessage(), 'affectedcount' => 0];
        }

        return [
            'success'       => true,
            'message'       => "Successfully processed $affected enrolments",
            'affectedcount' => $affected
        ];
    }

    public static function course_user_action_returns() {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'Success'),
            'message'       => new external_value(PARAM_TEXT, 'Message'),
            'affectedcount' => new external_value(PARAM_INT, 'Affected count'),
        ]);
    }

    public static function get_course_user_detail_parameters() {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
            'userid'   => new external_value(PARAM_INT, 'User ID'),
        ]);
    }

    public static function get_course_user_detail($courseid, $userid) {
        global $DB, $CFG;
        require_once($CFG->libdir.'/completionlib.php');
        require_once($CFG->libdir.'/gradelib.php');

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/course:view', $context);

        $params = self::validate_parameters(self::get_course_user_detail_parameters(), [
            'courseid' => $courseid,
            'userid'   => $userid,
        ]);

        $course = course_repository::get_course($params['courseid']);
        if (!$course) {
            throw new \moodle_exception('error', 'moodle', '', 'Course not found. courseid=' . $params['courseid']);
        }
        $user = \tool_management_console\repository\user_repository::get_user($params['userid']);
        if (!$user) {
            throw new \moodle_exception('error', 'moodle', '', 'User not found. userid=' . $params['userid']);
        }

        // Basic Info
        $userinfo = [
            'id' => (int)$user->id,
            'fullname' => fullname($user),
            'email' => $user->email,
        ];

        // Enrolment Data
        $enrolments_rs = course_repository::get_course_user_enrolments($course->id, $user->id);
        $enrolments = [];
        $status = 1; // Default suspended
        $timestart = 0;
        $timeend = 0;
        foreach ($enrolments_rs as $ue) {
            $enrolments[] = [
                'method' => (string)$ue->method,
                'status' => (int)$ue->status,
                'timestart' => (int)$ue->timestart > 0 ? (int)$ue->timestart : (int)$ue->timecreated,
                'timeend' => (int)$ue->timeend
            ];
            if ($ue->status == 0) $status = 0;
            if ($timestart == 0 || ($ue->timestart > 0 && $ue->timestart < $timestart)) {
                $timestart = (int)$ue->timestart > 0 ? (int)$ue->timestart : (int)$ue->timecreated;
            }
            if ($timeend == 0 || ($ue->timeend > 0 && $ue->timeend > $timeend)) {
                $timeend = (int)$ue->timeend;
            }
        }

        // Access Logs
        list($firstaccess, $lastaccess) = course_repository::get_course_user_first_and_last_access($course->id, $user->id);

        // Activities and Grades
        $modinfo = get_fast_modinfo($course);
        $cms = $modinfo->get_cms();
        
        $activities = [];
        $completed_count = 0;
        $total_tracked = 0;

        $completion = new \completion_info($course);
        
        foreach ($cms as $cm) {
            if (!$cm->uservisible) continue;
            
            $act = [
                'id' => (int)$cm->id,
                'name' => (string)$cm->name,
                'modname' => (string)$cm->modname,
                'completionstatus' => 0,
                'grade' => ''
            ];

            if ($completion->is_enabled($cm) != COMPLETION_TRACKING_NONE) {
                $total_tracked++;
                $cdata = $completion->get_data($cm, false, $user->id);
                $act['completionstatus'] = (int)$cdata->completionstate;
                if ($cdata->completionstate == COMPLETION_COMPLETE || $cdata->completionstate == COMPLETION_COMPLETE_PASS) {
                    $completed_count++;
                }
            }

            if (plugin_supports('mod', $cm->modname, FEATURE_GRADE_HAS_GRADE, false)) {
                $grade_item = \grade_item::fetch([
                    'itemtype' => 'mod',
                    'itemmodule' => $cm->modname,
                    'iteminstance' => $cm->instance,
                    'courseid' => $course->id
                ]);
                if ($grade_item) {
                    $grade_grade = \grade_grade::fetch(['itemid' => $grade_item->id, 'userid' => $user->id]);
                    if ($grade_grade && !is_null($grade_grade->finalgrade)) {
                        $act['grade'] = (string)format_float($grade_grade->finalgrade, $grade_item->get_decimals());
                    }
                }
            }

            $activities[] = $act;
        }

        $progress = $total_tracked > 0 ? round(($completed_count / $total_tracked) * 100) : 0;

        return [
            'user' => $userinfo,
            'status' => $status,
            'timestart' => $timestart,
            'timeend' => $timeend,
            'firstaccess' => $firstaccess,
            'lastaccess' => $lastaccess,
            'progress' => (int)$progress,
            'enrolments' => $enrolments,
            'activities' => $activities
        ];
    }

    public static function get_course_user_detail_returns() {
        return new external_single_structure([
            'user' => new external_single_structure([
                'id' => new external_value(PARAM_INT, 'User ID'),
                'fullname' => new external_value(PARAM_TEXT, 'Fullname'),
                'email' => new external_value(PARAM_TEXT, 'Email'),
            ]),
            'status' => new external_value(PARAM_INT, 'Global enrol status (0=active, 1=suspended)'),
            'timestart' => new external_value(PARAM_INT, 'Timestart'),
            'timeend' => new external_value(PARAM_INT, 'Timeend'),
            'firstaccess' => new external_value(PARAM_INT, 'First access timestamp'),
            'lastaccess' => new external_value(PARAM_INT, 'Last access timestamp'),
            'progress' => new external_value(PARAM_INT, 'Progress percentage'),
            'enrolments' => new external_multiple_structure(
                new external_single_structure([
                    'method' => new external_value(PARAM_ALPHANUMEXT, 'Method'),
                    'status' => new external_value(PARAM_INT, 'Status'),
                    'timestart' => new external_value(PARAM_INT, 'Timestart'),
                    'timeend' => new external_value(PARAM_INT, 'Timeend'),
                ])
            ),
            'activities' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'CM ID'),
                    'name' => new external_value(PARAM_TEXT, 'Activity name'),
                    'modname' => new external_value(PARAM_PLUGIN, 'Module name'),
                    'completionstatus' => new external_value(PARAM_INT, 'Completion status'),
                    'grade' => new external_value(PARAM_TEXT, 'Grade string'),
                ])
            )
        ]);
    }

    public static function upload_courses_csv_parameters() {
        return new external_function_parameters([
            'fileContent' => new external_value(PARAM_RAW, 'Base64 encoded CSV file content'),
        ]);
    }

    /**
     * Bulk upload courses via base64 encoded CSV string.
     *
     * @param string $fileContent
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function upload_courses_csv($fileContent) {
        global $CFG;
        require_once($CFG->dirroot . '/course/lib.php');

        $context = context_system::instance();
        self::validate_context($context);
        
        $params = self::validate_parameters(self::upload_courses_csv_parameters(), [
            'fileContent' => $fileContent
        ]);

        $csvContent = base64_decode($params['fileContent'], true);
        if ($csvContent === false) {
            return ['success' => false, 'message' => 'Invalid base64 encoding'];
        }

        if (strlen($csvContent) > 5242880) { // 5MB limit
            return ['success' => false, 'message' => 'File too large (limit 5MB)'];
        }

        $lines = explode("\n", str_replace("\r", "", $csvContent));
        if (count($lines) < 2) {
            return ['success' => false, 'message' => 'Empty CSV or missing header'];
        }

        $header = str_getcsv(array_shift($lines));
        $header = array_map('trim', $header);

        $shortnameIdx = array_search('shortname', $header);
        $fullnameIdx = array_search('fullname', $header);
        $categoryIdx = array_search('category', $header);

        if ($shortnameIdx === false || $fullnameIdx === false || $categoryIdx === false) {
            return ['success' => false, 'message' => 'Missing required columns: shortname, fullname, category'];
        }

        $successCount = 0;
        $errorCount = 0;
        $errors = [];
        $processed_shortnames = [];
        global $DB;

        foreach ($lines as $lineNum => $line) {
            $line = trim($line);
            if (empty($line)) continue;

            $data = str_getcsv($line);
            if (count($data) < count($header)) {
                $errorCount++;
                $errors[] = "Row " . ($lineNum + 2) . ": Incomplete data";
                continue;
            }

            $shortname = trim($data[$shortnameIdx]);
            $fullname = trim($data[$fullnameIdx]);
            $category = trim($data[$categoryIdx]);

            if (isset($processed_shortnames[$shortname])) {
                $errorCount++;
                $errors[] = "Row " . ($lineNum + 2) . ": Duplicate shortname in CSV ($shortname)";
                continue;
            }
            if ($DB->record_exists('course', ['shortname' => $shortname])) {
                $errorCount++;
                $errors[] = "Row " . ($lineNum + 2) . ": Shortname already exists ($shortname)";
                continue;
            }
            
            $processed_shortnames[$shortname] = true;

            $courseData = new stdClass();
            $courseData->shortname = $shortname;
            $courseData->fullname = $fullname;
            $courseData->category = (int)$category;
            $courseData->visible = 1;

            try {
                $catcontext = \context_coursecat::instance($courseData->category);
                require_capability('moodle/course:create', $catcontext);
                
                create_course($courseData);
                $successCount++;
            } catch (\Exception $e) {
                $errorCount++;
                $errors[] = "Row " . ($lineNum + 2) . " ($shortname): " . $e->getMessage();
            }
        }

        $msg = "Created $successCount courses. ";
        if ($errorCount > 0) {
            $msg .= "$errorCount errors. " . implode("; ", array_slice($errors, 0, 3)) . (count($errors) > 3 ? "..." : "");
        }

        return [
            'success' => $errorCount === 0,
            'message' => $msg
        ];
    }

    public static function upload_courses_csv_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'True if operation completely succeeded'),
            'message' => new external_value(PARAM_TEXT, 'Status description message'),
        ]);
    }
}
