<?php
namespace local_adminer_api\repository;

defined('MOODLE_INTERNAL') || die();

class course_repository {

    public static function get_courses_filtered(array $params): array {
        global $DB;

        $sortablecolumns = [
            'id'            => 'c.id',
            'fullname'      => 'c.fullname',
            'shortname'     => 'c.shortname',
            'categoryname'  => 'cc.name',
            'visible'       => 'c.visible',
            'enrolledcount' => 'enr.enrolledcount',
            'completedcount'=> 'cmp.completedcount',
            'cohortscount'  => 'coh.cohortscount',
            'progress'      => 'progress_sort',
            'timecreated'   => 'c.timecreated',
            'startdate'     => 'c.startdate',
            'enddate'       => 'c.enddate'
        ];

        $sort = $params['sort'] ?? 'timecreated';
        if (!array_key_exists($sort, $sortablecolumns)) {
            $sort = 'timecreated';
        }
        $sortfield = $sortablecolumns[$sort];
        $direction = strtoupper($params['dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

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

        $decoded_filters = is_string($params['filters'] ?? null) ? json_decode($params['filters'], true) : ($params['filters'] ?? []);
        if (is_array($decoded_filters) && !empty($decoded_filters)) {
            $filter_index = 1;
            foreach ($decoded_filters as $key => $value) {
                if ($key === 'empty_only' && $value) {
                    $where .= " AND NOT EXISTS (
                        SELECT 1 FROM {enrol} filter_e 
                        JOIN {user_enrolments} filter_ue ON filter_e.id = filter_ue.enrolid 
                        WHERE filter_e.courseid = c.id AND filter_ue.status = 0
                    )";
                } else if ($key === 'exclude_category' && $value) {
                    $where .= " AND c.category != :filterval$filter_index";
                    $sqlparams["filterval$filter_index"] = (int)$value;
                    $filter_index++;
                } else if (array_key_exists($key, $sortablecolumns) && $value !== '') {
                    $fieldname = $sortablecolumns[$key];
                    if ($key === 'visible') {
                        $where .= " AND $fieldname = :filterval$filter_index";
                        $sqlparams["filterval$filter_index"] = (int)$value;
                    } else if (is_string($value)) {
                        $where .= " AND " . $DB->sql_like($fieldname, ":filterval$filter_index", false, false);
                        $sqlparams["filterval$filter_index"] = '%' . $value . '%';
                    }
                    $filter_index++;
                }
            }
        }

        $sql_select = "
            SELECT c.id, c.fullname, c.shortname, c.visible, c.timecreated, c.category, c.startdate, c.enddate,
                   cc.name AS categoryname,
                   COALESCE(enr.enrolledcount, 0) AS enrolledcount,
                   COALESCE(cmp.completedcount, 0) AS completedcount,
                   COALESCE(coh.cohortscount, 0) AS cohortscount,
                   CASE 
                       WHEN COALESCE(enr.enrolledcount, 0) > 0 
                       THEN ROUND((COALESCE(cmp.completedcount, 0) * 100.0) / enr.enrolledcount) 
                       ELSE 0 
                   END AS progress_sort
              FROM {course} c
              JOIN {course_categories} cc ON cc.id = c.category
         LEFT JOIN (
                SELECT e.courseid, COUNT(DISTINCT ue.userid) AS enrolledcount
                  FROM {enrol} e
                  JOIN {user_enrolments} ue ON ue.enrolid = e.id
                  JOIN {user} u ON u.id = ue.userid
                 WHERE ue.status = 0 AND u.deleted = 0
              GROUP BY e.courseid
         ) enr ON enr.courseid = c.id
         LEFT JOIN (
                SELECT ccmp.course AS courseid, COUNT(DISTINCT ccmp.userid) AS completedcount
                  FROM {course_completions} ccmp
                  JOIN {user} u ON u.id = ccmp.userid
                 WHERE ccmp.timecompleted IS NOT NULL AND u.deleted = 0
              GROUP BY ccmp.course
         ) cmp ON cmp.courseid = c.id
         LEFT JOIN (
                SELECT e.courseid, COUNT(DISTINCT e.customint1) AS cohortscount
                  FROM {enrol} e
                 WHERE e.enrol = 'cohort'
              GROUP BY e.courseid
         ) coh ON coh.courseid = c.id
             WHERE $where
          ORDER BY $sortfield $direction, c.id DESC
        ";

        $sql_count = "
            SELECT COUNT(c.id)
              FROM {course} c
              JOIN {course_categories} cc ON cc.id = c.category
             WHERE $where
        ";

        $totalcount = (int)$DB->count_records_sql($sql_count, $sqlparams);

        $page = (int)($params['page'] ?? 0);
        $perpage = (int)($params['perpage'] ?? 20);
        $limitfrom = $page * $perpage;
        $records = $DB->get_records_sql($sql_select, $sqlparams, $limitfrom, $perpage);

        $sql_kpis = "
            SELECT 
                COUNT(c.id) AS total_courses,
                COALESCE(SUM(COALESCE(enr.enrolledcount, 0)), 0) AS total_enrolled,
                COALESCE(AVG(
                    CASE 
                        WHEN COALESCE(enr.enrolledcount, 0) > 0 
                        THEN (COALESCE(cmp.completedcount, 0) * 100.0) / enr.enrolledcount 
                        ELSE 0 
                    END
                ), 0) AS avg_progress,
                SUM(CASE WHEN COALESCE(enr.enrolledcount, 0) = 0 THEN 1 ELSE 0 END) AS empty_courses
            FROM {course} c
            JOIN {course_categories} cc ON cc.id = c.category
            LEFT JOIN (
                SELECT e.courseid, COUNT(DISTINCT ue.userid) AS enrolledcount
                  FROM {enrol} e
                  JOIN {user_enrolments} ue ON ue.enrolid = e.id
                  JOIN {user} u ON u.id = ue.userid
                 WHERE ue.status = 0 AND u.deleted = 0
              GROUP BY e.courseid
            ) enr ON enr.courseid = c.id
            LEFT JOIN (
                SELECT ccmp.course AS courseid, COUNT(DISTINCT ccmp.userid) AS completedcount
                  FROM {course_completions} ccmp
                  JOIN {user} u ON u.id = ccmp.userid
                 WHERE ccmp.timecompleted IS NOT NULL AND u.deleted = 0
              GROUP BY ccmp.course
            ) cmp ON cmp.courseid = c.id
            WHERE $where
        ";

        $kpi_data = $DB->get_record_sql($sql_kpis, $sqlparams);
        $kpis = [
            'total_courses'  => (int)($kpi_data->total_courses ?? 0),
            'total_enrolled' => (int)($kpi_data->total_enrolled ?? 0),
            'avg_progress'   => (int)round($kpi_data->avg_progress ?? 0),
            'empty_courses'  => (int)($kpi_data->empty_courses ?? 0),
        ];

        return [$records, $totalcount, $kpis];
    }

    public static function get_course_enrolled_users_detail($courseid) {
        global $DB;
        $sql_users = "
            SELECT u.id, u.firstname, u.lastname, u.email, 
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
          GROUP BY u.id, u.firstname, u.lastname, u.email, ccmp.timecompleted
        ";
        return $DB->get_records_sql($sql_users, ['courseid' => $courseid]);
    }

    public static function get_course_user_cohort_map($courseid) {
        global $DB;
        $sql = "
            SELECT ue.userid, e.customint1 as cohortid
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE e.courseid = :courseid AND e.enrol = 'cohort'
        ";
        $rs = $DB->get_recordset_sql($sql, ['courseid' => $courseid]);
        $map = [];
        foreach ($rs as $uc) {
            $map[$uc->userid][] = (int)$uc->cohortid;
        }
        $rs->close();
        return $map;
    }

    public static function get_course_all_enrolments($courseid) {
        global $DB;
        $sql = "
            SELECT ue.id, ue.userid, e.enrol as method, ue.status, ue.timestart, ue.timeend, ue.timecreated
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE e.courseid = :courseid
        ";
        return $DB->get_records_sql($sql, ['courseid' => $courseid]);
    }

    public static function get_course_user_roles_map($courseid) {
        global $DB;
        $sql = "
            SELECT ra.userid, r.shortname
              FROM {role_assignments} ra
              JOIN {role} r ON r.id = ra.roleid
              JOIN {context} ctx ON ctx.id = ra.contextid
             WHERE ctx.contextlevel = 50 AND ctx.instanceid = :courseid
        ";
        $assignments = $DB->get_records_sql($sql, ['courseid' => $courseid]);
        $map = [];
        foreach ($assignments as $ra) {
            $map[$ra->userid][] = $ra->shortname;
        }
        return $map;
    }

    public static function get_course_cm_completions(array $cmids) {
        global $DB;
        if (empty($cmids)) {
            return [];
        }
        list($incmids, $cmparams) = $DB->get_in_or_equal($cmids, SQL_PARAMS_NAMED, 'cm');
        $sql = "
            SELECT userid, COUNT(DISTINCT coursemoduleid) as completedcount
              FROM {course_modules_completion}
             WHERE coursemoduleid $incmids
               AND completionstate IN (1, 2)
          GROUP BY userid
        ";
        return $DB->get_records_sql_menu($sql, $cmparams);
    }

    public static function get_course_linked_cohorts($courseid) {
        global $DB;
        $sql = "
            SELECT c.id, c.name, c.idnumber, e.id as enrolid, e.status as enrolstatus,
                   e.timecreated, e.enrolenddate, e.customint2 as groupid,
                   COUNT(DISTINCT ue.userid) as enrolledcount,
                   COUNT(DISTINCT ccmp.userid) as completedcount
              FROM {cohort} c
              JOIN {enrol} e ON e.customint1 = c.id
         LEFT JOIN {user_enrolments} ue ON ue.enrolid = e.id AND ue.status = 0
         LEFT JOIN {course_completions} ccmp ON ccmp.userid = ue.userid AND ccmp.course = e.courseid AND ccmp.timecompleted IS NOT NULL
             WHERE e.courseid = :courseid AND e.enrol = 'cohort'
          GROUP BY c.id, c.name, c.idnumber, e.id, e.status, e.timecreated, e.enrolenddate, e.customint2
        ";
        return $DB->get_records_sql($sql, ['courseid' => $courseid]);
    }

    public static function get_course_category_name($categoryid) {
        global $DB;
        $category = $DB->get_record('course_categories', ['id' => $categoryid]);
        return $category ? (string)$category->name : '';
    }

    public static function get_course_groups_list($courseid) {
        global $CFG;
        require_once($CFG->dirroot . '/group/lib.php');
        $groups = groups_get_all_groups($courseid);
        $result = [];
        if ($groups) {
            foreach ($groups as $g) {
                $result[] = [
                    'id' => (int)$g->id,
                    'name' => (string)$g->name
                ];
            }
        }
        return $result;
    }

    public static function get_course_user_enrolments($courseid, $userid) {
        global $DB;
        $sql = "
            SELECT ue.id, e.enrol as method, ue.status, ue.timestart, ue.timeend, ue.timecreated
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE e.courseid = :courseid AND ue.userid = :userid
        ";
        return $DB->get_records_sql($sql, ['courseid' => $courseid, 'userid' => $userid]);
    }

    public static function get_course_user_first_and_last_access($courseid, $userid) {
        global $DB;
        $lastaccess_rec = $DB->get_record('user_lastaccess', ['courseid' => $courseid, 'userid' => $userid]);
        $lastaccess = $lastaccess_rec ? (int)$lastaccess_rec->timeaccess : 0;
        $firstaccess = 0;
        if ($lastaccess > 0) {
            try {
                $sql_logs = "
                    SELECT MIN(timecreated) as firstaccess
                      FROM {logstore_standard_log}
                     WHERE courseid = :courseid AND userid = :userid
                ";
                $log_data = $DB->get_record_sql($sql_logs, ['courseid' => $courseid, 'userid' => $userid]);
                if ($log_data && $log_data->firstaccess) {
                    $firstaccess = (int)$log_data->firstaccess;
                }
            } catch (\Throwable $e) {
                // Ignore exception if log table is missing or fails
            }
            if ($firstaccess == 0) {
                $firstaccess = $lastaccess;
            }
        }
        return [$firstaccess, $lastaccess];
    }

    public static function count_courses($sql_count, $params) {
        global $DB;
        return (int)$DB->count_records_sql($sql_count, $params);
    }

    public static function get_paginated_courses($sql, $params, $limitfrom, $perpage) {
        global $DB;
        return $DB->get_records_sql($sql, $params, $limitfrom, $perpage);
    }

    public static function get_course_kpis($sql_kpis, $params) {
        global $DB;
        return $DB->get_record_sql($sql_kpis, $params);
    }

    public static function get_course($courseid) {
        global $DB;
        return $DB->get_record('course', ['id' => $courseid]);
    }
    
    public static function get_course_strict($courseid) {
        global $DB;
        return $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
    }

    public static function get_enrolled_users($sql_users, $courseid) {
        global $DB;
        return $DB->get_records_sql($sql_users, ['courseid' => $courseid]);
    }

    public static function get_user_cohorts($sql_user_cohorts, $courseid) {
        global $DB;
        return $DB->get_recordset_sql($sql_user_cohorts, ['courseid' => $courseid]);
    }

    public static function get_course_competencies($courseid) {
        global $DB;
        $sql = "
            SELECT cc.id, cc.competencyid, cc.ruleoutcome, cc.sortorder, cc.timecreated,
                   c.shortname, c.idnumber, c.description, c.parentid, c.path,
                   c.ruletype, c.ruleoutcome AS compruleoutcome,
                   f.id AS frameworkid, f.shortname AS frameworkname, f.idnumber AS frameworkidnumber, f.visible AS frameworkvisible,
                   COALESCE(p.shortname, '') AS parentname
              FROM {competency_coursecomp} cc
              JOIN {competency} c ON c.id = cc.competencyid
              JOIN {competency_framework} f ON f.id = c.competencyframeworkid
         LEFT JOIN {competency} p ON p.id = c.parentid
             WHERE cc.courseid = :courseid
          ORDER BY cc.sortorder ASC, c.shortname ASC
        ";
        $records = $DB->get_records_sql($sql, ['courseid' => $courseid]);

        $sql_modules = "
            SELECT mc.id, mc.competencyid, mc.cmid, mc.ruleoutcome, mc.sortorder, mc.timecreated,
                   cm.module AS moduleid, m.name AS modname, cm.instance, cm.section, cm.visible
              FROM {competency_modulecomp} mc
              JOIN {course_modules} cm ON cm.id = mc.cmid
              JOIN {modules} m ON m.id = cm.module
             WHERE cm.course = :courseid
          ORDER BY mc.sortorder ASC, mc.id ASC
        ";
        $module_records = $DB->get_records_sql($sql_modules, ['courseid' => $courseid]);

        // Batch fetch activity names grouped by module to avoid N+1 queries
        $instances_by_mod = [];
        foreach ($module_records as $mr) {
            $instances_by_mod[$mr->modname][$mr->instance] = (int)$mr->instance;
        }

        $names_by_mod_instance = [];
        foreach ($instances_by_mod as $modname => $instances) {
            if (empty($instances)) {
                continue;
            }
            try {
                list($insql, $inparams) = $DB->get_in_or_equal(array_values($instances));
                $names = $DB->get_records_select_menu($modname, "id $insql", $inparams, '', 'id, name');
                if ($names) {
                    $names_by_mod_instance[$modname] = $names;
                }
            } catch (\Exception $e) {
                // Ignore missing module tables or fields gracefully
            }
        }

        $modules_by_comp = [];
        foreach ($module_records as $mr) {
            $activity_name = $names_by_mod_instance[$mr->modname][$mr->instance] ?? '';
            if (empty($activity_name)) {
                $activity_name = ucfirst($mr->modname) . ' #' . $mr->instance;
            }

            $modules_by_comp[$mr->competencyid][] = [
                'id'          => (int)$mr->id,
                'cmid'        => (int)$mr->cmid,
                'modname'     => (string)$mr->modname,
                'name'        => (string)$activity_name,
                'ruleoutcome' => (int)$mr->ruleoutcome,
                'sortorder'   => (int)$mr->sortorder,
                'timecreated' => (int)$mr->timecreated,
            ];
        }

        $sql_enrolled = "
            SELECT COUNT(DISTINCT ue.userid)
              FROM {enrol} e
              JOIN {user_enrolments} ue ON ue.enrolid = e.id AND ue.status = 0
             WHERE e.courseid = :courseid
        ";
        $total_enrolled = 0;
        try {
            $total_enrolled = (int)$DB->count_records_sql($sql_enrolled, ['courseid' => $courseid]);
        } catch (\Exception $e) {
            $total_enrolled = 0;
        }

        $sql_completed = "
            SELECT c.competencyid, COUNT(DISTINCT ue.userid) AS completedcount
              FROM {competency_coursecomp} c
              JOIN {enrol} e ON e.courseid = c.courseid
              JOIN {user_enrolments} ue ON ue.enrolid = e.id AND ue.status = 0
              LEFT JOIN {competency_usercompcourse} ucc ON ucc.courseid = c.courseid AND ucc.competencyid = c.competencyid AND ucc.userid = ue.userid AND ucc.proficiency = 1
              LEFT JOIN {competency_usercomp} uc ON uc.competencyid = c.competencyid AND uc.userid = ue.userid AND uc.proficiency = 1
             WHERE c.courseid = :courseid AND (ucc.id IS NOT NULL OR uc.id IS NOT NULL)
          GROUP BY c.competencyid
        ";
        $completed_records = [];
        try {
            $completed_records = $DB->get_records_sql($sql_completed, ['courseid' => $courseid]);
        } catch (\Exception $e) {
            $completed_records = [];
        }

        $competencies = [];
        foreach ($records as $r) {
            $completed_count = isset($completed_records[$r->competencyid]) ? (int)$completed_records[$r->competencyid]->completedcount : 0;
            $progress = $total_enrolled > 0 ? round(($completed_count / $total_enrolled) * 100) : 0;

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
                'enrolledcount'       => $total_enrolled,
                'completedcount'      => $completed_count,
                'progress'            => $progress,
                'activities'          => $modules_by_comp[$r->competencyid] ?? [],
            ];
        }
        return $competencies;
    }
}
