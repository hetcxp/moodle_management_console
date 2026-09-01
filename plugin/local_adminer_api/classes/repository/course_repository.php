<?php
namespace local_adminer_api\repository;

defined('MOODLE_INTERNAL') || die();

class course_repository {

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

        $modules_by_comp = [];
        foreach ($module_records as $mr) {
            $activity_name = '';
            try {
                $activity_name = (string)$DB->get_field($mr->modname, 'name', ['id' => $mr->instance]);
            } catch (\Exception $e) {
                $activity_name = '';
            }
            if (empty($activity_name)) {
                $activity_name = ucfirst($mr->modname) . ' #' . $mr->instance;
            }

            $modules_by_comp[$mr->competencyid][] = [
                'id'          => (int)$mr->id,
                'cmid'        => (int)$mr->cmid,
                'modname'     => (string)$mr->modname,
                'name'        => $activity_name,
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
