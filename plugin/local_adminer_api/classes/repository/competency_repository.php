<?php
namespace local_adminer_api\repository;

defined('MOODLE_INTERNAL') || die();

class competency_repository {

    /**
     * Devuelve las escalas del sitio identificando la estándar por defecto.
     *
     * @return array
     */
    public static function get_scales() {
        global $DB;
        $records = $DB->get_records('scale', ['courseid' => 0], 'id ASC', 'id, name, scale, description');
        $scales = [];
        $first = true;
        foreach ($records as $r) {
            $items = array_map('trim', explode(',', $r->scale));
            $scales[] = [
                'id'        => (int)$r->id,
                'name'      => (string)$r->name,
                'isdefault' => $first ? 1 : 0,
                'items'     => $items,
            ];
            $first = false;
        }
        return $scales;
    }

    /**
     * KPIs globales de competencias.
     *
     * @return array
     */
    public static function get_kpis() {
        global $DB;
        $total_frameworks = (int)$DB->count_records('competency_framework');
        $visible_frameworks = (int)$DB->count_records('competency_framework', ['visible' => 1]);
        $hidden_frameworks = (int)$DB->count_records('competency_framework', ['visible' => 0]);
        $total_competencies = (int)$DB->count_records('competency');
        $pending_reviews = 0;
        try {
            $pending_reviews = (int)$DB->count_records_select('competency_usercomp', 'status IN (1, 2)');
        } catch (\Exception $e) {
            $pending_reviews = 0;
        }

        return [
            'total_frameworks'   => $total_frameworks,
            'visible_frameworks' => $visible_frameworks,
            'hidden_frameworks'  => $hidden_frameworks,
            'total_competencies' => $total_competencies,
            'pending_reviews'    => $pending_reviews,
        ];
    }

    /**
     * Listado paginado de marcos de competencias.
     *
     * @param int $page
     * @param int $perpage
     * @param string $sort
     * @param string $dir
     * @param string $search
     * @param array $filters
     * @return array
     */
    public static function get_paginated_frameworks($page = 0, $perpage = 50, $sort = 'shortname', $dir = 'ASC', $search = '', $filters = []) {
        global $DB;

        $where = "1=1";
        $sqlparams = [];

        if (!empty($search)) {
            $like = '%' . $search . '%';
            $where .= " AND (" . $DB->sql_like('f.shortname', ':s1', false, false) .
                      " OR " . $DB->sql_like('f.idnumber', ':s2', false, false) .
                      " OR " . $DB->sql_like('f.description', ':s3', false, false) . ")";
            $sqlparams['s1'] = $like;
            $sqlparams['s2'] = $like;
            $sqlparams['s3'] = $like;
        }

        if (isset($filters['visible']) && $filters['visible'] !== '' && $filters['visible'] !== '-1') {
            $where .= " AND f.visible = :visible";
            $sqlparams['visible'] = (int)$filters['visible'];
        }

        $sortfield = 'f.shortname';
        $d = strtoupper($dir) === 'DESC' ? 'DESC' : 'ASC';
        switch (strtolower($sort)) {
            case 'idnumber': $sortfield = 'f.idnumber'; break;
            case 'competenciescount': $sortfield = 'competenciescount'; break;
            case 'visible': $sortfield = 'f.visible'; break;
            case 'timecreated': $sortfield = 'f.timecreated'; break;
            case 'shortname':
            case 'name':
            default: $sortfield = 'f.shortname'; break;
        }

        $sql_select = "
            SELECT f.id, f.shortname, f.idnumber, f.description, f.visible, f.scaleid, f.timecreated, f.timemodified,
                   COALESCE(s.name, '') AS scalename,
                   (SELECT COUNT(c.id) FROM {competency} c WHERE c.competencyframeworkid = f.id) AS competenciescount
              FROM {competency_framework} f
         LEFT JOIN {scale} s ON s.id = f.scaleid
             WHERE $where
          ORDER BY $sortfield $d
        ";

        $sql_count = "SELECT COUNT(f.id) FROM {competency_framework} f WHERE $where";
        $totalcount = (int)$DB->count_records_sql($sql_count, $sqlparams);

        $limitfrom = $page * $perpage;
        $records = $DB->get_records_sql($sql_select, $sqlparams, $limitfrom, $perpage);

        $frameworks = [];
        foreach ($records as $r) {
            $frameworks[] = [
                'id'                => (int)$r->id,
                'shortname'         => (string)$r->shortname,
                'idnumber'          => (string)($r->idnumber ?? ''),
                'description'       => (string)($r->description ?? ''),
                'visible'           => (int)$r->visible,
                'scaleid'           => (int)$r->scaleid,
                'scalename'         => (string)($r->scalename ?: 'Escala estándar'),
                'competenciescount' => (int)$r->competenciescount,
                'timecreated'       => (int)$r->timecreated,
                'timemodified'      => (int)$r->timemodified,
            ];
        }

        return [
            'totalcount' => $totalcount,
            'page'       => (int)$page,
            'perpage'    => (int)$perpage,
            'frameworks' => $frameworks,
        ];
    }

