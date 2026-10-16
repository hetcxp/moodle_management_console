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
 * Cohort repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

/**
 * Cohort repository class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class cohort_repository {
    /**
     * Get cohorts filtered with pagination.
     *
     * @param array $params Filter and pagination parameters.
     * @return array Array containing records and total count.
     */
    public static function get_cohorts_filtered(array $params): array {
        global $DB;

        $where = "1=1";
        $sqlparams = [];

        if (!empty($params['search'])) {
            $like = '%' . $params['search'] . '%';
            $where .= " AND (" . $DB->sql_like('c.name', ':s1', false, false) .
                      " OR " . $DB->sql_like('c.idnumber', ':s2', false, false) . ")";
            $sqlparams['s1'] = $like;
            $sqlparams['s2'] = $like;
        }

        $rawfilters = $params['filters'] ?? null;
        $decodedfilters = is_string($rawfilters) ? json_decode($rawfilters, true) : ($rawfilters ?? []);
        if (is_array($decodedfilters) && !empty($decodedfilters)) {
            $filterindex = 1;
            $allowedfilters = ['name' => 'c.name', 'idnumber' => 'c.idnumber'];
            foreach ($decodedfilters as $key => $value) {
                if (array_key_exists($key, $allowedfilters) && $value !== '') {
                    $fieldname = $allowedfilters[$key];
                    if (is_string($value)) {
                        $where .= " AND " . $DB->sql_like($fieldname, ":filterval$filterindex", false, false);
                        $sqlparams["filterval$filterindex"] = '%' . $value . '%';
                    }
                    $filterindex++;
                }
            }
            if (isset($decodedfilters['empty_only']) && $decodedfilters['empty_only']) {
                if ($decodedfilters['empty_only'] === '1' || $decodedfilters['empty_only'] === true) {
                    $where .= " AND NOT EXISTS (SELECT 1 FROM {cohort_members} cm_f WHERE cm_f.cohortid = c.id)";
                } else if ($decodedfilters['empty_only'] === '0') {
                    $where .= " AND EXISTS (SELECT 1 FROM {cohort_members} cm_f WHERE cm_f.cohortid = c.id)";
                }
            }
        }

        $sortfield = 'c.name';
        $d = strtoupper($params['dir'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';
        switch (strtolower($params['sort'] ?? 'name')) {
            case 'idnumber':
                $sortfield = 'c.idnumber';
                break;
            case 'memberscount':
                $sortfield = 'memberscount';
                break;
            case 'coursescount':
                $sortfield = 'coursescount';
                break;
            case 'name':
            default:
                $sortfield = 'c.name';
                break;
        }

        $sqlselect = "
            SELECT c.id, c.name, c.idnumber, c.description,
                   (SELECT COUNT(cm.id) FROM {cohort_members} cm WHERE cm.cohortid = c.id) AS memberscount,
                   (SELECT COUNT(DISTINCT e.courseid) FROM {enrol} e
                     WHERE e.enrol = 'cohort' AND e.customint1 = c.id) AS coursescount
              FROM {cohort} c
             WHERE $where
          ORDER BY $sortfield $d
        ";

        $sqlcount = "SELECT COUNT(c.id) FROM {cohort} c WHERE $where";
        $totalcount = (int)$DB->count_records_sql($sqlcount, $sqlparams);

        $page = (int)($params['page'] ?? 0);
        $perpage = (int)($params['perpage'] ?? 50);
        $limitfrom = $page * $perpage;
        $records = $DB->get_records_sql($sqlselect, $sqlparams, $limitfrom, $perpage);

        return [$records, $totalcount];
    }

    /**
     * Count cohorts matching SQL.
     *
     * @param string $sqlcount SQL query for counting.
     * @param array $sqlparams Query parameters.
     * @return int Total cohorts count.
     */
    public static function count_cohorts(string $sqlcount, array $sqlparams = []): int {
        global $DB;
        return (int)$DB->count_records_sql($sqlcount, $sqlparams);
    }

    /**
     * Get paginated cohorts.
     *
     * @param string $sql SQL query.
     * @param array $sqlparams Query parameters.
     * @param int $limitfrom Offset.
     * @param int $perpage Records per page.
     * @return array Records array.
     */
    public static function get_paginated_cohorts(string $sql, array $sqlparams, int $limitfrom, int $perpage): array {
        global $DB;
        return $DB->get_records_sql($sql, $sqlparams, $limitfrom, $perpage);
    }

    /**
     * Get single cohort progress percentage.
     *
     * @param int $cohortid Cohort ID.
     * @return int Progress percentage (0-100).
     */
    public static function get_cohort_progress(int $cohortid): int {
        $map = self::get_cohorts_progress_map([(int)$cohortid]);
        return $map[(int)$cohortid] ?? 0;
    }

    /**
     * Get cohorts progress map indexed by cohort ID.
     *
     * @param array $cohortids Array of cohort IDs.
     * @return array Map of cohort ID to progress percentage.
     */
    public static function get_cohorts_progress_map(array $cohortids): array {
        global $DB;
        if (empty($cohortids)) {
            return [];
        }

        $cohortids = array_values(array_unique(array_map('intval', $cohortids)));
        [$insql, $inparams] = $DB->get_in_or_equal($cohortids, SQL_PARAMS_NAMED, 'coh');

        // Fetch synced courses for all specified cohorts.
        $sqlsynced = "
            SELECT e.id AS enrolid, e.customint1 AS cohortid, c.id AS courseid, c.*
              FROM {course} c
              JOIN {enrol} e ON e.courseid = c.id
             WHERE e.enrol = 'cohort' AND e.customint1 $insql
        ";
        $syncedrecords = $DB->get_records_sql($sqlsynced, $inparams);

        // Fetch members for all specified cohorts.
        $sqlmembers = "
            SELECT cm.id, cm.cohortid, cm.userid
              FROM {cohort_members} cm
              JOIN {user} u ON u.id = cm.userid
             WHERE cm.cohortid $insql AND u.deleted = 0
        ";
        $memberrecords = $DB->get_records_sql($sqlmembers, $inparams);

        $cohortcourses = [];
        $allcoursesrecords = [];
        foreach ($syncedrecords as $r) {
            $cid = (int)$r->id;
            $cohortcourses[$r->cohortid][$cid] = $r;
            $allcoursesrecords[$cid] = $r;
        }

        $cohortmembers = [];
        $alluserids = [];
        foreach ($memberrecords as $m) {
            $uid = (int)$m->userid;
            $cohortmembers[$m->cohortid][$uid] = $uid;
            $alluserids[$uid] = $uid;
        }

        // Initialize all cohorts with 0 progress.
        $progressmap = [];
        foreach ($cohortids as $cid) {
            $progressmap[$cid] = 0;
        }

        if (empty($alluserids) || empty($allcoursesrecords)) {
            return $progressmap;
        }

        $progressdata = self::get_cohort_members_progress_data(
            array_values($alluserids),
            array_values($allcoursesrecords)
        );

        foreach ($cohortids as $cid) {
            $courses = $cohortcourses[$cid] ?? [];
            $members = $cohortmembers[$cid] ?? [];

            if (empty($courses) || empty($members)) {
                $progressmap[$cid] = 0;
                continue;
            }

            $total = 0;
            $pairs = 0;
            foreach ($members as $uid) {
                foreach ($courses as $courseid => $crec) {
                    $total += $progressdata[$uid][$courseid] ?? 0;
                    $pairs++;
                }
            }

            $progressmap[$cid] = $pairs > 0 ? (int)round($total / $pairs) : 0;
        }

        return $progressmap;
    }

    /**
     * Calculate progress data for user and course combinations.
     *
     * @param array $userids Array of user IDs.
     * @param array $coursesrecords Array of course record objects.
     * @return array Progress data indexed by user ID and course ID.
     */
    public static function get_cohort_members_progress_data(array $userids, array $coursesrecords): array {
        global $DB, $CFG;
        if (empty($userids) || empty($coursesrecords)) {
            return [];
        }

        require_once($CFG->libdir . '/completionlib.php');

        $courseids = array_map(function ($c) {
            return (int)$c->id;
        }, $coursesrecords);
        [$inusql, $inuparams] = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED, 'u');
        [$incsql, $incparams] = $DB->get_in_or_equal($courseids, SQL_PARAMS_NAMED, 'c');
        $sqlparams = array_merge($inuparams, $incparams);

        // Course completions (100%).
        $sqlcompletions = "
            SELECT " . $DB->sql_concat('cc.userid', "'-'", 'cc.course') . " AS u_c, 100 AS progress
              FROM {course_completions} cc
             WHERE cc.userid $inusql AND cc.course $incsql AND cc.timecompleted > 0
        ";
        $completedmap = $DB->get_records_sql_menu($sqlcompletions, $sqlparams) ?: [];

        // Trackable activities by course.
        $trackablebycourse = [];
        $alltrackablecmids = [];
        foreach ($coursesrecords as $c) {
            $cinfo = \tool_management_console\moodle_version_helper::get_completion_info($c);
            if ($cinfo->is_enabled()) {
                $acts = $cinfo->get_activities();
                $trackablebycourse[$c->id] = count($acts);
                foreach (array_keys($acts) as $cmid) {
                    $alltrackablecmids[$cmid] = $c->id;
                }
            } else {
                $trackablebycourse[$c->id] = 0;
            }
        }

        // Module completions in batch.
        $cmcompletedcounts = [];
        if (!empty($alltrackablecmids)) {
            [$incmsql, $incmparams] = $DB->get_in_or_equal(array_keys($alltrackablecmids), SQL_PARAMS_NAMED, 'cm');
            $cmparams = array_merge($inuparams, $incmparams);
            $sqlcm = "
                SELECT " . $DB->sql_concat('cmc.userid', "'-'", 'cm.course') . " AS u_c,
                       COUNT(DISTINCT cmc.coursemoduleid) AS completed_count
                  FROM {course_modules_completion} cmc
                  JOIN {course_modules} cm ON cm.id = cmc.coursemoduleid
                 WHERE cmc.userid $inusql AND cmc.coursemoduleid $incmsql AND cmc.completionstate IN (1, 2)
              GROUP BY cmc.userid, cm.course
            ";
            $cmcompletedcounts = $DB->get_records_sql_menu($sqlcm, $cmparams) ?: [];
        }

        // Build result map: [userid => [courseid => progress]].
        $result = [];
        foreach ($userids as $uid) {
            $result[$uid] = [];
            foreach ($courseids as $cid) {
                $key = $uid . '-' . $cid;
                if (isset($completedmap[$key])) {
                    $result[$uid][$cid] = 100;
                } else if (!empty($trackablebycourse[$cid])) {
                    $cmdone = isset($cmcompletedcounts[$key]) ? (int)$cmcompletedcounts[$key] : 0;
                    $result[$uid][$cid] = (int)round(($cmdone / $trackablebycourse[$cid]) * 100);
                } else {
                    $result[$uid][$cid] = 0;
                }
            }
        }

        return $result;
    }

    /**
     * Get cohort record by ID.
     *
     * @param int $cohortid Cohort ID.
     * @return \stdClass|false Cohort record or false if not found.
     */
    public static function get_cohort(int $cohortid) {
        global $DB;
        return $DB->get_record('cohort', ['id' => $cohortid]);
    }

    /**
     * Get cohort record by ID or throw exception.
     *
     * @param int $cohortid Cohort ID.
     * @return \stdClass Cohort record.
     */
    public static function get_cohort_strict(int $cohortid): \stdClass {
        global $DB;
        return $DB->get_record('cohort', ['id' => $cohortid], '*', MUST_EXIST);
    }

    /**
     * Get synced courses for a cohort.
     *
     * @param int $cohortid Cohort ID.
     * @param int $limitfrom Offset.
     * @param int $limitnum Limit count.
     * @return array Courses array.
     */
    public static function get_cohort_synced_courses(int $cohortid, int $limitfrom = 0, int $limitnum = 0): array {
        global $DB;
        $sqlcourses = "
            SELECT c.*, e.id as enrolid,
                   (SELECT COUNT(ue.id) FROM {user_enrolments} ue WHERE ue.enrolid = e.id) as enrolledcount
              FROM {course} c
              JOIN {enrol} e ON e.courseid = c.id
             WHERE e.customint1 = :cohortid AND e.enrol = 'cohort'
          ORDER BY c.fullname ASC
        ";
        return $DB->get_records_sql($sqlcourses, ['cohortid' => $cohortid], $limitfrom, $limitnum);
    }

    /**
     * Get members of a cohort.
     *
     * @param int $cohortid Cohort ID.
     * @param int $limitfrom Offset.
     * @param int $limitnum Limit count.
     * @return array Cohort member records.
     */
    public static function get_cohort_members(int $cohortid, int $limitfrom = 0, int $limitnum = 0): array {
        global $DB;
        $sqlmembers = "
            SELECT u.id, u.firstname, u.lastname, u.email, u.lastaccess, u.suspended,
                   u.firstnamephonetic, u.lastnamephonetic, u.middlename, u.alternatename
              FROM {user} u
              JOIN {cohort_members} cm ON cm.userid = u.id
             WHERE cm.cohortid = :cohortid AND u.deleted = 0
          ORDER BY u.lastname ASC, u.firstname ASC
        ";
        return $DB->get_records_sql($sqlmembers, ['cohortid' => $cohortid], $limitfrom, $limitnum);
    }

    /**
     * Get cohort KPI metrics.
     *
     * @return array KPI metrics.
     */
    public static function get_kpis(): array {
        $cached = \tool_management_console\cache_manager::get_kpi('cohort_kpis');
        if ($cached !== null) {
            return $cached;
        }

        global $DB;
        $sqlcohorts = "SELECT COUNT(id) FROM {cohort}";
        $totalcohorts = (int)$DB->count_records_sql($sqlcohorts);

        $sqlmembers = "SELECT COUNT(id) FROM {cohort_members}";
        $totalmembers = (int)$DB->count_records_sql($sqlmembers);

        $avgmembers = $totalcohorts > 0 ? round($totalmembers / $totalcohorts, 1) : 0;

        $sqlempty = "
            SELECT COUNT(c.id)
              FROM {cohort} c
             WHERE NOT EXISTS (SELECT 1 FROM {cohort_members} cm WHERE cm.cohortid = c.id)
        ";
        $emptycohorts = (int)$DB->count_records_sql($sqlempty);

        $sqlsynced = "
            SELECT COUNT(DISTINCT customint1)
              FROM {enrol}
             WHERE enrol = 'cohort'
        ";
        $syncedcourses = (int)$DB->count_records_sql($sqlsynced);

        $result = [
            'total_cohorts' => $totalcohorts,
            'total_members' => $totalmembers,
            'avg_members' => $avgmembers,
            'empty_cohorts' => $emptycohorts,
            'synced_courses' => $syncedcourses,
        ];

        \tool_management_console\cache_manager::set_kpi('cohort_kpis', $result);
        return $result;
    }
}
