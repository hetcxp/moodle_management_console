<?php
namespace local_adminer_api\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;
use context_system;
use stdClass;

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
            'timecreated'   => 'c.timecreated'
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
                if (array_key_exists($key, $sortablecolumns) && $value !== '') {
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
            SELECT c.id, c.fullname, c.shortname, c.visible, c.timecreated, c.category,
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
        $totalcount = (int)$DB->count_records_sql($sql_count, $sqlparams);

        if ($params['sort'] === 'progress') {
            $orderby = "ORDER BY CASE WHEN enr.enrolledcount > 0 THEN (cmp.completedcount * 1.0 / enr.enrolledcount) ELSE 0 END $direction, c.id ASC";
        } else {
            $orderby = "ORDER BY $sortfield $direction";
        }

        $sql = $sql_select . " " . $orderby;
        $limitfrom = $params['page'] * $params['perpage'];
        $records = $DB->get_records_sql($sql, $sqlparams, $limitfrom, $params['perpage']);

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
                    'category'         => new external_value(PARAM_INT, 'Category ID'),
                    'categoryname'     => new external_value(PARAM_TEXT, 'Category name'),
                    'enrolledcount'    => new external_value(PARAM_INT, 'Number of enrolled active users'),
                    'completedcount'   => new external_value(PARAM_INT, 'Number of users who completed the course'),
                    'cohortscount'     => new external_value(PARAM_INT, 'Number of cohort enrolments'),
                    'progress_percent' => new external_value(PARAM_INT, 'Average completion percentage'),
                ])
            ),
        ]);
    }

    public static function course_action_parameters() {
        return new external_function_parameters([
            'action'      => new external_value(PARAM_ALPHA, 'Action: create, hide, show, delete, move'),
            'courseids'   => new external_multiple_structure(new external_value(PARAM_INT, 'Course ID'), 'Array of course IDs', VALUE_DEFAULT, []),
            'categoryid'  => new external_value(PARAM_INT, 'Target category ID for move or create', VALUE_DEFAULT, 0),
            'fullname'    => new external_value(PARAM_TEXT, 'Course fullname for create', VALUE_DEFAULT, ''),
            'shortname'   => new external_value(PARAM_TEXT, 'Course shortname for create', VALUE_DEFAULT, ''),
            'summary'     => new external_value(PARAM_RAW, 'Course summary for create', VALUE_DEFAULT, ''),
            'visible'     => new external_value(PARAM_INT, 'Course visibility for create', VALUE_DEFAULT, 1),
        ]);
    }

    public static function course_action($action, $courseids = [], $categoryid = 0, $fullname = '', $shortname = '', $summary = '', $visible = 1) {
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
                   COALESCE(ccmp.timecompleted, 0) as timecompleted
              FROM {user} u
              JOIN {user_enrolments} ue ON ue.userid = u.id
              JOIN {enrol} e ON e.id = ue.enrolid
         LEFT JOIN {course_completions} ccmp ON ccmp.userid = u.id AND ccmp.course = e.courseid
             WHERE e.courseid = :courseid AND ue.status = 0 AND u.deleted = 0
          GROUP BY u.id, u.firstname, u.lastname, u.email, ccmp.timecompleted
        ";
        $enrolled_users = $DB->get_records_sql($sql_users, ['courseid' => $course->id]);
        
        $users = [];
        foreach ($enrolled_users as $u) {
            $users[] = [
                'id' => (int)$u->id,
                'fullname' => fullname($u),
                'email' => $u->email,
                'progress' => $u->timecompleted > 0 ? 100 : 0 // Simplificado
            ];
        }

        // Obtener cohortes vinculadas (enrol = 'cohort')
        $sql_cohorts = "
            SELECT c.id, c.name, c.idnumber, e.id as enrolid
              FROM {cohort} c
              JOIN {enrol} e ON e.customint1 = c.id
             WHERE e.courseid = :courseid AND e.enrol = 'cohort'
        ";
        $linked_cohorts = $DB->get_records_sql($sql_cohorts, ['courseid' => $course->id]);

        $cohorts = [];
        foreach ($linked_cohorts as $c) {
            $cohorts[] = [
                'id' => (int)$c->id,
                'name' => (string)$c->name,
                'idnumber' => (string)$c->idnumber,
                'enrolid' => (int)$c->enrolid
            ];
        }

        return [
            'id' => (int)$course->id,
            'fullname' => $course->fullname,
            'shortname' => $course->shortname,
            'users' => $users,
            'cohorts' => $cohorts
        ];
    }

    public static function get_course_detail_returns() {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Course ID'),
            'fullname' => new external_value(PARAM_TEXT, 'Course fullname'),
            'shortname' => new external_value(PARAM_TEXT, 'Course shortname'),
            'users' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'User ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'User fullname'),
                    'email' => new external_value(PARAM_TEXT, 'User email'),
                    'progress' => new external_value(PARAM_INT, 'Progress percentage'),
                ])
            ),
            'cohorts' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Cohort ID'),
                    'name' => new external_value(PARAM_TEXT, 'Cohort name'),
                    'idnumber' => new external_value(PARAM_RAW, 'ID number'),
                    'enrolid' => new external_value(PARAM_INT, 'Enrol instance ID'),
                ])
            ),
        ]);
    }

    public static function course_cohort_action_parameters() {
        return new external_function_parameters([
            'action' => new external_value(PARAM_ALPHA, 'add or remove'),
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
            'cohortids' => new external_multiple_structure(new external_value(PARAM_INT, 'Cohort ID'), 'Array of cohort IDs'),
        ]);
    }

    public static function course_cohort_action($action, $courseid, $cohortids) {
        global $DB;
        require_once(__DIR__ . '/../../../../enrol/cohort/locallib.php');

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/course:enrolreview', $context);

        $params = self::validate_parameters(self::course_cohort_action_parameters(), [
            'action' => $action,
            'courseid' => $courseid,
            'cohortids' => $cohortids,
        ]);

        $course = $DB->get_record('course', ['id' => $params['courseid']], '*', MUST_EXIST);
        $enrolplugin = enrol_get_plugin('cohort');
        if (!$enrolplugin) {
            return ['success' => false, 'message' => 'Cohort enrol plugin is disabled.', 'affectedcount' => 0];
        }

        $affected = 0;
        foreach ($params['cohortids'] as $cohortid) {
            if ($params['action'] === 'add') {
                if (!$DB->record_exists('enrol', ['enrol' => 'cohort', 'courseid' => $course->id, 'customint1' => $cohortid])) {
                    $enrolplugin->add_instance($course, ['customint1' => $cohortid]);
                    $affected++;
                }
            } else if ($params['action'] === 'remove') {
                $instance = $DB->get_record('enrol', ['enrol' => 'cohort', 'courseid' => $course->id, 'customint1' => $cohortid]);
                if ($instance) {
                    $enrolplugin->delete_instance($instance);
                    $affected++;
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
            'action'   => new external_value(PARAM_ALPHA, 'add or remove'),
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
            'userids'  => new external_multiple_structure(new external_value(PARAM_INT, 'User ID')),
        ]);
    }

    public static function course_user_action($action, $courseid, $userids) {
        global $DB;
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('enrol/manual:enrol', $context);
        
        $params = self::validate_parameters(self::course_user_action_parameters(), [
            'action' => $action, 'courseid' => $courseid, 'userids' => $userids
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
        
        if (!$manualinstance) {
             return ['success' => false, 'message' => 'No manual enrolment instance found for course'];
        }
        
        $affected = 0;
        $roleid = $DB->get_field('role', 'id', ['shortname' => 'student']);
        
        foreach ($params['userids'] as $uid) {
            if ($params['action'] === 'add') {
                $enrol->enrol_user($manualinstance, $uid, $roleid);
                $affected++;
            } else if ($params['action'] === 'remove') {
                $enrol->unenrol_user($manualinstance, $uid);
                $affected++;
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
}
