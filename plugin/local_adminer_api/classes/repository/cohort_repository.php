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
 * Cohort repository for local_adminer_api.
 *
 * @package    local_adminer_api
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_adminer_api\repository;

defined('MOODLE_INTERNAL') || die();

/**
 * Cohort repository class.
 *
 * @package    local_adminer_api
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class cohort_repository {

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

        $decoded_filters = is_string($params['filters'] ?? null) ? json_decode($params['filters'], true) : ($params['filters'] ?? []);
        if (is_array($decoded_filters) && !empty($decoded_filters)) {
            $filter_index = 1;
            $allowed_filters = ['name' => 'c.name', 'idnumber' => 'c.idnumber'];
            foreach ($decoded_filters as $key => $value) {
                if (array_key_exists($key, $allowed_filters) && $value !== '') {
                    $fieldname = $allowed_filters[$key];
                    if (is_string($value)) {
                        $where .= " AND " . $DB->sql_like($fieldname, ":filterval$filter_index", false, false);
                        $sqlparams["filterval$filter_index"] = '%' . $value . '%';
                    }
                    $filter_index++;
                }
            }
            if (isset($decoded_filters['empty_only']) && $decoded_filters['empty_only']) {
                if ($decoded_filters['empty_only'] === '1' || $decoded_filters['empty_only'] === true) {
                    $where .= " AND NOT EXISTS (SELECT 1 FROM {cohort_members} cm_f WHERE cm_f.cohortid = c.id)";
                } else if ($decoded_filters['empty_only'] === '0') {
                    $where .= " AND EXISTS (SELECT 1 FROM {cohort_members} cm_f WHERE cm_f.cohortid = c.id)";
                }
            }
        }

        $sortfield = 'c.name';
        $d = strtoupper($params['dir'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';
        switch (strtolower($params['sort'] ?? 'name')) {
            case 'idnumber': $sortfield = 'c.idnumber'; break;
            case 'memberscount': $sortfield = 'memberscount'; break;
            case 'coursescount': $sortfield = 'coursescount'; break;
            case 'name':
            default: $sortfield = 'c.name'; break;
        }

        $sql_select = "
            SELECT c.id, c.name, c.idnumber, c.description,
                   (SELECT COUNT(cm.id) FROM {cohort_members} cm WHERE cm.cohortid = c.id) AS memberscount,
                   (SELECT COUNT(DISTINCT e.courseid) FROM {enrol} e WHERE e.enrol = 'cohort' AND e.customint1 = c.id) AS coursescount
              FROM {cohort} c
             WHERE $where
          ORDER BY $sortfield $d
        ";

        $sql_count = "SELECT COUNT(c.id) FROM {cohort} c WHERE $where";
        $totalcount = (int)$DB->count_records_sql($sql_count, $sqlparams);

        $page = (int)($params['page'] ?? 0);
        $perpage = (int)($params['perpage'] ?? 50);
        $limitfrom = $page * $perpage;
        $records = $DB->get_records_sql($sql_select, $sqlparams, $limitfrom, $perpage);

        return [$records, $totalcount];
    }

    public static function count_cohorts($sql_count, $sqlparams = []) {
        global $DB;
        return (int)$DB->count_records_sql($sql_count, $sqlparams);
    }

    public static function get_paginated_cohorts($sql, $sqlparams, $limitfrom, $perpage) {
        global $DB;
        return $DB->get_records_sql($sql, $sqlparams, $limitfrom, $perpage);
    }

    public static function get_cohort_progress($cohortid) {
        $map = self::get_cohorts_progress_map([(int)$cohortid]);
        return $map[(int)$cohortid] ?? 0;
    }

    public static function get_cohorts_progress_map(array $cohortids): array {
        global $DB;
        if (empty($cohortids)) {
            return [];
        }

        $cohortids = array_values(array_unique(array_map('intval', $cohortids)));
        list($in_sql, $in_params) = $DB->get_in_or_equal($cohortids, SQL_PARAMS_NAMED, 'coh');

        // Fetch synced courses for all specified cohorts
        $sql_synced = "
            SELECT e.id AS enrolid, e.customint1 AS cohortid, c.id AS courseid, c.*
              FROM {course} c
              JOIN {enrol} e ON e.courseid = c.id
             WHERE e.enrol = 'cohort' AND e.customint1 $in_sql
        ";
        $synced_records = $DB->get_records_sql($sql_synced, $in_params);

        // Fetch members for all specified cohorts
        $sql_members = "
            SELECT cm.id, cm.cohortid, cm.userid
              FROM {cohort_members} cm
              JOIN {user} u ON u.id = cm.userid
             WHERE cm.cohortid $in_sql AND u.deleted = 0
        ";
        $member_records = $DB->get_records_sql($sql_members, $in_params);

        $cohort_courses = [];
        $all_courses_records = [];
        foreach ($synced_records as $r) {
            $cid = (int)$r->id;
            $cohort_courses[$r->cohortid][$cid] = $r;
            $all_courses_records[$cid] = $r;
        }

        $cohort_members = [];
        $all_user_ids = [];
        foreach ($member_records as $m) {
            $uid = (int)$m->userid;
            $cohort_members[$m->cohortid][$uid] = $uid;
            $all_user_ids[$uid] = $uid;
        }

        // Initialize all cohorts with 0 progress
        $progress_map = [];
        foreach ($cohortids as $cid) {
            $progress_map[$cid] = 0;
        }

        if (empty($all_user_ids) || empty($all_courses_records)) {
            return $progress_map;
        }

        $progress_data = self::get_cohort_members_progress_data(
            array_values($all_user_ids),
            array_values($all_courses_records)
        );

        foreach ($cohortids as $cid) {
            $courses = $cohort_courses[$cid] ?? [];
            $members = $cohort_members[$cid] ?? [];

            if (empty($courses) || empty($members)) {
                $progress_map[$cid] = 0;
                continue;
            }

            $total = 0;
            $pairs = 0;
            foreach ($members as $uid) {
                foreach ($courses as $courseid => $crec) {
                    $total += $progress_data[$uid][$courseid] ?? 0;
                    $pairs++;
                }
            }

            $progress_map[$cid] = $pairs > 0 ? (int)round($total / $pairs) : 0;
        }

        return $progress_map;
    }

    public static function get_cohort_members_progress_data(array $userids, array $courses_records): array {
        global $DB, $CFG;
        if (empty($userids) || empty($courses_records)) {
            return [];
        }

        require_once($CFG->libdir . '/completionlib.php');

        $course_ids = array_map(function($c) { return (int)$c->id; }, $courses_records);
        list($in_u_sql, $in_u_params) = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED, 'u');
        list($in_c_sql, $in_c_params) = $DB->get_in_or_equal($course_ids, SQL_PARAMS_NAMED, 'c');
        $sqlparams = array_merge($in_u_params, $in_c_params);

        // Course completions (100%)
        $sql_completions = "
            SELECT " . $DB->sql_concat('cc.userid', "'-'", 'cc.course') . " AS u_c, 100 AS progress
              FROM {course_completions} cc
             WHERE cc.userid $in_u_sql AND cc.course $in_c_sql AND cc.timecompleted IS NOT NULL
        ";
        $completed_map = $DB->get_records_sql_menu($sql_completions, $sqlparams) ?: [];

        // Trackable activities by course
        $trackable_by_course = [];
        $all_trackable_cmids = [];
        foreach ($courses_records as $c) {
            $cinfo = new \completion_info($c);
            if ($cinfo->is_enabled()) {
                $acts = $cinfo->get_activities();
                $trackable_by_course[$c->id] = count($acts);
                foreach (array_keys($acts) as $cmid) {
                    $all_trackable_cmids[$cmid] = $c->id;
                }
            } else {
                $trackable_by_course[$c->id] = 0;
            }
        }

        // Module completions in batch
        $cm_completed_counts = [];
        if (!empty($all_trackable_cmids)) {
            list($in_cm_sql, $in_cm_params) = $DB->get_in_or_equal(array_keys($all_trackable_cmids), SQL_PARAMS_NAMED, 'cm');
            $cm_params = array_merge($in_u_params, $in_cm_params);
            $sql_cm = "
                SELECT " . $DB->sql_concat('cmc.userid', "'-'", 'cm.course') . " AS u_c,
                       COUNT(DISTINCT cmc.coursemoduleid) AS completed_count
                  FROM {course_modules_completion} cmc
                  JOIN {course_modules} cm ON cm.id = cmc.coursemoduleid
                 WHERE cmc.userid $in_u_sql AND cmc.coursemoduleid $in_cm_sql AND cmc.completionstate IN (1, 2)
              GROUP BY cmc.userid, cm.course
            ";
            $cm_completed_counts = $DB->get_records_sql_menu($sql_cm, $cm_params) ?: [];
        }

        // Build result map: [userid => [courseid => progress]]
        $result = [];
        foreach ($userids as $uid) {
            $result[$uid] = [];
            foreach ($course_ids as $cid) {
                $key = $uid . '-' . $cid;
                if (isset($completed_map[$key])) {
                    $result[$uid][$cid] = 100;
                } else if (!empty($trackable_by_course[$cid])) {
                    $cm_done = isset($cm_completed_counts[$key]) ? (int)$cm_completed_counts[$key] : 0;
                    $result[$uid][$cid] = (int)round(($cm_done / $trackable_by_course[$cid]) * 100);
                } else {
                    $result[$uid][$cid] = 0;
                }
            }
        }

        return $result;
    }

    public static function get_cohort($cohortid) {
        global $DB;
        return $DB->get_record('cohort', ['id' => $cohortid]);
    }

    public static function get_cohort_strict($cohortid) {
        global $DB;
        return $DB->get_record('cohort', ['id' => $cohortid], '*', MUST_EXIST);
    }

    public static function get_cohort_synced_courses($cohortid) {
        global $DB;
        $sql_courses = "
            SELECT c.*, e.id as enrolid,
                   (SELECT COUNT(ue.id) FROM {user_enrolments} ue WHERE ue.enrolid = e.id) as enrolledcount
              FROM {course} c
              JOIN {enrol} e ON e.courseid = c.id
             WHERE e.customint1 = :cohortid AND e.enrol = 'cohort'
        ";
        return $DB->get_records_sql($sql_courses, ['cohortid' => $cohortid]);
    }

    public static function get_cohort_members($cohortid) {
        global $DB;
        $sql_members = "
            SELECT u.id, u.firstname, u.lastname, u.email, u.lastaccess, u.suspended
              FROM {user} u
              JOIN {cohort_members} cm ON cm.userid = u.id
             WHERE cm.cohortid = :cohortid AND u.deleted = 0
        ";
        return $DB->get_records_sql($sql_members, ['cohortid' => $cohortid]);
    }

    public static function get_kpis() {
        $cached = \local_adminer_api\cache_manager::get_kpi('cohort_kpis');
        if ($cached !== null) {
            return $cached;
        }

        global $DB;
        $sql_cohorts = "SELECT COUNT(id) FROM {cohort}";
        $total_cohorts = (int)$DB->count_records_sql($sql_cohorts);

        $sql_members = "SELECT COUNT(id) FROM {cohort_members}";
        $total_members = (int)$DB->count_records_sql($sql_members);

        $avg_members = $total_cohorts > 0 ? round($total_members / $total_cohorts, 1) : 0;

        $sql_empty = "
            SELECT COUNT(c.id) 
              FROM {cohort} c 
              WHERE NOT EXISTS (SELECT 1 FROM {cohort_members} cm WHERE cm.cohortid = c.id)
        ";
        $empty_cohorts = (int)$DB->count_records_sql($sql_empty);

        $sql_synced = "
            SELECT COUNT(DISTINCT customint1) 
              FROM {enrol} 
             WHERE enrol = 'cohort'
        ";
        $synced_courses = (int)$DB->count_records_sql($sql_synced);

        $result = [
            'total_cohorts' => $total_cohorts,
            'total_members' => $total_members,
            'avg_members' => $avg_members,
            'empty_cohorts' => $empty_cohorts,
            'synced_courses' => $synced_courses,
        ];

        \local_adminer_api\cache_manager::set_kpi('cohort_kpis', $result);
        return $result;
    }
}
