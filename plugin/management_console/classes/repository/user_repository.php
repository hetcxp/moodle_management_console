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

defined('MOODLE_INTERNAL') || die();

/**
 * User repository class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class user_repository {

    public static function get_users_kpi_stats($sqlparams) {
        global $DB;
        $sql_stats = "
            SELECT 
                COUNT(u.id) AS total_users,
                SUM(CASE WHEN u.suspended = 0 THEN 1 ELSE 0 END) AS active_users,
                SUM(CASE WHEN u.suspended = 1 THEN 1 ELSE 0 END) AS suspended_users,
                SUM(CASE WHEN u.lastaccess > :recent THEN 1 ELSE 0 END) AS recent_active
            FROM {user} u
            WHERE u.deleted = 0 AND u.id <> :adminid AND u.id <> :guestid
        ";
        return $DB->get_record_sql($sql_stats, $sqlparams);
    }

    public static function get_users_kpi_avg_progress($sqlparams) {
        global $DB;
        $sql_progress = "
            SELECT ROUND(AVG(
                CASE WHEN enr.enrolled > 0 THEN (COALESCE(cmp.completed, 0) * 100.0 / enr.enrolled) ELSE 0 END
            ), 1) AS avg_progress
            FROM (
                SELECT ue.userid, COUNT(DISTINCT ue.id) AS enrolled 
                  FROM {user_enrolments} ue
                  JOIN {user} u ON u.id = ue.userid
                 WHERE ue.status = 0 AND u.deleted = 0 AND u.id <> :adminid AND u.id <> :guestid
                 GROUP BY ue.userid
            ) enr
            LEFT JOIN (
                SELECT cc.userid, COUNT(DISTINCT cc.id) AS completed 
                  FROM {course_completions} cc
                  JOIN {user} u2 ON u2.id = cc.userid
                 WHERE cc.timecompleted IS NOT NULL AND u2.deleted = 0 AND u2.id <> :adminid2 AND u2.id <> :guestid2
                 GROUP BY cc.userid
            ) cmp ON cmp.userid = enr.userid
        ";
        $primaryadmin = get_admin();
        $defaultadminid = $primaryadmin ? (int)$primaryadmin->id : 1;
        $params = array_merge($sqlparams, [
            'adminid2' => $sqlparams['adminid'] ?? $defaultadminid,
            'guestid2' => $sqlparams['guestid'] ?? 0,
        ]);
        return $DB->get_field_sql($sql_progress, $params);
    }

    public static function get_users_filtered(array $params): array {
        global $DB, $CFG;

        $allowed_sorts = [
            'id'         => 'u.id',
            'firstname'  => 'u.firstname',
            'lastname'   => 'u.lastname',
            'email'      => 'u.email',
            'suspended'  => 'u.suspended',
            'lastaccess' => 'u.lastaccess',
            'cohorts'    => 'coh.cohorts_count',
            'courses'    => 'enr.enrolled_courses',
            'progress'   => 'progress_sort'
        ];

        $sort = $params['sort'] ?? 'lastaccess';
        if (!array_key_exists($sort, $allowed_sorts)) {
            $sort = 'lastaccess';
        }
        $sortfield = $allowed_sorts[$sort];
        $direction = strtoupper($params['dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

        $primaryadmin = get_admin();
        $adminid = $primaryadmin ? (int)$primaryadmin->id : 1;
        $guestid = $CFG->siteguest ?? 0;
        $where = "u.deleted = 0 AND u.id <> :adminid AND u.id <> :guestid";
        $sqlparams = ['adminid' => $adminid, 'guestid' => $guestid];
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

        $decoded_filters = is_string($params['filters'] ?? null) ? json_decode($params['filters'], true) : ($params['filters'] ?? []);
        if (is_array($decoded_filters) && !empty($decoded_filters)) {
            $filter_index = 1;
            foreach ($decoded_filters as $key => $value) {
                if (array_key_exists($key, $allowed_sorts) && $value !== '') {
                    $fieldname = $allowed_sorts[$key];
                    if ($key === 'suspended') {
                        $where .= " AND $fieldname = :filterval$filter_index";
                        $sqlparams["filterval$filter_index"] = (int)$value;
                    } else if (is_string($value)) {
                        $where .= " AND " . $DB->sql_like($fieldname, ":filterval$filter_index", false, false);
                        $sqlparams["filterval$filter_index"] = '%' . $value . '%';
                    }
                    $filter_index++;
                } else if ($key === 'cohortid' && $value !== '' && $value !== '0') {
                    $where .= " AND EXISTS (SELECT 1 FROM {cohort_members} cm_f WHERE cm_f.userid = u.id AND cm_f.cohortid = :filterval$filter_index)";
                    $sqlparams["filterval$filter_index"] = (int)$value;
                    $filter_index++;
                }
            }
        }

        $sql_select = "
            SELECT u.id, u.username, u.firstname, u.lastname, u.email, u.suspended, u.lastaccess,
                   u.firstnamephonetic, u.lastnamephonetic, u.middlename, u.alternatename,
                   COALESCE(coh.cohorts_count, 0) AS cohorts_count,
                   COALESCE(enr.enrolled_courses, 0) AS enrolled_courses,
                   COALESCE(cmp.completed_courses, 0) AS completed_courses,
                   CASE 
                       WHEN COALESCE(enr.enrolled_courses, 0) > 0 
                       THEN ROUND((COALESCE(cmp.completed_courses, 0) * 100.0) / enr.enrolled_courses) 
                       ELSE 0 
                   END AS progress_sort
              FROM {user} u
         LEFT JOIN (
                SELECT userid, COUNT(id) AS cohorts_count
                  FROM {cohort_members}
              GROUP BY userid
         ) coh ON coh.userid = u.id
         LEFT JOIN (
                SELECT ue.userid, COUNT(DISTINCT ue.id) AS enrolled_courses
                  FROM {user_enrolments} ue
                  JOIN {enrol} e ON e.id = ue.enrolid
                 WHERE ue.status = 0
              GROUP BY ue.userid
         ) enr ON enr.userid = u.id
         LEFT JOIN (
                SELECT userid, COUNT(DISTINCT course) AS completed_courses
                  FROM {course_completions}
                 WHERE timecompleted IS NOT NULL
              GROUP BY userid
         ) cmp ON cmp.userid = u.id
             WHERE $where
          ORDER BY $sortfield $direction, u.id DESC
        ";

        $sql_count = "SELECT COUNT(u.id) FROM {user} u WHERE $where";
        $totalcount = (int)$DB->count_records_sql($sql_count, $sqlparams);

        $page = (int)($params['page'] ?? 0);
        $perpage = (int)($params['perpage'] ?? 20);
        $limitfrom = $page * $perpage;
        $records = $DB->get_records_sql($sql_select, $sqlparams, $limitfrom, $perpage);

        return [$records, $totalcount];
    }

    public static function count_users($sql_count, $sqlparams) {
        global $DB;
        return (int)$DB->count_records_sql($sql_count, $sqlparams);
    }

    public static function get_paginated_users($sql, $sqlparams, $limitfrom, $perpage) {
        global $DB;
        return $DB->get_records_sql($sql, $sqlparams, $limitfrom, $perpage);
    }

    public static function get_user($userid) {
        global $DB;
        return $DB->get_record('user', ['id' => $userid, 'deleted' => 0]);
    }

    public static function get_user_strict($userid) {
        global $DB;
        return $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);
    }

    public static function get_user_enrolled_courses($userid) {
        global $DB;
        $sql_courses = "
            SELECT c.id, c.fullname, c.shortname, MAX(e.enrol) as enrolmethod, MIN(ue.status) as enrolstatus
              FROM {course} c
              JOIN {enrol} e ON e.courseid = c.id
              JOIN {user_enrolments} ue ON ue.enrolid = e.id
             WHERE ue.userid = :userid
          GROUP BY c.id, c.fullname, c.shortname
        ";
        return $DB->get_records_sql($sql_courses, ['userid' => $userid]);
    }

    public static function get_user_all_enrolments($userid) {
        global $DB;
        $sql_all_enrolments = "
            SELECT ue.id, e.courseid, e.enrol as method, ue.status, ue.timestart, ue.timeend, ue.timecreated
              FROM {user_enrolments} ue
              JOIN {enrol} e ON e.id = ue.enrolid
             WHERE ue.userid = :userid
        ";
        return $DB->get_records_sql($sql_all_enrolments, ['userid' => $userid]);
    }

    public static function get_user_cohorts($userid) {
        global $DB;
        $sql_cohorts = "
            SELECT c.id, c.name, c.idnumber
              FROM {cohort} c
              JOIN {cohort_members} cm ON cm.cohortid = c.id
             WHERE cm.userid = :userid
        ";
        return $DB->get_records_sql($sql_cohorts, ['userid' => $userid]);
    }

    public static function get_role_id_by_shortname($shortname = 'student') {
        global $DB;
        return $DB->get_field('role', 'id', ['shortname' => $shortname]);
    }

    public static function get_user_courses_progress_data($userid, array $enrolled_courses): array {
        global $DB, $CFG;
        if (empty($enrolled_courses)) {
            return [];
        }

        require_once($CFG->libdir . '/completionlib.php');

        $course_ids = array_keys($enrolled_courses);
        list($in_c_sql, $in_c_params) = $DB->get_in_or_equal($course_ids, SQL_PARAMS_NAMED, 'c');
        $params = array_merge(['userid' => $userid], $in_c_params);

        // Direct course completions (100%)
        $sql_completions = "
            SELECT course, 100 AS progress
              FROM {course_completions}
             WHERE userid = :userid AND course $in_c_sql AND timecompleted IS NOT NULL
        ";
        $completed_map = $DB->get_records_sql_menu($sql_completions, $params) ?: [];

        // Trackable activities by course
        $trackable_by_course = [];
        $all_cmids = [];
        foreach ($enrolled_courses as $c) {
            $course_obj = \tool_management_console\repository\course_repository::get_course($c->id);
            if ($course_obj) {
                $cinfo = new \completion_info($course_obj);
                if ($cinfo->is_enabled()) {
                    $acts = $cinfo->get_activities();
                    $trackable_by_course[$c->id] = count($acts);
                    foreach (array_keys($acts) as $cmid) {
                        $all_cmids[$cmid] = $c->id;
                    }
                } else {
                    $trackable_by_course[$c->id] = 0;
                }
            }
        }

        // Batch fetch completed modules
        $cm_completed_counts = [];
        if (!empty($all_cmids)) {
            list($in_cm_sql, $in_cm_params) = $DB->get_in_or_equal(array_keys($all_cmids), SQL_PARAMS_NAMED, 'cm');
            $cm_params = array_merge(['userid' => $userid], $in_cm_params);
            $sql_cm = "
                SELECT cm.course, COUNT(DISTINCT cmc.coursemoduleid) as completed_count
                  FROM {course_modules_completion} cmc
                  JOIN {course_modules} cm ON cm.id = cmc.coursemoduleid
                 WHERE cmc.userid = :userid AND cmc.coursemoduleid $in_cm_sql AND cmc.completionstate IN (1, 2)
              GROUP BY cm.course
            ";
            $cm_completed_counts = $DB->get_records_sql_menu($sql_cm, $cm_params) ?: [];
        }

        $progress_map = [];
        foreach ($enrolled_courses as $c) {
            if (isset($completed_map[$c->id])) {
                $progress_map[$c->id] = 100;
            } else if (!empty($trackable_by_course[$c->id])) {
                $cm_done = isset($cm_completed_counts[$c->id]) ? (int)$cm_completed_counts[$c->id] : 0;
                $progress_map[$c->id] = (int)round(($cm_done / $trackable_by_course[$c->id]) * 100);
            } else {
                $progress_map[$c->id] = 0;
            }
        }

        return $progress_map;
    }

    public static function get_user_system_roles($userid) {
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
        $has_admin_role = false;

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
                $has_admin_role = true;
            }
        }

        if (is_siteadmin($userid) && !$has_admin_role) {
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
     * @param int $userid
     * @return array
     */
    public static function get_user_competencies(int $userid): array {
        global $DB;

        $dbman = $DB->get_manager();
        if (!$dbman->table_exists('competency') || !$dbman->table_exists('competency_usercomp')) {
            return [];
        }

        $scales_map = [];
        try {
            $scales_records = $DB->get_records('scale', null, '', 'id, name, scale');
            foreach ($scales_records as $sc) {
                $scales_map[$sc->id] = array_map('trim', explode(',', $sc->scale));
            }
        } catch (\Exception $e) {
            // Silencioso si falla la lectura de escalas.
        }

        $enrolled_courses = self::get_user_enrolled_courses($userid);
        $enrolled_course_ids = array_map('intval', array_keys($enrolled_courses));

        // 1. Obtener competencias asignadas al usuario desde competency_usercomp
        $sql_usercomp = "
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

        $records = $DB->get_records_sql($sql_usercomp, ['userid' => $userid]);

        // Verificar si además hay competencias en planes de aprendizaje que no tengan registro en usercomp
        if ($dbman->table_exists('competency_plan') && $dbman->table_exists('competency_plancomp')) {
            $sql_plancomp = "
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
            $plan_records = $DB->get_records_sql($sql_plancomp, ['userid' => $userid]);
            foreach ($plan_records as $pr) {
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

        // Obtener competencias vinculadas a los cursos en los que el usuario está matriculado
        if (!empty($enrolled_course_ids) && $dbman->table_exists('competency_coursecomp')) {
            list($in_ecids, $in_ecparams) = $DB->get_in_or_equal($enrolled_course_ids, SQL_PARAMS_NAMED, 'ecid');
            $sql_coursecomp = "
                SELECT DISTINCT c.id AS competencyid,
                       c.shortname, c.idnumber, c.description, c.competencyframeworkid,
                       c.scaleid AS comp_scaleid, c.scaleconfiguration,
                       f.shortname AS frameworkname, f.scaleid AS framework_scaleid
                  FROM {competency_coursecomp} cc
                  JOIN {competency} c ON c.id = cc.competencyid
                  JOIN {competency_framework} f ON f.id = c.competencyframeworkid
                 WHERE cc.courseid $in_ecids
            ";
            $coursecomp_records = $DB->get_records_sql($sql_coursecomp, $in_ecparams);
            foreach ($coursecomp_records as $ccr) {
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

        $competency_ids = [];
        $usercomp_ids = [];
        foreach ($records as $r) {
            $competency_ids[] = (int)$r->competencyid;
            if (!empty($r->usercompid)) {
                $usercomp_ids[] = (int)$r->usercompid;
            }
        }
        $competency_ids = array_values(array_unique($competency_ids));
        $usercomp_ids = array_values(array_unique($usercomp_ids));

        // Enriquecer con evaluaciones a nivel de curso (competency_usercompcourse) si existen
        if ($dbman->table_exists('competency_usercompcourse') && !empty($competency_ids)) {
            list($in_ucc_cids, $ucc_params) = $DB->get_in_or_equal($competency_ids, SQL_PARAMS_NAMED, 'ucccid');
            $ucc_params['ucc_userid'] = $userid;
            $ucc_records = $DB->get_records_select(
                'competency_usercompcourse',
                "competencyid $in_ucc_cids AND userid = :ucc_userid",
                $ucc_params,
                'timemodified DESC',
                'id, competencyid, courseid, proficiency, grade, timemodified'
            );
            foreach ($ucc_records as $ucc) {
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

        // 2. Cursos vinculados a cada competencia
        $courses_by_comp = [];
        if (!empty($competency_ids) && $dbman->table_exists('competency_coursecomp')) {
            list($in_csql, $in_cparams) = $DB->get_in_or_equal($competency_ids, SQL_PARAMS_NAMED, 'cid');
            $sql_cc = "
                SELECT cc.id, cc.competencyid, c.id AS courseid, c.fullname, c.shortname
                  FROM {competency_coursecomp} cc
                  JOIN {course} c ON c.id = cc.courseid
                 WHERE cc.competencyid $in_csql
              ORDER BY c.fullname ASC
            ";
            $cc_records = $DB->get_records_sql($sql_cc, $in_cparams);
            foreach ($cc_records as $cc) {
                $cid = (int)$cc->competencyid;
                $courses_by_comp[$cid][] = [
                    'id'          => (int)$cc->courseid,
                    'fullname'    => (string)$cc->fullname,
                    'shortname'   => (string)$cc->shortname,
                    'is_enrolled' => in_array((int)$cc->courseid, $enrolled_course_ids) ? 1 : 0,
                ];
            }
        }

        // 3. Evidencias para las competencias del usuario
        $evidences_by_usercomp = [];
        if (!empty($usercomp_ids) && $dbman->table_exists('competency_evidence')) {
            list($in_esql, $in_eparams) = $DB->get_in_or_equal($usercomp_ids, SQL_PARAMS_NAMED, 'evid');
            $sql_ev = "
                SELECT e.id, e.usercompetencyid, e.action, e.actionuserid, e.descidentifier,
                       e.note, e.grade, e.url, e.timecreated,
                       u.firstname, u.lastname
                  FROM {competency_evidence} e
             LEFT JOIN {user} u ON u.id = e.actionuserid
                 WHERE e.usercompetencyid $in_esql
              ORDER BY e.timecreated DESC
            ";
            $ev_records = $DB->get_records_sql($sql_ev, $in_eparams);
            foreach ($ev_records as $ev) {
                $action_name = 'Evidencia registrada';
                switch ((int)$ev->action) {
                    case 0: $action_name = 'Evidencia manual'; break;
                    case 1: $action_name = 'Evidencia adjuntada'; break;
                    case 2: $action_name = 'Completado en curso'; break;
                    case 3: $action_name = 'Revisión / Calificación'; break;
                    default: $action_name = 'Registro de competencia'; break;
                }
                $author_name = !empty($ev->firstname) ? fullname($ev) : 'Sistema';

                $evidences_by_usercomp[$ev->usercompetencyid][] = [
                    'id'                 => (int)$ev->id,
                    'action'             => (int)$ev->action,
                    'actionname'         => $action_name,
                    'actionuserfullname' => $author_name,
                    'descidentifier'     => (string)($ev->descidentifier ?? ''),
                    'note'               => (string)($ev->note ?? ''),
                    'url'                => (string)($ev->url ?? ''),
                    'grade'              => (int)($ev->grade ?? 0),
                    'timecreated'        => (int)$ev->timecreated,
                    'timecreated_str'    => userdate($ev->timecreated),
                ];
            }
        }

        // 4. Armar resultado
        $result = [];
        foreach ($records as $r) {
            $comp_id = (int)$r->competencyid;
            $usercomp_id = (int)$r->usercompid;

            $scale_id = !empty($r->comp_scaleid) ? $r->comp_scaleid : $r->framework_scaleid;
            $scale_items = $scales_map[$scale_id] ?? [];
            $grade_val = (int)$r->grade;
            $grade_name = ($grade_val > 0 && isset($scale_items[$grade_val - 1])) ? $scale_items[$grade_val - 1] : '';

            $status_name = 'En progreso';
            if ((int)$r->proficiency === 1) {
                $status_name = 'Competente';
            } else if ((int)$r->status === 1 || (int)$r->status === 2) {
                $status_name = 'En revisión';
            }

            $evs = $usercomp_id > 0 ? ($evidences_by_usercomp[$usercomp_id] ?? []) : [];

            $result[] = [
                'id'              => $comp_id,
                'shortname'       => (string)$r->shortname,
                'idnumber'        => (string)($r->idnumber ?? ''),
                'description'     => (string)($r->description ?? ''),
                'frameworkid'     => (int)$r->competencyframeworkid,
                'frameworkname'   => (string)$r->frameworkname,
                'proficiency'     => (int)$r->proficiency,
                'status'          => (int)$r->status,
                'statusname'      => $status_name,
                'grade'           => $grade_val,
                'gradename'       => $grade_name,
                'courses'         => $courses_by_comp[$comp_id] ?? [],
                'evidences_count' => count($evs),
                'evidences'       => $evs,
            ];
        }

        return $result;
    }
}
