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
 * Use case for course cohort enrollment actions.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\application\enrollments;

use context_course;
use core\message\message;
use moodle_exception;
use null_progress_trace;
use stdClass;
use tool_management_console\license_manager;

/**
 * Orchestrates cohort enrolment, suspension, expiration, sync and messages.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class course_cohort_action_usecase {
    /**
     * Execute cohort action for a course with transactional integrity.
     *
     * @param array $params Validated parameters dictionary.
     * @return array
     * @throws moodle_exception
     */
    public static function execute(array $params): array {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/enrol/cohort/locallib.php');
        require_once($CFG->dirroot . '/group/lib.php');

        $action = isset($params['action']) ? (string)$params['action'] : '';
        $allowed = ['add', 'remove', 'suspend', 'activate', 'sync', 'configure', 'message'];
        if (!in_array($action, $allowed, true)) {
            throw new \invalid_parameter_exception("Invalid cohort action: {$action}");
        }

        $coursecontext = context_course::instance($params['courseid']);
        require_capability('moodle/course:enrolreview', $coursecontext);
        if ($action === 'add' || $action === 'remove' || $action === 'suspend' || $action === 'activate') {
            require_capability('enrol/cohort:config', $coursecontext);
        }
        license_manager::require_active_license();

        $enrolplugin = enrol_get_plugin('cohort');
        if (!$enrolplugin) {
            throw new moodle_exception(
                'cohortpluginmissing',
                'tool_management_console',
                '',
                'Cohort enrolment plugin is not enabled.'
            );
        }

        $course = $DB->get_record('course', ['id' => $params['courseid']], '*', MUST_EXIST);
        $resolvedgroupid = self::resolve_group($params, $course, $coursecontext);

        $transaction = $DB->start_delegated_transaction();

        try {
            $affected = self::dispatch_action(
                $action,
                $params,
                $course,
                $coursecontext,
                $enrolplugin,
                $resolvedgroupid
            );
            $transaction->allow_commit();

            return [
                'success'       => true,
                'message'       => "Cohort action '{$action}' completed.",
                'affectedcount' => $affected,
            ];
        } catch (\Throwable $e) {
            try {
                $transaction->rollback($e);
            } catch (\Throwable $rollbackex) {
                if ($rollbackex !== $e) {
                    throw new \moodle_exception(
                        'error',
                        'moodle',
                        '',
                        'Transaction rollback failed: ' . $rollbackex->getMessage(),
                        $e
                    );
                }
            }
            $isnoperm = ($e instanceof \moodle_exception && $e->errorcode === 'nopermissions');
            if ($e instanceof \required_capability_exception || $isnoperm) {
                throw $e;
            }
            if ($e instanceof \dml_exception) {
                debugging(get_class($e) . ': Database query execution error', DEBUG_DEVELOPER);
            } else {
                debugging($e->getMessage(), DEBUG_DEVELOPER);
            }
            $message = ($e instanceof \moodle_exception && !($e instanceof \dml_exception))
                ? $e->getMessage()
                : 'An error occurred while processing the cohort action.';
            return [
                'success'       => false,
                'message'       => $message,
                'affectedcount' => 0,
            ];
        }
    }

    /**
     * Dispatch action to lifecycle or configuration handlers.
     *
     * @param string $action
     * @param array $params
     * @param stdClass $course
     * @param context_course $coursecontext
     * @param \enrol_plugin $enrolplugin
     * @param int $resolvedgroupid
     * @return int
     * @throws moodle_exception
     */
    private static function dispatch_action(
        string $action,
        array $params,
        stdClass $course,
        context_course $coursecontext,
        $enrolplugin,
        int $resolvedgroupid
    ): int {
        if ($action === 'add' || $action === 'remove' || $action === 'suspend' || $action === 'activate') {
            return self::dispatch_lifecycle($action, $params, $course, $coursecontext, $enrolplugin, $resolvedgroupid);
        }
        return self::dispatch_config($action, $params, $course, $coursecontext, $resolvedgroupid);
    }

    /**
     * Dispatch enrolment lifecycle actions.
     *
     * @param string $action
     * @param array $params
     * @param stdClass $course
     * @param context_course $coursecontext
     * @param \enrol_plugin $enrolplugin
     * @param int $resolvedgroupid
     * @return int
     */
    private static function dispatch_lifecycle(
        string $action,
        array $params,
        stdClass $course,
        context_course $coursecontext,
        $enrolplugin,
        int $resolvedgroupid
    ): int {
        $rawids = isset($params['cohortids']) ? (array)$params['cohortids'] : [];
        $cohortids = array_values(array_filter(array_map('intval', $rawids), fn($id) => $id > 0));
        if ($action === 'add') {
            return self::handle_add($params, $course, $coursecontext, $enrolplugin, $resolvedgroupid);
        }
        if ($action === 'remove') {
            return self::handle_remove($cohortids, $course->id, $coursecontext, $enrolplugin);
        }
        if ($action === 'suspend') {
            return self::handle_update_status($cohortids, $course->id, $coursecontext, $enrolplugin, ENROL_INSTANCE_DISABLED);
        }
        return self::handle_update_status($cohortids, $course->id, $coursecontext, $enrolplugin, ENROL_INSTANCE_ENABLED);
    }

    /**
     * Dispatch group, expiration, sync and message actions.
     *
     * @param string $action
     * @param array $params
     * @param stdClass $course
     * @param context_course $coursecontext
     * @param int $resolvedgroupid
     * @return int
     * @throws moodle_exception
     */
    private static function dispatch_config(
        string $action,
        array $params,
        stdClass $course,
        context_course $coursecontext,
        int $resolvedgroupid
    ): int {
        $cohortids = $params['cohortids'];
        if ($action === 'set_group') {
            return self::handle_set_group($cohortids, $course->id, $coursecontext, $resolvedgroupid);
        }
        if ($action === 'set_expiration') {
            return self::handle_set_expiration($cohortids, $course->id, $coursecontext, (int)$params['timeend']);
        }
        if ($action === 'sync') {
            return self::handle_sync($cohortids, $course->id, $coursecontext);
        }
        if ($action === 'message') {
            return self::handle_message($params, $course, $coursecontext);
        }
        throw new moodle_exception('error', 'moodle', '', 'Invalid action');
    }

    /**
     * Resolve group ID or create new group if newgroupname is provided.
     *
     * @param array $params Parameters.
     * @param stdClass $course Course record.
     * @param context_course $coursecontext Course context.
     * @return int
     */
    private static function resolve_group(array $params, stdClass $course, context_course $coursecontext): int {
        if (!empty($params['newgroupname'])) {
            require_capability('moodle/course:managegroups', $coursecontext);
            $newgroup = new stdClass();
            $newgroup->courseid = $course->id;
            $newgroup->name = $params['newgroupname'];
            return (int)groups_create_group($newgroup);
        }
        return (int)($params['groupid'] ?? 0);
    }

    /**
     * Handle adding cohort enrolments.
     *
     * @param array $params
     * @param stdClass $course
     * @param context_course $coursecontext
     * @param \enrol_plugin $enrolplugin
     * @param int $resolvedgroupid
     * @return int
     */
    private static function handle_add(
        array $params,
        stdClass $course,
        context_course $coursecontext,
        $enrolplugin,
        int $resolvedgroupid
    ): int {
        global $DB;
        require_capability('enrol/cohort:config', $coursecontext);

        $studentroleid = (int)$DB->get_field('role', 'id', ['shortname' => 'student']);
        $roleid = !empty($params['roleid']) ? $params['roleid'] : ($studentroleid ?: 5);
        $affected = 0;

        foreach ($params['cohortids'] as $cid) {
            $existing = $DB->get_record('enrol', [
                'courseid'   => $course->id,
                'enrol'      => 'cohort',
                'customint1' => $cid,
            ]);

            if (!$existing) {
                $instanceid = $enrolplugin->add_instance($course, [
                    'customint1' => $cid,
                    'roleid'     => $roleid,
                    'customint2' => $resolvedgroupid,
                ]);
                if ($instanceid) {
                    enrol_cohort_sync(new null_progress_trace(), $course->id);
                    $affected++;
                }
            } else if (empty($existing->roleid)) {
                $DB->set_field('enrol', 'roleid', $roleid, ['id' => $existing->id]);
                enrol_cohort_sync(new null_progress_trace(), $course->id);
                $affected++;
            }
        }
        return $affected;
    }

    /**
     * Handle removing cohort enrolments.
     *
     * @param array $cohortids
     * @param int $courseid
     * @param context_course $coursecontext
     * @param \enrol_plugin $enrolplugin
     * @return int
     */
    private static function handle_remove(array $cohortids, int $courseid, context_course $coursecontext, $enrolplugin): int {
        global $DB;
        require_capability('enrol/cohort:config', $coursecontext);
        $affected = 0;

        foreach ($cohortids as $cid) {
            $instances = $DB->get_records('enrol', [
                'courseid'   => $courseid,
                'enrol'      => 'cohort',
                'customint1' => $cid,
            ]);
            foreach ($instances as $instance) {
                $enrolplugin->delete_instance($instance);
                $affected++;
            }
        }
        return $affected;
    }

    /**
     * Handle updating status (enable/disable) for cohort enrolments.
     *
     * @param array $cohortids
     * @param int $courseid
     * @param context_course $coursecontext
     * @param \enrol_plugin $enrolplugin
     * @param int $newstatus
     * @return int
     */
    private static function handle_update_status(
        array $cohortids,
        int $courseid,
        context_course $coursecontext,
        $enrolplugin,
        int $newstatus
    ): int {
        global $DB;
        require_capability('enrol/cohort:config', $coursecontext);
        $affected = 0;

        foreach ($cohortids as $cid) {
            $instances = $DB->get_records('enrol', [
                'courseid'   => $courseid,
                'enrol'      => 'cohort',
                'customint1' => $cid,
            ]);
            foreach ($instances as $instance) {
                $enrolplugin->update_status($instance, $newstatus);
                $affected++;
            }
        }
        return $affected;
    }

    /**
     * Handle setting group for cohort enrolments.
     *
     * @param array $cohortids
     * @param int $courseid
     * @param context_course $coursecontext
     * @param int $groupid
     * @return int
     */
    private static function handle_set_group(
        array $cohortids,
        int $courseid,
        context_course $coursecontext,
        int $groupid
    ): int {
        global $DB;
        require_capability('enrol/cohort:config', $coursecontext);
        $affected = 0;

        foreach ($cohortids as $cid) {
            $instances = $DB->get_records('enrol', [
                'courseid'   => $courseid,
                'enrol'      => 'cohort',
                'customint1' => $cid,
            ]);
            foreach ($instances as $instance) {
                $DB->set_field('enrol', 'customint2', $groupid, ['id' => $instance->id]);
                enrol_cohort_sync(new null_progress_trace(), $courseid);
                $affected++;
            }
        }
        return $affected;
    }

    /**
     * Handle setting expiration period for cohort enrolments.
     *
     * @param array $cohortids
     * @param int $courseid
     * @param context_course $coursecontext
     * @param int $timeend
     * @return int
     */
    private static function handle_set_expiration(
        array $cohortids,
        int $courseid,
        context_course $coursecontext,
        int $timeend
    ): int {
        global $DB;
        require_capability('enrol/cohort:config', $coursecontext);
        $affected = 0;

        foreach ($cohortids as $cid) {
            $instances = $DB->get_records('enrol', [
                'courseid'   => $courseid,
                'enrol'      => 'cohort',
                'customint1' => $cid,
            ]);
            foreach ($instances as $instance) {
                if ($timeend > 0 && $timeend > time()) {
                    $duration = $timeend - time();
                    $DB->set_field('enrol', 'enrolperiod', $duration, ['id' => $instance->id]);
                } else if ($timeend === 0) {
                    $DB->set_field('enrol', 'enrolperiod', 0, ['id' => $instance->id]);
                }
                enrol_cohort_sync(new null_progress_trace(), $courseid);
                $affected++;
            }
        }
        return $affected;
    }

    /**
     * Handle manual sync for cohort enrolments.
     *
     * @param array $cohortids
     * @param int $courseid
     * @param context_course $coursecontext
     * @return int
     */
    private static function handle_sync(array $cohortids, int $courseid, context_course $coursecontext): int {
        global $DB;
        require_capability('enrol/cohort:config', $coursecontext);
        $affected = 0;

        foreach ($cohortids as $cid) {
            $instances = $DB->get_records('enrol', [
                'courseid'   => $courseid,
                'enrol'      => 'cohort',
                'customint1' => $cid,
            ]);
            foreach ($instances as $instance) {
                enrol_cohort_sync(new null_progress_trace(), $courseid);
                $affected++;
            }
        }
        return $affected;
    }

    /**
     * Handle sending message to all users in cohorts.
     *
     * @param array $params
     * @param stdClass $course
     * @param context_course $coursecontext
     * @return int
     * @throws moodle_exception
     */
    private static function handle_message(array $params, stdClass $course, context_course $coursecontext): int {
        require_capability('moodle/site:senderrormessage', $coursecontext);

        $msg = trim($params['message_text'] ?? '');
        if (empty($msg)) {
            throw new moodle_exception('error', 'moodle', '', 'Message text cannot be empty');
        }

        $userids = self::collect_cohort_member_ids($params['cohortids']);
        $affected = 0;

        foreach ($userids as $uid) {
            if (self::send_cohort_user_message($course, $uid, $msg)) {
                $affected++;
            }
        }
        return $affected;
    }

    /**
     * Collect unique member IDs from given cohorts.
     *
     * @param array $cohortids
     * @return array
     */
    private static function collect_cohort_member_ids(array $cohortids): array {
        global $DB;
        $userids = [];
        foreach ($cohortids as $cid) {
            $members = $DB->get_records('cohort_members', ['cohortid' => $cid], '', 'userid');
            foreach ($members as $m) {
                $userids[(int)$m->userid] = true;
            }
        }
        return array_keys($userids);
    }

    /**
     * Send instant message to single user.
     *
     * @param stdClass $course
     * @param int $uid
     * @param string $msg
     * @return bool
     */
    private static function send_cohort_user_message(stdClass $course, int $uid, string $msg): bool {
        global $DB, $USER;
        $recipient = $DB->get_record('user', ['id' => $uid]);
        if (!$recipient) {
            return false;
        }

        $eventdata = new message();
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
        return true;
    }
}
