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
 * Competency framework repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

defined('MOODLE_INTERNAL') || die();

/**
 * Repository specialized in competency frameworks, scales, and global KPIs.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class competency_framework_repository {

    /**
     * Devuelve las escalas del sitio identificando la estándar por defecto.
     *
     * @return array
     */
    public static function get_scales(): array {
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
    public static function get_kpis(): array {
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
    public static function get_paginated_frameworks($page = 0, $perpage = 50, $sort = 'shortname', $dir = 'ASC', $search = '', $filters = []): array {
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
    public static function get_framework_detail($frameworkid, $search = ''): ?array {
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
            'pendingreviewscount'=> competency_review_repository::count_pending_reviews_by_framework((int)$framework->id),
            'competencies'       => $competencies,
        ];
    }
}
