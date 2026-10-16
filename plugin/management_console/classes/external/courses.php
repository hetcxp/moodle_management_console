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

use context_course;
use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use tool_management_console\application\courses\course_action_usecase;
use tool_management_console\application\courses\get_course_detail_usecase;
use tool_management_console\repository\course_repository;
use tool_management_console\repository\course_enrolment_repository;
use stdClass;

/**
 * Courses external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class courses extends external_api {
    /**
     * Parameter definition for get_courses.
     *
     * @return external_function_parameters
     */
    public static function get_courses_parameters(): external_function_parameters {
        return new external_function_parameters([
            'page'       => new external_value(PARAM_INT, 'Page index starting from 0', VALUE_DEFAULT, 0),
            'perpage'    => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 20),
            'sort'       => new external_value(PARAM_ALPHA, 'Sort field', VALUE_DEFAULT, 'timecreated'),
            'dir'        => new external_value(PARAM_ALPHA, 'Sort direction ASC or DESC', VALUE_DEFAULT, 'DESC'),
            'search'     => new external_value(PARAM_TEXT, 'Search query text', VALUE_DEFAULT, ''),
            'category'   => new external_value(PARAM_INT, 'Category filter id', VALUE_DEFAULT, 0),
            'visibility' => new external_value(
                PARAM_INT,
                'Visibility filter -1:all, 1:visible, 0:hidden',
                VALUE_DEFAULT,
                -1
            ),
            'filters'    => new external_value(PARAM_RAW, 'JSON encoded filters string', VALUE_DEFAULT, '{}'),
        ]);
    }

    /**
     * Get paginated and filtered courses list.
     *
     * @param int $page Page index starting from 0.
     * @param int $perpage Items per page.
     * @param string $sort Sort field.
     * @param string $dir Sort direction ASC or DESC.
     * @param string $search Search query text.
     * @param int $category Category filter id.
     * @param int $visibility Visibility filter -1:all, 1:visible, 0:hidden.
     * @param string $filters JSON encoded filters string.
     * @return array
     */
    public static function get_courses(
        int $page = 0,
        int $perpage = 20,
        string $sort = 'timecreated',
        string $dir = 'DESC',
        string $search = '',
        int $category = 0,
        int $visibility = -1,
        string $filters = '{}'
    ): array {
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

        // Defensive sanitization and boundary clamps.
        $params['page'] = max(0, (int)$params['page']);
        $params['perpage'] = min(max(1, (int)$params['perpage']), 200);

        $allowedsorts = [
            'id', 'fullname', 'shortname', 'categoryname', 'visible',
            'enrolledcount', 'completedcount', 'cohortscount',
            'competenciescount', 'progress', 'timecreated', 'startdate', 'enddate',
        ];
        if (!in_array($params['sort'], $allowedsorts, true)) {
            $params['sort'] = 'timecreated';
        }

        $params['dir'] = strtoupper($params['dir']) === 'ASC' ? 'ASC' : 'DESC';

        if (!in_array((int)$params['visibility'], [-1, 0, 1], true)) {
            $params['visibility'] = -1;
        }

        // Validate JSON structure safely.
        if (is_string($params['filters'])) {
            $decoded = json_decode($params['filters'], true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
                $params['filters'] = '{}';
            }
        }

        [$records, $totalcount, $kpis] = course_repository::get_courses_filtered($params);

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
                'competenciescount' => (int)($r->competenciescount ?? 0),
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

    /**
     * Return structure for get_courses.
     *
     * @return external_single_structure
     */
    public static function get_courses_returns(): external_single_structure {
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
                    'competenciescount' => new external_value(
                        PARAM_INT,
                        'Number of competencies linked to the course',
                        VALUE_DEFAULT,
                        0
                    ),
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

    /**
     * Parameter definition for course_action.
     *
     * @return external_function_parameters
     */
    public static function course_action_parameters(): external_function_parameters {
        return new external_function_parameters([
            'action'         => new external_value(
                PARAM_ALPHANUMEXT,
                'Action: create, hide, show, delete, move, update, update_dates'
            ),
            'courseids'      => new external_multiple_structure(
                new external_value(PARAM_INT, 'Course ID'),
                'Array of course IDs',
                VALUE_DEFAULT,
                []
            ),
            'categoryid'     => new external_value(PARAM_INT, 'Target category ID for move or create', VALUE_DEFAULT, 0),
            'fullname'       => new external_value(PARAM_TEXT, 'Course fullname for create or update', VALUE_DEFAULT, ''),
            'shortname'      => new external_value(PARAM_TEXT, 'Course shortname for create or update', VALUE_DEFAULT, ''),
            'summary'        => new external_value(PARAM_RAW, 'Course summary for create or update', VALUE_DEFAULT, ''),
            'visible'        => new external_value(PARAM_INT, 'Course visibility for create', VALUE_DEFAULT, 1),
            'startdate'      => new external_value(PARAM_INT, 'Course start date', VALUE_DEFAULT, 0),
            'enddate'        => new external_value(PARAM_INT, 'Course end date', VALUE_DEFAULT, 0),
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
    public static function course_action(
        string $action,
        array $courseids = [],
        int $categoryid = 0,
        string $fullname = '',
        string $shortname = '',
        string $summary = '',
        int $visible = 1,
        int $startdate = 0,
        int $enddate = 0
    ): array {
        $context = context_system::instance();
        self::validate_context($context);

        $params = self::validate_parameters(self::course_action_parameters(), [
            'action'         => $action,
            'courseids'      => $courseids,
            'categoryid'     => $categoryid,
            'fullname'       => $fullname,
            'shortname'      => $shortname,
            'summary'        => $summary,
            'visible'        => $visible,
            'startdate'      => $startdate,
            'enddate'        => $enddate,
        ]);

        return course_action_usecase::execute($params);
    }

    /**
     * Return structure for course_action.
     *
     * @return external_single_structure
     */
    public static function course_action_returns(): external_single_structure {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message'       => new external_value(PARAM_TEXT, 'Status description message'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of courses affected'),
        ]);
    }

    /**
     * Parameter definition for get_course_detail.
     *
     * @return external_function_parameters
     */
    public static function get_course_detail_parameters(): external_function_parameters {
        return new external_function_parameters([
            'courseid'  => new external_value(PARAM_INT, 'Course ID'),
            'limitfrom' => new external_value(PARAM_INT, 'Offset for enrolled users', VALUE_DEFAULT, 0),
            'limitnum'  => new external_value(
                PARAM_INT,
                'Limit for enrolled users (max 500, default 200)',
                VALUE_DEFAULT,
                0
            ),
        ]);
    }

    /**
     * Get detailed information for a single course including enrolments, cohorts and competencies.
     *
     * @param int $courseid Course ID.
     * @param int $limitfrom Offset for enrolled users.
     * @param int $limitnum Limit for enrolled users.
     * @return array
     */
    public static function get_course_detail(int $courseid, int $limitfrom = 0, int $limitnum = 0): array {
        $params = self::validate_parameters(self::get_course_detail_parameters(), [
            'courseid'  => $courseid,
            'limitfrom' => $limitfrom,
            'limitnum'  => $limitnum,
        ]);

        $course = course_repository::get_course_strict($params['courseid']);
        $context = context_course::instance($course->id);
        self::validate_context($context);

        return get_course_detail_usecase::execute(
            (int)$course->id,
            (int)$params['limitfrom'],
            (int)$params['limitnum']
        );
    }

    /**
     * Return structure for get_course_detail.
     *
     * @return external_single_structure
     */
    public static function get_course_detail_returns(): external_single_structure {
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
                    'ruleoutcome'       => new external_value(
                        PARAM_INT,
                        'Rule outcome when course completed',
                        VALUE_DEFAULT,
                        1
                    ),
                    'sortorder'         => new external_value(PARAM_INT, 'Sort order', VALUE_DEFAULT, 0),
                    'timecreated'       => new external_value(PARAM_INT, 'Time created', VALUE_DEFAULT, 0),
                    'enrolledcount'     => new external_value(PARAM_INT, 'Enrolled students count', VALUE_DEFAULT, 0),
                    'completedcount'    => new external_value(PARAM_INT, 'Students completed count', VALUE_DEFAULT, 0),
                    'progress'          => new external_value(
                        PARAM_INT,
                        'Completion progress percentage',
                        VALUE_DEFAULT,
                        0
                    ),
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

    // Backward compatibility proxy delegations.

    /**
     * Parameter definition for course_cohort_action proxy.
     *
     * @return external_function_parameters
     */
    public static function course_cohort_action_parameters(): external_function_parameters {
        return course_enrollments::course_cohort_action_parameters();
    }

    /**
     * Proxy for course cohort actions.
     *
     * @param string $action Action name.
     * @param int $courseid Course ID.
     * @param array $cohortids Array of cohort IDs.
     * @param int $groupid Target group ID.
     * @param string $newgroupname New group name if creating.
     * @param int $timeend Expiration time.
     * @param string $messagetext Message text.
     * @param int $roleid Role ID.
     * @return array
     */
    public static function course_cohort_action(
        $action,
        $courseid,
        $cohortids,
        $groupid = 0,
        $newgroupname = '',
        $timeend = 0,
        $messagetext = '',
        $roleid = 0
    ): array {
        return course_enrollments::course_cohort_action(
            $action,
            $courseid,
            $cohortids,
            $groupid,
            $newgroupname,
            $timeend,
            $messagetext,
            $roleid
        );
    }

    /**
     * Return structure for course_cohort_action proxy.
     *
     * @return external_single_structure
     */
    public static function course_cohort_action_returns(): external_single_structure {
        return course_enrollments::course_cohort_action_returns();
    }

    /**
     * Parameter definition for course_user_action proxy.
     *
     * @return external_function_parameters
     */
    public static function course_user_action_parameters(): external_function_parameters {
        return course_enrollments::course_user_action_parameters();
    }

    /**
     * Proxy for course user actions.
     *
     * @param string $action Action name.
     * @param int $courseid Course ID.
     * @param array $userids Array of user IDs.
     * @param int $timeend Expiration time.
     * @param int $groupid Group ID.
     * @param string $newgroupname New group name.
     * @param string $messagetext Message text.
     * @return array
     */
    public static function course_user_action(
        $action,
        $courseid,
        $userids,
        $timeend = 0,
        $groupid = 0,
        $newgroupname = '',
        $messagetext = ''
    ): array {
        return course_enrollments::course_user_action(
            $action,
            $courseid,
            $userids,
            $timeend,
            $groupid,
            $newgroupname,
            $messagetext
        );
    }

    /**
     * Return structure for course_user_action proxy.
     *
     * @return external_single_structure
     */
    public static function course_user_action_returns(): external_single_structure {
        return course_enrollments::course_user_action_returns();
    }

    /**
     * Parameter definition for get_course_user_detail proxy.
     *
     * @return external_function_parameters
     */
    public static function get_course_user_detail_parameters(): external_function_parameters {
        return course_enrollments::get_course_user_detail_parameters();
    }

    /**
     * Proxy for get course user detail.
     *
     * @param int $courseid Course ID.
     * @param int $userid User ID.
     * @return array
     */
    public static function get_course_user_detail($courseid, $userid): array {
        return course_enrollments::get_course_user_detail($courseid, $userid);
    }

    /**
     * Return structure for get_course_user_detail proxy.
     *
     * @return external_single_structure
     */
    public static function get_course_user_detail_returns(): external_single_structure {
        return course_enrollments::get_course_user_detail_returns();
    }

    /**
     * Parameter definition for upload_courses_csv proxy.
     *
     * @return external_function_parameters
     */
    public static function upload_courses_csv_parameters(): external_function_parameters {
        return course_csv::upload_courses_csv_parameters();
    }

    /**
     * Proxy for bulk course CSV upload.
     *
     * @param string $filecontent Base64 encoded file content.
     * @return array
     */
    public static function upload_courses_csv($filecontent): array {
        return course_csv::upload_courses_csv($filecontent);
    }

    /**
     * Return structure for upload_courses_csv proxy.
     *
     * @return external_single_structure
     */
    public static function upload_courses_csv_returns(): external_single_structure {
        return course_csv::upload_courses_csv_returns();
    }

    /**
     * Parameter definition for list_server_backups proxy.
     *
     * @return external_function_parameters
     */
    public static function list_server_backups_parameters(): external_function_parameters {
        return course_backups::list_server_backups_parameters();
    }

    /**
     * Proxy for list server backups.
     *
     * @return array
     */
    public static function list_server_backups(): array {
        return course_backups::list_server_backups();
    }

    /**
     * Return structure for list_server_backups proxy.
     *
     * @return external_multiple_structure
     */
    public static function list_server_backups_returns(): external_multiple_structure {
        return course_backups::list_server_backups_returns();
    }

    /**
     * Parameter definition for restore_course_mbz proxy.
     *
     * @return external_function_parameters
     */
    public static function restore_course_mbz_parameters(): external_function_parameters {
        return course_backups::restore_course_mbz_parameters();
    }

    /**
     * Proxy for restoring course MBZ.
     *
     * @param string $backupfile Server path or file name.
     * @param int $categoryid Destination category ID.
     * @param string $fullname Course fullname.
     * @param string $shortname Course shortname.
     * @param int $courseid Destination course ID if existing.
     * @return array
     */
    public static function restore_course_mbz(
        $backupfile,
        $categoryid,
        $fullname = '',
        $shortname = '',
        $courseid = 0
    ): array {
        return course_backups::restore_course_mbz(
            $backupfile,
            $categoryid,
            $fullname,
            $shortname,
            $courseid
        );
    }

    /**
     * Return structure for restore_course_mbz proxy.
     *
     * @return external_single_structure
     */
    public static function restore_course_mbz_returns(): external_single_structure {
        return course_backups::restore_course_mbz_returns();
    }
}
