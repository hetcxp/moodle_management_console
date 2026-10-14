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

/**
 * Category repository class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class category_repository {
    /**
     * Count all course categories.
     *
     * @return int
     */
    public static function count_all(): int {
        global $DB;
        return (int)$DB->count_records('course_categories');
    }

    /**
     * Get paginated categories with parent names.
     *
     * @param int $page Page index.
     * @param int $perpage Items per page.
     * @return array
     */
    public static function get_paginated(int $page, int $perpage): array {
        global $DB;
        $sql = "
            SELECT cc.id, cc.name, cc.idnumber, cc.description, cc.parent, cc.visible, cc.coursecount,
                   COALESCE(p.name, '') AS parentname
              FROM {course_categories} cc
         LEFT JOIN {course_categories} p ON cc.parent = p.id
          ORDER BY cc.sortorder ASC, cc.name ASC
        ";
        $limitfrom = $page * $perpage;
        $records = $DB->get_records_sql($sql, [], $limitfrom, $perpage);
        foreach ($records as $rec) {
            $rec->description = clean_text((string)$rec->description, FORMAT_HTML);
        }
        return $records;
    }

    /**
     * Get all categories in flat list.
     *
     * @return array
     */
    public static function get_flat_categories(): array {
        global $DB;
        $fields = 'id, name, parent, depth, path, visible, coursecount';
        return $DB->get_records('course_categories', null, 'sortorder ASC, name ASC', $fields);
    }

    /**
     * Get courses belonging to category with enrolment and completion metrics.
     *
     * @param int $categoryid Category ID.
     * @param int $limitfrom Offset.
     * @param int $limitnum Limit.
     * @return array
     */
    public static function get_courses_by_category(int $categoryid, int $limitfrom = 0, int $limitnum = 200): array {
        global $DB;
        $sql = "
            SELECT c.id, c.fullname, c.shortname, c.visible,
                   COUNT(DISTINCT ue.userid) AS enrolledcount,
                   COUNT(DISTINCT ccmp.userid) AS completedcount
              FROM {course} c
         LEFT JOIN {enrol} e ON e.courseid = c.id
         LEFT JOIN {user_enrolments} ue ON ue.enrolid = e.id AND ue.status = 0
         LEFT JOIN {course_completions} ccmp ON ccmp.course = c.id AND ccmp.userid = ue.userid AND ccmp.timecompleted > 0
             WHERE c.category = :categoryid
          GROUP BY c.id, c.fullname, c.shortname, c.visible
          ORDER BY c.fullname ASC
        ";
        return $DB->get_records_sql($sql, ['categoryid' => $categoryid], $limitfrom, $limitnum);
    }

    /**
     * Get distinct active enrolled user IDs for a course.
     *
     * @param int $courseid Course ID.
     * @return array
     */
    public static function get_course_users(int $courseid): array {
        global $DB;
        $sqlusers = "SELECT DISTINCT ue.userid
                       FROM {enrol} e
                       JOIN {user_enrolments} ue ON ue.enrolid = e.id
                      WHERE e.courseid = :courseid AND ue.status = 0";
        return $DB->get_fieldset_sql($sqlusers, ['courseid' => $courseid]);
    }
}
