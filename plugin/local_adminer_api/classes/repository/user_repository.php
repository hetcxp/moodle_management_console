<?php
namespace local_adminer_api\repository;

defined('MOODLE_INTERNAL') || die();

class user_repository {

    public static function get_users_kpi_stats($sqlparams) {
        global $DB;
        $sql_stats = "
            SELECT 
                COUNT(u.id) AS total_users,
                SUM(CASE WHEN u.suspended = 0 THEN 1 ELSE 0 END) AS active_users,
                SUM(CASE WHEN u.suspended = 1 THEN 1 ELSE 0 END) AS suspended_users,
                SUM(CASE WHEN u.lastaccess > :recent THEN 1 ELSE 0 END) AS recent_active
            FROM {user} u
            WHERE u.deleted = 0 AND u.id <> :adminid AND u.id <> :guestid
        ";
        return $DB->get_record_sql($sql_stats, $sqlparams);
    }

    public static function get_users_kpi_avg_progress($sqlparams) {
        global $DB;
        $sql_progress = "
            SELECT ROUND(AVG(
                CASE WHEN enr.enrolled > 0 THEN (COALESCE(cmp.completed, 0) * 100.0 / enr.enrolled) ELSE 0 END
            ), 1) AS avg_progress
            FROM (
                SELECT ue.userid, COUNT(DISTINCT ue.id) AS enrolled 
                  FROM {user_enrolments} ue
                  JOIN {user} u ON u.id = ue.userid
                 WHERE ue.status = 0 AND u.deleted = 0 AND u.id <> :adminid AND u.id <> :guestid
                 GROUP BY ue.userid
            ) enr
            LEFT JOIN (
                SELECT cc.userid, COUNT(DISTINCT cc.id) AS completed 
                  FROM {course_completions} cc
                  JOIN {user} u2 ON u2.id = cc.userid
                 WHERE cc.timecompleted IS NOT NULL AND u2.deleted = 0 AND u2.id <> :adminid2 AND u2.id <> :guestid2
                 GROUP BY cc.userid
            ) cmp ON cmp.userid = enr.userid
        ";
        $primaryadmin = get_admin();
        $defaultadminid = $primaryadmin ? (int)$primaryadmin->id : 1;
        $params = array_merge($sqlparams, [
            'adminid2' => $sqlparams['adminid'] ?? $defaultadminid,
            'guestid2' => $sqlparams['guestid'] ?? 0,
        ]);
        return $DB->get_field_sql($sql_progress, $params);
    }

