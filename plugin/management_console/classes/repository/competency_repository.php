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
 * Competency repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

defined('MOODLE_INTERNAL') || die();

/**
 * Competency repository class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
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
        $cached = \tool_management_console\cache_manager::get_kpi('competency_kpis');
        if ($cached !== null) {
            return $cached;
        }

        global $DB;
        $total_frameworks = (int)$DB->count_records('competency_framework');
        $visible_frameworks = (int)$DB->count_records('competency_framework', ['visible' => 1]);
        $hidden_frameworks = (int)$DB->count_records('competency_framework', ['visible' => 0]);
        $total_competencies = (int)$DB->count_records('competency');
        $pending_reviews = 0;
        try {
            $pending_reviews = (int)$DB->count_records_select('competency_usercomp', 'status IN (1, 2)');
        } catch (\Exception $e) {
            debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
            $pending_reviews = 0;
        }

        $result = [
            'total_frameworks'   => $total_frameworks,
            'visible_frameworks' => $visible_frameworks,
            'hidden_frameworks'  => $hidden_frameworks,
            'total_competencies' => $total_competencies,
            'pending_reviews'    => $pending_reviews,
        ];

        \tool_management_console\cache_manager::set_kpi('competency_kpis', $result);
        return $result;
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

        $where_comp = "c.competencyframeworkid = :frameworkid";
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
                   c.ruletype, c.ruleoutcome, c.timecreated, c.timemodified,
                   COALESCE(p.shortname, '') AS parentname,
                   COALESCE((SELECT COUNT(DISTINCT cc.courseid) FROM {competency_coursecomp} cc WHERE cc.competencyid = c.id), 0) AS coursescount,
                   COALESCE((SELECT COUNT(sub.id) FROM {competency} sub WHERE sub.parentid = c.id), 0) AS childrencount,
                   COALESCE((SELECT COUNT(uc.id) FROM {competency_usercomp} uc WHERE uc.competencyid = c.id AND uc.status IN (1, 2)), 0) AS pendingreviewscount
              FROM {competency} c
         LEFT JOIN {competency} p ON p.id = c.parentid
             WHERE $where_comp
          ORDER BY c.path ASC, c.sortorder ASC, c.shortname ASC
        ";
        $comp_records = $DB->get_records_sql($sql_competencies, $sqlparams_comp);

        $competencies = [];
        foreach ($comp_records as $c) {
            $clean_path = trim((string)$c->path, '/');
            $depth = !empty($clean_path) ? substr_count($clean_path, '/') : 1;
            $level = max(1, $depth);

            $competencies[] = [
                'id'                  => (int)$c->id,
                'shortname'           => (string)$c->shortname,
                'idnumber'            => (string)($c->idnumber ?? ''),
                'description'         => (string)($c->description ?? ''),
                'parentid'            => (int)$c->parentid,
                'parentname'          => (string)($c->parentname ?? ''),
                'level'               => (int)$level,
                'path'                => (string)$c->path,
                'sortorder'           => (int)$c->sortorder,
                'coursescount'        => (int)($c->coursescount ?? 0),
                'childrencount'       => (int)($c->childrencount ?? 0),
                'ruletype'            => (string)($c->ruletype ?? ''),
                'ruleoutcome'         => (int)($c->ruleoutcome ?? 1),
                'pendingreviewscount' => (int)($c->pendingreviewscount ?? 0),
                'timecreated'         => (int)$c->timecreated,
                'timemodified'        => (int)$c->timemodified,
            ];
        }

        return [
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
     * Devuelve los detalles de una competencia individual y sus subcompetencias hijas.
     *
     * @param int $competencyid
     * @return array|null
     */
    public static function get_competency_detail($competencyid) {
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

        // Consultar subcompetencias hijas directas
        $sql_children = "
            SELECT c.id, c.shortname, c.idnumber, c.description, c.parentid, c.path, c.sortorder,
                   c.ruletype, c.ruleoutcome, c.timecreated, c.timemodified,
                   COALESCE((SELECT COUNT(DISTINCT cc.courseid) FROM {competency_coursecomp} cc WHERE cc.competencyid = c.id), 0) AS coursescount,
                   COALESCE((SELECT COUNT(sub.id) FROM {competency} sub WHERE sub.parentid = c.id), 0) AS childrencount,
                   COALESCE((SELECT COUNT(uc.id) FROM {competency_usercomp} uc WHERE uc.competencyid = c.id AND uc.status IN (1, 2)), 0) AS pendingreviewscount
              FROM {competency} c
             WHERE c.parentid = :competencyid
          ORDER BY c.sortorder ASC, c.shortname ASC
        ";
        $children_records = $DB->get_records_sql($sql_children, ['competencyid' => $competencyid]);

        $children = [];
        foreach ($children_records as $ch) {
            $children[] = [
                'id'                  => (int)$ch->id,
                'shortname'           => (string)$ch->shortname,
                'idnumber'            => (string)($ch->idnumber ?? ''),
                'description'         => (string)($ch->description ?? ''),
                'parentid'            => (int)$ch->parentid,
                'path'                => (string)$ch->path,
                'sortorder'           => (int)$ch->sortorder,
                'coursescount'        => (int)($ch->coursescount ?? 0),
                'childrencount'       => (int)($ch->childrencount ?? 0),
                'ruletype'            => (string)($ch->ruletype ?? ''),
                'ruleoutcome'         => (int)($ch->ruleoutcome ?? 1),
                'pendingreviewscount' => (int)($ch->pendingreviewscount ?? 0),
                'timecreated'         => (int)$ch->timecreated,
                'timemodified'        => (int)$ch->timemodified,
            ];
        }

        return [
            'id'                   => (int)$record->id,
            'shortname'            => (string)$record->shortname,
            'idnumber'             => (string)($record->idnumber ?? ''),
            'description'          => (string)($record->description ?? ''),
            'parentid'             => (int)$record->parentid,
            'parentname'           => (string)($record->parentname ?? ''),
            'path'                 => (string)$record->path,
            'sortorder'            => (int)$record->sortorder,
            'competencyframeworkid'=> (int)$record->competencyframeworkid,
            'frameworkname'        => (string)$record->frameworkname,
            'frameworkidnumber'    => (string)($record->frameworkidnumber ?? ''),
            'frameworkvisible'     => (int)$record->frameworkvisible,
            'scaleid'              => (int)$record->scaleid,
            'scalename'            => (string)$record->scalename,
            'ruletype'             => (string)($record->ruletype ?? ''),
            'ruleoutcome'          => (int)($record->ruleoutcome ?? 1),
            'ruleconfig'           => (string)($record->ruleconfig ?? ''),
            'childrencount'        => count($children),
            'pendingreviewscount'  => self::count_pending_reviews_by_competency((int)$record->id),
            'timecreated'          => (int)$record->timecreated,
            'timemodified'         => (int)$record->timemodified,
            'children'             => $children,
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
        $activity_names = self::resolve_module_activity_names($module_records);
        foreach ($module_records as $mr) {
            $activity_name = $activity_names[$mr->modname][$mr->instance] ?? '';
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
     * Devuelve los cursos y actividades vinculados a cada subcompetencia hija de una competencia principal.
     *
     * @param int $competencyid
     * @return array
     */
    public static function get_subcompetencies_courses($competencyid) {
        global $DB;

        // 1. Obtener subcompetencias hijas directas
        $sql_children = "
            SELECT c.id, c.shortname, c.idnumber, c.description, c.parentid, c.sortorder
              FROM {competency} c
             WHERE c.parentid = :competencyid
          ORDER BY c.sortorder ASC, c.shortname ASC
        ";
        $children = $DB->get_records_sql($sql_children, ['competencyid' => $competencyid]);
        if (empty($children)) {
            return [];
        }

        $subcomp_ids = array_map('intval', array_keys($children));
        list($insql, $params) = $DB->get_in_or_equal($subcomp_ids, SQL_PARAMS_NAMED, 'sc');

        // 2. Obtener todos los cursos vinculados a cualquiera de las subcompetencias
        $sql_courses = "
            SELECT cc.id AS linkid, cc.competencyid, c.id AS courseid, c.fullname, c.shortname, c.idnumber, c.visible, c.category,
                   COALESCE(cat.name, '') AS categoryname,
                   cc.ruleoutcome, cc.sortorder, cc.timecreated
              FROM {competency_coursecomp} cc
              JOIN {course} c ON c.id = cc.courseid
         LEFT JOIN {course_categories} cat ON cat.id = c.category
             WHERE cc.competencyid $insql
          ORDER BY cc.sortorder ASC, c.fullname ASC
        ";
        $course_records = $DB->get_records_sql($sql_courses, $params);

        // 3. Obtener actividades asociadas a cualquiera de las subcompetencias
        $sql_modules = "
            SELECT mc.id, mc.competencyid, mc.cmid, mc.ruleoutcome, mc.sortorder, mc.timecreated,
                   cm.course AS courseid, cm.module AS moduleid, m.name AS modname, cm.instance
              FROM {competency_modulecomp} mc
              JOIN {course_modules} cm ON cm.id = mc.cmid
              JOIN {modules} m ON m.id = cm.module
             WHERE mc.competencyid $insql
          ORDER BY mc.sortorder ASC, mc.id ASC
        ";
        $module_records = $DB->get_records_sql($sql_modules, $params);

        $modules_by_subcomp_course = [];
        $activity_names = self::resolve_module_activity_names($module_records);
        foreach ($module_records as $mr) {
            $activity_name = $activity_names[$mr->modname][$mr->instance] ?? '';
            if (empty($activity_name)) {
                $activity_name = ucfirst($mr->modname) . ' #' . $mr->instance;
            }

            $modules_by_subcomp_course[$mr->competencyid][$mr->courseid][] = [
                'id'          => (int)$mr->id,
                'cmid'        => (int)$mr->cmid,
                'modname'     => (string)$mr->modname,
                'name'        => $activity_name,
                'ruleoutcome' => (int)$mr->ruleoutcome,
                'sortorder'   => (int)$mr->sortorder,
                'timecreated' => (int)$mr->timecreated,
            ];
        }

        $courses_by_subcomp = [];
        foreach ($course_records as $cr) {
            $courses_by_subcomp[$cr->competencyid][] = [
                'id'           => (int)$cr->courseid,
                'fullname'     => (string)$cr->fullname,
                'shortname'    => (string)$cr->shortname,
                'idnumber'     => (string)($cr->idnumber ?? ''),
                'visible'      => (int)$cr->visible,
                'category'     => (int)$cr->category,
                'categoryname' => (string)($cr->categoryname ?? ''),
                'ruleoutcome'  => (int)$cr->ruleoutcome,
                'sortorder'    => (int)$cr->sortorder,
                'timecreated'  => (int)$cr->timecreated,
                'activities'   => $modules_by_subcomp_course[$cr->competencyid][$cr->courseid] ?? [],
            ];
        }

        $subcompetency_courses = [];
        foreach ($children as $child) {
            $subcompetency_courses[] = [
                'competencyid'       => (int)$child->id,
                'competencyname'     => (string)$child->shortname,
                'competencyidnumber' => (string)($child->idnumber ?? ''),
                'courses'            => $courses_by_subcomp[$child->id] ?? [],
            ];
        }

        return $subcompetency_courses;
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
        $activity_names = self::resolve_module_activity_names($records);
        foreach ($records as $r) {
            $name = $activity_names[$r->modname][$r->instance] ?? '';
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
     * Resuelve en lote los nombres de actividades por módulo e instancia para evitar N+1 queries.
     *
     * @param array $records Objetos que contienen propiedades modname e instance.
     * @return array Mapa asociativo [modname => [instance_id => name]]
     */
    private static function resolve_module_activity_names(array $records): array {
        global $DB;
        $instances_by_mod = [];
        foreach ($records as $r) {
            if (!empty($r->modname) && !empty($r->instance)) {
                $instances_by_mod[$r->modname][] = (int)$r->instance;
            }
        }

        $names = [];
        foreach ($instances_by_mod as $modname => $instances) {
            $unique_instances = array_values(array_unique($instances));
            if (empty($unique_instances)) {
                continue;
            }
            try {
                list($insql, $inparams) = $DB->get_in_or_equal($unique_instances, SQL_PARAMS_NAMED, 'inst');
                $items = $DB->get_records_select_menu($modname, "id $insql", $inparams, '', 'id, name');
                if (!empty($items)) {
                    foreach ($items as $instid => $name) {
                        $names[$modname][$instid] = (string)$name;
                    }
                }
            } catch (\Exception $e) {
                debugging("AdminerApi batch module name error for $modname: " . $e->getMessage(), DEBUG_DEVELOPER);
            }
        }
        return $names;
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
                debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
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
            debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
        }

        return true;
    }

    /**
     * Obtiene los usuarios vinculados a una competencia (a través de cursos asociados o registros de competencia),
     * junto con sus cursos matriculados, progreso y evidencias registradas.
     *
     * @param int $competencyid
     * @param string $search
     * @param string $status
     * @param int $courseid
     * @param int $page
     * @param int $perpage
     * @return array
     */
    public static function get_competency_users($competencyid, $search = '', $status = 'all', $courseid = 0, $page = 0, $perpage = 20, $sort = 'lastname', $dir = 'ASC') {
        global $DB;

        // 1. Obtener los IDs de cursos asociados a la competencia directa y sus subcompetencias
        $direct_course_ids = $DB->get_fieldset_select('competency_coursecomp', 'DISTINCT courseid', 'competencyid = :cid', ['cid' => $competencyid]) ?: [];
        $child_ids = $DB->get_fieldset_select('competency', 'id', 'parentid = :cid', ['cid' => $competencyid]) ?: [];
        $sub_course_ids = [];
        if (!empty($child_ids)) {
            list($ch_sql, $ch_params) = $DB->get_in_or_equal($child_ids, SQL_PARAMS_NAMED, 'ch');
            $sub_course_ids = $DB->get_fieldset_select('competency_coursecomp', 'DISTINCT courseid', "competencyid $ch_sql", $ch_params) ?: [];
        }
        $all_course_ids = array_values(array_unique(array_merge($direct_course_ids, $sub_course_ids)));

        if ($courseid > 0) {
            $relevant_course_ids = in_array($courseid, $all_course_ids) ? [$courseid] : [$courseid];
        } else {
            $relevant_course_ids = $all_course_ids;
        }

        // 2. Obtener escala de la competencia
        $scale_info = $DB->get_record_sql("
            SELECT s.id, s.name, s.scale
              FROM {competency} c
              JOIN {competency_framework} f ON f.id = c.competencyframeworkid
         LEFT JOIN {scale} s ON s.id = f.scaleid
             WHERE c.id = :cid
        ", ['cid' => $competencyid]);

        $scale_items = [];
        if (!empty($scale_info->scale)) {
            $scale_items = array_map('trim', explode(',', $scale_info->scale));
        }

        // 3. Obtener el universo de usuarios
        // A) Usuarios con registro en mdl_competency_usercomp
        $usercomp_records = $DB->get_records('competency_usercomp', ['competencyid' => $competencyid]);
        $usercomp_by_user = [];
        foreach ($usercomp_records as $uc) {
            $usercomp_by_user[$uc->userid] = $uc;
        }

        // B) Usuarios matriculados en los cursos relevantes
        $enrolled_user_ids = [];
        if (!empty($relevant_course_ids)) {
            list($rc_sql, $rc_params) = $DB->get_in_or_equal($relevant_course_ids, SQL_PARAMS_NAMED, 'rc');
            $enrolled_user_ids = $DB->get_fieldset_sql("
                SELECT DISTINCT ue.userid
                  FROM {enrol} e
                  JOIN {user_enrolments} ue ON ue.enrolid = e.id
                  JOIN {user} u ON u.id = ue.userid
                 WHERE e.courseid $rc_sql AND ue.status = 0 AND u.deleted = 0
            ", $rc_params) ?: [];
        }

        $all_user_ids = array_values(array_unique(array_merge(array_keys($usercomp_by_user), $enrolled_user_ids)));
        if (empty($all_user_ids)) {
            return [
                'totalcount' => 0,
                'page'       => (int)$page,
                'perpage'    => (int)$perpage,
                'users'      => [],
                'scale'      => [
                    'id'    => (int)($scale_info->id ?? 0),
                    'name'  => (string)($scale_info->name ?? 'Escala'),
                    'items' => $scale_items,
                ],
            ];
        }

        // 4. Filtrar por búsqueda y estado
        list($u_sql, $u_params) = $DB->get_in_or_equal($all_user_ids, SQL_PARAMS_NAMED, 'uid');
        $where_clauses = ["id $u_sql", "deleted = 0"];
        $params = $u_params;

        if (!empty($search)) {
            $like = '%' . $search . '%';
            $where_clauses[] = "(" . $DB->sql_like('firstname', ':s1', false, false) .
                               " OR " . $DB->sql_like('lastname', ':s2', false, false) .
                               " OR " . $DB->sql_like('email', ':s3', false, false) . ")";
            $params['s1'] = $like;
            $params['s2'] = $like;
            $params['s3'] = $like;
        }

        // Filtrado por status
        if ($status === 'proficient') {
            $proficient_uids = [];
            foreach ($usercomp_by_user as $uid => $uc) {
                if ((int)$uc->proficiency === 1) {
                    $proficient_uids[] = $uid;
                }
            }
            if (empty($proficient_uids)) {
                $where_clauses[] = "1 = 0";
            } else {
                list($p_sql, $p_params) = $DB->get_in_or_equal($proficient_uids, SQL_PARAMS_NAMED, 'prf');
                $where_clauses[] = "id $p_sql";
                $params = array_merge($params, $p_params);
            }
        } else if ($status === 'not_proficient') {
            $proficient_uids = [];
            foreach ($usercomp_by_user as $uid => $uc) {
                if ((int)$uc->proficiency === 1) {
                    $proficient_uids[] = $uid;
                }
            }
            if (!empty($proficient_uids)) {
                list($np_sql, $np_params) = $DB->get_in_or_equal($proficient_uids, SQL_PARAMS_NAMED, 'nprf');
                $where_clauses[] = "id NOT $np_sql";
                $params = array_merge($params, $np_params);
            }
        } else if ($status === 'in_review' || $status === 'pending_reviews' || $status === 'with_pending') {
            $review_uids = [];
            foreach ($usercomp_by_user as $uid => $uc) {
                if (in_array((int)$uc->status, [1, 2])) {
                    $review_uids[] = $uid;
                }
            }
            if (empty($review_uids)) {
                $where_clauses[] = "1 = 0";
            } else {
                list($rev_sql, $rev_params) = $DB->get_in_or_equal($review_uids, SQL_PARAMS_NAMED, 'rev');
                $where_clauses[] = "id $rev_sql";
                $params = array_merge($params, $rev_params);
            }
        }

        $where = implode(' AND ', $where_clauses);
        $totalcount = (int)$DB->count_records_select('user', $where, $params);

        $order_dir = strtoupper($dir) === 'DESC' ? 'DESC' : 'ASC';
        $order_by = "lastname $order_dir, firstname $order_dir";
        if ($sort === 'firstname' || $sort === 'fullname') {
            $order_by = "firstname $order_dir, lastname $order_dir";
        } else if ($sort === 'email') {
            $order_by = "email $order_dir";
        } else if ($sort === 'id') {
            $order_by = "id $order_dir";
        }

        $limitfrom = $page * $perpage;
        $users_records = $DB->get_records_select('user', $where, $params, $order_by, 'id, firstname, lastname, email, picture, imagealt', $limitfrom, $perpage);

        if (empty($users_records)) {
            return [
                'totalcount' => $totalcount,
                'page'       => (int)$page,
                'perpage'    => (int)$perpage,
                'users'      => [],
                'scale'      => [
                    'id'    => (int)($scale_info->id ?? 0),
                    'name'  => (string)($scale_info->name ?? 'Escala'),
                    'items' => $scale_items,
                ],
            ];
        }

        $page_user_ids = array_keys($users_records);

        // 5. Cargar información de cursos matriculados por usuario en los cursos relevantes
        $user_courses_map = [];
        if (!empty($all_course_ids)) {
            list($puid_sql, $puid_params) = $DB->get_in_or_equal($page_user_ids, SQL_PARAMS_NAMED, 'puid');
            list($acid_sql, $acid_params) = $DB->get_in_or_equal($all_course_ids, SQL_PARAMS_NAMED, 'acid');
            $enr_params = array_merge($puid_params, $acid_params);

            $sql_enr = "
                SELECT ue.userid, c.id AS courseid, c.fullname, c.shortname, c.enablecompletion,
                       COALESCE(ccmp.timecompleted, 0) AS timecompleted
                  FROM {enrol} e
                  JOIN {user_enrolments} ue ON ue.enrolid = e.id
                  JOIN {course} c ON c.id = e.courseid
             LEFT JOIN {course_completions} ccmp ON ccmp.userid = ue.userid AND ccmp.course = c.id
                 WHERE ue.userid $puid_sql AND e.courseid $acid_sql AND ue.status = 0
              ORDER BY c.fullname ASC
            ";
            $enrol_results = $DB->get_records_sql($sql_enr, $enr_params);

            // Obtener módulos completados por usuario y curso
            $sql_cm_done = "
                SELECT cmc.userid, cm.course, COUNT(DISTINCT cmc.coursemoduleid) AS donecount
                  FROM {course_modules_completion} cmc
                  JOIN {course_modules} cm ON cm.id = cmc.coursemoduleid
                 WHERE cmc.userid $puid_sql AND cm.course $acid_sql AND cmc.completionstate IN (1, 2)
              GROUP BY cmc.userid, cm.course
            ";
            $cm_dones = $DB->get_records_sql($sql_cm_done, $enr_params);
            $user_course_cm_done = [];
            foreach ($cm_dones as $cmd) {
                $user_course_cm_done[$cmd->userid . '_' . $cmd->course] = (int)$cmd->donecount;
            }

            // Total módulos con completitud por curso
            $sql_cm_total = "
                SELECT cm.course, COUNT(cm.id) AS totalcount
                  FROM {course_modules} cm
                 WHERE cm.course $acid_sql AND cm.completion > 0 AND cm.deletioninprogress = 0
              GROUP BY cm.course
            ";
            $cm_totals = $DB->get_records_sql_menu($sql_cm_total, $acid_params) ?: [];

            // Obtener evaluaciones por curso si existen (mdl_competency_usercompcourse)
            $ucc_records = $DB->get_records_select('competency_usercompcourse', "competencyid = :cid AND userid $puid_sql", array_merge(['cid' => $competencyid], $puid_params));
            $ucc_by_user_course = [];
            foreach ($ucc_records as $ucc) {
                $ucc_by_user_course[$ucc->userid . '_' . $ucc->courseid] = $ucc;
            }

            // Calcular avance para cada usuario en cada curso
            foreach ($enrol_results as $er) {
                $is_completed = (int)$er->timecompleted > 0;
                $ucc = $ucc_by_user_course[$er->userid . '_' . $er->courseid] ?? null;

                $progress = 0;
                if ($is_completed) {
                    $progress = 100;
                } else {
                    $total_mods = (int)($cm_totals[$er->courseid] ?? 0);
                    $done_mods = (int)($user_course_cm_done[$er->userid . '_' . $er->courseid] ?? 0);
                    if ($total_mods > 0) {
                        $progress = (int)round(($done_mods / $total_mods) * 100);
                    }
                }

                $user_courses_map[$er->userid][] = [
                    'courseid'     => (int)$er->courseid,
                    'fullname'     => (string)$er->fullname,
                    'shortname'    => (string)$er->shortname,
                    'completed'    => $is_completed ? 1 : 0,
                    'progress'     => $progress,
                    'proficiency'  => $ucc ? (int)$ucc->proficiency : 0,
                    'grade'        => $ucc ? (int)$ucc->grade : 0,
                ];
            }
        }

        // 6. Cargar evidencias de los usuarios de la página
        $page_usercomp_ids = [];
        $usercomp_to_userid = [];
        foreach ($page_user_ids as $puid) {
            if (isset($usercomp_by_user[$puid])) {
                $ucid = (int)$usercomp_by_user[$puid]->id;
                $page_usercomp_ids[] = $ucid;
                $usercomp_to_userid[$ucid] = $puid;
            }
        }

        $evidences_by_user = [];
        if (!empty($page_usercomp_ids)) {
            list($ev_sql, $ev_params) = $DB->get_in_or_equal($page_usercomp_ids, SQL_PARAMS_NAMED, 'evid');
            $sql_ev = "
                SELECT e.id, e.usercompetencyid, e.action, e.actionuserid, e.descidentifier,
                       e.note, e.grade, e.url, e.timecreated,
                       u.firstname, u.lastname
                  FROM {competency_evidence} e
             LEFT JOIN {user} u ON u.id = e.actionuserid
                 WHERE e.usercompetencyid $ev_sql
              ORDER BY e.timecreated DESC
            ";
            $ev_records = $DB->get_records_sql($sql_ev, $ev_params);
            foreach ($ev_records as $ev) {
                $target_uid = $usercomp_to_userid[$ev->usercompetencyid] ?? 0;
                if ($target_uid > 0) {
                    $grade_val = (int)($ev->grade ?? 0);
                    $grade_name = ($grade_val > 0 && isset($scale_items[$grade_val - 1])) ? $scale_items[$grade_val - 1] : '';

                    $action_name = 'Evidencia registrada';
                    switch ((int)$ev->action) {
                        case 0: $action_name = 'Evidencia manual'; break;
                        case 1: $action_name = 'Evidencia adjuntada'; break;
                        case 2: $action_name = 'Completado en curso'; break;
                        case 3: $action_name = 'Revisión / Calificación'; break;
                        default: $action_name = 'Registro de competencia'; break;
                    }

                    $author_name = !empty($ev->firstname) ? fullname($ev) : 'Sistema Moodle';

                    $evidences_by_user[$target_uid][] = [
                        'id'                 => (int)$ev->id,
                        'action'             => (int)$ev->action,
                        'actionname'         => $action_name,
                        'actionuserfullname' => $author_name,
                        'descidentifier'     => (string)($ev->descidentifier ?? ''),
                        'note'               => (string)($ev->note ?? ''),
                        'grade'              => $grade_val,
                        'gradename'          => $grade_name,
                        'url'                => (string)($ev->url ?? ''),
                        'timecreated'        => (int)$ev->timecreated,
                    ];
                }
            }
        }

        // 7. Revisiones pendientes por usuario
        $user_pending_map = [];
        if (!empty($page_user_ids)) {
            $comp_ids_to_check = array_merge([(int)$competencyid], $child_ids);
            list($chk_csql, $chk_cparams) = $DB->get_in_or_equal($comp_ids_to_check, SQL_PARAMS_NAMED, 'chkcomp');
            list($chk_usql, $chk_uparams) = $DB->get_in_or_equal($page_user_ids, SQL_PARAMS_NAMED, 'chku');
            $chk_params = array_merge($chk_cparams, $chk_uparams);
            $sql_pending = "
                SELECT userid, COUNT(id) AS cnt
                  FROM {competency_usercomp}
                 WHERE competencyid $chk_csql
                   AND userid $chk_usql
                   AND status IN (1, 2)
              GROUP BY userid
            ";
            try {
                $user_pending_map = $DB->get_records_sql_menu($sql_pending, $chk_params) ?: [];
            } catch (\Exception $e) {
                $user_pending_map = [];
            }
        }

        // 8. Ensamble de los usuarios
        $users_output = [];
        foreach ($users_records as $ur) {
            $uid = (int)$ur->id;
            $uc = $usercomp_by_user[$uid] ?? null;
            $user_courses = $user_courses_map[$uid] ?? [];
            $user_evidences = $evidences_by_user[$uid] ?? [];

            $grade_val = $uc ? (int)$uc->grade : 0;
            $grade_name = ($grade_val > 0 && isset($scale_items[$grade_val - 1])) ? $scale_items[$grade_val - 1] : '';

            // Progreso general en los cursos vinculados
            $completed_courses_count = 0;
            $total_course_progress = 0;
            foreach ($user_courses as $ucourse) {
                if ($ucourse['completed'] === 1) {
                    $completed_courses_count++;
                    $total_course_progress += 100;
                } else {
                    $total_course_progress += $ucourse['progress'];
                }
            }
            $avg_progress = !empty($user_courses) ? (int)round($total_course_progress / count($user_courses)) : 0;

            $pending_count = isset($user_pending_map[$uid])
                ? (int)$user_pending_map[$uid]
                : (($uc && in_array((int)$uc->status, [1, 2])) ? 1 : 0);

            $users_output[] = [
                'userid'                 => $uid,
                'fullname'               => trim(($ur->firstname ?? '') . ' ' . ($ur->lastname ?? '')),
                'email'                  => (string)$ur->email,
                'usercompid'             => $uc ? (int)$uc->id : 0,
                'status'                 => $uc ? (int)$uc->status : 0, // 0=idle, 1=waiting_for_review, 2=in_review
                'pendingreviewscount'    => $pending_count,
                'proficiency'            => $uc ? (int)$uc->proficiency : 0,
                'grade'                  => $grade_val,
                'gradename'              => $grade_name,
                'courses'                => $user_courses,
                'coursescount'           => count($user_courses),
                'completedcoursescount'  => $completed_courses_count,
                'progress'               => $avg_progress,
                'evidencescount'         => count($user_evidences),
                'evidences'              => $user_evidences,
            ];
        }

        return [
            'totalcount' => $totalcount,
            'page'       => (int)$page,
            'perpage'    => (int)$perpage,
            'users'      => $users_output,
            'scale'      => [
                'id'    => (int)($scale_info->id ?? 0),
                'name'  => (string)($scale_info->name ?? 'Escala'),
                'items' => $scale_items,
            ],
        ];
    }
}
