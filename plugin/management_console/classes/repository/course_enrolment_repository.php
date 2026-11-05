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

/**
 * Repository specialized in course enrolments, completions, and user activity metrics.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class course_enrolment_repository {
    /**
     * Get detailed list of enrolled users in a course.
     *
     * @param int $courseid
     * @param int $limitfrom
     * @param int $limitnum
     * @return array
     */
    public static function get_course_enrolled_users_detail(int $courseid, int $limitfrom = 0, int $limitnum = 0): array {
        global $DB;
        $sqlusers = "
            SELECT u.id, u.firstname, u.lastname, u.email,
                   u.firstnamephonetic, u.lastnamephonetic, u.middlename, u.alternatename,
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
          GROUP BY u.id, u.firstname, u.lastname, u.email,
                   u.firstnamephonetic, u.lastnamephonetic, u.middlename, u.alternatename,
                   ccmp.timecompleted
          ORDER BY u.lastname ASC, u.firstname ASC
        ";
        return $DB->get_records_sql($sqlusers, ['courseid' => $courseid], $limitfrom, $limitnum);
    }

    /**
     * Get mapping of course user IDs to their cohort IDs.
     *
     * @param int $courseid
     * @param array $userids
     * @return array
     */
    public static function get_course_user_cohort_map(int $courseid, array $userids = []): array {
        global $DB;
        $params = ['courseid' => $courseid];
        $usersql = '';
        if (!empty($userids)) {
            [$inus, $uparams] = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED, 'u');
            $usersql = " AND ue.userid $inus";
            $params = array_merge($params, $uparams);
        }
        $sql = "
            SELECT ue.userid, e.customint1 as cohortid
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE e.courseid = :courseid AND e.enrol = 'cohort' $usersql
        ";
        $rs = $DB->get_recordset_sql($sql, $params);
        $map = [];
        foreach ($rs as $uc) {
            $map[$uc->userid][] = (int)$uc->cohortid;
        }
        $rs->close();
        return $map;
    }

    /**
     * Get all enrolments for users in a course.
     *
     * @param int $courseid
     * @param array $userids
     * @return array
     */
    public static function get_course_all_enrolments(int $courseid, array $userids = []): array {
        global $DB;
        $params = ['courseid' => $courseid];
        $usersql = '';
        if (!empty($userids)) {
            [$inus, $uparams] = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED, 'u');
            $usersql = " AND ue.userid $inus";
            $params = array_merge($params, $uparams);
        }
        $sql = "
            SELECT ue.id, ue.userid, e.enrol as method, ue.status, ue.timestart, ue.timeend, ue.timecreated
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE e.courseid = :courseid $usersql
        ";
        return $DB->get_records_sql($sql, $params);
    }

    /**
     * Get mapping of user IDs to course role shortnames.
     *
     * @param int $courseid
     * @param array $userids
     * @return array
     */
    public static function get_course_user_roles_map(int $courseid, array $userids = []): array {
        global $DB;
        $params = ['courseid' => $courseid];
        $usersql = '';
        if (!empty($userids)) {
            [$inus, $uparams] = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED, 'u');
            $usersql = " AND ra.userid $inus";
            $params = array_merge($params, $uparams);
        }
        $sql = "
            SELECT ra.userid, r.shortname
              FROM {role_assignments} ra
              JOIN {role} r ON r.id = ra.roleid
              JOIN {context} ctx ON ctx.id = ra.contextid
             WHERE ctx.contextlevel = 50 AND ctx.instanceid = :courseid $usersql
        ";
        $assignments = $DB->get_records_sql($sql, $params);
        $map = [];
        foreach ($assignments as $ra) {
            $map[$ra->userid][] = $ra->shortname;
        }
        return $map;
    }

    /**
     * Get completion counts per user for given course module IDs.
     *
     * @param array $cmids
     * @param array $userids
     * @return array
     */
    public static function get_course_cm_completions(array $cmids, array $userids = []): array {
        global $DB;
        if (empty($cmids)) {
            return [];
        }
        [$incmids, $cmparams] = $DB->get_in_or_equal($cmids, SQL_PARAMS_NAMED, 'cm');
        $params = $cmparams;
        $usersql = '';
        if (!empty($userids)) {
            [$inus, $uparams] = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED, 'u');
            $usersql = " AND userid $inus";
            $params = array_merge($params, $uparams);
        }
        $sql = "
            SELECT userid, COUNT(DISTINCT coursemoduleid) as completedcount
              FROM {course_modules_completion}
             WHERE coursemoduleid $incmids $usersql
               AND completionstate IN (1, 2)
          GROUP BY userid
        ";
        return $DB->get_records_sql_menu($sql, $params);
    }

    /**
     * Get cohorts enrolled in a course with metrics.
     *
     * @param int $courseid
     * @return array
     */
    public static function get_course_linked_cohorts(int $courseid): array {
        global $DB;
        $sql = "
            SELECT c.id, c.name, c.idnumber, e.id as enrolid, e.status as enrolstatus,
                   e.timecreated, e.enrolenddate, e.customint2 as groupid, e.roleid,
                   COUNT(DISTINCT ue.userid) as enrolledcount,
                   COUNT(DISTINCT ccmp.userid) as completedcount
              FROM {cohort} c
              JOIN {enrol} e ON e.customint1 = c.id
         LEFT JOIN {user_enrolments} ue ON ue.enrolid = e.id AND ue.status = 0
         LEFT JOIN {course_completions} ccmp ON ccmp.userid = ue.userid AND ccmp.course = e.courseid AND ccmp.timecompleted > 0
             WHERE e.courseid = :courseid AND e.enrol = 'cohort'
          GROUP BY c.id, c.name, c.idnumber, e.id, e.status, e.timecreated, e.enrolenddate, e.customint2, e.roleid
        ";
        return $DB->get_records_sql($sql, ['courseid' => $courseid]);
    }

    /**
     * Get list of groups in a course.
     *
     * @param int $courseid
     * @return array
     */
    public static function get_course_groups_list(int $courseid): array {
        global $CFG;
        require_once($CFG->dirroot . '/group/lib.php');
        $groups = groups_get_all_groups($courseid);
        $result = [];
        if ($groups) {
            foreach ($groups as $g) {
                $result[] = [
                    'id' => (int)$g->id,
                    'name' => (string)$g->name,
                ];
            }
        }
        return $result;
    }

    /**
     * Get enrolments for a specific user in a course.
     *
     * @param int $courseid
     * @param int $userid
     * @return array
     */
    public static function get_course_user_enrolments(int $courseid, int $userid): array {
        global $DB;
        $sql = "
            SELECT ue.id, e.enrol as method, ue.status, ue.timestart, ue.timeend, ue.timecreated
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE e.courseid = :courseid AND ue.userid = :userid
        ";
        return $DB->get_records_sql($sql, ['courseid' => $courseid, 'userid' => $userid]);
    }

    /**
     * Get first and last access timestamp for a user in a course.
     *
     * @param int $courseid
     * @param int $userid
     * @return array
     */
    public static function get_course_user_first_and_last_access(int $courseid, int $userid): array {
        global $DB;
        $lastaccessrec = $DB->get_record('user_lastaccess', ['courseid' => $courseid, 'userid' => $userid]);
        $lastaccess = $lastaccessrec ? (int)$lastaccessrec->timeaccess : 0;
        $firstaccess = 0;
        if ($lastaccess > 0) {
            try {
                $sqllogs = "
                    SELECT MIN(timecreated) as firstaccess
                      FROM {logstore_standard_log}
                     WHERE courseid = :courseid AND userid = :userid
                ";
                $logdata = $DB->get_record_sql($sqllogs, ['courseid' => $courseid, 'userid' => $userid]);
                if ($logdata && $logdata->firstaccess) {
                    $firstaccess = (int)$logdata->firstaccess;
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

    /**
     * Executes batch manual enrolments for one user across multiple courses.
     *
     * @param string $action
     * @param int $userid
     * @param array $courseids
     * @param array $options
     * @return array
     */
    public static function batch_user_course_enrolment(string $action, int $userid, array $courseids, array $options = []): array {
        global $DB;
        $enrol = enrol_get_plugin('manual');
        if (!$enrol) {
            return ['success' => false, 'message' => 'Manual enrolment plugin is disabled'];
        }

        $timestart = $options['timestart'] ?? 0;
        $timeend = $options['timeend'] ?? 0;
        $affected = 0;
        $transaction = $DB->start_delegated_transaction();
        try {
            foreach ($courseids as $cid) {
                $coursecontext = \context_course::instance($cid);
                require_capability('enrol/manual:enrol', $coursecontext);

                $instances = enrol_get_instances($cid, true);
                $manualinstance = null;
                foreach ($instances as $instance) {
                    if ($instance->enrol === 'manual') {
                        $manualinstance = $instance;
                        break;
                    }
                }
                if ($manualinstance) {
                    if ($action === 'add') {
                        $roleid = user_repository::get_role_id_by_shortname('student');
                        $enrol->enrol_user($manualinstance, $userid, $roleid);
                        $affected++;
                    } else if ($action === 'remove') {
                        $enrol->unenrol_user($manualinstance, $userid);
                        $affected++;
                    } else if ($action === 'suspend') {
                        $enrol->update_user_enrol($manualinstance, $userid, ENROL_USER_SUSPENDED);
                        $affected++;
                    } else if ($action === 'activate') {
                        $enrol->update_user_enrol($manualinstance, $userid, ENROL_USER_ACTIVE);
                        $affected++;
                    } else if ($action === 'update_dates') {
                        $enrol->update_user_enrol($manualinstance, $userid, null, $timestart, $timeend);
                        $affected++;
                    }
                }
            }
            $transaction->allow_commit();
        } catch (\Throwable $e) {
            try {
                $transaction->rollback($e);
            } catch (\Throwable $rollbackex) {
                if ($rollbackex !== $e) {
                    throw $rollbackex;
                }
            }
            debugging($e->getMessage(), DEBUG_DEVELOPER);
            return ['success' => false, 'message' => $e->getMessage(), 'affectedcount' => 0];
        }
        return ['success' => true, 'message' => "Successfully processed $affected enrolments"];
    }

    /**
     * Executes batch manual enrolments for multiple users in a single course.
     *
     * @param string $action
     * @param int $courseid
     * @param array $userids
     * @param array $options
     * @return array
     */
    public static function batch_course_user_enrolment(string $action, int $courseid, array $userids, array $options = []): array {
        global $DB, $CFG;
        $coursecontext = \context_course::instance($courseid);
        require_capability('enrol/manual:enrol', $coursecontext);

        $enrol = enrol_get_plugin('manual');
        if (!$enrol) {
            return ['success' => false, 'message' => 'Manual enrolment plugin disabled'];
        }

        $instances = enrol_get_instances($courseid, true);
        $manualinstance = null;
        foreach ($instances as $instance) {
            if ($instance->enrol === 'manual') {
                $manualinstance = $instance;
                break;
            }
        }

        if (!$manualinstance && in_array($action, ['add', 'remove', 'suspend', 'activate', 'set_expiration'])) {
            return ['success' => false, 'message' => 'No manual enrolment instance found for course'];
        }

        $timeend = $options['timeend'] ?? 0;
        $groupid = $options['groupid'] ?? 0;
        $newgroupname = $options['newgroupname'] ?? '';
        $messagetext = $options['message_text'] ?? '';
        $affected = 0;
        $roleid = $DB->get_field('role', 'id', ['shortname' => 'student']);

        $targetgroupid = $groupid;

        $transaction = $DB->start_delegated_transaction();
        try {
            if ($action === 'setgroup' && $targetgroupid === 0 && !empty($newgroupname)) {
                require_once($CFG->dirroot . '/group/lib.php');
                $newgroup = new \stdClass();
                $newgroup->courseid = $courseid;
                $newgroup->name = $newgroupname;
                $targetgroupid = groups_create_group($newgroup);
            }

            foreach ($userids as $uid) {
                if ($action === 'add') {
                    $enrol->enrol_user($manualinstance, $uid, $roleid);
                    $affected++;
                } else if ($action === 'remove') {
                    $enrol->unenrol_user($manualinstance, $uid);
                    $affected++;
                } else if ($action === 'suspend') {
                    $enrol->update_user_enrol($manualinstance, $uid, ENROL_USER_SUSPENDED);
                    $affected++;
                } else if ($action === 'activate') {
                    $enrol->update_user_enrol($manualinstance, $uid, ENROL_USER_ACTIVE);
                    $affected++;
                } else if ($action === 'set_expiration') {
                    $enrol->update_user_enrol($manualinstance, $uid, null, null, $timeend);
                    $affected++;
                } else if ($action === 'setgroup') {
                    require_once($CFG->dirroot . '/group/lib.php');
                    if ($targetgroupid > 0) {
                        if (groups_add_member($targetgroupid, $uid)) {
                            $affected++;
                        }
                    }
                } else if ($action === 'message') {
                    global $USER;
                    $recipient = $DB->get_record('user', ['id' => $uid]);
                    if ($recipient && !empty($messagetext)) {
                        $message = new \core\message\message();
                        $message->courseid          = $courseid;
                        $message->component         = 'moodle';
                        $message->name              = 'instantmessage';
                        $message->userfrom          = $USER;
                        $message->userto            = $recipient;
                        $cleanmsg = clean_text(substr($messagetext, 0, 65535), FORMAT_HTML);
                        $message->subject           = 'Mensaje';
                        $message->fullmessage       = $cleanmsg;
                        $message->fullmessageformat = FORMAT_HTML;
                        $message->fullmessagehtml   = $cleanmsg;
                        $message->smallmessage      = strip_tags($cleanmsg);
                        message_send($message);
                        $affected++;
                    }
                }
            }
            $transaction->allow_commit();
        } catch (\Throwable $e) {
            try {
                $transaction->rollback($e);
            } catch (\Throwable $rollbackex) {
                if ($rollbackex !== $e) {
                    throw $rollbackex;
                }
            }
            debugging($e->getMessage(), DEBUG_DEVELOPER);
            return ['success' => false, 'message' => $e->getMessage(), 'affectedcount' => 0];
        }

        return [
            'success'       => true,
            'message'       => "Successfully processed $affected enrolments",
            'affectedcount' => $affected,
        ];
    }

    /**
     * Get learning path assigned cohorts.
     *
     * @param int $courseid
     * @return array
     */
    public static function get_learning_path_cohorts(int $courseid): array {
        global $DB;
        $sqlcohorts = "
            SELECT e.id AS enrolid, e.customint1 AS cohortid, coh.name AS cohortname,
                   COUNT(DISTINCT ue.userid) AS membercount
              FROM {enrol} e
              JOIN {cohort} coh ON coh.id = e.customint1
         LEFT JOIN {user_enrolments} ue ON ue.enrolid = e.id AND ue.status = 0
             WHERE e.courseid = :courseid AND e.enrol = 'cohort'
          GROUP BY e.id, e.customint1, coh.name
          ORDER BY coh.name ASC
        ";
        $cohortrecords = $DB->get_records_sql($sqlcohorts, ['courseid' => $courseid], 0, 100);
        if (!$cohortrecords) {
            return [];
        }
        return array_values(array_map(function ($c) {
            return [
                'enrol_id'     => (int)$c->enrolid,
                'cohort_id'    => (int)$c->cohortid,
                'name'         => $c->cohortname,
                'member_count' => (int)$c->membercount,
            ];
        }, $cohortrecords));
    }

    /**
     * Get learning path enrolled users with pagination.
     *
     * @param int $courseid
     * @param int $limitfrom
     * @param int $limitnum
     * @return array
     */
    public static function get_learning_path_enrolled_users(int $courseid, int $limitfrom = 0, int $limitnum = 100): array {
        global $DB;
        $offset = max(0, $limitfrom);
        $limit = ($limitnum > 0 && $limitnum <= 500) ? $limitnum : 100;
        $sqlenrolledusers = "
            SELECT ue.id AS userenrolid, u.id, u.firstname, u.lastname, u.email,
                   ue.status, ue.timecreated, e.enrol AS enrolmethod
              FROM {user} u
              JOIN {user_enrolments} ue ON ue.userid = u.id
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE e.courseid = :courseid AND u.deleted = 0
          ORDER BY u.lastname ASC, u.firstname ASC
        ";
        $enrolleduserrecords = $DB->get_records_sql($sqlenrolledusers, ['courseid' => $courseid], $offset, $limit);
        $enrolledusers = [];
        if ($enrolleduserrecords) {
            foreach ($enrolleduserrecords as $eur) {
                $uid = (int)$eur->id;
                if (!isset($enrolledusers[$uid])) {
                    $enrolledusers[$uid] = [
                        'id'           => $uid,
                        'fullname'     => $eur->firstname . ' ' . $eur->lastname,
                        'email'        => $eur->email,
                        'status'       => (int)$eur->status,
                        'enrol_method' => $eur->enrolmethod,
                        'timecreated'  => (int)$eur->timecreated,
                    ];
                } else if ($eur->enrolmethod === 'manual') {
                    $enrolledusers[$uid]['enrol_method'] = 'manual';
                }
            }
        }
        return array_values($enrolledusers);
    }

    /**
     * Get user enrolled courses list.
     *
     * @param int $userid User ID.
     * @param int $limitfrom Offset.
     * @param int $limitnum Limit.
     * @return array Enrolled courses.
     */
    public static function get_user_enrolled_courses(int $userid, int $limitfrom = 0, int $limitnum = 0): array {
        global $DB;
        $sqlcourses = "
            SELECT c.id, c.fullname, c.shortname, MAX(e.enrol) as enrolmethod, MIN(ue.status) as enrolstatus
              FROM {course} c
              JOIN {enrol} e ON e.courseid = c.id
              JOIN {user_enrolments} ue ON ue.enrolid = e.id
             WHERE ue.userid = :userid
          GROUP BY c.id, c.fullname, c.shortname
          ORDER BY c.fullname ASC
        ";
        return $DB->get_records_sql($sqlcourses, ['userid' => $userid], $limitfrom, $limitnum);
    }

    /**
     * Calculate completion progress for a user across a set of courses.
     *
     * @param int $userid User ID.
     * @param array $enrolledcourses Enrolled courses array.
     * @return array Progress map indexed by course ID.
     */
    public static function get_user_courses_progress_data(int $userid, array $enrolledcourses): array {
        global $DB, $CFG;
        if (empty($enrolledcourses)) {
            return [];
        }

        require_once($CFG->libdir . '/completionlib.php');

        $courseids = array_keys($enrolledcourses);
        [$incsql, $incparams] = $DB->get_in_or_equal($courseids, SQL_PARAMS_NAMED, 'c');
        $params = array_merge(['userid' => $userid], $incparams);

        // Direct course completions (100%).
        $sqlcompletions = "
            SELECT course, 100 AS progress
              FROM {course_completions}
             WHERE userid = :userid AND course $incsql AND timecompleted > 0
        ";
        $completedmap = $DB->get_records_sql_menu($sqlcompletions, $params) ?: [];

        // Trackable activities by course.
        $trackablebycourse = [];
        $allcmids = [];
        foreach ($enrolledcourses as $c) {
            $courseobj = \tool_management_console\repository\course_repository::get_course($c->id);
            if ($courseobj) {
                $cinfo = \tool_management_console\moodle_version_helper::get_completion_info($courseobj);
                if ($cinfo->is_enabled()) {
                    $acts = $cinfo->get_activities();
                    $trackablebycourse[$c->id] = count($acts);
                    foreach (array_keys($acts) as $cmid) {
                        $allcmids[$cmid] = $c->id;
                    }
                } else {
                    $trackablebycourse[$c->id] = 0;
                }
            }
        }

        // Batch fetch completed modules.
        $cmcompletedcounts = [];
        if (!empty($allcmids)) {
            [$incmsql, $incmparams] = $DB->get_in_or_equal(array_keys($allcmids), SQL_PARAMS_NAMED, 'cm');
            $cmparams = array_merge(['userid' => $userid], $incmparams);
            $sqlcm = "
                SELECT cm.course, COUNT(DISTINCT cmc.coursemoduleid) as completed_count
                  FROM {course_modules_completion} cmc
                  JOIN {course_modules} cm ON cm.id = cmc.coursemoduleid
                 WHERE cmc.userid = :userid AND cmc.coursemoduleid $incmsql AND cmc.completionstate IN (1, 2)
              GROUP BY cm.course
            ";
            $cmcompletedcounts = $DB->get_records_sql_menu($sqlcm, $cmparams) ?: [];
        }

        $progressmap = [];
        foreach ($enrolledcourses as $c) {
            if (isset($completedmap[$c->id])) {
                $progressmap[$c->id] = 100;
            } else if (!empty($trackablebycourse[$c->id])) {
                $cmdone = isset($cmcompletedcounts[$c->id]) ? (int)$cmcompletedcounts[$c->id] : 0;
                $progressmap[$c->id] = (int)round(($cmdone / $trackablebycourse[$c->id]) * 100);
            } else {
                $progressmap[$c->id] = 0;
            }
        }

        return $progressmap;
    }
}
