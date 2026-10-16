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
 * Use case to retrieve and aggregate user details.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\application\users;

use context_system;
use context_user;
use stdClass;
use tool_management_console\repository\user_repository;

/**
 * Aggregates user profile, enrolments, progress and cohorts data.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_user_detail_usecase {
    /**
     * Maximum records per page allowed for bounded query.
     */
    private const MAX_PAGE_LIMIT = 500;

    /**
     * Default records per page.
     */
    private const DEFAULT_PAGE_LIMIT = 200;

    /**
     * Execute use case to get user details.
     *
     * @param int $userid ID of the user.
     * @param int $limitfrom Pagination offset for courses.
     * @param int $limitnum Pagination limit for courses.
     * @return array
     */
    public static function execute(int $userid, int $limitfrom = 0, int $limitnum = 0): array {
        $user = user_repository::get_user_strict($userid);
        $context = context_user::instance($user->id);
        require_capability('moodle/user:viewdetails', $context);

        $offset = max(0, $limitfrom);
        $limit = ($limitnum > 0 && $limitnum <= self::MAX_PAGE_LIMIT) ? $limitnum : self::DEFAULT_PAGE_LIMIT;

        $courses = self::build_enrolled_courses($user->id, $offset, $limit);
        $cohorts = self::build_user_cohorts($user->id);
        $progressmetrics = self::calculate_progress_summary($courses);
        $systemroles = user_repository::get_user_system_roles($user->id);
        $competencies = user_repository::get_user_competencies($user->id);

        return [
            'id'                => (int)$user->id,
            'username'          => (string)$user->username,
            'fullname'          => fullname($user),
            'email'             => self::resolve_user_email($user),
            'suspended'         => (int)$user->suspended,
            'is_active'         => empty($user->suspended) ? 1 : 0,
            'is_admin'          => self::resolve_is_admin((int)$user->id),
            'lastaccess'        => (int)$user->lastaccess,
            'enrolled_courses'  => $progressmetrics['enrolled_count'],
            'completed_courses' => $progressmetrics['completed_count'],
            'cohorts_count'     => count($cohorts),
            'progress'          => (int)$progressmetrics['progress'],
            'courses'           => $courses,
            'cohorts'           => $cohorts,
            'system_roles'      => $systemroles,
            'competencies'      => $competencies,
        ];
    }

    /**
     * Check if user is a site administrator.
     *
     * @param int $uid
     * @return int
     */
    private static function resolve_is_admin(int $uid): int {
        global $CFG;
        $siteadmins = explode(',', $CFG->siteadmins ?? '');
        return in_array($uid, $siteadmins) ? 1 : 0;
    }

    /**
     * Resolve user email respecting capabilities.
     *
     * @param stdClass $user
     * @return string
     */
    private static function resolve_user_email(stdClass $user): string {
        $canview = is_siteadmin() || has_capability('moodle/user:viewalldetails', context_system::instance());
        if (!$canview) {
            return '';
        }
        return trim(preg_replace('/[\s\x{00a0}]+/u', '', (string)$user->email));
    }

    /**
     * Build list of enrolled courses with progress metrics.
     *
     * @param int $userid User ID.
     * @param int $offset Offset.
     * @param int $limit Limit.
     * @return array
     */
    private static function build_enrolled_courses(int $userid, int $offset, int $limit): array {
        global $CFG;
        require_once($CFG->libdir . '/completionlib.php');

        $enrolledcourses = user_repository::get_user_enrolled_courses($userid, $offset, $limit);
        $allenrolments = user_repository::get_user_all_enrolments($userid, 0, 500);
        $courseenrolmentsmap = self::build_course_enrolments_map($allenrolments);
        $progressmap = user_repository::get_user_courses_progress_data($userid, $enrolledcourses);

        $courses = [];
        foreach ($enrolledcourses as $c) {
            $courses[] = self::map_course_item($c, $progressmap, $courseenrolmentsmap);
        }
        return $courses;
    }

    /**
     * Map course item with enrolments and progress.
     *
     * @param stdClass $c
     * @param array $progressmap
     * @param array $courseenrolmentsmap
     * @return array
     */
    private static function map_course_item(stdClass $c, array $progressmap, array $courseenrolmentsmap): array {
        $cid = (int)$c->id;
        $progressval = isset($progressmap[$cid]) ? (int)$progressmap[$cid] : 0;
        $enrolments = isset($courseenrolmentsmap[$cid]) ? $courseenrolmentsmap[$cid] : [];

        return [
            'id'          => $cid,
            'fullname'    => $c->fullname,
            'shortname'   => $c->shortname,
            'progress'    => $progressval,
            'enrolmethod' => $c->enrolmethod,
            'enrolstatus' => (int)$c->enrolstatus,
            'enrolments'  => $enrolments,
        ];
    }

    /**
     * Build map of course enrolments.
     *
     * @param array $allenrolments
     * @return array
     */
    private static function build_course_enrolments_map(array $allenrolments): array {
        $map = [];
        foreach ($allenrolments as $ue) {
            $start = (int)$ue->timestart;
            $created = (int)$ue->timecreated;
            $map[$ue->courseid][] = [
                'method'    => (string)$ue->method,
                'status'    => (int)$ue->status,
                'timestart' => $start > 0 ? $start : $created,
                'timeend'   => (int)$ue->timeend,
            ];
        }
        return $map;
    }

    /**
     * Build list of user cohorts.
     *
     * @param int $userid User ID.
     * @return array
     */
    private static function build_user_cohorts(int $userid): array {
        $linkedcohorts = user_repository::get_user_cohorts($userid, 0, 100);
        $cohorts = [];
        foreach ($linkedcohorts as $coh) {
            $cohorts[] = [
                'id'       => (int)$coh->id,
                'name'     => (string)$coh->name,
                'idnumber' => (string)$coh->idnumber,
            ];
        }
        return $cohorts;
    }

    /**
     * Calculate summary progress for active courses.
     *
     * @param array $courses Courses list.
     * @return array Metrics dictionary.
     */
    private static function calculate_progress_summary(array $courses): array {
        $activecourses = array_filter($courses, function ($c) {
            return isset($c['enrolstatus']) && (int)$c['enrolstatus'] === 0;
        });
        $enrolledcount = count($activecourses);
        $completedcount = count(array_filter($activecourses, function ($c) {
            return (int)($c['progress'] ?? 0) === 100;
        }));
        $progress = ($enrolledcount > 0) ? min(100, round(($completedcount / $enrolledcount) * 100)) : 0;

        return [
            'enrolled_count'  => $enrolledcount,
            'completed_count' => $completedcount,
            'progress'        => $progress,
        ];
    }
}
