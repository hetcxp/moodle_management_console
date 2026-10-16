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
 * Use case to retrieve detailed information for a course.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\application\courses;

use completion_info;
use context_course;
use stdClass;
use tool_management_console\repository\course_repository;
use tool_management_console\repository\course_enrolment_repository;

/**
 * Query use case for course detail aggregation.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_course_detail_usecase {
    /**
     * Maximum records per page allowed for bounded query.
     */
    private const MAX_PAGE_LIMIT = 500;

    /**
     * Default records per page.
     */
    private const DEFAULT_PAGE_LIMIT = 200;

    /**
     * Execute use case to get course details.
     *
     * @param int $courseid ID of the course.
     * @param int $limitfrom Pagination offset.
     * @param int $limitnum Pagination limit.
     * @return array Aggregated course detail data.
     */
    public static function execute(int $courseid, int $limitfrom = 0, int $limitnum = 0): array {
        $course = course_repository::get_course_strict($courseid);
        $context = context_course::instance($course->id);

        require_capability('moodle/course:view', $context);
        if (empty($course->visible)) {
            require_capability('moodle/course:viewhiddencourses', $context);
        }

        $offset = max(0, $limitfrom);
        $limit = ($limitnum > 0 && $limitnum <= self::MAX_PAGE_LIMIT) ? $limitnum : self::DEFAULT_PAGE_LIMIT;

        $users = self::build_enrolled_users($course, $context, $offset, $limit);
        $cohorts = self::build_linked_cohorts($course->id);
        $coursegroups = course_repository::get_course_groups_list($course->id);
        $categoryname = course_repository::get_course_category_name($course->category);
        $competencies = course_repository::get_course_competencies($course->id);

        return [
            'id'           => (int)$course->id,
            'fullname'     => $course->fullname,
            'shortname'    => $course->shortname,
            'categoryname' => $categoryname,
            'timecreated'  => (int)$course->timecreated,
            'startdate'    => (int)$course->startdate,
            'enddate'      => (int)$course->enddate,
            'users'        => $users,
            'cohorts'      => $cohorts,
            'coursegroups' => $coursegroups,
            'competencies' => $competencies,
        ];
    }

    /**
     * Build list of enrolled users with completions and enrolment data.
     *
     * @param stdClass $course Course record.
     * @param context_course $context Course context.
     * @param int $offset Offset.
     * @param int $limit Limit.
     * @return array
     */
    private static function build_enrolled_users(stdClass $course, context_course $context, int $offset, int $limit): array {
        $enrolledusers = course_enrolment_repository::get_course_enrolled_users_detail($course->id, $offset, $limit);
        if (empty($enrolledusers)) {
            return [];
        }

        $userids = array_map(function ($u) {
            return (int)$u->id;
        }, $enrolledusers);

        $maps = [
            'cohorts'    => course_repository::get_course_user_cohort_map($course->id, $userids),
            'enrolments' => self::build_user_enrolments_map($course->id, $userids),
            'roles'      => course_repository::get_course_user_roles_map($course->id, $userids),
        ];
        $progresscalc = self::calculate_activity_completions($course, $userids);
        $canviewemail = is_siteadmin() || has_capability('moodle/course:useremail', $context);

        $users = [];
        foreach ($enrolledusers as $u) {
            $users[] = self::map_user_item($u, $maps, $progresscalc, $canviewemail);
        }
        return $users;
    }

    /**
     * Map single enrolled user record.
     *
     * @param stdClass $u
     * @param array $maps
     * @param array $progresscalc
     * @param bool $canviewemail
     * @return array
     */
    private static function map_user_item(stdClass $u, array $maps, array $progresscalc, bool $canviewemail): array {
        $uid = (int)$u->id;
        $status = isset($u->enrolstatus) ? (int)$u->enrolstatus : 0;
        $timeend = isset($u->timeend) ? (int)$u->timeend : 0;

        return [
            'id'         => $uid,
            'fullname'   => fullname($u),
            'email'      => self::resolve_email($u, $canviewemail),
            'progress'   => self::resolve_user_progress($u, $progresscalc),
            'status'     => $status,
            'timestart'  => self::resolve_timestart($u),
            'timeend'    => $timeend,
            'enrolments' => self::resolve_user_enrolments($uid, $maps['enrolments']),
            'cohortids'  => self::resolve_cohorts_str($uid, $maps['cohorts']),
            'roles'      => self::resolve_roles_str($uid, $maps['roles']),
        ];
    }

    /**
     * Resolve user enrolments list.
     *
     * @param int $uid
     * @param array $enrolmentsmap
     * @return array
     */
    private static function resolve_user_enrolments(int $uid, array $enrolmentsmap): array {
        if (isset($enrolmentsmap[$uid])) {
            return $enrolmentsmap[$uid];
        }
        return [];
    }

    /**
     * Resolve email view permission.
     *
     * @param stdClass $u
     * @param bool $canviewemail
     * @return string
     */
    private static function resolve_email(stdClass $u, bool $canviewemail): string {
        if (!$canviewemail) {
            return '';
        }
        return (string)($u->email ?? '');
    }

    /**
     * Resolve user timestart.
     *
     * @param stdClass $u
     * @return int
     */
    private static function resolve_timestart(stdClass $u): int {
        $start = (int)($u->timestart ?? 0);
        if ($start > 0) {
            return $start;
        }
        return (int)($u->timecreated ?? 0);
    }

    /**
     * Resolve cohorts string.
     *
     * @param int $uid
     * @param array $cohortusermap
     * @return string
     */
    private static function resolve_cohorts_str(int $uid, array $cohortusermap): string {
        if (isset($cohortusermap[$uid])) {
            return implode(',', $cohortusermap[$uid]);
        }
        return '';
    }

    /**
     * Resolve roles string.
     *
     * @param int $uid
     * @param array $userrolesmap
     * @return string
     */
    private static function resolve_roles_str(int $uid, array $userrolesmap): string {
        if (isset($userrolesmap[$uid])) {
            return implode(',', $userrolesmap[$uid]);
        }
        return 'student';
    }

    /**
     * Build map of user enrolments by userid.
     *
     * @param int $courseid Course ID.
     * @param array $userids Array of user IDs.
     * @return array
     */
    private static function build_user_enrolments_map(int $courseid, array $userids): array {
        $allenrolments = course_repository::get_course_all_enrolments($courseid, $userids);
        $map = [];
        foreach ($allenrolments as $ue) {
            $start = (int)$ue->timestart;
            $created = (int)$ue->timecreated;
            $map[$ue->userid][] = [
                'method'    => (string)$ue->method,
                'status'    => (int)$ue->status,
                'timestart' => $start > 0 ? $start : $created,
                'timeend'   => (int)$ue->timeend,
            ];
        }
        return $map;
    }

    /**
     * Calculate activity completions for users in a course.
     *
     * @param stdClass $course Course record.
     * @param array $userids User IDs.
     * @return array Array with totalactivities count and completions map.
     */
    private static function calculate_activity_completions(stdClass $course, array $userids): array {
        global $CFG;
        require_once($CFG->libdir . '/completionlib.php');

        $cinfo = new completion_info($course);
        $trackable = $cinfo->is_enabled() ? $cinfo->get_activities() : [];
        $total = count($trackable);

        $completions = [];
        if ($total > 0 && !empty($userids)) {
            $completions = course_repository::get_course_cm_completions(array_keys($trackable), $userids);
        }

        return [
            'total'       => $total,
            'completions' => $completions,
        ];
    }

    /**
     * Resolve progress percentage for a single user.
     *
     * @param stdClass $u User object.
     * @param array $calc Completion calculation data.
     * @return int Progress percentage (0-100).
     */
    private static function resolve_user_progress(stdClass $u, array $calc): int {
        if (!empty($u->timecompleted)) {
            return 100;
        }
        if ($calc['total'] > 0) {
            $completed = isset($calc['completions'][$u->id]) ? (int)$calc['completions'][$u->id] : 0;
            return (int)round(($completed / $calc['total']) * 100);
        }
        return 0;
    }

    /**
     * Build list of linked cohorts with progress metrics.
     *
     * @param int $courseid Course ID.
     * @return array
     */
    private static function build_linked_cohorts(int $courseid): array {
        $linkedcohorts = course_repository::get_course_linked_cohorts($courseid);
        $cohorts = [];

        foreach ($linkedcohorts as $c) {
            $enrolled = (int)$c->enrolledcount;
            $completed = (int)$c->completedcount;
            $progress = ($enrolled > 0) ? (int)round(($completed / $enrolled) * 100) : 0;

            $cohorts[] = [
                'id'           => (int)$c->id,
                'name'         => (string)$c->name,
                'idnumber'     => (string)$c->idnumber,
                'enrolid'      => (int)$c->enrolid,
                'status'       => (int)$c->enrolstatus,
                'timecreated'  => (int)$c->timecreated,
                'enrolenddate' => (int)$c->enrolenddate,
                'groupid'      => (int)$c->groupid,
                'progress'     => $progress,
            ];
        }

        return $cohorts;
    }
}
