<?php
namespace local_adminer_api\repository;

defined('MOODLE_INTERNAL') || die();

class cohort_repository {

    public static function count_cohorts($sql_count, $sqlparams = []) {
        global $DB;
        return (int)$DB->count_records_sql($sql_count, $sqlparams);
    }

    public static function get_paginated_cohorts($sql, $sqlparams, $limitfrom, $perpage) {
        global $DB;
        return $DB->get_records_sql($sql, $sqlparams, $limitfrom, $perpage);
    }

    public static function get_cohort_progress($cohortid) {
        global $DB;
        $sql_prog = "
            SELECT ROUND(AVG(
                CASE WHEN enr.enrolled > 0 THEN (cmp.completed * 100.0 / enr.enrolled) ELSE 0 END
            )) AS avg_progress
            FROM {cohort_members} cm
            JOIN {user} u ON u.id = cm.userid
            LEFT JOIN (SELECT userid, COUNT(DISTINCT id) AS enrolled FROM {user_enrolments} WHERE status = 0 GROUP BY userid) enr ON enr.userid = cm.userid
            LEFT JOIN (SELECT userid, COUNT(DISTINCT id) AS completed FROM {course_completions} WHERE timecompleted IS NOT NULL GROUP BY userid) cmp ON cmp.userid = cm.userid
            WHERE cm.cohortid = :cohortid AND u.deleted = 0
        ";
        return $DB->get_field_sql($sql_prog, ['cohortid' => $cohortid]);
    }

    public static function get_cohort($cohortid) {
        global $DB;
        return $DB->get_record('cohort', ['id' => $cohortid]);
    }

    public static function get_cohort_strict($cohortid) {
        global $DB;
        return $DB->get_record('cohort', ['id' => $cohortid], '*', MUST_EXIST);
    }

    public static function get_cohort_synced_courses($cohortid) {
        global $DB;
        $sql_courses = "
            SELECT c.*, e.id as enrolid,
                   (SELECT COUNT(ue.id) FROM {user_enrolments} ue WHERE ue.enrolid = e.id) as enrolledcount
              FROM {course} c
              JOIN {enrol} e ON e.courseid = c.id
             WHERE e.customint1 = :cohortid AND e.enrol = 'cohort'
        ";
        return $DB->get_records_sql($sql_courses, ['cohortid' => $cohortid]);
    }

    public static function get_cohort_members($cohortid) {
        global $DB;
        $sql_members = "
            SELECT u.id, u.firstname, u.lastname, u.email, u.lastaccess, u.suspended
              FROM {user} u
              JOIN {cohort_members} cm ON cm.userid = u.id
             WHERE cm.cohortid = :cohortid AND u.deleted = 0
        ";
        return $DB->get_records_sql($sql_members, ['cohortid' => $cohortid]);
    }

    public static function get_kpis() {
        global $DB;
        $sql_cohorts = "SELECT COUNT(id) FROM {cohort}";
        $total_cohorts = (int)$DB->count_records_sql($sql_cohorts);

        $sql_members = "SELECT COUNT(id) FROM {cohort_members}";
        $total_members = (int)$DB->count_records_sql($sql_members);

        $avg_members = $total_cohorts > 0 ? round($total_members / $total_cohorts, 1) : 0;

        $sql_empty = "
            SELECT COUNT(c.id) 
              FROM {cohort} c 
              WHERE NOT EXISTS (SELECT 1 FROM {cohort_members} cm WHERE cm.cohortid = c.id)
        ";
        $empty_cohorts = (int)$DB->count_records_sql($sql_empty);

        $sql_synced = "
            SELECT COUNT(DISTINCT customint1) 
              FROM {enrol} 
             WHERE enrol = 'cohort'
        ";
        $synced_courses = (int)$DB->count_records_sql($sql_synced);

        return [
            'total_cohorts' => $total_cohorts,
            'total_members' => $total_members,
            'avg_members' => $avg_members,
            'empty_cohorts' => $empty_cohorts,
            'synced_courses' => $synced_courses,
        ];
    }
}