    /**
     * Detalle de un marco y sus competencias de nivel 1.
     *
     * @param int $frameworkid
     * @param string $search
     * @return array|null
     */
    public static function get_framework_detail($frameworkid, $search = '') {
        global $DB;

        $sql_framework = "
            SELECT f.id, f.shortname, f.idnumber, f.description, f.visible, f.scaleid, f.scaleconfiguration, f.taxonomies,
                   f.timecreated, f.timemodified,
                   COALESCE(s.name, '') AS scalename
              FROM {competency_framework} f
         LEFT JOIN {scale} s ON s.id = f.scaleid
             WHERE f.id = :frameworkid
        ";
        $framework = $DB->get_record_sql($sql_framework, ['frameworkid' => $frameworkid]);
        if (!$framework) {
            return null;
        }

        $where_comp = "c.competencyframeworkid = :frameworkid AND c.parentid = 0";
        $sqlparams_comp = ['frameworkid' => $frameworkid];

        if (!empty($search)) {
            $like = '%' . $search . '%';
            $where_comp .= " AND (" . $DB->sql_like('c.shortname', ':s1', false, false) .
                           " OR " . $DB->sql_like('c.idnumber', ':s2', false, false) .
                           " OR " . $DB->sql_like('c.description', ':s3', false, false) . ")";
            $sqlparams_comp['s1'] = $like;
            $sqlparams_comp['s2'] = $like;
            $sqlparams_comp['s3'] = $like;
        }

        $sql_competencies = "
            SELECT c.id, c.shortname, c.idnumber, c.description, c.parentid, c.path, c.sortorder,
                   c.timecreated, c.timemodified,
                   COALESCE((SELECT COUNT(DISTINCT cc.courseid) FROM {competency_coursecomp} cc WHERE cc.competencyid = c.id), 0) AS coursescount,
                   COALESCE((SELECT COUNT(uc.id) FROM {competency_usercomp} uc WHERE uc.competencyid = c.id AND uc.status IN (1, 2)), 0) AS pendingreviewscount
              FROM {competency} c
             WHERE $where_comp
          ORDER BY c.sortorder ASC, c.shortname ASC
        ";
        $comp_records = $DB->get_records_sql($sql_competencies, $sqlparams_comp);

        $competencies = [];
        foreach ($comp_records as $c) {
            $competencies[] = [
                'id'                  => (int)$c->id,
                'shortname'           => (string)$c->shortname,
                'idnumber'            => (string)($c->idnumber ?? ''),
                'description'         => (string)($c->description ?? ''),
                'parentid'            => (int)$c->parentid,
                'path'                => (string)$c->path,
                'sortorder'           => (int)$c->sortorder,
                'coursescount'        => (int)($c->coursescount ?? 0),
                'pendingreviewscount' => (int)($c->pendingreviewscount ?? 0),
                'timecreated'         => (int)$c->timecreated,
                'timemodified'        => (int)$c->timemodified,
            ];
        }        return [
            'id'                 => (int)$framework->id,
            'shortname'          => (string)$framework->shortname,
            'idnumber'           => (string)($framework->idnumber ?? ''),
            'description'        => (string)($framework->description ?? ''),
            'visible'            => (int)$framework->visible,
            'scaleid'            => (int)$framework->scaleid,
            'scalename'          => (string)($framework->scalename ?: 'Escala estándar'),
            'scaleconfiguration' => (string)($framework->scaleconfiguration ?? ''),
            'taxonomies'         => (string)($framework->taxonomies ?? ''),
            'timecreated'        => (int)$framework->timecreated,
            'timemodified'       => (int)$framework->timemodified,
            'competenciescount'  => count($competencies),
            'pendingreviewscount'=> self::count_pending_reviews_by_framework((int)$framework->id),
            'competencies'       => $competencies,
        ];
    }

