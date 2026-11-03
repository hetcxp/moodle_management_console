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
 * User repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

/**
 * User repository class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class user_repository {
    /**
     * Get KPI statistics for users.
     *
     * @param array $sqlparams Optional SQL parameters.
     * @return \stdClass|false KPI statistics record or false.
     */
    public static function get_users_kpi_stats(array $sqlparams = []) {
        global $DB, $CFG;
        if (empty($sqlparams)) {
            $primaryadmin = get_admin();
            $adminid = $primaryadmin ? (int)$primaryadmin->id : 1;
            $guestid = $CFG->siteguest ?? 0;
            $sqlparams = [
                'adminid' => $adminid,
                'guestid' => $guestid,
                'recent'  => time() - (30 * 86400),
            ];
        }
        $sqlstats = "
            SELECT
                COUNT(u.id) AS total_users,
                SUM(CASE WHEN u.suspended = 0 THEN 1 ELSE 0 END) AS active_users,
                SUM(CASE WHEN u.suspended = 1 THEN 1 ELSE 0 END) AS suspended_users,
                SUM(CASE WHEN u.lastaccess > :recent THEN 1 ELSE 0 END) AS recent_active
            FROM {user} u
            WHERE u.deleted = 0 AND u.id <> :adminid AND u.id <> :guestid
        ";
        return $DB->get_record_sql($sqlstats, $sqlparams);
    }

    /**
     * Build SQL subquery calculating enrolled courses, completed courses and progress per user.
     *
     * @return string SQL subquery.
     */
    private static function build_user_progress_subquery(): string {
        return "
            SELECT eu.userid,
                   COUNT(eu.courseid) AS enrolled_courses,
                   COALESCE(SUM(
                       CASE
                           WHEN cc_usr.is_cc = 1 THEN 1
                           WHEN COALESCE(cm_tot.total_cm, 0) > 0
                                AND COALESCE(cm_usr.done_cm, 0) >= cm_tot.total_cm THEN 1
                           ELSE 0
                       END
                   ), 0) AS completed_courses,
                   CASE
                       WHEN COUNT(eu.courseid) > 0
                       THEN ROUND((SUM(
                           CASE
                               WHEN cc_usr.is_cc = 1 THEN 1
                               WHEN COALESCE(cm_tot.total_cm, 0) > 0
                                    AND COALESCE(cm_usr.done_cm, 0) >= cm_tot.total_cm THEN 1
                               ELSE 0
                           END
                       ) * 100.0) / COUNT(eu.courseid))
                       ELSE 0
                   END AS progress_sort
              FROM (
                  SELECT DISTINCT ue.userid, e.courseid
                    FROM {user_enrolments} ue
                    JOIN {enrol} e ON e.id = ue.enrolid
                    JOIN {course} c ON c.id = e.courseid
                   WHERE ue.status = 0 AND c.id <> 1
              ) eu
         LEFT JOIN (
                  SELECT ccmp.course AS courseid, ccmp.userid, 1 AS is_cc
                    FROM {course_completions} ccmp
                   WHERE ccmp.timecompleted > 0
                GROUP BY ccmp.course, ccmp.userid
              ) cc_usr ON cc_usr.courseid = eu.courseid AND cc_usr.userid = eu.userid
         LEFT JOIN (
                  SELECT cm.course AS courseid, COUNT(cm.id) AS total_cm
                    FROM {course} c_cm
                    JOIN {course_modules} cm ON cm.course = c_cm.id
                   WHERE c_cm.enablecompletion = 1
                     AND cm.completion > 0
                     AND cm.deletioninprogress = 0
                GROUP BY cm.course
              ) cm_tot ON cm_tot.courseid = eu.courseid
         LEFT JOIN (
                  SELECT cm.course AS courseid, cmc.userid, COUNT(DISTINCT cmc.coursemoduleid) AS done_cm
                    FROM {course_modules} cm
                    JOIN {course_modules_completion} cmc ON cmc.coursemoduleid = cm.id
                   WHERE cm.completion > 0
                     AND cm.deletioninprogress = 0
                     AND cmc.completionstate IN (1, 2)
                GROUP BY cm.course, cmc.userid
              ) cm_usr ON cm_usr.courseid = eu.courseid AND cm_usr.userid = eu.userid
          GROUP BY eu.userid
        ";
    }

    /**
     * Get average progress for users KPI.
     *
     * @param array $sqlparams Base SQL parameters.
     * @return mixed Average progress value.
     */
    public static function get_users_kpi_avg_progress(array $sqlparams) {
        global $DB;
        $adminid = 1;
        if (isset($sqlparams['adminid'])) {
            $adminid = (int)$sqlparams['adminid'];
        } else {
            $primaryadmin = get_admin();
            if ($primaryadmin) {
                $adminid = (int)$primaryadmin->id;
            }
        }
        $guestid = 0;
        if (isset($sqlparams['guestid'])) {
            $guestid = (int)$sqlparams['guestid'];
        }
        $sqlsubenr = self::build_user_progress_subquery();
        $sqlprogress = "
            SELECT ROUND(AVG(COALESCE(enr.progress_sort, 0)), 1) AS avg_progress
              FROM ($sqlsubenr) enr
              JOIN {user} u ON u.id = enr.userid
             WHERE u.deleted = 0 AND u.id <> :adminid AND u.id <> :guestid
        ";
        return $DB->get_field_sql($sqlprogress, [
            'adminid' => $adminid,
            'guestid' => $guestid,
        ]);
    }

    /**
     * Detect competency tables and build unions for user competencies count.
     *
     * @return array Array of SQL union queries.
     */
    private static function detect_competency_unions(): array {
        global $DB;

        $dbman = $DB->get_manager();
        $hascomp = $dbman->table_exists('competency');
        if (!$hascomp) {
            return [];
        }

        $compunions = [];
        if ($dbman->table_exists('competency_usercomp')) {
            $compunions[] = "SELECT uc.userid, uc.competencyid FROM {competency_usercomp} uc " .
                "JOIN {competency} c ON c.id = uc.competencyid";
        }
        if ($dbman->table_exists('competency_plan') && $dbman->table_exists('competency_plancomp')) {
            $compunions[] = "SELECT p.userid, pc.competencyid FROM {competency_plancomp} pc " .
                "JOIN {competency_plan} p ON p.id = pc.planid JOIN {competency} c ON c.id = pc.competencyid";
        }
        if ($dbman->table_exists('competency_coursecomp')) {
            $compunions[] = "SELECT ue.userid, cc.competencyid FROM {competency_coursecomp} cc " .
                "JOIN {enrol} e ON e.courseid = cc.courseid " .
                "JOIN {user_enrolments} ue ON ue.enrolid = e.id " .
                "JOIN {competency} c ON c.id = cc.competencyid";
        }
        if ($dbman->table_exists('competency_usercompcourse')) {
            $compunions[] = "SELECT ucc.userid, ucc.competencyid FROM {competency_usercompcourse} ucc " .
                "JOIN {competency} c ON c.id = ucc.competencyid";
        }

        return $compunions;
    }

    /**
     * Build competencies JOIN and SELECT fragments.
     *
     * @param array $compunions
     * @return array [bool $hascompetencies, string $compjoin, string $compselect, string $compcol]
     */
    private static function build_competencies_join(array $compunions): array {
        $hascompetencies = !empty($compunions);
        if (!$hascompetencies) {
            return [
                false,
                '',
                '0 AS competencies_count,',
                '0',
            ];
        }

        $unionsql = implode("\n                        UNION\n                        ", $compunions);
        $compjoin = "
         LEFT JOIN (
                SELECT all_comp.userid, COUNT(DISTINCT all_comp.competencyid) AS competencies_count
                  FROM (
                        $unionsql
                  ) all_comp
              GROUP BY all_comp.userid
         ) comp_uc ON comp_uc.userid = u.id";
        $compselect = "COALESCE(comp_uc.competencies_count, 0) AS competencies_count,";
        $compcol = "COALESCE(comp_uc.competencies_count, 0)";

        return [$hascompetencies, $compjoin, $compselect, $compcol];
    }

    /**
     * Get sortable columns mapping for users query.
     *
     * @param bool $hascompetencies
     * @return array
     */
    private static function get_sortable_columns(bool $hascompetencies): array {
        $compcol = '0';
        if ($hascompetencies) {
            $compcol = 'COALESCE(comp_uc.competencies_count, 0)';
        }

        return [
            'id'                 => 'u.id',
            'firstname'          => 'u.firstname',
            'lastname'           => 'u.lastname',
            'email'              => 'u.email',
            'suspended'          => 'u.suspended',
            'lastaccess'         => 'u.lastaccess',
            'cohorts'            => 'COALESCE(coh.cohorts_count, 0)',
            'cohorts_count'      => 'COALESCE(coh.cohorts_count, 0)',
            'competencies'       => $compcol,
            'competencies_count' => $compcol,
            'courses'            => 'COALESCE(enr.enrolled_courses, 0)',
            'enrolled_courses'   => 'COALESCE(enr.enrolled_courses, 0)',
            'completed_courses'  => 'COALESCE(enr.completed_courses, 0)',
            'progress'           => 'COALESCE(enr.progress_sort, 0)',
        ];
    }

    /**
     * Resolve order by clause for users query.
     *
     * @param array $params
     * @param array $sortablecolumns
     * @return string
     */
    private static function resolve_user_order_by(array $params, array $sortablecolumns): string {
        $sort = 'lastaccess';
        if (isset($params['sort']) && array_key_exists($params['sort'], $sortablecolumns)) {
            $sort = $params['sort'];
        }

        $direction = 'DESC';
        if (isset($params['dir']) && strtoupper($params['dir']) === 'ASC') {
            $direction = 'ASC';
        }

        if ($sort === 'progress') {
            return "COALESCE(enr.progress_sort, 0) $direction, " .
                   "COALESCE(enr.completed_courses, 0) $direction, " .
                   "COALESCE(enr.enrolled_courses, 0) $direction, " .
                   "u.id $direction";
        }

        $sortfield = $sortablecolumns[$sort];
        if ($sortfield === '0') {
            return "u.id $direction";
        }

        return "$sortfield $direction, u.id $direction";
    }

    /**
     * Build where clause and parameters for users query.
     *
     * @param array $params
     * @param array $sortablecolumns
     * @return array
     */
    private static function build_users_where_clause(array $params, array $sortablecolumns): array {
        global $DB, $CFG;

        $adminid = 1;
        $primaryadmin = get_admin();
        if ($primaryadmin) {
            $adminid = (int)$primaryadmin->id;
        }

        $guestid = 0;
        if (isset($CFG->siteguest)) {
            $guestid = (int)$CFG->siteguest;
        }

        $where = "u.deleted = 0 AND u.id <> :adminid AND u.id <> :guestid";
        $sqlparams = [
            'adminid' => $adminid,
            'guestid' => $guestid,
        ];

        if (!empty($params['search'])) {
            $searchlike = '%' . $params['search'] . '%';
            $where .= " AND (" . $DB->sql_like('u.firstname', ':search1', false, false) .
                      " OR " . $DB->sql_like('u.lastname', ':search2', false, false) .
                      " OR " . $DB->sql_like('u.email', ':search3', false, false) .
                      " OR " . $DB->sql_like('u.username', ':search4', false, false) . ")";
            $sqlparams['search1'] = $searchlike;
            $sqlparams['search2'] = $searchlike;
            $sqlparams['search3'] = $searchlike;
            $sqlparams['search4'] = $searchlike;
        }

        return self::append_decoded_user_filters($params, $sortablecolumns, $where, $sqlparams);
    }

    /**
     * Append decoded json filters to users where clause.
     *
     * @param array $params
     * @param array $sortablecolumns
     * @param string $where
     * @param array $sqlparams
     * @return array
     */
    private static function append_decoded_user_filters(
        array $params,
        array $sortablecolumns,
        string $where,
        array $sqlparams
    ): array {
        $rawfilters = null;
        if (isset($params['filters'])) {
            $rawfilters = $params['filters'];
        }
        $decoded = $rawfilters;
        if (is_string($rawfilters)) {
            $decoded = json_decode($rawfilters, true);
        }
        if (!is_array($decoded) || empty($decoded)) {
            return [$where, $sqlparams];
        }

        $filterindex = 1;
        foreach ($decoded as $key => $value) {
            [$where, $sqlparams, $filterindex] = self::apply_single_user_filter(
                (string)$key,
                $value,
                $sortablecolumns,
                $where,
                $sqlparams,
                $filterindex
            );
        }

        return [$where, $sqlparams];
    }

    /**
     * Apply a single user filter entry to where clause and parameters.
     *
     * @param string $key
     * @param mixed $value
     * @param array $sortablecolumns
     * @param string $where
     * @param array $sqlparams
     * @param int $filterindex
     * @return array
     */
    private static function apply_single_user_filter(
        string $key,
        $value,
        array $sortablecolumns,
        string $where,
        array $sqlparams,
        int $filterindex
    ): array {
        if ($key === 'cohortid' && $value !== '' && $value !== '0' && $value !== 0) {
            $where .= " AND EXISTS (SELECT 1 FROM {cohort_members} cm_f " .
                "WHERE cm_f.userid = u.id AND cm_f.cohortid = :filterval$filterindex)";
            $sqlparams["filterval$filterindex"] = (int)$value;
            return [$where, $sqlparams, $filterindex + 1];
        }

        if (array_key_exists($key, $sortablecolumns) && $value !== '') {
            $fieldname = $sortablecolumns[$key];
            return self::apply_column_user_filter(
                $key,
                $value,
                $fieldname,
                $where,
                $sqlparams,
                $filterindex
            );
        }

        return [$where, $sqlparams, $filterindex];
    }

    /**
     * Apply column-based user filter condition.
     *
     * @param string $key
     * @param mixed $value
     * @param string $fieldname
     * @param string $where
     * @param array $sqlparams
     * @param int $filterindex
     * @return array
     */
    private static function apply_column_user_filter(
        string $key,
        $value,
        string $fieldname,
        string $where,
        array $sqlparams,
        int $filterindex
    ): array {
        global $DB;

        if ($key === 'suspended') {
            $where .= " AND $fieldname = :filterval$filterindex";
            $sqlparams["filterval$filterindex"] = (int)$value;
            return [$where, $sqlparams, $filterindex + 1];
        }

        if (is_string($value)) {
            $where .= " AND " . $DB->sql_like($fieldname, ":filterval$filterindex", false, false);
            $sqlparams["filterval$filterindex"] = '%' . $value . '%';
            return [$where, $sqlparams, $filterindex + 1];
        }

        return [$where, $sqlparams, $filterindex];
    }

    /**
     * Get users filtered with pagination.
     *
     * @param array $params Filter and pagination parameters.
     * @return array Array containing records and total count.
     */
    public static function get_users_filtered(array $params): array {
        global $DB;

        $compunions = self::detect_competency_unions();
        [$hascompetencies, $compjoin, $compselect] = self::build_competencies_join($compunions);
        $sortablecolumns = self::get_sortable_columns($hascompetencies);
        $orderby = self::resolve_user_order_by($params, $sortablecolumns);
        [$where, $sqlparams] = self::build_users_where_clause($params, $sortablecolumns);

        $sqlsubenr = self::build_user_progress_subquery();

        $sqlselect = "
            SELECT u.id, u.username, u.firstname, u.lastname, u.email, u.suspended, u.lastaccess,
                   u.firstnamephonetic, u.lastnamephonetic, u.middlename, u.alternatename,
                   COALESCE(coh.cohorts_count, 0) AS cohorts_count,
                   $compselect
                   COALESCE(enr.enrolled_courses, 0) AS enrolled_courses,
                   COALESCE(enr.completed_courses, 0) AS completed_courses,
                   COALESCE(enr.progress_sort, 0) AS progress_sort
              FROM {user} u
         LEFT JOIN (
                SELECT userid, COUNT(id) AS cohorts_count
                  FROM {cohort_members}
              GROUP BY userid
         ) coh ON coh.userid = u.id
         $compjoin
         LEFT JOIN (
             $sqlsubenr
         ) enr ON enr.userid = u.id
             WHERE $where
          ORDER BY $orderby
        ";

        $sqlcount = "SELECT COUNT(u.id) FROM {user} u WHERE $where";
        $totalcount = (int)$DB->count_records_sql($sqlcount, $sqlparams);

        $page = 0;
        if (isset($params['page'])) {
            $page = (int)$params['page'];
        }
        $perpage = 20;
        if (isset($params['perpage'])) {
            $perpage = (int)$params['perpage'];
        }
        $limitfrom = $page * $perpage;
        $records = $DB->get_records_sql($sqlselect, $sqlparams, $limitfrom, $perpage);

        return [$records, $totalcount];
    }

    /**
     * Count users matching query.
     *
     * @param string $sqlcount SQL query.
     * @param array $sqlparams Query parameters.
     * @return int Count of users.
     */
    public static function count_users(string $sqlcount, array $sqlparams): int {
        global $DB;
        return (int)$DB->count_records_sql($sqlcount, $sqlparams);
    }

    /**
     * Get paginated users.
     *
     * @param string $sql SQL query.
     * @param array $sqlparams Query parameters.
     * @param int $limitfrom Offset.
     * @param int $perpage Records per page.
     * @return array Records array.
     */
    public static function get_paginated_users(string $sql, array $sqlparams, int $limitfrom, int $perpage): array {
        global $DB;
        return $DB->get_records_sql($sql, $sqlparams, $limitfrom, $perpage);
    }

    /**
     * Get user by ID.
     *
     * @param int $userid User ID.
     * @return \stdClass|false User record or false.
     */
    public static function get_user(int $userid) {
        global $DB;
        return $DB->get_record('user', ['id' => $userid, 'deleted' => 0]);
    }

    /**
     * Get user strictly or throw exception.
     *
     * @param int $userid User ID.
     * @return \stdClass User record.
     */
    public static function get_user_strict(int $userid): \stdClass {
        global $DB;
        return $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);
    }

    /**
     * Get enrolled courses for user.
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
     * Get all enrolments for user.
     *
     * @param int $userid User ID.
     * @param int $limitfrom Offset.
     * @param int $limitnum Limit.
     * @return array Enrolment records.
     */
    public static function get_user_all_enrolments(int $userid, int $limitfrom = 0, int $limitnum = 0): array {
        global $DB;
        $sqlallenrolments = "
            SELECT ue.id, e.courseid, e.enrol as method, ue.status, ue.timestart, ue.timeend, ue.timecreated
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE ue.userid = :userid
          ORDER BY ue.timecreated DESC
        ";
        return $DB->get_records_sql($sqlallenrolments, ['userid' => $userid], $limitfrom, $limitnum);
    }

    /**
     * Get cohorts for user.
     *
     * @param int $userid User ID.
     * @param int $limitfrom Offset.
     * @param int $limitnum Limit.
     * @return array Cohort records.
     */
    public static function get_user_cohorts(int $userid, int $limitfrom = 0, int $limitnum = 0): array {
        global $DB;
        $sqlcohorts = "
            SELECT c.id, c.name, c.idnumber
              FROM {cohort} c
              JOIN {cohort_members} cm ON cm.cohortid = c.id
             WHERE cm.userid = :userid
          ORDER BY c.name ASC
        ";
        return $DB->get_records_sql($sqlcohorts, ['userid' => $userid], $limitfrom, $limitnum);
    }

    /**
     * Get role ID by shortname.
     *
     * @param string $shortname Role shortname.
     * @return mixed Role ID or false.
     */
    public static function get_role_id_by_shortname(string $shortname = 'student') {
        global $DB;
        return $DB->get_field('role', 'id', ['shortname' => $shortname]);
    }

    /**
     * Get courses progress map for user.
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

    /**
     * Get system roles assigned to a user.
     *
     * @param int $userid User ID.
     * @return array System roles array.
     */
    public static function get_user_system_roles(int $userid): array {
        global $DB;
        $syscontext = \context_system::instance();

        $sql = "
            SELECT r.id, r.name, r.shortname
              FROM {role_assignments} ra
              JOIN {role} r ON r.id = ra.roleid
             WHERE ra.contextid = :contextid AND ra.userid = :userid
          ORDER BY r.sortorder ASC, r.id ASC
        ";
        $roles = $DB->get_records_sql($sql, ['contextid' => $syscontext->id, 'userid' => $userid]);

        $result = [];
        $hasadminrole = false;

        foreach ($roles as $r) {
            $rolename = role_get_name($r, $syscontext, ROLENAME_BOTH);
            if (empty($rolename)) {
                $rolename = !empty($r->name) ? $r->name : $r->shortname;
            }
            $result[] = [
                'id' => (int)$r->id,
                'name' => (string)$rolename,
                'shortname' => (string)$r->shortname,
            ];
            if ($r->shortname === 'admin' || $r->shortname === 'siteadmin') {
                $hasadminrole = true;
            }
        }

        if (is_siteadmin($userid) && !$hasadminrole) {
            array_unshift($result, [
                'id' => 0,
                'name' => 'Administrador del sitio',
                'shortname' => 'siteadmin',
            ]);
        }

        return $result;
    }

    /**
     * Obtiene las competencias asignadas a un usuario con sus cursos vinculados, estado y evidencias.
     *
     * @param int $userid User ID.
     * @return array Competencies list with course links and evidence.
     */
    public static function get_user_competencies(int $userid): array {
        global $DB;

        $dbman = $DB->get_manager();
        if (!$dbman->table_exists('competency') || !$dbman->table_exists('competency_usercomp')) {
            return [];
        }

        $scalesmap = [];
        try {
            $scalesrecords = $DB->get_records('scale', null, '', 'id, name, scale');
            foreach ($scalesrecords as $sc) {
                $scalesmap[$sc->id] = array_map('trim', explode(',', $sc->scale));
            }
        } catch (\Exception $e) {
            debugging('Error loading scales in user_repository: ' . $e->getMessage(), DEBUG_DEVELOPER);
        }

        $enrolledcourses = self::get_user_enrolled_courses($userid);
        $enrolledcourseids = array_map('intval', array_keys($enrolledcourses));

        // 1. Obtener competencias asignadas al usuario desde competency_usercomp.
        $sqlusercomp = "
            SELECT uc.id AS usercompid, uc.status, uc.proficiency, uc.grade, uc.timemodified,
                   c.id AS competencyid, c.shortname, c.idnumber, c.description, c.competencyframeworkid,
                   c.scaleid AS comp_scaleid, c.scaleconfiguration,
                   f.shortname AS frameworkname, f.scaleid AS framework_scaleid
              FROM {competency_usercomp} uc
              JOIN {competency} c ON c.id = uc.competencyid
              JOIN {competency_framework} f ON f.id = c.competencyframeworkid
             WHERE uc.userid = :userid
          ORDER BY f.shortname ASC, c.shortname ASC
        ";

        $records = $DB->get_records_sql($sqlusercomp, ['userid' => $userid]);

        // Verificar si ademas hay competencias en planes de aprendizaje sin registro en usercomp.
        if ($dbman->table_exists('competency_plan') && $dbman->table_exists('competency_plancomp')) {
            $sqlplancomp = "
                SELECT pc.competencyid,
                       c.id, c.shortname, c.idnumber, c.description, c.competencyframeworkid,
                       c.scaleid AS comp_scaleid, c.scaleconfiguration,
                       f.shortname AS frameworkname, f.scaleid AS framework_scaleid
                  FROM {competency_plancomp} pc
                  JOIN {competency_plan} p ON p.id = pc.planid
                  JOIN {competency} c ON c.id = pc.competencyid
                  JOIN {competency_framework} f ON f.id = c.competencyframeworkid
                 WHERE p.userid = :userid
            ";
            $planrecords = $DB->get_records_sql($sqlplancomp, ['userid' => $userid]);
            foreach ($planrecords as $pr) {
                $exists = false;
                foreach ($records as $r) {
                    if ((int)$r->competencyid === (int)$pr->competencyid) {
                        $exists = true;
                        break;
                    }
                }
                if (!$exists) {
                    $obj = new \stdClass();
                    $obj->usercompid = 0;
                    $obj->status = 0;
                    $obj->proficiency = 0;
                    $obj->grade = 0;
                    $obj->timemodified = 0;
                    $obj->competencyid = (int)$pr->competencyid;
                    $obj->shortname = (string)$pr->shortname;
                    $obj->idnumber = (string)($pr->idnumber ?? '');
                    $obj->description = (string)($pr->description ?? '');
                    $obj->competencyframeworkid = (int)$pr->competencyframeworkid;
                    $obj->comp_scaleid = $pr->comp_scaleid;
                    $obj->scaleconfiguration = $pr->scaleconfiguration;
                    $obj->frameworkname = (string)$pr->frameworkname;
                    $obj->framework_scaleid = $pr->framework_scaleid;
                    $records['plan_' . $pr->competencyid] = $obj;
                }
            }
        }

        // Obtener competencias vinculadas a los cursos matriculados.
        if (!empty($enrolledcourseids) && $dbman->table_exists('competency_coursecomp')) {
            [$inecids, $inecparams] = $DB->get_in_or_equal($enrolledcourseids, SQL_PARAMS_NAMED, 'ecid');
            $sqlcoursecomp = "
                SELECT DISTINCT c.id AS competencyid,
                       c.shortname, c.idnumber, c.description, c.competencyframeworkid,
                       c.scaleid AS comp_scaleid, c.scaleconfiguration,
                       f.shortname AS frameworkname, f.scaleid AS framework_scaleid
                  FROM {competency_coursecomp} cc
                  JOIN {competency} c ON c.id = cc.competencyid
                  JOIN {competency_framework} f ON f.id = c.competencyframeworkid
                 WHERE cc.courseid $inecids
            ";
            $coursecomprecords = $DB->get_records_sql($sqlcoursecomp, $inecparams);
            foreach ($coursecomprecords as $ccr) {
                $exists = false;
                foreach ($records as $r) {
                    if ((int)$r->competencyid === (int)$ccr->competencyid) {
                        $exists = true;
                        break;
                    }
                }
                if (!$exists) {
                    $obj = new \stdClass();
                    $obj->usercompid = 0;
                    $obj->status = 0;
                    $obj->proficiency = 0;
                    $obj->grade = 0;
                    $obj->timemodified = 0;
                    $obj->competencyid = (int)$ccr->competencyid;
                    $obj->shortname = (string)$ccr->shortname;
                    $obj->idnumber = (string)($ccr->idnumber ?? '');
                    $obj->description = (string)($ccr->description ?? '');
                    $obj->competencyframeworkid = (int)$ccr->competencyframeworkid;
                    $obj->comp_scaleid = $ccr->comp_scaleid;
                    $obj->scaleconfiguration = $ccr->scaleconfiguration;
                    $obj->frameworkname = (string)$ccr->frameworkname;
                    $obj->framework_scaleid = $ccr->framework_scaleid;
                    $records['course_' . $ccr->competencyid] = $obj;
                }
            }
        }

        if (empty($records)) {
            return [];
        }

        $competencyids = [];
        $usercompids = [];
        foreach ($records as $r) {
            $competencyids[] = (int)$r->competencyid;
            if (!empty($r->usercompid)) {
                $usercompids[] = (int)$r->usercompid;
            }
        }
        $competencyids = array_values(array_unique($competencyids));
        $usercompids = array_values(array_unique($usercompids));

        // Enriquecer con evaluaciones a nivel de curso (competency_usercompcourse) si existen.
        if ($dbman->table_exists('competency_usercompcourse') && !empty($competencyids)) {
            [$inucccids, $uccparams] = $DB->get_in_or_equal($competencyids, SQL_PARAMS_NAMED, 'ucccid');
            $uccparams['ucc_userid'] = $userid;
            $uccrecords = $DB->get_records_select(
                'competency_usercompcourse',
                "competencyid $inucccids AND userid = :ucc_userid",
                $uccparams,
                'timemodified DESC',
                'id, competencyid, courseid, proficiency, grade, timemodified'
            );
            foreach ($uccrecords as $ucc) {
                foreach ($records as &$r) {
                    if ((int)$r->competencyid === (int)$ucc->competencyid) {
                        if (empty($r->proficiency) && !empty($ucc->proficiency)) {
                            $r->proficiency = (int)$ucc->proficiency;
                        }
                        if (empty($r->grade) && !empty($ucc->grade)) {
                            $r->grade = (int)$ucc->grade;
                        }
                    }
                }
                unset($r);
            }
        }

        // 2. Cursos vinculados a cada competencia.
        $coursesbycomp = [];
        if (!empty($competencyids) && $dbman->table_exists('competency_coursecomp')) {
            $coursesprogress = !empty($enrolledcourses) ? self::get_user_courses_progress_data($userid, $enrolledcourses) : [];
            [$incsql, $incparams] = $DB->get_in_or_equal($competencyids, SQL_PARAMS_NAMED, 'cid');
            $sqlcc = "
                SELECT cc.id, cc.competencyid, c.id AS courseid, c.fullname, c.shortname
                  FROM {competency_coursecomp} cc
                  JOIN {course} c ON c.id = cc.courseid
                 WHERE cc.competencyid $incsql
              ORDER BY c.fullname ASC
            ";
            $ccrecords = $DB->get_records_sql($sqlcc, $incparams);
            foreach ($ccrecords as $cc) {
                $cid = (int)$cc->competencyid;
                $courseid = (int)$cc->courseid;
                $isenrolled = in_array($courseid, $enrolledcourseids) ? 1 : 0;
                $coursesbycomp[$cid][] = [
                    'id'          => $courseid,
                    'fullname'    => (string)$cc->fullname,
                    'shortname'   => (string)$cc->shortname,
                    'is_enrolled' => $isenrolled,
                    'progress'    => $isenrolled ? (int)($coursesprogress[$courseid] ?? 0) : 0,
                ];
            }
        }

        // 3. Evidencias para las competencias del usuario.
        $evidencesbyusercomp = [];
        if (!empty($usercompids) && $dbman->table_exists('competency_evidence')) {
            [$inesql, $ineparams] = $DB->get_in_or_equal($usercompids, SQL_PARAMS_NAMED, 'evid');
            $sqlev = "
                SELECT e.id, e.usercompetencyid, e.action, e.actionuserid, e.descidentifier,
                       e.note, e.grade, e.url, e.timecreated,
                       u.firstname, u.lastname,
                       u.firstnamephonetic, u.lastnamephonetic, u.middlename, u.alternatename
                  FROM {competency_evidence} e
             LEFT JOIN {user} u ON u.id = e.actionuserid
                 WHERE e.usercompetencyid $inesql
              ORDER BY e.timecreated DESC
            ";
            $evrecords = $DB->get_records_sql($sqlev, $ineparams);
            foreach ($evrecords as $ev) {
                $actionname = 'Evidencia registrada';
                switch ((int)$ev->action) {
                    case 0:
                        $actionname = 'Evidencia manual';
                        break;
                    case 1:
                        $actionname = 'Evidencia adjuntada';
                        break;
                    case 2:
                        $actionname = 'Completado en curso';
                        break;
                    case 3:
                        $actionname = 'Revisión / Calificación';
                        break;
                    default:
                        $actionname = 'Registro de competencia';
                        break;
                }
                $authorname = !empty($ev->firstname) ? fullname($ev) : 'Sistema';

                $evidencesbyusercomp[$ev->usercompetencyid][] = [
                    'id'                 => (int)$ev->id,
                    'action'             => (int)$ev->action,
                    'actionname'         => $actionname,
                    'actionuserfullname' => $authorname,
                    'descidentifier'     => (string)($ev->descidentifier ?? ''),
                    'note'               => (string)($ev->note ?? ''),
                    'url'                => competency_review_repository::sanitize_url($ev->url ?? null),
                    'grade'              => (int)($ev->grade ?? 0),
                    'timecreated'        => (int)$ev->timecreated,
                    'timecreated_str'    => userdate($ev->timecreated),
                ];
            }
        }

        // 4. Identificar competencias de planes ad-hoc.
        $adhoccompids = [];
        if ($dbman->table_exists('competency_plan') && $dbman->table_exists('competency_plancomp')) {
            $sqladhoc = "
                SELECT DISTINCT pc.competencyid
                  FROM {competency_plancomp} pc
                  JOIN {competency_plan} p ON p.id = pc.planid
                 WHERE p.userid = :userid
                   AND (p.templateid IS NULL OR p.templateid = 0)
                   AND p.name = :planname
            ";
            $adhocrecords = $DB->get_records_sql($sqladhoc, [
                'userid'   => $userid,
                'planname' => 'Plan de Competencias Personales',
            ]);
            $adhoccompids = array_map(function ($r) {
                return (int)$r->competencyid;
            }, $adhocrecords);
        }

        // 5. Armar resultado.
        $result = [];
        foreach ($records as $key => $r) {
            $compid = (int)$r->competencyid;
            $usercompid = (int)$r->usercompid;

            $scaleid = !empty($r->comp_scaleid) ? $r->comp_scaleid : $r->framework_scaleid;
            $scaleitems = $scalesmap[$scaleid] ?? [];
            $gradeval = (int)$r->grade;
            $gradename = ($gradeval > 0 && isset($scaleitems[$gradeval - 1])) ? $scaleitems[$gradeval - 1] : '';

            $statusname = 'En progreso';
            if ((int)$r->proficiency === 1) {
                $statusname = 'Competente';
            } else if ((int)$r->status === 1 || (int)$r->status === 2) {
                $statusname = 'En revisión';
            }

            $evs = $usercompid > 0 ? ($evidencesbyusercomp[$usercompid] ?? []) : [];

            $enrolledinlinkedcourse = 0;
            foreach ($coursesbycomp[$compid] ?? [] as $course) {
                if (!empty($course['is_enrolled'])) {
                    $enrolledinlinkedcourse = 1;
                    break;
                }
            }

            if (in_array($compid, $adhoccompids)) {
                $source = 'adhoc';
            } else if (strpos((string)$key, 'course_') === 0) {
                $source = 'course';
            } else {
                $source = 'usercomp';
            }

            $result[] = [
                'id'                        => $compid,
                'shortname'                 => (string)$r->shortname,
                'idnumber'                  => (string)($r->idnumber ?? ''),
                'description'               => (string)($r->description ?? ''),
                'frameworkid'               => (int)$r->competencyframeworkid,
                'frameworkname'             => (string)$r->frameworkname,
                'proficiency'               => (int)$r->proficiency,
                'status'                    => (int)$r->status,
                'statusname'                => $statusname,
                'grade'                     => $gradeval,
                'gradename'                 => $gradename,
                'courses'                   => $coursesbycomp[$compid] ?? [],
                'evidences_count'           => count($evs),
                'evidences'                 => $evs,
                'source'                    => $source,
                'enrolled_in_linked_course' => $enrolledinlinkedcourse,
            ];
        }

        return $result;
    }
}
