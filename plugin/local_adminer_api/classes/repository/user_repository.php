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
                CASE WHEN enr.enrolled > 0 THEN (cmp.completed * 100.0 / enr.enrolled) ELSE 0 END
            ), 1) AS avg_progress
            FROM {user} u
            LEFT JOIN (SELECT userid, COUNT(DISTINCT id) AS enrolled FROM {user_enrolments} WHERE status = 0 GROUP BY userid) enr ON enr.userid = u.id
            LEFT JOIN (SELECT userid, COUNT(DISTINCT id) AS completed FROM {course_completions} WHERE timecompleted IS NOT NULL GROUP BY userid) cmp ON cmp.userid = u.id
            WHERE u.deleted = 0 AND u.id <> :adminid AND u.id <> :guestid
        ";
        return $DB->get_field_sql($sql_progress, $sqlparams);
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
}
