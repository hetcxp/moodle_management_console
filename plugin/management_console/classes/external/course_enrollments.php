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
 * External service for course cohort and user enrolments in tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\external;

use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use tool_management_console\application\enrollments\course_cohort_action_usecase;
use tool_management_console\repository\course_repository;
use tool_management_console\repository\course_enrolment_repository;
use tool_management_console\repository\user_repository;

/**
 * Course enrolments external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class course_enrollments extends external_api {
    /**
     * Parameter definition for course_cohort_action.
     *
     * @return external_function_parameters
     */
    public static function course_cohort_action_parameters(): external_function_parameters {
        return new external_function_parameters([
            'action' => new external_value(
                PARAM_ALPHANUMEXT,
                'add, remove, suspend, activate, set_group, set_expiration, message, sync'
            ),
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
            'cohortids' => new external_multiple_structure(
                new external_value(PARAM_INT, 'Cohort ID'),
                'Array of cohort IDs'
            ),
            'groupid' => new external_value(PARAM_INT, 'Group ID', VALUE_DEFAULT, 0),
            'newgroupname' => new external_value(PARAM_TEXT, 'New group name if creating', VALUE_DEFAULT, ''),
            'timeend' => new external_value(PARAM_INT, 'Expiration time', VALUE_DEFAULT, 0),
            'message_text' => new external_value(PARAM_RAW, 'Message text', VALUE_DEFAULT, ''),
            'roleid' => new external_value(PARAM_INT, 'Role ID to assign (defaults to student)', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Perform cohort actions on a course (add, remove, suspend, etc.).
     *
     * @param string $action
     * @param int $courseid
     * @param array $cohortids
     * @param int $groupid
     * @param string $newgroupname
     * @param int $timeend
     * @param string $messagetext
     * @param int $roleid
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function course_cohort_action(
        $action,
        $courseid,
        $cohortids,
        $groupid = 0,
        $newgroupname = '',
        $timeend = 0,
        $messagetext = '',
        $roleid = 0
    ): array {
        $context = context_system::instance();
        self::validate_context($context);

        $params = self::validate_parameters(self::course_cohort_action_parameters(), [
            'action' => $action,
            'courseid' => $courseid,
            'cohortids' => $cohortids,
            'groupid' => $groupid,
            'newgroupname' => $newgroupname,
            'timeend' => $timeend,
            'message_text' => $messagetext,
            'roleid' => $roleid,
        ]);

        return course_cohort_action_usecase::execute($params);
    }

    /**
     * Return structure for course_cohort_action.
     *
     * @return external_single_structure
     */
    public static function course_cohort_action_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success'),
            'message' => new external_value(PARAM_TEXT, 'Message'),
            'affectedcount' => new external_value(PARAM_INT, 'Affected count'),
        ]);
    }

    /**
     * Parameter definition for course_user_action.
     *
     * @return external_function_parameters
     */
    public static function course_user_action_parameters(): external_function_parameters {
        return new external_function_parameters([
            'action'   => new external_value(
                PARAM_ALPHANUMEXT,
                'add, remove, suspend, activate, set_expiration, setgroup, message'
            ),
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
            'userids'  => new external_multiple_structure(new external_value(PARAM_INT, 'User ID')),
            'timeend'  => new external_value(PARAM_INT, 'Expiration time', VALUE_DEFAULT, 0),
            'groupid'  => new external_value(PARAM_INT, 'Group ID', VALUE_DEFAULT, 0),
            'newgroupname' => new external_value(PARAM_TEXT, 'New group name', VALUE_DEFAULT, ''),
            'message_text' => new external_value(PARAM_RAW, 'Message text', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Perform user actions within a course (enrol, suspend, group assignment, etc.).
     *
     * @param string $action
     * @param int $courseid
     * @param array $userids
     * @param int $timeend
     * @param int $groupid
     * @param string $newgroupname
     * @param string $messagetext
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function course_user_action(
        $action,
        $courseid,
        $userids,
        $timeend = 0,
        $groupid = 0,
        $newgroupname = '',
        $messagetext = ''
    ): array {
        $context = context_system::instance();
        self::validate_context($context);

        $params = self::validate_parameters(self::course_user_action_parameters(), [
            'action' => $action,
            'courseid' => $courseid,
            'userids' => $userids,
            'timeend' => $timeend,
            'groupid' => $groupid,
            'newgroupname' => $newgroupname,
            'message_text' => $messagetext,
        ]);

        $coursecontext = \context_course::instance($params['courseid']);
        require_capability('enrol/manual:enrol', $coursecontext);
        \tool_management_console\license_manager::require_active_license();

        return course_enrolment_repository::batch_course_user_enrolment(
            $params['action'],
            $params['courseid'],
            $params['userids'],
            [
                'timeend' => $params['timeend'],
                'groupid' => $params['groupid'],
                'newgroupname' => $params['newgroupname'],
                'message_text' => $params['message_text'],
            ]
        );
    }

    /**
     * Return structure for course_user_action.
     *
     * @return external_single_structure
     */
    public static function course_user_action_returns(): external_single_structure {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'Success'),
            'message'       => new external_value(PARAM_TEXT, 'Message'),
            'affectedcount' => new external_value(PARAM_INT, 'Affected count'),
        ]);
    }

    /**
     * Parameter definition for get_course_user_detail.
     *
     * @return external_function_parameters
     */
    public static function get_course_user_detail_parameters(): external_function_parameters {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
            'userid'   => new external_value(PARAM_INT, 'User ID'),
        ]);
    }

    /**
     * Get detailed enrolment, completion and grades for a user in course.
     *
     * @param int $courseid
     * @param int $userid
     * @return array
     */
    public static function get_course_user_detail($courseid, $userid): array {
        global $DB, $CFG;
        require_once($CFG->libdir . '/completionlib.php');
        require_once($CFG->libdir . '/gradelib.php');

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/course:view', $context);

        $params = self::validate_parameters(self::get_course_user_detail_parameters(), [
            'courseid' => $courseid,
            'userid'   => $userid,
        ]);

        $course = course_repository::get_course($params['courseid']);
        if (!$course) {
            throw new \moodle_exception('error', 'moodle', '', 'Course not found. courseid=' . $params['courseid']);
        }
        $user = user_repository::get_user($params['userid']);
        if (!$user) {
            throw new \moodle_exception('error', 'moodle', '', 'User not found. userid=' . $params['userid']);
        }

        // Basic Info.
        $userinfo = [
            'id' => (int)$user->id,
            'fullname' => fullname($user),
            'email' => $user->email,
        ];

        // Enrolment Data.
        $enrolmentsrs = course_repository::get_course_user_enrolments($course->id, $user->id);
        $enrolments = [];
        $status = 1; // Default suspended.
        $timestart = 0;
        $timeend = 0;
        foreach ($enrolmentsrs as $ue) {
            $enrolments[] = [
                'method' => (string)$ue->method,
                'status' => (int)$ue->status,
                'timestart' => (int)$ue->timestart > 0 ? (int)$ue->timestart : (int)$ue->timecreated,
                'timeend' => (int)$ue->timeend,
            ];
            if ($ue->status == 0) {
                $status = 0;
            }
            if ($timestart == 0 || ($ue->timestart > 0 && $ue->timestart < $timestart)) {
                $timestart = (int)$ue->timestart > 0 ? (int)$ue->timestart : (int)$ue->timecreated;
            }
            if ($timeend == 0 || ($ue->timeend > 0 && $ue->timeend > $timeend)) {
                $timeend = (int)$ue->timeend;
            }
        }

        // Access Logs.
        [$firstaccess, $lastaccess] = course_repository::get_course_user_first_and_last_access($course->id, $user->id);

        // Activities and Grades.
        $modinfo = get_fast_modinfo($course);
        $cms = $modinfo->get_cms();

        $activities = [];
        $completedcount = 0;
        $totaltracked = 0;

        $completion = new \completion_info($course);

        foreach ($cms as $cm) {
            if (!$cm->uservisible) {
                continue;
            }

            $act = [
                'id' => (int)$cm->id,
                'name' => (string)$cm->name,
                'modname' => (string)$cm->modname,
                'completionstatus' => 0,
                'grade' => '',
            ];

            if ($completion->is_enabled($cm) != COMPLETION_TRACKING_NONE) {
                $totaltracked++;
                $cdata = $completion->get_data($cm, false, $user->id);
                $act['completionstatus'] = (int)$cdata->completionstate;
                $iscomplete = ($cdata->completionstate == COMPLETION_COMPLETE
                    || $cdata->completionstate == COMPLETION_COMPLETE_PASS);
                if ($iscomplete) {
                    $completedcount++;
                }
            }

            if (plugin_supports('mod', $cm->modname, FEATURE_GRADE_HAS_GRADE, false)) {
                $gradeitem = \grade_item::fetch([
                    'itemtype' => 'mod',
                    'itemmodule' => $cm->modname,
                    'iteminstance' => $cm->instance,
                    'courseid' => $course->id,
                ]);
                if ($gradeitem) {
                    $gradegrade = \grade_grade::fetch(['itemid' => $gradeitem->id, 'userid' => $user->id]);
                    if ($gradegrade && !is_null($gradegrade->finalgrade)) {
                        $act['grade'] = (string)format_float($gradegrade->finalgrade, $gradeitem->get_decimals());
                    }
                }
            }

            $activities[] = $act;
        }

        $progress = $totaltracked > 0 ? round(($completedcount / $totaltracked) * 100) : 0;

        return [
            'user' => $userinfo,
            'status' => $status,
            'timestart' => $timestart,
            'timeend' => $timeend,
            'firstaccess' => $firstaccess,
            'lastaccess' => $lastaccess,
            'progress' => (int)$progress,
            'enrolments' => $enrolments,
            'activities' => $activities,
        ];
    }

    /**
     * Return structure for get_course_user_detail.
     *
     * @return external_single_structure
     */
    public static function get_course_user_detail_returns(): external_single_structure {
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
                    'name' => new external_value(PARAM_TEXT, 'Activity name'),
                    'modname' => new external_value(PARAM_PLUGIN, 'Module name'),
                    'completionstatus' => new external_value(PARAM_INT, 'Completion status'),
                    'grade' => new external_value(PARAM_TEXT, 'Grade string'),
                ])
            ),
        ]);
    }
}
