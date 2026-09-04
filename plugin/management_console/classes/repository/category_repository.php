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
 * Category repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

defined('MOODLE_INTERNAL') || die();

/**
 * Category repository class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
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
                   COUNT(DISTINCT ue.userid) AS enrolledcount,
                   COUNT(DISTINCT ccmp.userid) AS completedcount
              FROM {course} c
         LEFT JOIN {enrol} e ON e.courseid = c.id
         LEFT JOIN {user_enrolments} ue ON ue.enrolid = e.id AND ue.status = 0
         LEFT JOIN {course_completions} ccmp ON ccmp.course = c.id AND ccmp.userid = ue.userid AND ccmp.timecompleted IS NOT NULL
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
