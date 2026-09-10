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
 * Course enrolment and progress repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

defined('MOODLE_INTERNAL') || die();

/**
 * Repository specialized in course enrolments, completions, and user activity metrics.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class course_enrolment_repository {

    public static function get_course_enrolled_users_detail($courseid) {
        global $DB;
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
        return $DB->get_records_sql($sql_users, ['courseid' => $courseid]);
    }

    public static function get_course_user_cohort_map($courseid) {
        global $DB;
        $sql = "
            SELECT ue.userid, e.customint1 as cohortid
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE e.courseid = :courseid AND e.enrol = 'cohort'
        ";
        $rs = $DB->get_recordset_sql($sql, ['courseid' => $courseid]);
        $map = [];
        foreach ($rs as $uc) {
            $map[$uc->userid][] = (int)$uc->cohortid;
        }
        $rs->close();
        return $map;
    }

    public static function get_course_all_enrolments($courseid) {
        global $DB;
        $sql = "
            SELECT ue.id, ue.userid, e.enrol as method, ue.status, ue.timestart, ue.timeend, ue.timecreated
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE e.courseid = :courseid
        ";
        return $DB->get_records_sql($sql, ['courseid' => $courseid]);
    }

    public static function get_course_user_roles_map($courseid) {
        global $DB;
        $sql = "
            SELECT ra.userid, r.shortname
              FROM {role_assignments} ra
              JOIN {role} r ON r.id = ra.roleid
              JOIN {context} ctx ON ctx.id = ra.contextid
             WHERE ctx.contextlevel = 50 AND ctx.instanceid = :courseid
        ";
        $assignments = $DB->get_records_sql($sql, ['courseid' => $courseid]);
        $map = [];
        foreach ($assignments as $ra) {
            $map[$ra->userid][] = $ra->shortname;
        }
        return $map;
    }

    public static function get_course_cm_completions(array $cmids) {
        global $DB;
        if (empty($cmids)) {
            return [];
        }
        list($incmids, $cmparams) = $DB->get_in_or_equal($cmids, SQL_PARAMS_NAMED, 'cm');
        $sql = "
            SELECT userid, COUNT(DISTINCT coursemoduleid) as completedcount
              FROM {course_modules_completion}
             WHERE coursemoduleid $incmids
               AND completionstate IN (1, 2)
          GROUP BY userid
        ";
        return $DB->get_records_sql_menu($sql, $cmparams);
    }

    public static function get_course_linked_cohorts($courseid) {
        global $DB;
        $sql = "
            SELECT c.id, c.name, c.idnumber, e.id as enrolid, e.status as enrolstatus,
                   e.timecreated, e.enrolenddate, e.customint2 as groupid, e.roleid,
                   COUNT(DISTINCT ue.userid) as enrolledcount,
                   COUNT(DISTINCT ccmp.userid) as completedcount
              FROM {cohort} c
              JOIN {enrol} e ON e.customint1 = c.id
         LEFT JOIN {user_enrolments} ue ON ue.enrolid = e.id AND ue.status = 0
         LEFT JOIN {course_completions} ccmp ON ccmp.userid = ue.userid AND ccmp.course = e.courseid AND ccmp.timecompleted IS NOT NULL
             WHERE e.courseid = :courseid AND e.enrol = 'cohort'
          GROUP BY c.id, c.name, c.idnumber, e.id, e.status, e.timecreated, e.enrolenddate, e.customint2, e.roleid
        ";
        return $DB->get_records_sql($sql, ['courseid' => $courseid]);
    }

    public static function get_course_groups_list($courseid) {
        global $CFG;
        require_once($CFG->dirroot . '/group/lib.php');
        $groups = groups_get_all_groups($courseid);
        $result = [];
        if ($groups) {
            foreach ($groups as $g) {
                $result[] = [
                    'id' => (int)$g->id,
                    'name' => (string)$g->name
                ];
            }
        }
        return $result;
    }

    public static function get_course_user_enrolments($courseid, $userid) {
        global $DB;
        $sql = "
            SELECT ue.id, e.enrol as method, ue.status, ue.timestart, ue.timeend, ue.timecreated
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE e.courseid = :courseid AND ue.userid = :userid
        ";
        return $DB->get_records_sql($sql, ['courseid' => $courseid, 'userid' => $userid]);
    }

    public static function get_course_user_first_and_last_access($courseid, $userid) {
        global $DB;
        $lastaccess_rec = $DB->get_record('user_lastaccess', ['courseid' => $courseid, 'userid' => $userid]);
        $lastaccess = $lastaccess_rec ? (int)$lastaccess_rec->timeaccess : 0;
        $firstaccess = 0;
        if ($lastaccess > 0) {
            try {
                $sql_logs = "
                    SELECT MIN(timecreated) as firstaccess
                      FROM {logstore_standard_log}
                     WHERE courseid = :courseid AND userid = :userid
                ";
                $log_data = $DB->get_record_sql($sql_logs, ['courseid' => $courseid, 'userid' => $userid]);
                if ($log_data && $log_data->firstaccess) {
                    $firstaccess = (int)$log_data->firstaccess;
                }
            } catch (\Throwable $e) {
                debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
            }
            if ($firstaccess == 0) {
                $firstaccess = $lastaccess;
            }
        }
        return [$firstaccess, $lastaccess];
    }
}
