<?php
namespace local_adminer_api\repository;

defined('MOODLE_INTERNAL') || die();

class course_repository {

    public static function count_courses($sql_count, $params) {
        global $DB;
        return (int)$DB->count_records_sql($sql_count, $params);
    }

    public static function get_paginated_courses($sql, $params, $limitfrom, $perpage) {
        global $DB;
        return $DB->get_records_sql($sql, $params, $limitfrom, $perpage);
    }

    public static function get_course_kpis($sql_kpis, $params) {
        global $DB;
        return $DB->get_record_sql($sql_kpis, $params);
    }

    public static function get_course($courseid) {
        global $DB;
        return $DB->get_record('course', ['id' => $courseid]);
    }
    
    public static function get_course_strict($courseid) {
        global $DB;
        return $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
    }

    public static function get_enrolled_users($sql_users, $courseid) {
        global $DB;
        return $DB->get_records_sql($sql_users, ['courseid' => $courseid]);
    }

    public static function get_user_cohorts($sql_user_cohorts, $courseid) {
        global $DB;
        return $DB->get_recordset_sql($sql_user_cohorts, ['courseid' => $courseid]);
    }
}