    public static function get_users_filtered(array $params): array {
        global $DB, $CFG;

        $allowed_sorts = [
            'id'         => 'u.id',
            'firstname'  => 'u.firstname',
            'lastname'   => 'u.lastname',
            'email'      => 'u.email',
            'suspended'  => 'u.suspended',
            'lastaccess' => 'u.lastaccess',
            'cohorts'    => 'coh.cohorts_count',
            'courses'    => 'enr.enrolled_courses',
            'progress'   => 'progress_sort'
        ];

        $sort = $params['sort'] ?? 'lastaccess';
        if (!array_key_exists($sort, $allowed_sorts)) {
            $sort = 'lastaccess';
        }
        $sortfield = $allowed_sorts[$sort];
        $direction = strtoupper($params['dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

        $primaryadmin = get_admin();
        $adminid = $primaryadmin ? (int)$primaryadmin->id : 1;
        $guestid = $CFG->siteguest ?? 0;
        $where = "u.deleted = 0 AND u.id <> :adminid AND u.id <> :guestid";
        $sqlparams = ['adminid' => $adminid, 'guestid' => $guestid];
        if (!empty($params['search'])) {
            $searchlike = '%' . $params['search'] . '%';
            $where .= " AND (" . $DB->sql_like('u.firstname', ':search1', false, false) .
                      " OR " . $DB->sql_like('u.lastname', ':search2', false, false) .
                      " OR " . $DB->sql_like('u.email', ':search3', false, false) .
                      " OR " . $DB->sql_like('u.username', ':search4', false, false) . ")";
            $sqlparams['search1'] = $searchlike;
            $sqlparams['search2'] = $searchlike;
            $sqlparams['search3'] = $searchlike;
            $sqlparams['search4'] = $searchlike;
        }

        $decoded_filters = is_string($params['filters'] ?? null) ? json_decode($params['filters'], true) : ($params['filters'] ?? []);
        if (is_array($decoded_filters) && !empty($decoded_filters)) {
            $filter_index = 1;
            foreach ($decoded_filters as $key => $value) {
                if (array_key_exists($key, $allowed_sorts) && $value !== '') {
                    $fieldname = $allowed_sorts[$key];
                    if ($key === 'suspended') {
                        $where .= " AND $fieldname = :filterval$filter_index";
                        $sqlparams["filterval$filter_index"] = (int)$value;
                    } else if (is_string($value)) {
                        $where .= " AND " . $DB->sql_like($fieldname, ":filterval$filter_index", false, false);
                        $sqlparams["filterval$filter_index"] = '%' . $value . '%';
                    }
                    $filter_index++;
                } else if ($key === 'cohortid' && $value !== '' && $value !== '0') {
                    $where .= " AND EXISTS (SELECT 1 FROM {cohort_members} cm_f WHERE cm_f.userid = u.id AND cm_f.cohortid = :filterval$filter_index)";
                    $sqlparams["filterval$filter_index"] = (int)$value;
                    $filter_index++;
                }
            }
        }

        $sql_select = "
            SELECT u.id, u.username, u.firstname, u.lastname, u.email, u.suspended, u.lastaccess,
                   u.firstnamephonetic, u.lastnamephonetic, u.middlename, u.alternatename,
                   COALESCE(coh.cohorts_count, 0) AS cohorts_count,
                   COALESCE(enr.enrolled_courses, 0) AS enrolled_courses,
                   COALESCE(cmp.completed_courses, 0) AS completed_courses,
                   CASE 
                       WHEN COALESCE(enr.enrolled_courses, 0) > 0 
                       THEN ROUND((COALESCE(cmp.completed_courses, 0) * 100.0) / enr.enrolled_courses) 
                       ELSE 0 
                   END AS progress_sort
              FROM {user} u
         LEFT JOIN (
                SELECT userid, COUNT(id) AS cohorts_count
                  FROM {cohort_members}
              GROUP BY userid
         ) coh ON coh.userid = u.id
         LEFT JOIN (
                SELECT ue.userid, COUNT(DISTINCT ue.id) AS enrolled_courses
                  FROM {user_enrolments} ue
                  JOIN {enrol} e ON e.id = ue.enrolid
                 WHERE ue.status = 0
              GROUP BY ue.userid
         ) enr ON enr.userid = u.id
         LEFT JOIN (
                SELECT userid, COUNT(DISTINCT course) AS completed_courses
                  FROM {course_completions}
                 WHERE timecompleted IS NOT NULL
              GROUP BY userid
         ) cmp ON cmp.userid = u.id
             WHERE $where
          ORDER BY $sortfield $direction, u.id DESC
        ";

        $sql_count = "SELECT COUNT(u.id) FROM {user} u WHERE $where";
        $totalcount = (int)$DB->count_records_sql($sql_count, $sqlparams);

        $page = (int)($params['page'] ?? 0);
        $perpage = (int)($params['perpage'] ?? 20);
        $limitfrom = $page * $perpage;
        $records = $DB->get_records_sql($sql_select, $sqlparams, $limitfrom, $perpage);

        return [$records, $totalcount];
    }

    public static function count_users($sql_count, $sqlparams) {
        global $DB;
        return (int)$DB->count_records_sql($sql_count, $sqlparams);
    }

    public static function get_paginated_users($sql, $sqlparams, $limitfrom, $perpage) {
        global $DB;
        return $DB->get_records_sql($sql, $sqlparams, $limitfrom, $perpage);
    }

    public static function get_user($userid) {
        global $DB;
        return $DB->get_record('user', ['id' => $userid, 'deleted' => 0]);
    }

    public static function get_user_strict($userid) {
        global $DB;
        return $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);
    }

    public static function get_user_enrolled_courses($userid) {
        global $DB;
        $sql_courses = "
            SELECT c.id, c.fullname, c.shortname, MAX(e.enrol) as enrolmethod, MIN(ue.status) as enrolstatus
              FROM {course} c
              JOIN {enrol} e ON e.courseid = c.id
              JOIN {user_enrolments} ue ON ue.enrolid = e.id
             WHERE ue.userid = :userid
          GROUP BY c.id, c.fullname, c.shortname
        ";
        return $DB->get_records_sql($sql_courses, ['userid' => $userid]);
    }

    public static function get_user_all_enrolments($userid) {
        global $DB;
        $sql_all_enrolments = "
            SELECT ue.id, e.courseid, e.enrol as method, ue.status, ue.timestart, ue.timeend, ue.timecreated
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE ue.userid = :userid
        ";
        return $DB->get_records_sql($sql_all_enrolments, ['userid' => $userid]);
    }

    public static function get_user_cohorts($userid) {
        global $DB;
        $sql_cohorts = "
            SELECT c.id, c.name, c.idnumber
              FROM {cohort} c
              JOIN {cohort_members} cm ON cm.cohortid = c.id
             WHERE cm.userid = :userid
        ";
        return $DB->get_records_sql($sql_cohorts, ['userid' => $userid]);
    }

    public static function get_role_id_by_shortname($shortname = 'student') {
        global $DB;
        return $DB->get_field('role', 'id', ['shortname' => $shortname]);
    }

    public static function get_user_courses_progress_data($userid, array $enrolled_courses): array {
        global $DB, $CFG;
        if (empty($enrolled_courses)) {
            return [];
        }

        require_once($CFG->libdir . '/completionlib.php');

        $course_ids = array_keys($enrolled_courses);
        list($in_c_sql, $in_c_params) = $DB->get_in_or_equal($course_ids, SQL_PARAMS_NAMED, 'c');
        $params = array_merge(['userid' => $userid], $in_c_params);

        // Direct course completions (100%)
        $sql_completions = "
            SELECT course, 100 AS progress
              FROM {course_completions}
             WHERE userid = :userid AND course $in_c_sql AND timecompleted IS NOT NULL
        ";
        $completed_map = $DB->get_records_sql_menu($sql_completions, $params) ?: [];

        // Trackable activities by course
        $trackable_by_course = [];
        $all_cmids = [];
        foreach ($enrolled_courses as $c) {
            $course_obj = \local_adminer_api\repository\course_repository::get_course($c->id);
            if ($course_obj) {
                $cinfo = new \completion_info($course_obj);
                if ($cinfo->is_enabled()) {
                    $acts = $cinfo->get_activities();
                    $trackable_by_course[$c->id] = count($acts);
                    foreach (array_keys($acts) as $cmid) {
                        $all_cmids[$cmid] = $c->id;
                    }
                } else {
                    $trackable_by_course[$c->id] = 0;
                }
            }
        }

        // Batch fetch completed modules
        $cm_completed_counts = [];
        if (!empty($all_cmids)) {
            list($in_cm_sql, $in_cm_params) = $DB->get_in_or_equal(array_keys($all_cmids), SQL_PARAMS_NAMED, 'cm');
            $cm_params = array_merge(['userid' => $userid], $in_cm_params);
            $sql_cm = "
                SELECT cm.course, COUNT(DISTINCT cmc.coursemoduleid) as completed_count
                  FROM {course_modules_completion} cmc
                  JOIN {course_modules} cm ON cm.id = cmc.coursemoduleid
                 WHERE cmc.userid = :userid AND cmc.coursemoduleid $in_cm_sql AND cmc.completionstate IN (1, 2)
              GROUP BY cm.course
            ";
            $cm_completed_counts = $DB->get_records_sql_menu($sql_cm, $cm_params) ?: [];
        }

        $progress_map = [];
        foreach ($enrolled_courses as $c) {
            if (isset($completed_map[$c->id])) {
                $progress_map[$c->id] = 100;
            } else if (!empty($trackable_by_course[$c->id])) {
                $cm_done = isset($cm_completed_counts[$c->id]) ? (int)$cm_completed_counts[$c->id] : 0;
                $progress_map[$c->id] = (int)round(($cm_done / $trackable_by_course[$c->id]) * 100);
            } else {
                $progress_map[$c->id] = 0;
            }
        }

        return $progress_map;
    }
}
