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

defined('MOODLE_INTERNAL') || die();

use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
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

    public static function course_cohort_action_parameters() {
        return new external_function_parameters([
            'action' => new external_value(PARAM_ALPHANUMEXT, 'add, remove, suspend, activate, set_group, set_expiration, message, sync'),
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
            'cohortids' => new external_multiple_structure(new external_value(PARAM_INT, 'Cohort ID'), 'Array of cohort IDs'),
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
     * @param string $message_text
     * @param int $roleid
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function course_cohort_action($action, $courseid, $cohortids, $groupid = 0, $newgroupname = '', $timeend = 0, $message_text = '', $roleid = 0) {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/enrol/cohort/locallib.php');
        require_once($CFG->dirroot . '/group/lib.php');

        $context = context_system::instance();
        self::validate_context($context);

        $params = self::validate_parameters(self::course_cohort_action_parameters(), [
            'action' => $action,
            'courseid' => $courseid,
            'cohortids' => $cohortids,
            'groupid' => $groupid,
            'newgroupname' => $newgroupname,
            'timeend' => $timeend,
            'message_text' => $message_text,
            'roleid' => $roleid,
        ]);

        $coursecontext = \context_course::instance($params['courseid']);
        require_capability('moodle/course:enrolreview', $coursecontext);

        $course = $DB->get_record('course', ['id' => $params['courseid']], '*', MUST_EXIST);
        $enrolplugin = enrol_get_plugin('cohort');

        // Resolve group
        $resolved_groupid = $params['groupid'];
        if (!empty($params['newgroupname'])) {
            require_capability('moodle/course:managegroups', $coursecontext);
            $newgroup = new \stdClass();
            $newgroup->courseid = $course->id;
            $newgroup->name = $params['newgroupname'];
            $resolved_groupid = groups_create_group($newgroup);
        }

        $affected = 0;

        switch ($params['action']) {
            case 'add':
                require_capability('enrol/cohort:config', $coursecontext);
                $roleid = !empty($params['roleid']) ? $params['roleid'] : 5; // default student

                foreach ($params['cohortids'] as $cid) {
                    $existing = $DB->get_record('enrol', [
                        'courseid' => $course->id,
                        'enrol' => 'cohort',
                        'customint1' => $cid
                    ]);

                    if (!$existing) {
                        $instanceid = $enrolplugin->add_instance($course, [
                            'customint1' => $cid,
                            'roleid' => $roleid,
                            'customint2' => $resolved_groupid
                        ]);
                        if ($instanceid) {
                            $instance = $DB->get_record('enrol', ['id' => $instanceid]);
                            enrol_cohort_sync($instance);
                            $affected++;
                        }
                    }
                }
                break;

            case 'remove':
                require_capability('enrol/cohort:config', $coursecontext);
                foreach ($params['cohortids'] as $cid) {
                    $instances = $DB->get_records('enrol', [
                        'courseid' => $course->id,
                        'enrol' => 'cohort',
                        'customint1' => $cid
                    ]);
                    foreach ($instances as $instance) {
                        $enrolplugin->delete_instance($instance);
                        $affected++;
                    }
                }
                break;

            case 'suspend':
                require_capability('enrol/cohort:config', $coursecontext);
                foreach ($params['cohortids'] as $cid) {
                    $instances = $DB->get_records('enrol', [
                        'courseid' => $course->id,
                        'enrol' => 'cohort',
                        'customint1' => $cid
                    ]);
                    foreach ($instances as $instance) {
                        $enrolplugin->update_status($instance, ENROL_INSTANCE_DISABLED);
                        $affected++;
                    }
                }
                break;

            case 'activate':
                require_capability('enrol/cohort:config', $coursecontext);
                foreach ($params['cohortids'] as $cid) {
                    $instances = $DB->get_records('enrol', [
                        'courseid' => $course->id,
                        'enrol' => 'cohort',
                        'customint1' => $cid
                    ]);
                    foreach ($instances as $instance) {
                        $enrolplugin->update_status($instance, ENROL_INSTANCE_ENABLED);
                        $affected++;
                    }
                }
                break;

            case 'set_group':
                require_capability('enrol/cohort:config', $coursecontext);
                foreach ($params['cohortids'] as $cid) {
                    $instances = $DB->get_records('enrol', [
                        'courseid' => $course->id,
                        'enrol' => 'cohort',
                        'customint1' => $cid
                    ]);
                    foreach ($instances as $instance) {
                        $DB->set_field('enrol', 'customint2', $resolved_groupid, ['id' => $instance->id]);
                        enrol_cohort_sync($instance);
                        $affected++;
                    }
                }
                break;

            case 'set_expiration':
                require_capability('enrol/cohort:config', $coursecontext);
                foreach ($params['cohortids'] as $cid) {
                    $instances = $DB->get_records('enrol', [
                        'courseid' => $course->id,
                        'enrol' => 'cohort',
                        'customint1' => $cid
                    ]);
                    foreach ($instances as $instance) {
                        $enrolend = $params['timeend'];
                        if ($enrolend > 0 && $enrolend > time()) {
                            $duration = $enrolend - time();
                            $DB->set_field('enrol', 'enrolperiod', $duration, ['id' => $instance->id]);
                        } else if ($enrolend == 0) {
                            $DB->set_field('enrol', 'enrolperiod', 0, ['id' => $instance->id]);
                        }
                        enrol_cohort_sync($instance);
                        $affected++;
                    }
                }
                break;

            case 'sync':
                require_capability('enrol/cohort:config', $coursecontext);
                foreach ($params['cohortids'] as $cid) {
                    $instances = $DB->get_records('enrol', [
                        'courseid' => $course->id,
                        'enrol' => 'cohort',
                        'customint1' => $cid
                    ]);
                    foreach ($instances as $instance) {
                        enrol_cohort_sync($instance);
                        $affected++;
                    }
                }
                break;

            case 'message':
                require_capability('moodle/site:senderrormessage', $coursecontext);
                global $USER;
                $userids = [];
                foreach ($params['cohortids'] as $cid) {
                    $members = $DB->get_records('cohort_members', ['cohortid' => $cid], '', 'userid');
                    foreach ($members as $m) {
                        $userids[$m->userid] = true;
                    }
                }

                $msg = trim($params['message_text']);
                if (empty($msg)) {
                    throw new \moodle_exception('error', 'moodle', '', 'Message text cannot be empty');
                }

                foreach (array_keys($userids) as $uid) {
                    $recipient = $DB->get_record('user', ['id' => $uid]);
                    if ($recipient) {
                        $eventdata = new \core\message\message();
                        $eventdata->courseid          = $course->id;
                        $eventdata->component         = 'moodle';
                        $eventdata->name              = 'instantmessage';
                        $eventdata->userfrom          = $USER;
                        $eventdata->userto            = $recipient;
                        $eventdata->subject           = 'Notice regarding course: ' . $course->fullname;
                        $eventdata->fullmessage       = $msg;
                        $eventdata->fullmessageformat = FORMAT_MARKDOWN;
                        $eventdata->fullmessagehtml   = format_text($msg, FORMAT_MARKDOWN);
                        $eventdata->smallmessage      = $msg;
                        $eventdata->notification      = 0;
                        message_send($eventdata);
                        $affected++;
                    }
                }
                break;

            default:
                throw new \moodle_exception('error', 'moodle', '', 'Invalid action');
        }

        return [
            'success' => true,
            'message' => "Cohort action '{$params['action']}' completed.",
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
            'action'   => new external_value(PARAM_ALPHANUMEXT, 'add, remove, suspend, activate, set_expiration, setgroup, message'),
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
     * @param string $message_text
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function course_user_action($action, $courseid, $userids, $timeend = 0, $groupid = 0, $newgroupname = '', $message_text = '') {
        $context = context_system::instance();
        self::validate_context($context);
        
        $params = self::validate_parameters(self::course_user_action_parameters(), [
            'action' => $action, 'courseid' => $courseid, 'userids' => $userids,
            'timeend' => $timeend, 'groupid' => $groupid, 'newgroupname' => $newgroupname, 'message_text' => $message_text
        ]);

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

    public static function course_user_action_returns() {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'Success'),
            'message'       => new external_value(PARAM_TEXT, 'Message'),
            'affectedcount' => new external_value(PARAM_INT, 'Affected count'),
        ]);
    }

    public static function get_course_user_detail_parameters() {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
            'userid'   => new external_value(PARAM_INT, 'User ID'),
        ]);
    }

    public static function get_course_user_detail($courseid, $userid) {
        global $DB, $CFG;
        require_once($CFG->libdir.'/completionlib.php');
        require_once($CFG->libdir.'/gradelib.php');

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

        // Basic Info
        $userinfo = [
            'id' => (int)$user->id,
            'fullname' => fullname($user),
            'email' => $user->email,
        ];

        // Enrolment Data
        $enrolments_rs = course_repository::get_course_user_enrolments($course->id, $user->id);
        $enrolments = [];
        $status = 1; // Default suspended
        $timestart = 0;
        $timeend = 0;
        foreach ($enrolments_rs as $ue) {
            $enrolments[] = [
                'method' => (string)$ue->method,
                'status' => (int)$ue->status,
                'timestart' => (int)$ue->timestart > 0 ? (int)$ue->timestart : (int)$ue->timecreated,
                'timeend' => (int)$ue->timeend
            ];
            if ($ue->status == 0) $status = 0;
            if ($timestart == 0 || ($ue->timestart > 0 && $ue->timestart < $timestart)) {
                $timestart = (int)$ue->timestart > 0 ? (int)$ue->timestart : (int)$ue->timecreated;
            }
            if ($timeend == 0 || ($ue->timeend > 0 && $ue->timeend > $timeend)) {
                $timeend = (int)$ue->timeend;
            }
        }

        // Access Logs
        list($firstaccess, $lastaccess) = course_repository::get_course_user_first_and_last_access($course->id, $user->id);

        // Activities and Grades
        $modinfo = get_fast_modinfo($course);
        $cms = $modinfo->get_cms();
        
        $activities = [];
        $completed_count = 0;
        $total_tracked = 0;

        $completion = new \completion_info($course);
        
        foreach ($cms as $cm) {
            if (!$cm->uservisible) continue;
            
            $act = [
                'id' => (int)$cm->id,
                'name' => (string)$cm->name,
                'modname' => (string)$cm->modname,
                'completionstatus' => 0,
                'grade' => ''
            ];

            if ($completion->is_enabled($cm) != COMPLETION_TRACKING_NONE) {
                $total_tracked++;
                $cdata = $completion->get_data($cm, false, $user->id);
                $act['completionstatus'] = (int)$cdata->completionstate;
                if ($cdata->completionstate == COMPLETION_COMPLETE || $cdata->completionstate == COMPLETION_COMPLETE_PASS) {
                    $completed_count++;
                }
            }

            if (plugin_supports('mod', $cm->modname, FEATURE_GRADE_HAS_GRADE, false)) {
                $grade_item = \grade_item::fetch([
                    'itemtype' => 'mod',
                    'itemmodule' => $cm->modname,
                    'iteminstance' => $cm->instance,
                    'courseid' => $course->id
                ]);
                if ($grade_item) {
                    $grade_grade = \grade_grade::fetch(['itemid' => $grade_item->id, 'userid' => $user->id]);
                    if ($grade_grade && !is_null($grade_grade->finalgrade)) {
                        $act['grade'] = (string)format_float($grade_grade->finalgrade, $grade_item->get_decimals());
                    }
                }
            }

            $activities[] = $act;
        }

        $progress = $total_tracked > 0 ? round(($completed_count / $total_tracked) * 100) : 0;

        return [
            'user' => $userinfo,
            'status' => $status,
            'timestart' => $timestart,
            'timeend' => $timeend,
            'firstaccess' => $firstaccess,
            'lastaccess' => $lastaccess,
            'progress' => (int)$progress,
            'enrolments' => $enrolments,
            'activities' => $activities
        ];
    }

    public static function get_course_user_detail_returns() {
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
            )
        ]);
    }
}
