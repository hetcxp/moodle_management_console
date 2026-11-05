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
 * Competency review and evidence repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

/**
 * Repository specialized in competency reviews, evaluations, and evidence.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class competency_review_repository {
    /**
     * Cuenta revisiones pendientes a nivel de marco.
     *
     * @param int $frameworkid
     * @return int
     */
    public static function count_pending_reviews_by_framework($frameworkid): int {
        global $DB;
        $sql = "
            SELECT COUNT(uc.id)
              FROM {competency_usercomp} uc
              JOIN {competency} c ON c.id = uc.competencyid
             WHERE c.competencyframeworkid = :frameworkid
               AND uc.status IN (1, 2)
        ";
        try {
            return (int)$DB->count_records_sql($sql, ['frameworkid' => $frameworkid]);
        } catch (\Exception $e) {
            debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
            return 0;
        }
    }

    /**
     * Cuenta revisiones pendientes a nivel de competencia.
     *
     * @param int $competencyid
     * @return int
     */
    public static function count_pending_reviews_by_competency($competencyid): int {
        global $DB;
        $sql = "
            SELECT COUNT(uc.id)
              FROM {competency_usercomp} uc
             WHERE uc.competencyid = :competencyid
               AND uc.status IN (1, 2)
        ";
        try {
            return (int)$DB->count_records_sql($sql, ['competencyid' => $competencyid]);
        } catch (\Exception $e) {
            debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
            return 0;
        }
    }

    /**
     * Cuenta revisiones pendientes a nivel de curso.
     *
     * @param int $courseid
     * @return int
     */
    public static function count_pending_reviews_by_course($courseid): int {
        global $DB;
        $sql = "
            SELECT COUNT(ucc.id)
              FROM {competency_usercompcourse} ucc
             WHERE ucc.courseid = :courseid
               AND ucc.status IN (1, 2)
        ";
        try {
            return (int)$DB->count_records_sql($sql, ['courseid' => $courseid]);
        } catch (\Exception $e) {
            debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
            return 0;
        }
    }

    /**
     * Obtiene el listado de revisiones pendientes con paginación y filtros.
     *
     * @param array $filters
     * @param int $page
     * @param int $perpage
     * @return array
     */
    public static function get_pending_reviews($filters = [], $page = 0, $perpage = 20): array {
        global $DB;

        $where = "uc.status IN (1, 2)";
        $params = [];

        if (!empty($filters['frameworkid'])) {
            $where .= " AND c.competencyframeworkid = :frameworkid";
            $params['frameworkid'] = (int)$filters['frameworkid'];
        }

        if (!empty($filters['competencyid'])) {
            $where .= " AND uc.competencyid = :competencyid";
            $params['competencyid'] = (int)$filters['competencyid'];
        }

        if (!empty($filters['userid'])) {
            $where .= " AND uc.userid = :userid";
            $params['userid'] = (int)$filters['userid'];
        }

        if (!empty($filters['search'])) {
            $like = '%' . $filters['search'] . '%';
            $where .= " AND (" . $DB->sql_like('u.firstname', ':s1', false, false) .
                      " OR " . $DB->sql_like('u.lastname', ':s2', false, false) .
                      " OR " . $DB->sql_like('u.email', ':s3', false, false) .
                      " OR " . $DB->sql_like('c.shortname', ':s4', false, false) . ")";
            $params['s1'] = $like;
            $params['s2'] = $like;
            $params['s3'] = $like;
            $params['s4'] = $like;
        }

        $sqlselect = "
            SELECT uc.id AS usercompid, uc.userid, uc.competencyid, uc.status, uc.reviewerid,
                   uc.proficiency, uc.grade, uc.timemodified,
                   u.firstname, u.lastname, u.email, u.picture, u.imagealt,
                   u.firstnamephonetic, u.lastnamephonetic, u.middlename, u.alternatename,
                   c.shortname AS competencyname, c.idnumber AS competencyidnumber, c.competencyframeworkid,
                   f.shortname AS frameworkname, f.scaleid, COALESCE(s.name, 'Escala estándar') AS scalename,
                   COALESCE(s.scale, '') AS scaleitems
              FROM {competency_usercomp} uc
              JOIN {user} u ON u.id = uc.userid
              JOIN {competency} c ON c.id = uc.competencyid
              JOIN {competency_framework} f ON f.id = c.competencyframeworkid
         LEFT JOIN {scale} s ON s.id = f.scaleid
             WHERE $where
          ORDER BY uc.timemodified DESC
        ";

        $sqlcount = "
            SELECT COUNT(uc.id)
              FROM {competency_usercomp} uc
              JOIN {user} u ON u.id = uc.userid
              JOIN {competency} c ON c.id = uc.competencyid
              JOIN {competency_framework} f ON f.id = c.competencyframeworkid
             WHERE $where
        ";

        $totalcount = (int)$DB->count_records_sql($sqlcount, $params);
        $limitfrom = $page * $perpage;
        $records = $DB->get_records_sql($sqlselect, $params, $limitfrom, $perpage);

        $reviews = [];
        foreach ($records as $r) {
            $items = array_map('trim', explode(',', $r->scaleitems));
            $scaleoptions = [];
            foreach ($items as $idx => $item) {
                if ($item !== '') {
                    $scaleoptions[] = [
                        'value' => $idx + 1,
                        'name'  => $item,
                    ];
                }
            }

            // Obtener última evidencia si existe.
            $latestevidence = '';
            try {
                $ev = $DB->get_records(
                    'competency_evidence',
                    ['usercompetencyid' => $r->usercompid],
                    'timecreated DESC',
                    'note',
                    0,
                    1
                );
                if (!empty($ev)) {
                    $firstev = reset($ev);
                    $latestevidence = (string)($firstev->note ?? '');
                }
            } catch (\Exception $e) {
                debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
                $latestevidence = '';
            }

            $reviews[] = [
                'usercompid'           => (int)$r->usercompid,
                'userid'               => (int)$r->userid,
                'userfullname'         => fullname($r),
                'useremail'            => (string)$r->email,
                'competencyid'         => (int)$r->competencyid,
                'competencyname'       => (string)$r->competencyname,
                'competencyidnumber'   => (string)($r->competencyidnumber ?? ''),
                'competencyframeworkid' => (int)$r->competencyframeworkid,
                'frameworkname'        => (string)$r->frameworkname,
                'status'               => (int)$r->status,
                'proficiency'          => (int)$r->proficiency,
                'currentgrade'         => (int)($r->grade ?? 0),
                'scaleid'              => (int)$r->scaleid,
                'scalename'            => (string)$r->scalename,
                'scaleoptions'         => $scaleoptions,
                'latestevidence'       => $latestevidence,
                'timemodified'         => (int)$r->timemodified,
            ];
        }

        return [
            'totalcount' => $totalcount,
            'page'       => (int)$page,
            'perpage'    => (int)$perpage,
            'reviews'    => $reviews,
        ];
    }

    /**
     * Evalúa y completa la revisión de una competencia de usuario.
     *
     * @param int $usercompid
     * @param int $grade
     * @param int $proficiency
     * @param string $note
     * @param int $reviewerid
     * @return bool
     */
    public static function evaluate_competency_review($usercompid, $grade, $proficiency, $note = '', $reviewerid = 0): bool {
        global $DB, $USER;

        $rid = $reviewerid > 0 ? $reviewerid : $USER->id;
        $usercomp = $DB->get_record('competency_usercomp', ['id' => $usercompid], '*', MUST_EXIST);

        $usercomp->status = 0; // STATUS_IDLE (Completada la revisión).
        $usercomp->reviewerid = $rid;
        $usercomp->grade = (int)$grade;
        $usercomp->proficiency = (int)$proficiency;
        $usercomp->timemodified = time();
        $usercomp->usermodified = $rid;

        $DB->update_record('competency_usercomp', $usercomp);

        // Registrar evidencia manual si la tabla existe.
        try {
            $evidence = new \stdClass();
            $evidence->usercompetencyid = $usercompid;
            $evidence->contextid = \context_system::instance()->id;
            $evidence->action = 0;
            $evidence->actionuserid = $rid;
            $evidence->descidentifier = 'evidence_manual';
            $evidence->desccomponent = 'core_competency';
            $evidence->desca = null;
            $evidence->url = null;
            $evidence->grade = (int)$grade;
            $evidence->note = (string)$note;
            $evidence->timecreated = time();
            $evidence->timemodified = time();
            $evidence->usermodified = $rid;
            $DB->insert_record('competency_evidence', $evidence);
        } catch (\Exception $e) {
            debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
        }

        return true;
    }

    /**
     * Sanitize evidence URL to strictly allow HTTP, HTTPS or same-origin root-relative paths.
     * Blocks dangerous schemes (javascript:, vbscript:, data:, file:) and protocol-relative (//).
     *
     * @param string|null $url
     * @return string Empty string if invalid, sanitized URL otherwise.
     */
    public static function sanitize_url(?string $url): string {
        if (empty($url)) {
            return '';
        }
        $url = trim($url);
        if (empty($url)) {
            return '';
        }

        // Reject control characters.
        if (preg_match('/[\x00-\x1f\x7f]/', $url)) {
            return '';
        }

        // Reject protocol-relative URLs.
        if (str_starts_with($url, '//')) {
            return '';
        }

        // Allow root-relative paths (e.g. /pluginfile.php/...).
        if (str_starts_with($url, '/') && !str_starts_with($url, '/\\')) {
            return clean_param($url, PARAM_URL);
        }

        // Allow http or https only.
        if (preg_match('#^https?://#i', $url)) {
            return clean_param($url, PARAM_URL);
        }

        return '';
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
            debugging('Error loading scales in competency_review_repository: ' . $e->getMessage(), DEBUG_DEVELOPER);
        }

        $enrolledcourses = course_enrolment_repository::get_user_enrolled_courses($userid);
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
            $coursesprogress = !empty($enrolledcourses)
                ? course_enrolment_repository::get_user_courses_progress_data($userid, $enrolledcourses)
                : [];
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
                    'url'                => self::sanitize_url($ev->url ?? null),
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
                $source = competency_repository::SOURCE_ADHOC;
            } else if (strpos((string)$key, 'course_') === 0) {
                $source = competency_repository::SOURCE_COURSE;
            } else {
                $source = competency_repository::SOURCE_USERCOMP;
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
