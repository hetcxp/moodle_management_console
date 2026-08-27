<?php
namespace local_adminer_api\repository;

defined('MOODLE_INTERNAL') || die();

class category_repository {

    public static function count_all() {
        global $DB;
        return (int)$DB->count_records('course_categories');
    }

    public static function get_paginated($page, $perpage) {
        global $DB;
        $sql = "
            SELECT cc.id, cc.name, cc.idnumber, cc.description, cc.parent, cc.visible, cc.coursecount,
                   COALESCE(p.name, '') AS parentname
              FROM {course_categories} cc
         LEFT JOIN {course_categories} p ON cc.parent = p.id
          ORDER BY cc.sortorder ASC, cc.name ASC
        ";
        $limitfrom = $page * $perpage;
        return $DB->get_records_sql($sql, [], $limitfrom, $perpage);
    }

    public static function get_flat_categories() {
        global $DB;
        return $DB->get_records('course_categories', null, 'sortorder ASC, name ASC', 'id, name, parent, depth, path, visible, coursecount');
    }

    public static function get_courses_by_category($categoryid) {
        global $DB;
        $sql = "
            SELECT c.id, c.fullname, c.shortname, c.visible,
                   COUNT(DISTINCT ue.userid) AS enrolledcount
              FROM {course} c
         LEFT JOIN {enrol} e ON e.courseid = c.id
         LEFT JOIN {user_enrolments} ue ON ue.enrolid = e.id AND ue.status = 0
             WHERE c.category = :categoryid
          GROUP BY c.id, c.fullname, c.shortname, c.visible
          ORDER BY c.fullname ASC
        ";
        return $DB->get_records_sql($sql, ['categoryid' => $categoryid]);
    }

    public static function get_course_users($courseid) {
        global $DB;
        $sql_users = "SELECT DISTINCT ue.userid 
                        FROM {enrol} e 
                        JOIN {user_enrolments} ue ON ue.enrolid = e.id 
                       WHERE e.courseid = :courseid AND ue.status = 0";
        return $DB->get_fieldset_sql($sql_users, ['courseid' => $courseid]);
    }
}