    /**
     * Devuelve los detalles de una competencia individual.
     *
     * @param int $competencyid
     * @return array|null
     */
    public static function get_competency_detail($competencyid) {
        global $DB;

        $sql = "
            SELECT c.id, c.shortname, c.idnumber, c.description, c.parentid, c.path, c.sortorder,
                   c.competencyframeworkid, c.timecreated, c.timemodified,
                   f.shortname AS frameworkname, f.idnumber AS frameworkidnumber, f.visible AS frameworkvisible,
                   f.scaleid, COALESCE(s.name, 'Escala estándar') AS scalename
              FROM {competency} c
              JOIN {competency_framework} f ON f.id = c.competencyframeworkid
         LEFT JOIN {scale} s ON s.id = f.scaleid
             WHERE c.id = :competencyid
        ";

        $record = $DB->get_record_sql($sql, ['competencyid' => $competencyid]);
        if (!$record) {
            return null;
        }

        return [
            'id'                   => (int)$record->id,
            'shortname'            => (string)$record->shortname,
            'idnumber'             => (string)($record->idnumber ?? ''),
            'description'          => (string)($record->description ?? ''),
            'parentid'             => (int)$record->parentid,
            'path'                 => (string)$record->path,
            'sortorder'            => (int)$record->sortorder,
            'competencyframeworkid'=> (int)$record->competencyframeworkid,
            'frameworkname'        => (string)$record->frameworkname,
            'frameworkidnumber'    => (string)($record->frameworkidnumber ?? ''),
            'frameworkvisible'     => (int)$record->frameworkvisible,
            'scaleid'              => (int)$record->scaleid,
            'scalename'            => (string)$record->scalename,
            'pendingreviewscount'  => self::count_pending_reviews_by_competency((int)$record->id),
            'timecreated'          => (int)$record->timecreated,
            'timemodified'         => (int)$record->timemodified,
        ];
    }

