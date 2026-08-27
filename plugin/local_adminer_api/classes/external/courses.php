<?php
namespace local_adminer_api\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;
use context_system;
use context_course;
use stdClass;
use local_adminer_api\repository\course_repository;

defined('MOODLE_INTERNAL') || die();


class courses extends external_api {

    public static function get_courses_parameters() {
        return new external_function_parameters([
            'page'       => new external_value(PARAM_INT, 'Page index starting from 0', VALUE_DEFAULT, 0),
            'perpage'    => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 20),
            'sort'       => new external_value(PARAM_ALPHA, 'Sort field', VALUE_DEFAULT, 'timecreated'),
            'dir'        => new external_value(PARAM_ALPHA, 'Sort direction ASC or DESC', VALUE_DEFAULT, 'DESC'),
            'search'     => new external_value(PARAM_RAW, 'Search query text', VALUE_DEFAULT, ''),
            'category'   => new external_value(PARAM_INT, 'Category filter id', VALUE_DEFAULT, 0),
            'visibility' => new external_value(PARAM_INT, 'Visibility filter -1:all, 1:visible, 0:hidden', VALUE_DEFAULT, -1),
            'filters'    => new external_value(PARAM_RAW, 'JSON encoded filters string', VALUE_DEFAULT, '{}'),
        ]);
    }

    public static function get_courses($page = 0, $perpage = 20, $sort = 'timecreated', $dir = 'DESC', $search = '', $category = 0, $visibility = -1, $filters = '{}') {
        global $DB;

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

        $sortablecolumns = [
            'id'            => 'c.id',
            'fullname'      => 'c.fullname',
            'shortname'     => 'c.shortname',
            'categoryname'  => 'cc.name',
            'visible'       => 'c.visible',
            'enrolledcount' => 'enr.enrolledcount',
            'completedcount'=> 'cmp.completedcount',
            'cohortscount'  => 'coh.cohortscount',
            'progress'      => 'progress_sort',
            'timecreated'   => 'c.timecreated',
            'startdate'     => 'c.startdate',
            'enddate'       => 'c.enddate'
        ];

        if (!array_key_exists($params['sort'], $sortablecolumns)) {
            $params['sort'] = 'timecreated';
        }
        $sortfield = $sortablecolumns[$params['sort']];
        $direction = strtoupper($params['dir']) === 'ASC' ? 'ASC' : 'DESC';

        $where = "c.id <> 1";
        $sqlparams = [];

        if (!empty($params['search'])) {
            $where .= " AND (" . $DB->sql_like('c.fullname', ':search1', false, false) .
                      " OR " . $DB->sql_like('c.shortname', ':search2', false, false) . ")";
            $sqlparams['search1'] = '%' . $params['search'] . '%';
            $sqlparams['search2'] = '%' . $params['search'] . '%';
        }

        if (!empty($params['category'])) {
            $where .= " AND c.category = :category";
            $sqlparams['category'] = $params['category'];
        }

        if ($params['visibility'] !== -1) {
            $where .= " AND c.visible = :visibility";
            $sqlparams['visibility'] = $params['visibility'];
        }

        $decoded_filters = json_decode($params['filters'], true);
        if (is_array($decoded_filters) && !empty($decoded_filters)) {
            $filter_index = 1;
            foreach ($decoded_filters as $key => $value) {
                if ($key === 'empty_only' && $value) {
                    $where .= " AND NOT EXISTS (
                        SELECT 1 FROM {enrol} filter_e 
                        JOIN {user_enrolments} filter_ue ON filter_e.id = filter_ue.enrolid 
                        WHERE filter_e.courseid = c.id AND filter_ue.status = 0
                    )";
                } else if ($key === 'exclude_category' && $value) {
                    $where .= " AND c.category != :filterval$filter_index";
                    $sqlparams["filterval$filter_index"] = (int)$value;
                    $filter_index++;
                } else if (array_key_exists($key, $sortablecolumns) && $value !== '') {
                    $fieldname = $sortablecolumns[$key];
                    if ($key === 'visible') {
                        $where .= " AND $fieldname = :filterval$filter_index";
                        $sqlparams["filterval$filter_index"] = (int)$value;
                    } else if (is_string($value)) {
                        $where .= " AND " . $DB->sql_like($fieldname, ":filterval$filter_index", false, false);
                        $sqlparams["filterval$filter_index"] = '%' . $value . '%';
                    }
                    $filter_index++;
                }
            }
        }

        $sql_select = "
            SELECT c.id, c.fullname, c.shortname, c.visible, c.timecreated, c.category, c.startdate, c.enddate,
                   COALESCE(cc.name, '') AS categoryname,
                   COALESCE(enr.enrolledcount, 0) AS enrolledcount,
                   COALESCE(cmp.completedcount, 0) AS completedcount,
                   COALESCE(coh.cohortscount, 0) AS cohortscount
              FROM {course} c
         LEFT JOIN {course_categories} cc ON c.category = cc.id
         LEFT JOIN (
            SELECT e.courseid, COUNT(DISTINCT ue.userid) as enrolledcount
              FROM {enrol} e
              JOIN {user_enrolments} ue ON e.id = ue.enrolid
             WHERE ue.status = 0
             GROUP BY e.courseid
         ) enr ON enr.courseid = c.id
         LEFT JOIN (
            SELECT ccmp.course, COUNT(DISTINCT ccmp.userid) as completedcount
              FROM {course_completions} ccmp
              JOIN {enrol} e ON e.courseid = ccmp.course
              JOIN {user_enrolments} ue ON e.id = ue.enrolid AND ue.userid = ccmp.userid
             WHERE ccmp.timecompleted IS NOT NULL AND ue.status = 0
             GROUP BY ccmp.course
         ) cmp ON cmp.course = c.id
         LEFT JOIN (
            SELECT e.courseid, COUNT(DISTINCT e.customint1) as cohortscount
              FROM {enrol} e
             WHERE e.enrol = 'cohort'
             GROUP BY e.courseid
         ) coh ON coh.courseid = c.id
             WHERE $where
        ";

        $sql_count = "SELECT COUNT(c.id) FROM {course} c WHERE $where";
        $totalcount = course_repository::count_courses($sql_count, $sqlparams);

        // Fetch paginated data
        // Calcular KPIs (ignorar paginación)
        $sql_kpis = "
            SELECT COUNT(c.id) AS total_courses,
                   SUM(COALESCE(enr.enrolledcount, 0)) AS total_enrolled,
                   SUM(COALESCE(cmp.completedcount, 0)) AS total_completed,
                   SUM(CASE WHEN COALESCE(enr.enrolledcount, 0) = 0 THEN 1 ELSE 0 END) AS empty_courses
              FROM {course} c
         LEFT JOIN (
            SELECT e.courseid, COUNT(DISTINCT ue.userid) as enrolledcount
              FROM {enrol} e
              JOIN {user_enrolments} ue ON e.id = ue.enrolid
             WHERE ue.status = 0
             GROUP BY e.courseid
         ) enr ON enr.courseid = c.id
         LEFT JOIN (
            SELECT ccmp.course, COUNT(DISTINCT ccmp.userid) as completedcount
              FROM {course_completions} ccmp
              JOIN {enrol} e ON e.courseid = ccmp.course
              JOIN {user_enrolments} ue ON e.id = ue.enrolid AND ue.userid = ccmp.userid
             WHERE ccmp.timecompleted IS NOT NULL AND ue.status = 0
             GROUP BY ccmp.course
         ) cmp ON cmp.course = c.id
             WHERE $where
        ";
        
        $kpi_record = course_repository::get_course_kpis($sql_kpis, $sqlparams);
        $global_enrolled = (int)($kpi_record->total_enrolled ?? 0);
        $kpis = [
            'total_courses' => (int)($kpi_record->total_courses ?? 0),
            'total_enrolled' => (int)($kpi_record->total_enrolled ?? 0),
            'avg_progress' => 0,
            'empty_courses' => (int)($kpi_record->empty_courses ?? 0),
        ];
        if ($kpis['total_enrolled'] > 0) {
            $kpis['avg_progress'] = round(((int)($kpi_record->total_completed ?? 0) / $kpis['total_enrolled']) * 100);
        }

        if ($params['sort'] === 'progress') {
            $orderby = "ORDER BY CASE WHEN enr.enrolledcount > 0 THEN (cmp.completedcount * 1.0 / enr.enrolledcount) ELSE 0 END $direction, c.id ASC";
        } else {
            $orderby = "ORDER BY $sortfield $direction";
        }

        $sql = $sql_select . " " . $orderby;
        $limitfrom = $params['page'] * $params['perpage'];
        $records = course_repository::get_paginated_courses($sql, $sqlparams, $limitfrom, $params['perpage']);

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
            'action'      => new external_value(PARAM_ALPHANUMEXT, 'Action: create, hide, show, delete, move, update_dates'),
            'courseids'   => new external_multiple_structure(new external_value(PARAM_INT, 'Course ID'), 'Array of course IDs', VALUE_DEFAULT, []),
            'categoryid'  => new external_value(PARAM_INT, 'Target category ID for move or create', VALUE_DEFAULT, 0),
            'fullname'    => new external_value(PARAM_TEXT, 'Course fullname for create', VALUE_DEFAULT, ''),
            'shortname'   => new external_value(PARAM_TEXT, 'Course shortname for create', VALUE_DEFAULT, ''),
            'summary'     => new external_value(PARAM_RAW, 'Course summary for create', VALUE_DEFAULT, ''),
            'visible'     => new external_value(PARAM_INT, 'Course visibility for create', VALUE_DEFAULT, 1),
            'startdate'   => new external_value(PARAM_INT, 'Course start date', VALUE_DEFAULT, 0),
            'enddate'     => new external_value(PARAM_INT, 'Course end date', VALUE_DEFAULT, 0),
        ]);
    }

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

        switch ($act) {
            case 'create':
                require_capability('moodle/course:create', $context);
                if (empty($params['fullname']) || empty($params['shortname']) || empty($params['categoryid'])) {
                    return ['success' => false, 'message' => 'fullname, shortname and categoryid are required.', 'affectedcount' => 0];
                }

                $data = new stdClass();
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
                return [
                    'success' => true,
                    'message' => 'Course created successfully with ID ' . $newcourse->id,
                    'affectedcount' => 1,
                ];

            case 'hide':
                require_capability('moodle/course:visibility', $context);
                foreach ($params['courseids'] as $cid) {
                    if ($cid > 1) {
                        course_change_visibility($cid, false);
                        $affected++;
                    }
                }
                break;

            case 'show':
                require_capability('moodle/course:visibility', $context);
                foreach ($params['courseids'] as $cid) {
                    if ($cid > 1) {
                        course_change_visibility($cid, true);
                        $affected++;
                    }
                }
                break;

            case 'delete':
                require_capability('moodle/course:delete', $context);
                foreach ($params['courseids'] as $cid) {
                    if ($cid > 1) {
                        $course = $DB->get_record('course', ['id' => $cid]);
                        if ($course) {
                            delete_course($course, false);
                            $affected++;
                        }
                    }
                }
                break;

            case 'move':
                require_capability('moodle/category:manage', $context);
                if (empty($params['categoryid'])) {
                    return ['success' => false, 'message' => 'categoryid is required to move courses.', 'affectedcount' => 0];
                }
                $validcids = array_filter($params['courseids'], fn($id) => $id > 1);
                if (!empty($validcids)) {
                    if (move_courses($validcids, $params['categoryid'])) {
                        $affected = count($validcids);
                    }
                }
                break;

            case 'update_dates':
                require_capability('moodle/course:update', $context);
                foreach ($params['courseids'] as $cid) {
                    if ($cid > 1) {
                        $course = $DB->get_record('course', ['id' => $cid]);
                        if ($course) {
                            $data = new stdClass();
                            $data->id = $cid;
                            $data->startdate = $params['startdate'] > 0 ? $params['startdate'] : 0;
                            $data->enddate = $params['enddate'] > 0 ? $params['enddate'] : 0;
                            update_course($data);
                            $affected++;
                        }
                    }
                }
                break;

            default:
                return ['success' => false, 'message' => 'Unknown action: ' . $act, 'affectedcount' => 0];
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
        global $DB;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/course:view', $context);

        $params = self::validate_parameters(self::get_course_detail_parameters(), [
            'courseid' => $courseid,
        ]);

        $course = $DB->get_record('course', ['id' => $params['courseid']], '*', MUST_EXIST);
        $coursecontext = \context_course::instance($course->id);

        // Obtener usuarios inscritos y su progreso
        $sql_users = "
            SELECT u.id, u.firstname, u.lastname, u.email, 
                   MIN(ue.status) as enrolstatus,
                   MIN(ue.timestart) as timestart, 
                   MAX(ue.timeend) as timeend, 
                   MIN(ue.timecreated) as timecreated,
                   COALESCE(ccmp.timecompleted, 0) as timecompleted
              FROM {user} u
              JOIN {user_enrolments} ue ON ue.userid = u.id
              JOIN {enrol} e ON e.id = ue.enrolid
         LEFT JOIN {course_completions} ccmp ON ccmp.userid = u.id AND ccmp.course = e.courseid
             WHERE e.courseid = :courseid AND u.deleted = 0
          GROUP BY u.id, u.firstname, u.lastname, u.email, ccmp.timecompleted
        ";
        $enrolled_users = $DB->get_records_sql($sql_users, ['courseid' => $course->id]);
        
        $sql_user_cohorts = "
            SELECT ue.userid, e.customint1 as cohortid
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE e.courseid = :courseid AND e.enrol = 'cohort'
        ";
        $user_cohorts_rs = $DB->get_recordset_sql($sql_user_cohorts, ['courseid' => $course->id]);
        $cohort_user_map = [];
        foreach ($user_cohorts_rs as $uc) {
            $cohort_user_map[$uc->userid][] = (int)$uc->cohortid;
        }
        $user_cohorts_rs->close();

        $sql_all_enrolments = "
            SELECT ue.id, ue.userid, e.enrol as method, ue.status, ue.timestart, ue.timeend, ue.timecreated
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE e.courseid = :courseid
        ";
        $all_enrolments = $DB->get_records_sql($sql_all_enrolments, ['courseid' => $course->id]);
        $user_enrolments_map = [];
        foreach ($all_enrolments as $ue) {
            $user_enrolments_map[$ue->userid][] = [
                'method' => (string)$ue->method,
                'status' => (int)$ue->status,
                'timestart' => (int)$ue->timestart > 0 ? (int)$ue->timestart : (int)$ue->timecreated,
                'timeend' => (int)$ue->timeend
            ];
        }

        // Get user roles
        $sql_roles = "
            SELECT ra.userid, r.shortname
              FROM {role_assignments} ra
              JOIN {role} r ON r.id = ra.roleid
              JOIN {context} ctx ON ctx.id = ra.contextid
             WHERE ctx.contextlevel = 50 AND ctx.instanceid = :courseid
        ";
        $role_assignments = $DB->get_records_sql($sql_roles, ['courseid' => $course->id]);
        $user_roles_map = [];
        foreach ($role_assignments as $ra) {
            $user_roles_map[$ra->userid][] = $ra->shortname;
        }

        $users = [];
        foreach ($enrolled_users as $u) {
            $progress = \core_completion\progress::get_course_progress_percentage($course, $u->id);
            $progress_val = $progress !== null ? (int)round($progress) : 0;
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

        // Obtener cohortes vinculadas (enrol = 'cohort')
        $sql_cohorts = "
            SELECT c.id, c.name, c.idnumber, e.id as enrolid, e.status as enrolstatus,
                   e.timecreated, e.enrolenddate, e.customint2 as groupid,
                   COUNT(DISTINCT ue.userid) as enrolledcount,
                   COUNT(DISTINCT ccmp.userid) as completedcount
              FROM {cohort} c
              JOIN {enrol} e ON e.customint1 = c.id
         LEFT JOIN {user_enrolments} ue ON ue.enrolid = e.id AND ue.status = 0
         LEFT JOIN {course_completions} ccmp ON ccmp.userid = ue.userid AND ccmp.course = e.courseid AND ccmp.timecompleted IS NOT NULL
             WHERE e.courseid = :courseid AND e.enrol = 'cohort'
          GROUP BY c.id, c.name, c.idnumber, e.id, e.status, e.timecreated, e.enrolenddate, e.customint2
        ";
        $linked_cohorts = $DB->get_records_sql($sql_cohorts, ['courseid' => $course->id]);

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

        $coursegroups = [];
        global $CFG;
        require_once($CFG->dirroot . '/group/lib.php');
        $groups = groups_get_all_groups($course->id);
        if ($groups) {
            foreach ($groups as $g) {
                $coursegroups[] = [
                    'id' => (int)$g->id,
                    'name' => (string)$g->name
                ];
            }
        }

        return [
            'id' => (int)$course->id,
            'fullname' => $course->fullname,
            'shortname' => $course->shortname,
            'timecreated' => (int)$course->timecreated,
            'startdate' => (int)$course->startdate,
            'enddate' => (int)$course->enddate,
            'users' => $users,
            'cohorts' => $cohorts,
            'coursegroups' => $coursegroups
        ];
    }

    public static function get_course_detail_returns() {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Course ID'),
            'fullname' => new external_value(PARAM_TEXT, 'Course fullname'),
            'shortname' => new external_value(PARAM_TEXT, 'Course shortname'),
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
                    'idnumber' => new external_value(PARAM_RAW, 'ID number'),
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
        ]);
    }

    public static function course_cohort_action_parameters() {
        return new external_function_parameters([
            'action' => new external_value(PARAM_ALPHANUMEXT, 'add, remove, suspend, activate, set_group, set_expiration, message'),
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
            'cohortids' => new external_multiple_structure(new external_value(PARAM_INT, 'Cohort ID'), 'Array of cohort IDs'),
            'groupid' => new external_value(PARAM_INT, 'Group ID', VALUE_DEFAULT, 0),
            'newgroupname' => new external_value(PARAM_TEXT, 'New group name if creating', VALUE_DEFAULT, ''),
            'timeend' => new external_value(PARAM_INT, 'Expiration time', VALUE_DEFAULT, 0),
            'message_text' => new external_value(PARAM_RAW, 'Message text', VALUE_DEFAULT, ''),
        ]);
    }

    public static function course_cohort_action($action, $courseid, $cohortids, $groupid = 0, $newgroupname = '', $timeend = 0, $message_text = '') {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/enrol/cohort/locallib.php');
        require_once($CFG->dirroot . '/group/lib.php');

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/course:enrolreview', $context);

        $params = self::validate_parameters(self::course_cohort_action_parameters(), [
            'action' => $action,
            'courseid' => $courseid,
            'cohortids' => $cohortids,
            'groupid' => $groupid,
            'newgroupname' => $newgroupname,
            'timeend' => $timeend,
            'message_text' => $message_text,
        ]);

        $course = $DB->get_record('course', ['id' => $params['courseid']], '*', MUST_EXIST);
        $enrolplugin = enrol_get_plugin('cohort');
        if (!$enrolplugin) {
            return ['success' => false, 'message' => 'Cohort enrol plugin is disabled.', 'affectedcount' => 0];
        }

        $affected = 0;
        $finalgroupid = $params['groupid'];
        
        if (($params['action'] === 'add' || $params['action'] === 'set_group') && !empty($params['newgroupname'])) {
            require_capability('moodle/course:managegroups', $context);
            $newgroup = new stdClass();
            $newgroup->courseid = $course->id;
            $newgroup->name = $params['newgroupname'];
            $finalgroupid = groups_create_group($newgroup);
        }

        foreach ($params['cohortids'] as $cohortid) {
            if ($params['action'] === 'add') {
                if (!$DB->record_exists('enrol', ['enrol' => 'cohort', 'courseid' => $course->id, 'customint1' => $cohortid])) {
                    $enrolplugin->add_instance($course, ['customint1' => $cohortid, 'customint2' => $finalgroupid]);
                    
                    $instance = $DB->get_record('enrol', ['enrol' => 'cohort', 'courseid' => $course->id, 'customint1' => $cohortid]);
                    if ($instance && $params['timeend'] > 0) {
                        $DB->set_field('enrol', 'enrolenddate', $params['timeend'], ['id' => $instance->id]);
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
                            $message->subject           = 'Mensaje';
                            $message->fullmessage       = $params['message_text'];
                            $message->fullmessageformat = FORMAT_HTML;
                            $message->fullmessagehtml   = $params['message_text'];
                            $message->smallmessage      = strip_tags($params['message_text']);
                            message_send($message);
                            $affected++;
                        }
                    }
                }
            }
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

    public static function course_user_action($action, $courseid, $userids, $timeend = 0, $groupid = 0, $newgroupname = '', $message_text = '') {
        global $DB, $CFG;
        require_once($CFG->dirroot.'/group/lib.php');
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('enrol/manual:enrol', $context);
        
        $params = self::validate_parameters(self::course_user_action_parameters(), [
            'action' => $action, 'courseid' => $courseid, 'userids' => $userids,
            'timeend' => $timeend, 'groupid' => $groupid, 'newgroupname' => $newgroupname, 'message_text' => $message_text
        ]);
        
        $enrol = enrol_get_plugin('manual');
        if (!$enrol) {
            return ['success' => false, 'message' => 'Manual enrolment plugin disabled'];
        }
        
        $coursecontext = \context_course::instance($params['courseid']);
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
                    $message->subject           = 'Mensaje';
                    $message->fullmessage       = $params['message_text'];
                    $message->fullmessageformat = FORMAT_HTML;
                    $message->fullmessagehtml   = $params['message_text'];
                    $message->smallmessage      = strip_tags($params['message_text']);
                    message_send($message);
                    $affected++;
                }
            }
        }
        return ['success' => true, 'message' => "Successfully processed $affected enrolments"];
    }

    public static function course_user_action_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success'),
            'message' => new external_value(PARAM_TEXT, 'Message'),
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

        $course = $DB->get_record('course', ['id' => $params['courseid']]);
        if (!$course) {
            throw new \moodle_exception('error', 'moodle', '', 'Course not found. courseid=' . $params['courseid']);
        }
        $user = $DB->get_record('user', ['id' => $params['userid']]);
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
        $sql_enrol = "
            SELECT ue.id, e.enrol as method, ue.status, ue.timestart, ue.timeend, ue.timecreated
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE e.courseid = :courseid AND ue.userid = :userid
        ";
        $enrolments_rs = $DB->get_records_sql($sql_enrol, ['courseid' => $course->id, 'userid' => $user->id]);
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
        $lastaccess_rec = $DB->get_record('user_lastaccess', ['courseid' => $course->id, 'userid' => $user->id]);
        $lastaccess = $lastaccess_rec ? (int)$lastaccess_rec->timeaccess : 0;
        
        $firstaccess = 0;
        if ($lastaccess > 0) {
            try {
                $sql_logs = "
                    SELECT MIN(timecreated) as firstaccess
                      FROM {logstore_standard_log}
                     WHERE courseid = :courseid AND userid = :userid
                ";
                $log_data = $DB->get_record_sql($sql_logs, ['courseid' => $course->id, 'userid' => $user->id]);
                if ($log_data && $log_data->firstaccess) {
                    $firstaccess = (int)$log_data->firstaccess;
                }
            } catch (\Throwable $e) {
                // Ignore exception if log table is missing or fails
            }
            if ($firstaccess == 0) {
                $firstaccess = $lastaccess;
            }
        }

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
                    'name' => new external_value(PARAM_RAW, 'Activity name'),
                    'modname' => new external_value(PARAM_PLUGIN, 'Module name'),
                    'completionstatus' => new external_value(PARAM_INT, 'Completion status'),
                    'grade' => new external_value(PARAM_RAW, 'Grade string'),
                ])
            )
        ]);
    }

    public static function upload_courses_csv_parameters() {
        return new external_function_parameters([
            'fileContent' => new external_value(PARAM_RAW, 'Base64 encoded CSV file content'),
        ]);
    }

    public static function upload_courses_csv($fileContent) {
        global $CFG;
        require_once($CFG->dirroot . '/course/lib.php');

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/course:create', $context);

        $params = self::validate_parameters(self::upload_courses_csv_parameters(), [
            'fileContent' => $fileContent
        ]);

        $csvContent = base64_decode($params['fileContent']);
        if ($csvContent === false) {
            return ['success' => false, 'message' => 'Invalid base64 encoding'];
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

            $courseData = new stdClass();
            $courseData->shortname = $shortname;
            $courseData->fullname = $fullname;
            $courseData->category = (int)$category;
            $courseData->visible = 1;

            try {
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
