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
 * Course repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

/**
 * Course repository class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class course_repository {
    /**
     * Get courses with filtered metrics.
     *
     * @param array $params
     * @return array
     */
    public static function get_courses_filtered(array $params): array {
        global $DB;

        $sortablecolumns = self::get_sortable_columns();
        $orderby = self::resolve_course_order_by($params, $sortablecolumns);
        [$where, $sqlparams] = self::build_courses_where_clause($params, $sortablecolumns);

        $sqlsubenr = self::build_course_progress_subquery();
        $sqlsubcoh = "
            SELECT e.courseid, COUNT(DISTINCT e.customint1) AS cohortscount
              FROM {enrol} e
             WHERE e.enrol = 'cohort'
          GROUP BY e.courseid
        ";
        $sqlsubcomp = "
            SELECT ccomp.courseid, COUNT(DISTINCT ccomp.competencyid) AS competenciescount
              FROM {competency_coursecomp} ccomp
          GROUP BY ccomp.courseid
        ";

        $sqlselect = "
            SELECT c.id, c.fullname, c.shortname, c.visible, c.timecreated, c.category, c.startdate, c.enddate,
                   cc.name AS categoryname,
                   COALESCE(enr.enrolledcount, 0) AS enrolledcount,
                   COALESCE(enr.completedcount, 0) AS completedcount,
                   COALESCE(coh.cohortscount, 0) AS cohortscount,
                   COALESCE(comp.competenciescount, 0) AS competenciescount,
                   COALESCE(enr.progress_sort, 0) AS progress_sort
              FROM {course} c
              JOIN {course_categories} cc ON cc.id = c.category
         LEFT JOIN ($sqlsubenr) enr ON enr.courseid = c.id
         LEFT JOIN ($sqlsubcoh) coh ON coh.courseid = c.id
         LEFT JOIN ($sqlsubcomp) comp ON comp.courseid = c.id
             WHERE $where
          ORDER BY $orderby
        ";

        $sqlkpis = "
            SELECT
                COUNT(c.id) AS total_courses,
                COALESCE(SUM(COALESCE(enr.enrolledcount, 0)), 0) AS total_enrolled,
                COALESCE(AVG(COALESCE(enr.progress_sort, 0)), 0) AS avg_progress,
                SUM(CASE WHEN COALESCE(enr.enrolledcount, 0) = 0 THEN 1 ELSE 0 END) AS empty_courses
            FROM {course} c
            JOIN {course_categories} cc ON cc.id = c.category
            LEFT JOIN ($sqlsubenr) enr ON enr.courseid = c.id
            WHERE $where
        ";

        $kpidata = $DB->get_record_sql($sqlkpis, $sqlparams);
        $kpis = self::format_courses_kpis($kpidata);
        $totalcount = $kpis['total_courses'];

        $page = 0;
        if (!empty($params['page'])) {
            $page = (int)$params['page'];
        }
        $perpage = 20;
        if (!empty($params['perpage'])) {
            $perpage = (int)$params['perpage'];
        }
        $limitfrom = $page * $perpage;
        $records = [];
        if ($totalcount > 0) {
            $records = $DB->get_records_sql($sqlselect, $sqlparams, $limitfrom, $perpage);
        }

        return [$records, $totalcount, $kpis];
    }

    /**
     * Get sortable columns mapping for courses query.
     *
     * @return array
     */
    private static function get_sortable_columns(): array {
        return [
            'id'                => 'c.id',
            'fullname'          => 'c.fullname',
            'shortname'         => 'c.shortname',
            'categoryname'      => 'cc.name',
            'visible'           => 'c.visible',
            'enrolledcount'     => 'COALESCE(enr.enrolledcount, 0)',
            'completedcount'    => 'COALESCE(enr.completedcount, 0)',
            'cohortscount'      => 'COALESCE(coh.cohortscount, 0)',
            'competenciescount' => 'COALESCE(comp.competenciescount, 0)',
            'progress'          => 'COALESCE(enr.progress_sort, 0)',
            'progress_percent'  => 'COALESCE(enr.progress_sort, 0)',
            'timecreated'       => 'c.timecreated',
            'startdate'         => 'c.startdate',
            'enddate'           => 'c.enddate',
        ];
    }

    /**
     * Resolve order by clause for courses query.
     *
     * @param array $params
     * @param array $sortablecolumns
     * @return string
     */
    private static function resolve_course_order_by(array $params, array $sortablecolumns): string {
        $sort = 'timecreated';
        if (isset($params['sort']) && array_key_exists($params['sort'], $sortablecolumns)) {
            $sort = $params['sort'];
        }

        $direction = 'DESC';
        if (isset($params['dir']) && strtoupper($params['dir']) === 'ASC') {
            $direction = 'ASC';
        }

        if ($sort === 'progress' || $sort === 'progress_percent') {
            return "COALESCE(enr.progress_sort, 0) $direction, " .
                   "COALESCE(enr.completedcount, 0) $direction, " .
                   "COALESCE(enr.enrolledcount, 0) $direction, " .
                   "c.id $direction";
        }

        $sortfield = $sortablecolumns[$sort];
        return "$sortfield $direction, c.id $direction";
    }

    /**
     * Build where clause and parameters for courses query.
     *
     * @param array $params
     * @param array $sortablecolumns
     * @return array
     */
    private static function build_courses_where_clause(array $params, array $sortablecolumns): array {
        global $DB;

        $where = "c.id <> 1";
        $sqlparams = [];

        if (!empty($params['search'])) {
            $where .= " AND (" . $DB->sql_like('c.fullname', ':search1', false, false) .
                      " OR " . $DB->sql_like('c.shortname', ':search2', false, false) . ")";
            $sqlparams['search1'] = '%' . $params['search'] . '%';
            $sqlparams['search2'] = '%' . $params['search'] . '%';
        }

        if (!empty($params['category'])) {
            $where .= " AND c.category = :category";
            $sqlparams['category'] = $params['category'];
        }

        if (isset($params['visibility']) && $params['visibility'] !== -1) {
            $where .= " AND c.visible = :visibility";
            $sqlparams['visibility'] = $params['visibility'];
        }

        return self::append_decoded_course_filters($params, $sortablecolumns, $where, $sqlparams);
    }

    /**
     * Append decoded json filters to courses where clause.
     *
     * @param array $params
     * @param array $sortablecolumns
     * @param string $where
     * @param array $sqlparams
     * @return array
     */
    private static function append_decoded_course_filters(
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
            [$where, $sqlparams, $filterindex] = self::apply_single_course_filter(
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
     * Apply a single filter entry to where clause and parameters.
     *
     * @param string $key
     * @param mixed $value
     * @param array $sortablecolumns
     * @param string $where
     * @param array $sqlparams
     * @param int $filterindex
     * @return array
     */
    private static function apply_single_course_filter(
        string $key,
        $value,
        array $sortablecolumns,
        string $where,
        array $sqlparams,
        int $filterindex
    ): array {
        if ($key === 'empty_only' && !empty($value)) {
            $where .= " AND NOT EXISTS (
                SELECT 1 FROM {enrol} filter_e
                JOIN {user_enrolments} filter_ue ON filter_e.id = filter_ue.enrolid
                WHERE filter_e.courseid = c.id AND filter_ue.status = 0
            )";
            return [$where, $sqlparams, $filterindex];
        }

        if ($key === 'exclude_category' && !empty($value)) {
            $where .= " AND c.category != :filterval$filterindex";
            $sqlparams["filterval$filterindex"] = (int)$value;
            return [$where, $sqlparams, $filterindex + 1];
        }

        if (array_key_exists($key, $sortablecolumns) && $value !== '') {
            $fieldname = $sortablecolumns[$key];
            return self::apply_column_course_filter(
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
     * Apply column-based filter condition.
     *
     * @param string $key
     * @param mixed $value
     * @param string $fieldname
     * @param string $where
     * @param array $sqlparams
     * @param int $filterindex
     * @return array
     */
    private static function apply_column_course_filter(
        string $key,
        $value,
        string $fieldname,
        string $where,
        array $sqlparams,
        int $filterindex
    ): array {
        global $DB;

        if ($key === 'visible') {
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
     * Format KPIs structure from raw database record.
     *
     * @param mixed $kpidata
     * @return array
     */
    private static function format_courses_kpis($kpidata): array {
        $totalcourses = 0;
        if (isset($kpidata->total_courses)) {
            $totalcourses = (int)$kpidata->total_courses;
        }

        $totalenrolled = 0;
        if (isset($kpidata->total_enrolled)) {
            $totalenrolled = (int)$kpidata->total_enrolled;
        }

        $avgprogress = 0;
        if (isset($kpidata->avg_progress)) {
            $avgprogress = (int)round((float)$kpidata->avg_progress);
        }

        $emptycourses = 0;
        if (isset($kpidata->empty_courses)) {
            $emptycourses = (int)$kpidata->empty_courses;
        }

        return [
            'total_courses'  => $totalcourses,
            'total_enrolled' => $totalenrolled,
            'avg_progress'   => $avgprogress,
            'empty_courses'  => $emptycourses,
        ];
    }

    /**
     * Build SQL subquery calculating enrolled count, completed count and average progress per course.
     *
     * @return string SQL subquery.
     */
    private static function build_course_progress_subquery(): string {
        return "
            SELECT eu.courseid,
                   COUNT(eu.userid) AS enrolledcount,
                   SUM(
                       CASE
                           WHEN cc_usr.is_cc = 1 THEN 1
                           WHEN COALESCE(cm_tot.total_cm, 0) > 0
                                AND COALESCE(cm_usr.done_cm, 0) >= cm_tot.total_cm THEN 1
                           ELSE 0
                       END
                   ) AS completedcount,
                   ROUND(AVG(
                       CASE
                           WHEN cc_usr.is_cc = 1 THEN 100.0
                           WHEN COALESCE(cm_tot.total_cm, 0) > 0
                                AND COALESCE(cm_usr.done_cm, 0) >= cm_tot.total_cm THEN 100.0
                           WHEN COALESCE(cm_tot.total_cm, 0) > 0
                           THEN ROUND((COALESCE(cm_usr.done_cm, 0) * 100.0) / cm_tot.total_cm)
                           ELSE 0.0
                       END
                   )) AS progress_sort
              FROM (
                  SELECT DISTINCT e.courseid, ue.userid
                    FROM {enrol} e
                    JOIN {user_enrolments} ue ON ue.enrolid = e.id
                    JOIN {user} u ON u.id = ue.userid
                   WHERE ue.status = 0 AND u.deleted = 0
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
          GROUP BY eu.courseid
        ";
    }


    /**
     * Delegate to course_enrolment_repository.
     *
     * @param int $courseid
     * @param array $userids
     * @return array
     */
    public static function get_course_user_cohort_map(int $courseid, array $userids = []): array {
        return course_enrolment_repository::get_course_user_cohort_map($courseid, $userids);
    }

    /**
     * Delegate to course_enrolment_repository.
     *
     * @param int $courseid
     * @param array $userids
     * @return array
     */
    public static function get_course_all_enrolments(int $courseid, array $userids = []): array {
        return course_enrolment_repository::get_course_all_enrolments($courseid, $userids);
    }

    /**
     * Delegate to course_enrolment_repository.
     *
     * @param int $courseid
     * @param array $userids
     * @return array
     */
    public static function get_course_user_roles_map(int $courseid, array $userids = []): array {
        return course_enrolment_repository::get_course_user_roles_map($courseid, $userids);
    }

    /**
     * Delegate to course_enrolment_repository.
     *
     * @param array $cmids
     * @param array $userids
     * @return array
     */
    public static function get_course_cm_completions(array $cmids, array $userids = []): array {
        return course_enrolment_repository::get_course_cm_completions($cmids, $userids);
    }

    /**
     * Delegate to course_enrolment_repository.
     *
     * @param int $courseid
     * @return array
     */
    public static function get_course_linked_cohorts(int $courseid): array {
        return course_enrolment_repository::get_course_linked_cohorts($courseid);
    }

    /**
     * Get course category name.
     *
     * @param int $categoryid
     * @return string
     */
    public static function get_course_category_name(int $categoryid): string {
        global $DB;
        $category = $DB->get_record('course_categories', ['id' => $categoryid]);
        return $category ? (string)$category->name : '';
    }

    /**
     * Delegate to course_enrolment_repository.
     *
     * @param int $courseid
     * @return array
     */
    public static function get_course_groups_list(int $courseid): array {
        return course_enrolment_repository::get_course_groups_list($courseid);
    }

    /**
     * Delegate to course_enrolment_repository.
     *
     * @param int $courseid
     * @param int $userid
     * @return array
     */
    public static function get_course_user_enrolments(int $courseid, int $userid): array {
        return course_enrolment_repository::get_course_user_enrolments($courseid, $userid);
    }

    /**
     * Delegate to course_enrolment_repository.
     *
     * @param int $courseid
     * @param int $userid
     * @return array
     */
    public static function get_course_user_first_and_last_access(int $courseid, int $userid): array {
        return course_enrolment_repository::get_course_user_first_and_last_access($courseid, $userid);
    }

    /**
     * Count courses matching query.
     *
     * @param string $sqlcount
     * @param array $params
     * @return int
     */
    public static function count_courses(string $sqlcount, array $params): int {
        global $DB;
        return (int)$DB->count_records_sql($sqlcount, $params);
    }

    /**
     * Get paginated courses.
     *
     * @param string $sql
     * @param array $params
     * @param int $limitfrom
     * @param int $perpage
     * @return array
     */
    public static function get_paginated_courses(string $sql, array $params, int $limitfrom, int $perpage): array {
        global $DB;
        return $DB->get_records_sql($sql, $params, $limitfrom, $perpage);
    }

    /**
     * Get course KPIs.
     *
     * @param string $sqlkpis
     * @param array $params
     * @return \stdClass|null
     */
    public static function get_course_kpis(string $sqlkpis, array $params): ?\stdClass {
        global $DB;
        $record = $DB->get_record_sql($sqlkpis, $params);
        return $record ?: null;
    }

    /**
     * Get course by ID.
     *
     * @param int $courseid
     * @return \stdClass|null
     */
    public static function get_course(int $courseid): ?\stdClass {
        global $DB;
        $course = $DB->get_record('course', ['id' => $courseid]);
        return $course ?: null;
    }

    /**
     * Get course strictly by ID or throw exception.
     *
     * @param int $courseid
     * @return \stdClass
     */
    public static function get_course_strict(int $courseid): \stdClass {
        global $DB;
        return $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
    }

    /**
     * Get enrolled users.
     *
     * @param mixed $sqlusersorcourseid
     * @param int|null $courseid
     * @return array
     */
    public static function get_enrolled_users($sqlusersorcourseid, ?int $courseid = null): array {
        global $DB;
        if ($courseid === null) {
            $cid = (int)$sqlusersorcourseid;
            return array_values(course_enrolment_repository::get_course_enrolled_users_detail($cid));
        }
        return $DB->get_records_sql($sqlusersorcourseid, ['courseid' => $courseid]);
    }

    /**
     * Get user cohorts recordset.
     *
     * @param string $sqlusercohorts
     * @param int $courseid
     * @return \moodle_recordset
     */
    public static function get_user_cohorts(string $sqlusercohorts, int $courseid): \moodle_recordset {
        global $DB;
        return $DB->get_recordset_sql($sqlusercohorts, ['courseid' => $courseid]);
    }

    /**
     * Get competencies associated with a course.
     *
     * @param int $courseid
     * @return array
     */
    public static function get_course_competencies(int $courseid): array {
        global $DB;
        $sql = "
            SELECT cc.id, cc.competencyid, cc.ruleoutcome, cc.sortorder, cc.timecreated,
                   c.shortname, c.idnumber, c.description, c.parentid, c.path,
                   c.ruletype, c.ruleoutcome AS compruleoutcome,
                   f.id AS frameworkid, f.shortname AS frameworkname,
                   f.idnumber AS frameworkidnumber, f.visible AS frameworkvisible,
                   COALESCE(p.shortname, '') AS parentname
              FROM {competency_coursecomp} cc
              JOIN {competency} c ON c.id = cc.competencyid
              JOIN {competency_framework} f ON f.id = c.competencyframeworkid
         LEFT JOIN {competency} p ON p.id = c.parentid
             WHERE cc.courseid = :courseid
          ORDER BY cc.sortorder ASC, c.shortname ASC
        ";
        $records = $DB->get_records_sql($sql, ['courseid' => $courseid]);

        $sqlmodules = "
            SELECT mc.id, mc.competencyid, mc.cmid, mc.ruleoutcome, mc.sortorder, mc.timecreated,
                   cm.module AS moduleid, m.name AS modname, cm.instance, cm.section, cm.visible
              FROM {competency_modulecomp} mc
              JOIN {course_modules} cm ON cm.id = mc.cmid
              JOIN {modules} m ON m.id = cm.module
             WHERE cm.course = :courseid
          ORDER BY mc.sortorder ASC, mc.id ASC
        ";
        $modulerecords = $DB->get_records_sql($sqlmodules, ['courseid' => $courseid]);

        // Batch fetch activity names grouped by module to avoid N+1 queries.
        $instancesbymod = [];
        foreach ($modulerecords as $mr) {
            $instancesbymod[$mr->modname][$mr->instance] = (int)$mr->instance;
        }

        $namesbymodinstance = [];
        foreach ($instancesbymod as $modname => $instances) {
            if (empty($instances)) {
                continue;
            }
            try {
                [$insql, $inparams] = $DB->get_in_or_equal(array_values($instances));
                $names = $DB->get_records_select_menu($modname, "id $insql", $inparams, '', 'id, name');
                if ($names) {
                    $namesbymodinstance[$modname] = $names;
                }
            } catch (\Exception $e) {
                debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
            }
        }

        $modulesbycomp = [];
        foreach ($modulerecords as $mr) {
            $activityname = $namesbymodinstance[$mr->modname][$mr->instance] ?? '';
            if (empty($activityname)) {
                $activityname = ucfirst($mr->modname) . ' #' . $mr->instance;
            }

            $modulesbycomp[$mr->competencyid][] = [
                'id'          => (int)$mr->id,
                'cmid'        => (int)$mr->cmid,
                'modname'     => (string)$mr->modname,
                'name'        => (string)$activityname,
                'ruleoutcome' => (int)$mr->ruleoutcome,
                'sortorder'   => (int)$mr->sortorder,
                'timecreated' => (int)$mr->timecreated,
            ];
        }

        $sqlenrolled = "
            SELECT COUNT(DISTINCT ue.userid)
              FROM {enrol} e
              JOIN {user_enrolments} ue ON ue.enrolid = e.id AND ue.status = 0
             WHERE e.courseid = :courseid
        ";
        $totalenrolled = 0;
        try {
            $totalenrolled = (int)$DB->count_records_sql($sqlenrolled, ['courseid' => $courseid]);
        } catch (\Exception $e) {
            debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
            $totalenrolled = 0;
        }

        $sqlcompleted = "
            SELECT c.competencyid, COUNT(DISTINCT ue.userid) AS completedcount
              FROM {competency_coursecomp} c
              JOIN {enrol} e ON e.courseid = c.courseid
              JOIN {user_enrolments} ue ON ue.enrolid = e.id AND ue.status = 0
         LEFT JOIN {competency_usercompcourse} ucc ON ucc.courseid = c.courseid
                   AND ucc.competencyid = c.competencyid AND ucc.userid = ue.userid AND ucc.proficiency = 1
         LEFT JOIN {competency_usercomp} uc ON uc.competencyid = c.competencyid
                   AND uc.userid = ue.userid AND uc.proficiency = 1
             WHERE c.courseid = :courseid AND (ucc.id IS NOT NULL OR uc.id IS NOT NULL)
          GROUP BY c.competencyid
        ";
        $completedrecords = [];
        try {
            $completedrecords = $DB->get_records_sql($sqlcompleted, ['courseid' => $courseid]);
        } catch (\Exception $e) {
            debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
            $completedrecords = [];
        }

        $competencies = [];
        foreach ($records as $r) {
            $completedcount = isset($completedrecords[$r->competencyid])
                ? (int)$completedrecords[$r->competencyid]->completedcount
                : 0;
            $progress = $totalenrolled > 0 ? round(($completedcount / $totalenrolled) * 100) : 0;

            $competencies[] = [
                'id'                  => (int)$r->competencyid,
                'linkid'              => (int)$r->id,
                'shortname'           => (string)$r->shortname,
                'idnumber'            => (string)($r->idnumber ?? ''),
                'description'         => (string)($r->description ?? ''),
                'parentid'            => (int)$r->parentid,
                'parentname'          => (string)($r->parentname ?? ''),
                'path'                => (string)$r->path,
                'frameworkid'         => (int)$r->frameworkid,
                'frameworkname'       => (string)$r->frameworkname,
                'frameworkidnumber'   => (string)($r->frameworkidnumber ?? ''),
                'frameworkvisible'    => (int)$r->frameworkvisible,
                'ruleoutcome'         => (int)$r->ruleoutcome,
                'sortorder'           => (int)$r->sortorder,
                'timecreated'         => (int)$r->timecreated,
                'enrolledcount'       => $totalenrolled,
                'completedcount'      => $completedcount,
                'progress'            => $progress,
                'activities'          => $modulesbycomp[$r->competencyid] ?? [],
            ];
        }
        return $competencies;
    }
}