    /**
     * Devuelve los cursos vinculados a una competencia y las actividades vinculadas en cada curso.
     *
     * @param int $competencyid
     * @return array
     */
    public static function get_competency_courses($competencyid) {
        global $DB;

        $sql = "
            SELECT cc.id, c.id AS courseid, c.fullname, c.shortname, c.idnumber, c.visible, c.category,
                   COALESCE(cat.name, '') AS categoryname,
                   cc.ruleoutcome, cc.sortorder, cc.timecreated
              FROM {competency_coursecomp} cc
              JOIN {course} c ON c.id = cc.courseid
         LEFT JOIN {course_categories} cat ON cat.id = c.category
             WHERE cc.competencyid = :competencyid
          ORDER BY cc.sortorder ASC, c.fullname ASC
        ";

        $records = $DB->get_records_sql($sql, ['competencyid' => $competencyid]);

        // Obtener actividades asociadas a la competencia en mdl_competency_modulecomp
        $sql_modules = "
            SELECT mc.id, mc.cmid, mc.ruleoutcome, mc.sortorder, mc.timecreated,
                   cm.course AS courseid, cm.module AS moduleid, m.name AS modname, cm.instance
              FROM {competency_modulecomp} mc
              JOIN {course_modules} cm ON cm.id = mc.cmid
              JOIN {modules} m ON m.id = cm.module
             WHERE mc.competencyid = :competencyid
          ORDER BY mc.sortorder ASC, mc.id ASC
        ";
        $module_records = $DB->get_records_sql($sql_modules, ['competencyid' => $competencyid]);

        $modules_by_course = [];
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

            $modules_by_course[$mr->courseid][] = [
                'id'          => (int)$mr->id,
                'cmid'        => (int)$mr->cmid,
                'modname'     => (string)$mr->modname,
                'name'        => $activity_name,
                'ruleoutcome' => (int)$mr->ruleoutcome,
                'sortorder'   => (int)$mr->sortorder,
                'timecreated' => (int)$mr->timecreated,
            ];
        }

        $courses = [];
        foreach ($records as $r) {
            $courses[] = [
                'id'           => (int)$r->courseid,
                'fullname'     => (string)$r->fullname,
                'shortname'    => (string)$r->shortname,
                'idnumber'     => (string)($r->idnumber ?? ''),
                'visible'      => (int)$r->visible,
                'category'     => (int)$r->category,
                'categoryname' => (string)($r->categoryname ?? ''),
                'ruleoutcome'  => (int)$r->ruleoutcome,
                'sortorder'    => (int)$r->sortorder,
                'timecreated'  => (int)$r->timecreated,
                'activities'   => $modules_by_course[$r->courseid] ?? [],
            ];
        }

