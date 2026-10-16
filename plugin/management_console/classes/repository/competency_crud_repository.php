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
 * Competency CRUD repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

/**
 * Repository specializing in CRUD, details, rules and user universe calculations for competencies.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class competency_crud_repository {
    /**
     * Obtiene el registro de una competencia con control de existencia.
     *
     * @param int $competencyid ID de la competencia.
     * @param bool $mustexist Si debe arrojar excepción si no existe.
     * @return \stdClass|null Registro de la competencia.
     */
    public static function get_competency_record(int $competencyid, bool $mustexist = true): ?\stdClass {
        global $DB;
        return $DB->get_record('competency', ['id' => $competencyid], '*', $mustexist ? MUST_EXIST : IGNORE_MISSING);
    }

    /**
     * Actualiza el registro de competencia y la marca de tiempo en el marco asociado.
     *
     * @param \stdClass $record Registro de la competencia.
     * @param int $frameworkid ID del marco.
     * @param int $now Marca de tiempo actual.
     */
    private static function save_competency_and_touch(\stdClass $record, int $frameworkid, int $now): void {
        global $DB;
        $DB->update_record('competency', $record);
        $DB->set_field('competency_framework', 'timemodified', $now, ['id' => $frameworkid]);
    }

    /**
     * Devuelve los detalles de una competencia individual y sus subcompetencias hijas.
     *
     * @param int $competencyid Competency ID.
     * @return array|null Competency details or null if not found.
     */
    public static function get_competency_detail(int $competencyid): ?array {
        global $DB;

        $sql = "
            SELECT c.id, c.shortname, c.idnumber, c.description, c.parentid, c.path, c.sortorder,
                   c.ruletype, c.ruleoutcome, c.ruleconfig,
                   c.competencyframeworkid, c.timecreated, c.timemodified,
                   p.shortname AS parentname,
                   f.shortname AS frameworkname, f.idnumber AS frameworkidnumber, f.visible AS frameworkvisible,
                   f.scaleid, COALESCE(s.name, 'Escala estándar') AS scalename
              FROM {competency} c
              JOIN {competency_framework} f ON f.id = c.competencyframeworkid
         LEFT JOIN {competency} p ON p.id = c.parentid
         LEFT JOIN {scale} s ON s.id = f.scaleid
             WHERE c.id = :competencyid
        ";

        $record = $DB->get_record_sql($sql, ['competencyid' => $competencyid]);
        if (!$record) {
            return null;
        }

        // Subcompetencias hijas inmediatas con estadísticas agregadas.
        $sqlchildren = "
            SELECT c.id, c.shortname, c.idnumber, c.description, c.parentid, c.path, c.sortorder,
                   c.ruletype, c.ruleoutcome, c.timecreated, c.timemodified,
                   COALESCE((SELECT COUNT(cc.id)
                                FROM {competency_coursecomp} cc
                               WHERE cc.competencyid = c.id), 0) AS coursescount,
                   COALESCE((SELECT COUNT(sub.id)
                                FROM {competency} sub
                               WHERE sub.parentid = c.id), 0) AS childrencount,
                   COALESCE((SELECT COUNT(uc.id)
                                FROM {competency_usercomp} uc
                               WHERE uc.competencyid = c.id AND uc.status IN (1, 2)), 0) AS pendingreviewscount
              FROM {competency} c
             WHERE c.parentid = :competencyid
          ORDER BY c.sortorder ASC, c.shortname ASC
        ";
        $childrenrecords = $DB->get_records_sql($sqlchildren, ['competencyid' => $competencyid]);

        $children = [];
        foreach ($childrenrecords as $ch) {
            $children[] = [
                'id'                  => (int)$ch->id,
                'shortname'           => (string)$ch->shortname,
                'idnumber'            => (string)($ch->idnumber ?? ''),
                'description'         => clean_text((string)($ch->description ?? ''), FORMAT_HTML),
                'parentid'            => (int)$ch->parentid,
                'path'                => (string)$ch->path,
                'sortorder'           => (int)$ch->sortorder,
                'coursescount'        => (int)($ch->coursescount ?? 0),
                'childrencount'       => (int)($ch->childrencount ?? 0),
                'ruletype'            => (string)($ch->ruletype ?? ''),
                'ruleoutcome'         => (int)$ch->ruleoutcome,
                'pendingreviewscount' => (int)($ch->pendingreviewscount ?? 0),
                'timecreated'         => (int)$ch->timecreated,
                'timemodified'        => (int)$ch->timemodified,
            ];
        }

        $cleanpath = trim((string)$record->path, '/');
        $parts = array_filter(explode('/', $cleanpath), function ($p) {
            return $p !== '' && $p !== '0';
        });
        $level = max(1, count($parts));

        $grandparentname = '';
        $grandparentid = 0;
        if (!empty($record->parentid)) {
            $parentrec = $DB->get_record('competency', ['id' => $record->parentid], 'id, parentid');
            if ($parentrec && (int)$parentrec->parentid > 0) {
                $level = 3;
                $gprec = $DB->get_record('competency', ['id' => $parentrec->parentid], 'id, shortname');
                if ($gprec) {
                    $grandparentid = (int)$gprec->id;
                    $grandparentname = (string)$gprec->shortname;
                }
            } else if ($level === 1) {
                $level = 2;
            }
        }

        return [
            'id'                   => (int)$record->id,
            'shortname'            => (string)$record->shortname,
            'idnumber'             => (string)($record->idnumber ?? ''),
            'description'          => clean_text((string)($record->description ?? ''), FORMAT_HTML),
            'parentid'             => (int)$record->parentid,
            'parentname'           => (string)($record->parentname ?? ''),
            'level'                => (int)$level,
            'grandparentid'        => $grandparentid,
            'grandparentname'      => $grandparentname,
            'path'                 => (string)$record->path,
            'sortorder'            => (int)$record->sortorder,
            'ruletype'             => (string)($record->ruletype ?? ''),
            'ruleoutcome'          => (int)$record->ruleoutcome,
            'ruleconfig'            => (string)($record->ruleconfig ?? ''),
            'competencyframeworkid' => (int)$record->competencyframeworkid,
            'frameworkname'         => (string)$record->frameworkname,
            'frameworkidnumber'    => (string)($record->frameworkidnumber ?? ''),
            'frameworkvisible'     => (int)$record->frameworkvisible,
            'scaleid'              => (int)($record->scaleid ?? 0),
            'scalename'            => (string)$record->scalename,
            'timecreated'          => (int)$record->timecreated,
            'timemodified'         => (int)$record->timemodified,
            'children'             => $children,
            'childrencount'        => count($children),
        ];
    }

    /**
     * Obtiene la escala de calificación asociada al marco de la competencia.
     *
     * @param int $competencyid Competency ID.
     * @return array [$scaleinfo, $scaleitems]
     */
    public static function fetch_competency_scale_info(int $competencyid): array {
        global $DB;
        $scaleinfo = $DB->get_record_sql("
            SELECT s.id, s.name, s.scale
              FROM {competency} c
              JOIN {competency_framework} f ON f.id = c.competencyframeworkid
         LEFT JOIN {scale} s ON s.id = f.scaleid
             WHERE c.id = :cid
        ", ['cid' => $competencyid]);

        $scaleitems = [];
        if (!empty($scaleinfo->scale)) {
            $scaleitems = array_map('trim', explode(',', $scaleinfo->scale));
        }

        return [$scaleinfo, $scaleitems];
    }

    /**
     * Construye el universo tripartito de usuarios vinculados a una competencia.
     *
     * @param int $competencyid Competency ID.
     * @param array $relevantcourseids Relevant course IDs array.
     * @return array [$usercompbyuser, $adhocuserids, $alluserids]
     */
    public static function build_competency_user_universe(int $competencyid, array $relevantcourseids): array {
        global $DB;
        $usercomprecords = $DB->get_records('competency_usercomp', ['competencyid' => $competencyid]);
        $usercompbyuser = [];
        foreach ($usercomprecords as $uc) {
            $usercompbyuser[$uc->userid] = $uc;
        }

        $enrolleduserids = [];
        if (!empty($relevantcourseids)) {
            [$rcsql, $rcparams] = $DB->get_in_or_equal($relevantcourseids, SQL_PARAMS_NAMED, 'rc');
            $enrolleduserids = $DB->get_fieldset_sql("
                SELECT DISTINCT ue.userid
                  FROM {enrol} e
                  JOIN {user_enrolments} ue ON ue.enrolid = e.id
                  JOIN {user} u ON u.id = ue.userid
                 WHERE e.courseid $rcsql AND ue.status = 0 AND u.deleted = 0
            ", $rcparams) ?: [];
        }

        $adhocuserids = [];
        $dbman = $DB->get_manager();
        if ($dbman->table_exists('competency_plan') && $dbman->table_exists('competency_plancomp')) {
            $sqladhoc = "
                SELECT DISTINCT p.userid
                  FROM {competency_plancomp} pc
                  JOIN {competency_plan} p ON p.id = pc.planid
                 WHERE pc.competencyid = :cid
                   AND (p.templateid IS NULL OR p.templateid = 0)
                   AND p.name = :planname
            ";
            $adhocuserids = $DB->get_fieldset_sql($sqladhoc, [
                'cid'      => $competencyid,
                'planname' => 'Plan de Competencias Personales',
            ]) ?: [];
            $adhocuserids = array_map('intval', $adhocuserids);
        }

        $alluserids = array_values(array_unique(array_merge(
            array_keys($usercompbyuser),
            $enrolleduserids,
            $adhocuserids
        )));

        return [$usercompbyuser, $adhocuserids, $alluserids];
    }

    /**
     * Carga y computa el progreso en cursos para los usuarios de la página actual.
     *
     * @param array $pageuserids Array of page user IDs.
     * @param array $allcourseids Array of course IDs.
     * @param int $competencyid Competency ID.
     * @return array Course map for users.
     */
    public static function load_page_users_course_map(array $pageuserids, array $allcourseids, int $competencyid): array {
        global $DB;
        $usercoursesmap = [];
        if (empty($allcourseids) || empty($pageuserids)) {
            return $usercoursesmap;
        }

        [$puidsql, $puidparams] = $DB->get_in_or_equal($pageuserids, SQL_PARAMS_NAMED, 'puid');
        [$acidsql, $acidparams] = $DB->get_in_or_equal($allcourseids, SQL_PARAMS_NAMED, 'acid');
        $enrparams = array_merge($puidparams, $acidparams);

        $sqlenr = "
            SELECT ue.userid, c.id AS courseid, c.fullname, c.shortname, c.enablecompletion,
                   COALESCE(ccmp.timecompleted, 0) AS timecompleted
              FROM {enrol} e
              JOIN {user_enrolments} ue ON ue.enrolid = e.id
              JOIN {course} c ON c.id = e.courseid
         LEFT JOIN {course_completions} ccmp ON ccmp.userid = ue.userid AND ccmp.course = c.id
             WHERE ue.userid $puidsql AND e.courseid $acidsql AND ue.status = 0
          ORDER BY c.fullname ASC
        ";
        $enrolresults = $DB->get_records_sql($sqlenr, $enrparams);

        $sqlcmdone = "
            SELECT cmc.userid, cm.course, COUNT(DISTINCT cmc.coursemoduleid) AS donecount
              FROM {course_modules_completion} cmc
              JOIN {course_modules} cm ON cm.id = cmc.coursemoduleid
             WHERE cmc.userid $puidsql AND cm.course $acidsql AND cmc.completionstate IN (1, 2)
          GROUP BY cmc.userid, cm.course
        ";
        $cmdones = $DB->get_records_sql($sqlcmdone, $enrparams);
        $usercoursecmdone = [];
        foreach ($cmdones as $cmd) {
            $usercoursecmdone[$cmd->userid . '_' . $cmd->course] = (int)$cmd->donecount;
        }

        $sqlcmtotal = "
            SELECT cm.course, COUNT(cm.id) AS totalcount
              FROM {course_modules} cm
             WHERE cm.course $acidsql AND cm.completion > 0 AND cm.deletioninprogress = 0
          GROUP BY cm.course
        ";
        $cmtotals = $DB->get_records_sql_menu($sqlcmtotal, $acidparams) ?: [];

        $uccrecords = $DB->get_records_select(
            'competency_usercompcourse',
            "competencyid = :cid AND userid $puidsql",
            array_merge(['cid' => $competencyid], $puidparams)
        );
        $uccbyusercourse = [];
        foreach ($uccrecords as $ucc) {
            $uccbyusercourse[$ucc->userid . '_' . $ucc->courseid] = $ucc;
        }

        foreach ($enrolresults as $er) {
            $iscompleted = (int)$er->timecompleted > 0;
            $ucc = $uccbyusercourse[$er->userid . '_' . $er->courseid] ?? null;

            $progress = 0;
            if ($iscompleted) {
                $progress = 100;
            } else {
                $totalmods = (int)($cmtotals[$er->courseid] ?? 0);
                $donemods = (int)($usercoursecmdone[$er->userid . '_' . $er->courseid] ?? 0);
                if ($totalmods > 0) {
                    $progress = (int)round(($donemods / $totalmods) * 100);
                }
            }

            $usercoursesmap[$er->userid][] = [
                'courseid'     => (int)$er->courseid,
                'fullname'     => (string)$er->fullname,
                'shortname'    => (string)$er->shortname,
                'completed'    => $iscompleted ? 1 : 0,
                'progress'     => $progress,
                'proficiency'  => $ucc ? (int)$ucc->proficiency : 0,
                'grade'        => $ucc ? (int)$ucc->grade : 0,
            ];
        }

        return $usercoursesmap;
    }

    /**
     * Carga y formatea las evidencias de competencias de la página actual.
     *
     * @param array $pageuserids Page user IDs array.
     * @param array $usercompbyuser Map of user competencies by user ID.
     * @param array $scaleitems Scale items array.
     * @return array Evidence map by user.
     */
    public static function load_page_users_evidences(
        array $pageuserids,
        array $usercompbyuser,
        array $scaleitems
    ): array {
        global $DB;
        $pageusercompids = [];
        $usercomptouserid = [];
        foreach ($pageuserids as $puid) {
            if (isset($usercompbyuser[$puid])) {
                $ucid = (int)$usercompbyuser[$puid]->id;
                $pageusercompids[] = $ucid;
                $usercomptouserid[$ucid] = $puid;
            }
        }

        $evidencesbyuser = [];
        if (empty($pageusercompids)) {
            return $evidencesbyuser;
        }

        [$evsql, $evparams] = $DB->get_in_or_equal($pageusercompids, SQL_PARAMS_NAMED, 'evid');
        $sqlev = "
            SELECT e.id, e.usercompetencyid, e.action, e.actionuserid, e.descidentifier,
                   e.note, e.grade, e.url, e.timecreated,
                   u.firstname, u.lastname,
                   u.firstnamephonetic, u.lastnamephonetic, u.middlename, u.alternatename
              FROM {competency_evidence} e
         LEFT JOIN {user} u ON u.id = e.actionuserid
             WHERE e.usercompetencyid $evsql
          ORDER BY e.timecreated DESC
        ";
        $evrecords = $DB->get_records_sql($sqlev, $evparams);
        foreach ($evrecords as $ev) {
            $targetuid = $usercomptouserid[$ev->usercompetencyid] ?? 0;
            if ($targetuid > 0) {
                $gradeval = (int)($ev->grade ?? 0);
                $gradename = ($gradeval > 0 && isset($scaleitems[$gradeval - 1])) ? $scaleitems[$gradeval - 1] : '';

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

                $authorname = !empty($ev->firstname) ? fullname($ev) : 'Sistema Moodle';

                $evidencesbyuser[$targetuid][] = [
                    'id'                 => (int)$ev->id,
                    'action'             => (int)$ev->action,
                    'actionname'         => $actionname,
                    'actionuserfullname' => $authorname,
                    'descidentifier'     => (string)($ev->descidentifier ?? ''),
                    'note'               => (string)($ev->note ?? ''),
                    'grade'              => $gradeval,
                    'gradename'          => $gradename,
                    'url'                => competency_review_repository::sanitize_url($ev->url ?? null),
                    'timecreated'        => (int)$ev->timecreated,
                ];
            }
        }

        return $evidencesbyuser;
    }

    /**
     * Carga el recuento de revisiones pendientes de competencias para los usuarios de la página actual.
     *
     * @param array $pageuserids Page user IDs array.
     * @param int $competencyid Competency ID.
     * @param array $childids Child competency IDs array.
     * @return array Pending reviews count map by user ID.
     */
    public static function load_page_users_pending_reviews(array $pageuserids, int $competencyid, array $childids): array {
        global $DB;
        if (empty($pageuserids)) {
            return [];
        }

        $compidstocheck = array_merge([(int)$competencyid], $childids);
        [$chkcsql, $chkcparams] = $DB->get_in_or_equal($compidstocheck, SQL_PARAMS_NAMED, 'chkcomp');
        [$chkusql, $chkuparams] = $DB->get_in_or_equal($pageuserids, SQL_PARAMS_NAMED, 'chku');
        $chkparams = array_merge($chkcparams, $chkuparams);
        $sqlpending = "
            SELECT userid, COUNT(id) AS cnt
              FROM {competency_usercomp}
             WHERE competencyid $chkcsql
               AND userid $chkusql
               AND status IN (1, 2)
          GROUP BY userid
        ";
        try {
            return $DB->get_records_sql_menu($sqlpending, $chkparams) ?: [];
        } catch (\Exception $e) {
            debugging('Error loading pending reviews in competency_crud_repository: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return [];
        }
    }

    /**
     * Obtiene los usuarios vinculados a una competencia, junto con cursos, progreso y evidencias.
     *
     * @param int $competencyid Competency ID.
     * @param string $search Search query.
     * @param string $status Filter status.
     * @param int $courseid Course ID.
     * @param int $page Page offset.
     * @param int $perpage Records per page.
     * @param string $sort Sort field.
     * @param string $dir Sort direction.
     * @return array Competency users list and pagination info.
     */
    public static function get_competency_users(
        int $competencyid,
        string $search = '',
        string $status = 'all',
        int $courseid = 0,
        int $page = 0,
        int $perpage = 20,
        string $sort = 'lastname',
        string $dir = 'ASC'
    ): array {
        global $DB;

        // 1. Resolver cursos asociados y escala.
        [$allcourseids, $relevantcourseids, $childids] =
            competency_course_link_repository::resolve_competency_course_ids($competencyid, $courseid);
        [$scaleinfo, $scaleitems] = self::fetch_competency_scale_info($competencyid);

        // 2. Obtener universo de usuarios.
        [$usercompbyuser, $adhocuserids, $alluserids] = self::build_competency_user_universe($competencyid, $relevantcourseids);
        if (empty($alluserids)) {
            return [
                'totalcount' => 0,
                'page'       => (int)$page,
                'perpage'    => (int)$perpage,
                'users'      => [],
                'scale'      => [
                    'id'    => (int)($scaleinfo->id ?? 0),
                    'name'  => (string)($scaleinfo->name ?? 'Escala'),
                    'items' => $scaleitems,
                ],
            ];
        }

        // 3. Filtrar por búsqueda y estado.
        [$usql, $uparams] = $DB->get_in_or_equal($alluserids, SQL_PARAMS_NAMED, 'uid');
        $whereclauses = ["id $usql", "deleted = 0"];
        $params = $uparams;

        if (!empty($search)) {
            $like = '%' . $search . '%';
            $whereclauses[] = "(" . $DB->sql_like('firstname', ':s1', false, false) .
                               " OR " . $DB->sql_like('lastname', ':s2', false, false) .
                               " OR " . $DB->sql_like('email', ':s3', false, false) . ")";
            $params['s1'] = $like;
            $params['s2'] = $like;
            $params['s3'] = $like;
        }

        // Filtrado por status.
        if ($status === 'proficient') {
            $proficientuids = [];
            foreach ($usercompbyuser as $uid => $uc) {
                if ((int)$uc->proficiency === 1) {
                    $proficientuids[] = $uid;
                }
            }
            if (empty($proficientuids)) {
                $whereclauses[] = "1 = 0";
            } else {
                [$psql, $pparams] = $DB->get_in_or_equal($proficientuids, SQL_PARAMS_NAMED, 'prf');
                $whereclauses[] = "id $psql";
                $params = array_merge($params, $pparams);
            }
        } else if ($status === 'not_proficient') {
            $proficientuids = [];
            foreach ($usercompbyuser as $uid => $uc) {
                if ((int)$uc->proficiency === 1) {
                    $proficientuids[] = $uid;
                }
            }
            if (!empty($proficientuids)) {
                [$npsql, $npparams] = $DB->get_in_or_equal($proficientuids, SQL_PARAMS_NAMED, 'nprf');
                $whereclauses[] = "id NOT $npsql";
                $params = array_merge($params, $npparams);
            }
        } else if ($status === 'in_review' || $status === 'pending_reviews' || $status === 'with_pending') {
            $reviewuids = [];
            foreach ($usercompbyuser as $uid => $uc) {
                if (in_array((int)$uc->status, [1, 2])) {
                    $reviewuids[] = $uid;
                }
            }
            if (empty($reviewuids)) {
                $whereclauses[] = "1 = 0";
            } else {
                [$revsql, $revparams] = $DB->get_in_or_equal($reviewuids, SQL_PARAMS_NAMED, 'rev');
                $whereclauses[] = "id $revsql";
                $params = array_merge($params, $revparams);
            }
        }

        $where = implode(' AND ', $whereclauses);
        $totalcount = (int)$DB->count_records_select('user', $where, $params);

        $orderdir = strtoupper($dir) === 'DESC' ? 'DESC' : 'ASC';
        $orderby = "lastname $orderdir, firstname $orderdir";
        if ($sort === 'firstname' || $sort === 'fullname') {
            $orderby = "firstname $orderdir, lastname $orderdir";
        } else if ($sort === 'email') {
            $orderby = "email $orderdir";
        } else if ($sort === 'id') {
            $orderby = "id $orderdir";
        }

        $limitfrom = $page * $perpage;
        $usersrecords = $DB->get_records_select(
            'user',
            $where,
            $params,
            $orderby,
            'id, firstname, lastname, email, picture, imagealt',
            $limitfrom,
            $perpage
        );

        if (empty($usersrecords)) {
            return [
                'totalcount' => $totalcount,
                'page'       => (int)$page,
                'perpage'    => (int)$perpage,
                'users'      => [],
                'scale'      => [
                    'id'    => (int)($scaleinfo->id ?? 0),
                    'name'  => (string)($scaleinfo->name ?? 'Escala'),
                    'items' => $scaleitems,
                ],
            ];
        }

        $pageuserids = array_keys($usersrecords);

        // 4. Cargar mapas derivados para los usuarios paginados.
        $usercoursesmap = self::load_page_users_course_map($pageuserids, $allcourseids, $competencyid);
        $evidencesbyuser = self::load_page_users_evidences($pageuserids, $usercompbyuser, $scaleitems);
        $userpendingmap = self::load_page_users_pending_reviews($pageuserids, $competencyid, $childids);

        // 5. Ensamble de los registros de usuario.
        $usersoutput = [];
        foreach ($usersrecords as $ur) {
            $uid = (int)$ur->id;
            $uc = $usercompbyuser[$uid] ?? null;
            $usercourses = $usercoursesmap[$uid] ?? [];
            $userevidences = $evidencesbyuser[$uid] ?? [];

            $gradeval = $uc ? (int)$uc->grade : 0;
            $gradename = ($gradeval > 0 && isset($scaleitems[$gradeval - 1])) ? $scaleitems[$gradeval - 1] : '';

            // Progreso general en los cursos vinculados.
            $completedcoursescount = 0;
            $totalcourseprogress = 0;
            foreach ($usercourses as $ucourse) {
                if ($ucourse['completed'] === 1) {
                    $completedcoursescount++;
                    $totalcourseprogress += 100;
                } else {
                    $totalcourseprogress += $ucourse['progress'];
                }
            }
            $avgprogress = !empty($usercourses) ? (int)round($totalcourseprogress / count($usercourses)) : 0;

            $pendingcount = isset($userpendingmap[$uid])
                ? (int)$userpendingmap[$uid]
                : (($uc && in_array((int)$uc->status, [1, 2])) ? 1 : 0);

            $isadhoc = in_array($uid, $adhocuserids);
            if ($isadhoc) {
                $source = 'adhoc';
            } else if (!empty($usercourses)) {
                $source = 'course';
            } else {
                $source = 'usercomp';
            }

            $usersoutput[] = [
                'userid'                 => $uid,
                'fullname'               => trim(($ur->firstname ?? '') . ' ' . ($ur->lastname ?? '')),
                'email'                  => (string)$ur->email,
                'usercompid'             => $uc ? (int)$uc->id : 0,
                'status'                 => $uc ? (int)$uc->status : 0,
                'pendingreviewscount'    => $pendingcount,
                'proficiency'            => $uc ? (int)$uc->proficiency : 0,
                'grade'                  => $gradeval,
                'gradename'              => $gradename,
                'courses'                => $usercourses,
                'coursescount'           => count($usercourses),
                'completedcoursescount'  => $completedcoursescount,
                'progress'               => $avgprogress,
                'evidencescount'         => count($userevidences),
                'evidences'              => $userevidences,
                'source'                 => $source,
                'is_adhoc'               => $isadhoc ? 1 : 0,
            ];
        }

        return [
            'totalcount' => $totalcount,
            'page'       => (int)$page,
            'perpage'    => (int)$perpage,
            'users'      => $usersoutput,
            'scale'      => [
                'id'    => (int)($scaleinfo->id ?? 0),
                'name'  => (string)($scaleinfo->name ?? 'Escala'),
                'items' => $scaleitems,
            ],
        ];
    }

    /**
     * Ejecuta acciones de creación, edición, actualización de reglas y eliminación de competencias.
     *
     * @param string $action create, edit, update_rule, delete.
     * @param int $competencyid Competency ID.
     * @param int $frameworkid Framework ID.
     * @param int $parentid Parent competency ID.
     * @param string $shortname Competency short name.
     * @param string $idnumber ID number.
     * @param string $description Description text.
     * @param string $ruletype Rule type.
     * @param int $ruleoutcome Rule outcome value.
     * @param string $ruleconfig Rule config string.
     * @param int $userid Modifying user ID.
     * @return array Result array.
     */
    public static function competency_action(
        string $action,
        int $competencyid = 0,
        int $frameworkid = 0,
        int $parentid = 0,
        string $shortname = '',
        string $idnumber = '',
        string $description = '',
        string $ruletype = '',
        int $ruleoutcome = 1,
        string $ruleconfig = '',
        int $userid = 0
    ): array {
        global $DB;
        $now = time();

        switch ($action) {
            case 'create':
                if (empty($frameworkid)) {
                    return [
                        'success'       => false,
                        'message'       => 'Se requiere el ID del marco para crear la competencia.',
                        'affectedcount' => 0,
                    ];
                }
                if (empty(trim($shortname))) {
                    return [
                        'success'       => false,
                        'message'       => 'El nombre de la competencia es obligatorio.',
                        'affectedcount' => 0,
                    ];
                }

                $framework = $DB->get_record('competency_framework', ['id' => $frameworkid], '*', MUST_EXIST);

                $parent = null;
                $targetparentid = $parentid;
                if ($targetparentid > 0) {
                    $parent = $DB->get_record('competency', [
                        'id'                    => $targetparentid,
                        'competencyframeworkid' => $framework->id,
                    ], '*', MUST_EXIST);
                    if ((int)$parent->parentid > 0) {
                        $grandparent = $DB->get_record('competency', [
                            'id' => (int)$parent->parentid,
                        ], 'id, parentid');
                        if ($grandparent && (int)$grandparent->parentid > 0) {
                            return [
                                'success'       => false,
                                'message'       => 'Solo se permiten hasta 3 niveles de jerarquía (competencia principal, ' .
                                    'subcompetencia y subcompetencia de tercer nivel).',
                                'affectedcount' => 0,
                            ];
                        }
                    }
                }

                $maxsort = (int)$DB->get_field_sql(
                    "SELECT MAX(sortorder) FROM {competency} WHERE competencyframeworkid = :fid AND parentid = :pid",
                    ['fid' => $framework->id, 'pid' => $targetparentid]
                );

                $record = new \stdClass();
                $record->shortname             = trim($shortname);
                $record->idnumber              = trim($idnumber);
                $record->description           = clean_text($description, FORMAT_HTML);
                $record->descriptionformat     = FORMAT_HTML;
                $record->competencyframeworkid = $framework->id;
                $record->parentid              = $targetparentid;
                $record->path                  = $parent ? $parent->path : '/0/';
                $record->sortorder             = $maxsort + 1;
                $record->ruletype              = !empty($ruletype) ? trim($ruletype) : null;
                $record->ruleoutcome           = $ruleoutcome;
                $record->ruleconfig            = !empty($ruleconfig) ? trim($ruleconfig) : null;
                $record->scaleid               = null;
                $record->scaleconfiguration    = null;
                $record->timecreated           = $now;
                $record->timemodified          = $now;
                $record->usermodified          = $userid;

                $newid = $DB->insert_record('competency', $record);

                $newpath = $parent ? ($parent->path . $newid . '/') : ('/0/' . $newid . '/');
                $DB->set_field('competency', 'path', $newpath, ['id' => $newid]);
                $DB->set_field('competency_framework', 'timemodified', $now, ['id' => $framework->id]);

                $createmsg = $targetparentid > 0
                    ? 'Subcompetencia creada exitosamente.'
                    : 'Competencia creada exitosamente.';

                return [
                    'success'       => true,
                    'message'       => $createmsg,
                    'affectedcount' => (int)$newid,
                ];

            case 'edit':
                if (empty($competencyid)) {
                    return [
                        'success'       => false,
                        'message'       => 'Se requiere el ID de la competencia a editar.',
                        'affectedcount' => 0,
                    ];
                }
                if (empty(trim($shortname))) {
                    return [
                        'success'       => false,
                        'message'       => 'El nombre de la competencia es obligatorio.',
                        'affectedcount' => 0,
                    ];
                }

                $existing = self::get_competency_record($competencyid);
                $existing->shortname    = trim($shortname);
                $existing->idnumber     = trim($idnumber);
                $existing->description  = clean_text($description, FORMAT_HTML);
                $existing->ruletype     = !empty($ruletype) ? trim($ruletype) : null;
                $existing->ruleoutcome  = $ruleoutcome;
                $existing->ruleconfig   = !empty($ruleconfig) ? trim($ruleconfig) : null;

                if ($parentid !== (int)$existing->parentid) {
                    $newparentid = $parentid;
                    if ($newparentid === (int)$existing->id) {
                        return [
                            'success'       => false,
                            'message'       => 'Una competencia no puede ser padre de sí misma.',
                            'affectedcount' => 0,
                        ];
                    }
                    if ($newparentid > 0) {
                        $parent = $DB->get_record('competency', [
                            'id'                    => $newparentid,
                            'competencyframeworkid' => $existing->competencyframeworkid,
                        ], '*', MUST_EXIST);

                        // Determinar nivel del nuevo padre.
                        $parentcleanpath = trim((string)$parent->path, '/');
                        $parentparts = array_filter(explode('/', $parentcleanpath), function ($p) {
                            return $p !== '' && $p !== '0';
                        });
                        $parentlevel = max(1, count($parentparts));
                        if ($parentlevel === 1 && (int)$parent->parentid > 0) {
                            $parentlevel = 2;
                            $gp = $DB->get_record('competency', ['id' => $parent->parentid], 'id, parentid');
                            if ($gp && (int)$gp->parentid > 0) {
                                $parentlevel = 3;
                            }
                        }

                        if ($parentlevel >= 3) {
                            return [
                                'success'       => false,
                                'message'       => 'Solo se permiten hasta 3 niveles de jerarquía. ' .
                                    'La competencia de destino ya está en el nivel máximo.',
                                'affectedcount' => 0,
                            ];
                        }

                        // Verificar que los descendientes de la competencia no superen 3 niveles.
                        $haschildren = $DB->record_exists('competency', ['parentid' => $existing->id]);
                        if ($haschildren && $parentlevel >= 2) {
                            return [
                                'success'       => false,
                                'message'       => 'Esta competencia tiene subcompetencias y no puede moverse ' .
                                    'al nivel 3 porque excedería el límite de 3 niveles.',
                                'affectedcount' => 0,
                            ];
                        }

                        $hasgrandchildren = $DB->record_exists_sql(
                            "SELECT 1 FROM {competency} c1 JOIN {competency} c2 ON c2.parentid = c1.id WHERE c1.parentid = :id",
                            ['id' => $existing->id]
                        );
                        if ($hasgrandchildren && $parentlevel >= 1) {
                            return [
                                'success'       => false,
                                'message'       => 'Esta competencia tiene subcompetencias de tercer nivel ' .
                                    'y no puede moverse debajo de otra competencia.',
                                'affectedcount' => 0,
                            ];
                        }
                    }
                    $oldpath = $existing->path;
                    if ($newparentid > 0) {
                        if (!empty($parent->path) && strpos($parent->path, $oldpath) === 0) {
                            return [
                                'success'       => false,
                                'message'       => 'No se puede mover una competencia dentro de sus propias subcompetencias.',
                                'affectedcount' => 0,
                            ];
                        }
                        $newpath = $parent->path . $existing->id . '/';
                    } else {
                        $newpath = '/0/' . $existing->id . '/';
                    }
                    $existing->parentid = $newparentid;
                    $existing->path = $newpath;

                    $descendants = $DB->get_records_select(
                        'competency',
                        'competencyframeworkid = :fid AND path LIKE :pathlike AND id != :id',
                        ['fid' => $existing->competencyframeworkid, 'pathlike' => $oldpath . '%', 'id' => $existing->id]
                    );
                    foreach ($descendants as $desc) {
                        $desc->path = $newpath . substr($desc->path, strlen($oldpath));
                        $DB->update_record('competency', $desc);
                    }
                }

                $existing->timemodified = $now;
                $existing->usermodified = $userid;

                self::save_competency_and_touch($existing, (int)$existing->competencyframeworkid, $now);

                return [
                    'success'       => true,
                    'message'       => 'Competencia actualizada exitosamente.',
                    'affectedcount' => 1,
                ];

            case 'update_rule':
                if (empty($competencyid)) {
                    return [
                        'success'       => false,
                        'message'       => 'Se requiere el ID de la competencia para actualizar la regla.',
                        'affectedcount' => 0,
                    ];
                }

                $existing = self::get_competency_record($competencyid);
                $existing->ruletype     = !empty($ruletype) ? trim($ruletype) : null;
                $existing->ruleoutcome  = $ruleoutcome;
                $existing->ruleconfig   = !empty($ruleconfig) ? trim($ruleconfig) : null;
                $existing->timemodified = $now;
                $existing->usermodified = $userid;

                self::save_competency_and_touch($existing, (int)$existing->competencyframeworkid, $now);

                return [
                    'success'       => true,
                    'message'       => 'Regla de completado actualizada exitosamente.',
                    'affectedcount' => (int)$existing->id,
                ];

            case 'delete':
                if (empty($competencyid)) {
                    return [
                        'success'       => false,
                        'message'       => 'Se requiere el ID de la competencia a eliminar.',
                        'affectedcount' => 0,
                    ];
                }

                $existing = self::get_competency_record($competencyid);
                $fid = (int)$existing->competencyframeworkid;

                $DB->delete_records_select('competency', 'id = :id OR path LIKE :pathlike', [
                    'id'       => $existing->id,
                    'pathlike' => '%/' . $existing->id . '/%',
                ]);
                $DB->set_field('competency_framework', 'timemodified', $now, ['id' => $fid]);

                return [
                    'success'       => true,
                    'message'       => 'Competencia y subcompetencias eliminadas exitosamente.',
                    'affectedcount' => 1,
                ];

            default:
                return ['success' => false, 'message' => 'Acción no reconocida: ' . $action, 'affectedcount' => 0];
        }
    }
}