        return $courses;
    }

    /**
     * Obtiene las actividades disponibles en un curso para vincular a una competencia.
     *
     * @param int $courseid
     * @param int $competencyid
     * @return array
     */
    public static function get_course_available_activities($courseid, $competencyid = 0) {
        global $DB;

        $sql = "
            SELECT cm.id AS cmid, cm.course, m.name AS modname, cm.instance, cm.visible, cm.section
              FROM {course_modules} cm
              JOIN {modules} m ON m.id = cm.module
             WHERE cm.course = :courseid
          ORDER BY cm.section ASC, cm.id ASC
        ";
        $records = $DB->get_records_sql($sql, ['courseid' => $courseid]);

        $linked_cmids = [];
        if ($competencyid > 0) {
            $linked = $DB->get_records('competency_modulecomp', ['competencyid' => $competencyid], '', 'cmid, ruleoutcome, id');
            foreach ($linked as $l) {
                $linked_cmids[$l->cmid] = [
                    'id'          => (int)$l->id,
                    'ruleoutcome' => (int)$l->ruleoutcome,
                ];
            }
        }

        $activities = [];
        foreach ($records as $r) {
            $name = '';
            try {
                $name = (string)$DB->get_field($r->modname, 'name', ['id' => $r->instance]);
            } catch (\Exception $e) {
                $name = '';
            }
            if (empty($name)) {
                $name = ucfirst($r->modname) . ' #' . $r->instance;
            }

            $is_linked = isset($linked_cmids[$r->cmid]);
            $activities[] = [
                'cmid'        => (int)$r->cmid,
                'courseid'    => (int)$r->course,
                'modname'     => (string)$r->modname,
                'name'        => $name,
                'visible'     => (int)$r->visible,
                'section'     => (int)$r->section,
                'islinked'    => $is_linked ? 1 : 0,
                'linkid'      => $is_linked ? $linked_cmids[$r->cmid]['id'] : 0,
                'ruleoutcome' => $is_linked ? $linked_cmids[$r->cmid]['ruleoutcome'] : 0,
            ];
        }

        return $activities;
    }

    /**
     * Cuenta revisiones pendientes a nivel de marco.
     *
     * @param int $frameworkid
     * @return int
     */
    public static function count_pending_reviews_by_framework($frameworkid) {
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
            return 0;
        }
    }

    /**
     * Cuenta revisiones pendientes a nivel de competencia.
     *
     * @param int $competencyid
     * @return int
     */
    public static function count_pending_reviews_by_competency($competencyid) {
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
            return 0;
        }
    }

    /**
     * Cuenta revisiones pendientes a nivel de curso.
     *
     * @param int $courseid
     * @return int
     */
    public static function count_pending_reviews_by_course($courseid) {
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
    public static function get_pending_reviews($filters = [], $page = 0, $perpage = 20) {
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

        $sql_select = "
            SELECT uc.id AS usercompid, uc.userid, uc.competencyid, uc.status, uc.reviewerid,
                   uc.proficiency, uc.grade, uc.timemodified,
                   u.firstname, u.lastname, u.email, u.picture, u.imagealt,
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

        $sql_count = "
            SELECT COUNT(uc.id)
              FROM {competency_usercomp} uc
              JOIN {user} u ON u.id = uc.userid
              JOIN {competency} c ON c.id = uc.competencyid
              JOIN {competency_framework} f ON f.id = c.competencyframeworkid
             WHERE $where
        ";

        $totalcount = (int)$DB->count_records_sql($sql_count, $params);
        $limitfrom = $page * $perpage;
        $records = $DB->get_records_sql($sql_select, $params, $limitfrom, $perpage);

        $reviews = [];
        foreach ($records as $r) {
            $items = array_map('trim', explode(',', $r->scaleitems));
            $scale_options = [];
            foreach ($items as $idx => $item) {
                if ($item !== '') {
                    $scale_options[] = [
                        'value' => $idx + 1,
                        'name'  => $item,
                    ];
                }
            }

            // Obtener última evidencia si existe
            $latest_evidence = '';
            try {
                $ev = $DB->get_records('competency_evidence', ['usercompetencyid' => $r->usercompid], 'timecreated DESC', 'note', 0, 1);
                if (!empty($ev)) {
                    $first_ev = reset($ev);
                    $latest_evidence = (string)($first_ev->note ?? '');
                }
            } catch (\Exception $e) {
                $latest_evidence = '';
            }

            $reviews[] = [
                'usercompid'           => (int)$r->usercompid,
                'userid'               => (int)$r->userid,
                'userfullname'         => fullname($r),
                'useremail'            => (string)$r->email,
                'competencyid'         => (int)$r->competencyid,
                'competencyname'       => (string)$r->competencyname,
                'competencyidnumber'   => (string)($r->competencyidnumber ?? ''),
                'competencyframeworkid'=> (int)$r->competencyframeworkid,
                'frameworkname'        => (string)$r->frameworkname,
                'status'               => (int)$r->status,
                'proficiency'          => (int)$r->proficiency,
                'currentgrade'         => (int)($r->grade ?? 0),
                'scaleid'              => (int)$r->scaleid,
                'scalename'            => (string)$r->scalename,
                'scaleoptions'         => $scale_options,
                'latestevidence'       => $latest_evidence,
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
    public static function evaluate_competency_review($usercompid, $grade, $proficiency, $note = '', $reviewerid = 0) {
        global $DB, $USER;

        $rid = $reviewerid > 0 ? $reviewerid : $USER->id;
        $usercomp = $DB->get_record('competency_usercomp', ['id' => $usercompid], '*', MUST_EXIST);

        $usercomp->status = 0; // STATUS_IDLE (Completada la revisión)
        $usercomp->reviewerid = $rid;
        $usercomp->grade = (int)$grade;
        $usercomp->proficiency = (int)$proficiency;
        $usercomp->timemodified = time();
        $usercomp->usermodified = $rid;

        $DB->update_record('competency_usercomp', $usercomp);

        // Registrar evidencia manual si la tabla existe
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
            // Continuar si la evidencia es opcional
        }

        return true;
    }
}
