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
 * External service for competencies in tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\external;

defined('MOODLE_INTERNAL') || die();

use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use tool_management_console\repository\competency_repository;

/**
 * Competencies external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class competencies extends external_api {

    /**
     * Helper para verificar permisos de visualización.
     */
    protected static function check_view_capability($context) {
        if (is_siteadmin()) {
            return;
        }
        if (has_capability('moodle/competency:competencymanage', $context) ||
            has_capability('moodle/competency:competencyview', $context)) {
            return;
        }
        throw new \moodle_exception('nopermissions', 'error', '', 'view competencies');
    }

    /**
     * Helper para verificar permisos de gestión.
     */
    protected static function check_manage_capability($context) {
        if (is_siteadmin()) {
            return;
        }
        require_capability('moodle/competency:competencymanage', $context);
    }

    // ==========================================
    // 1. GET SCALES
    // ==========================================
    public static function get_scales_parameters() {
        return new external_function_parameters([]);
    }

    public static function get_scales() {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        $scales = competency_repository::get_scales();
        return ['scales' => $scales];
    }

    public static function get_scales_returns() {
        return new external_single_structure([
            'scales' => new external_multiple_structure(
                new external_single_structure([
                    'id'        => new external_value(PARAM_INT, 'Scale ID'),
                    'name'      => new external_value(PARAM_TEXT, 'Scale name'),
                    'isdefault' => new external_value(PARAM_INT, '1 if this is the default standard scale'),
                    'items'     => new external_multiple_structure(new external_value(PARAM_TEXT, 'Scale grade label')),
                ])
            ),
        ]);
    }

    // ==========================================
    // 2. GET KPIS
    // ==========================================
    public static function get_competency_kpis_parameters() {
        return new external_function_parameters([]);
    }

    public static function get_competency_kpis() {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        return competency_repository::get_kpis();
    }

    public static function get_competency_kpis_returns() {
        return new external_single_structure([
            'total_frameworks'   => new external_value(PARAM_INT, 'Total frameworks count'),
            'visible_frameworks' => new external_value(PARAM_INT, 'Visible frameworks count'),
            'hidden_frameworks'  => new external_value(PARAM_INT, 'Hidden frameworks count'),
            'total_competencies' => new external_value(PARAM_INT, 'Total competencies count'),
            'pending_reviews'    => new external_value(PARAM_INT, 'Total pending competency reviews count', VALUE_DEFAULT, 0),
        ]);
    }

    // ==========================================
    // 3. GET FRAMEWORKS (PAGINATED)
    // ==========================================
    public static function get_competency_frameworks_parameters() {
        return new external_function_parameters([
            'page'    => new external_value(PARAM_INT, 'Page index', VALUE_DEFAULT, 0),
            'perpage' => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 50),
            'sort'    => new external_value(PARAM_ALPHA, 'Sort column', VALUE_DEFAULT, 'shortname'),
            'dir'     => new external_value(PARAM_ALPHA, 'Sort direction', VALUE_DEFAULT, 'ASC'),
            'search'  => new external_value(PARAM_TEXT, 'Search term', VALUE_DEFAULT, ''),
            'filters' => new external_value(PARAM_RAW, 'JSON filters', VALUE_DEFAULT, '{}'),
        ]);
    }

    public static function get_competency_frameworks($page = 0, $perpage = 50, $sort = 'shortname', $dir = 'ASC', $search = '', $filters = '{}') {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        $params = self::validate_parameters(self::get_competency_frameworks_parameters(), [
            'page'    => $page,
            'perpage' => $perpage,
            'sort'    => $sort,
            'dir'     => $dir,
            'search'  => $search,
            'filters' => $filters,
        ]);
        $params['perpage'] = min(max(1, $params['perpage']), 200);

        $decoded_filters = json_decode($params['filters'], true);
        if (!is_array($decoded_filters)) {
            $decoded_filters = [];
        }

        return competency_repository::get_paginated_frameworks(
            $params['page'],
            $params['perpage'],
            $params['sort'],
            $params['dir'],
            $params['search'],
            $decoded_filters
        );
    }

    public static function get_competency_frameworks_returns() {
        return new external_single_structure([
            'totalcount' => new external_value(PARAM_INT, 'Total frameworks count'),
            'page'       => new external_value(PARAM_INT, 'Current page index'),
            'perpage'    => new external_value(PARAM_INT, 'Items per page'),
            'frameworks' => new external_multiple_structure(
                new external_single_structure([
                    'id'                => new external_value(PARAM_INT, 'Framework ID'),
                    'shortname'         => new external_value(PARAM_TEXT, 'Framework short name'),
                    'idnumber'          => new external_value(PARAM_TEXT, 'Framework ID number'),
                    'description'       => new external_value(PARAM_RAW, 'Framework description'),
                    'visible'           => new external_value(PARAM_INT, 'Visibility (1 or 0)'),
                    'scaleid'           => new external_value(PARAM_INT, 'Associated scale ID'),
                    'scalename'         => new external_value(PARAM_TEXT, 'Associated scale name'),
                    'competenciescount' => new external_value(PARAM_INT, 'Number of competencies'),
                    'timecreated'       => new external_value(PARAM_INT, 'Creation timestamp'),
                    'timemodified'      => new external_value(PARAM_INT, 'Last modified timestamp'),
                ])
            ),
        ]);
    }

    // ==========================================
    // 4. FRAMEWORK ACTION (CREATE/EDIT/DELETE/TOGGLE)
    // ==========================================
    public static function competency_framework_action_parameters() {
        return new external_function_parameters([
            'action'      => new external_value(PARAM_ALPHANUMEXT, 'Action: create, edit, delete, toggle_visibility, hide, show'),
            'frameworkid' => new external_value(PARAM_INT, 'Framework ID (for edit/delete/toggle)', VALUE_DEFAULT, 0),
            'shortname'   => new external_value(PARAM_TEXT, 'Framework name', VALUE_DEFAULT, ''),
            'idnumber'    => new external_value(PARAM_TEXT, 'Framework ID number', VALUE_DEFAULT, ''),
            'description' => new external_value(PARAM_RAW, 'Description', VALUE_DEFAULT, ''),
            'scaleid'     => new external_value(PARAM_INT, 'Scale ID', VALUE_DEFAULT, 0),
            'visible'     => new external_value(PARAM_INT, 'Visibility 1/0', VALUE_DEFAULT, 1),
        ]);
    }

    /**
     * Perform competency framework mutation actions (create, edit, delete).
     *
     * @param string $action
     * @param int $frameworkid
     * @param string $shortname
     * @param string $idnumber
     * @param string $description
     * @param int $scaleid
     * @param int $visible
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function competency_framework_action($action, $frameworkid = 0, $shortname = '', $idnumber = '', $description = '', $scaleid = 0, $visible = 1) {
        global $DB, $USER;

        $context = context_system::instance();
        self::validate_context($context);
        self::check_manage_capability($context);

        $params = self::validate_parameters(self::competency_framework_action_parameters(), [
            'action'      => $action,
            'frameworkid' => $frameworkid,
            'shortname'   => $shortname,
            'idnumber'    => $idnumber,
            'description' => $description,
            'scaleid'     => $scaleid,
            'visible'     => $visible,
        ]);

        $act = $params['action'];
        $now = time();

        switch ($act) {
            case 'create':
                if (empty(trim($params['shortname']))) {
                    return ['success' => false, 'message' => 'El nombre del marco es obligatorio.', 'affectedcount' => 0];
                }

                // Resolver escala: si no viene dada o es 0, buscar la primera escala estándar
                $target_scaleid = $params['scaleid'];
                if (empty($target_scaleid)) {
                    $first_scale = $DB->get_record('scale', ['courseid' => 0], 'id ASC', 'id, scale');
                    $target_scaleid = $first_scale ? (int)$first_scale->id : 1;
                }

                // Generar scaleconfiguration por defecto según elementos de la escala
                $scale_rec = $DB->get_record('scale', ['id' => $target_scaleid]);
                $scale_config = [];
                if ($scale_rec && !empty($scale_rec->scale)) {
                    $items = array_map('trim', explode(',', $scale_rec->scale));
                    $item_count = count($items);
                    foreach ($items as $idx => $item) {
                        $val_id = $idx + 1;
                        $is_last = ($val_id === $item_count);
                        $scale_config[] = [
                            'scaleid'      => $target_scaleid,
                            'id'           => $val_id,
                            'scaledefault' => $is_last ? 1 : 0,
                            'proficient'   => $is_last ? 1 : 0,
                        ];
                    }
                }

                $record = new \stdClass();
                $record->shortname          = trim($params['shortname']);
                $record->idnumber           = trim($params['idnumber']);
                $record->description        = clean_text($params['description'], FORMAT_HTML);
                $record->descriptionformat  = FORMAT_HTML;
                $record->visible            = $params['visible'] ? 1 : 0;
                $record->scaleid            = $target_scaleid;
                $record->scaleconfiguration = json_encode($scale_config);
                $record->contextid          = $context->id;
                $record->taxonomies         = json_encode(['1' => 'competency']);
                $record->timecreated        = $now;
                $record->timemodified       = $now;
                $record->usermodified       = $USER->id;

                $newid = $DB->insert_record('competency_framework', $record);
                \tool_management_console\cache_manager::invalidate_kpis('competency_kpis');

                return [
                    'success'       => true,
                    'message'       => 'Marco de competencias creado exitosamente.',
                    'affectedcount' => (int)$newid,
                ];

            case 'edit':
                if (empty($params['frameworkid'])) {
                    return ['success' => false, 'message' => 'Se requiere el ID del marco a editar.', 'affectedcount' => 0];
                }
                if (empty(trim($params['shortname']))) {
                    return ['success' => false, 'message' => 'El nombre del marco es obligatorio.', 'affectedcount' => 0];
                }

                $existing = $DB->get_record('competency_framework', ['id' => $params['frameworkid']], '*', MUST_EXIST);

                $existing->shortname    = trim($params['shortname']);
                $existing->idnumber     = trim($params['idnumber']);
                $existing->description  = clean_text($params['description'], FORMAT_HTML);
                $existing->visible      = $params['visible'] ? 1 : 0;
                $existing->timemodified = $now;
                $existing->usermodified = $USER->id;

                if (!empty($params['scaleid']) && $params['scaleid'] != $existing->scaleid) {
                    $existing->scaleid = (int)$params['scaleid'];
                    $scale_rec = $DB->get_record('scale', ['id' => $existing->scaleid]);
                    if ($scale_rec && !empty($scale_rec->scale)) {
                        $items = array_map('trim', explode(',', $scale_rec->scale));
                        $item_count = count($items);
                        $scale_config = [];
                        foreach ($items as $idx => $item) {
                            $val_id = $idx + 1;
                            $is_last = ($val_id === $item_count);
                            $scale_config[] = [
                                'scaleid'      => $existing->scaleid,
                                'id'           => $val_id,
                                'scaledefault' => $is_last ? 1 : 0,
                                'proficient'   => $is_last ? 1 : 0,
                            ];
                        }
                        $existing->scaleconfiguration = json_encode($scale_config);
                    }
                }

                $DB->update_record('competency_framework', $existing);
                \tool_management_console\cache_manager::invalidate_kpis('competency_kpis');

                return [
                    'success'       => true,
                    'message'       => 'Marco de competencias actualizado exitosamente.',
                    'affectedcount' => 1,
                ];

            case 'toggle_visibility':
                if (empty($params['frameworkid'])) {
                    return ['success' => false, 'message' => 'Se requiere el ID del marco.', 'affectedcount' => 0];
                }
                $existing = $DB->get_record('competency_framework', ['id' => $params['frameworkid']], '*', MUST_EXIST);
                $existing->visible = $existing->visible ? 0 : 1;
                $existing->timemodified = $now;
                $existing->usermodified = $USER->id;
                $DB->update_record('competency_framework', $existing);
                \tool_management_console\cache_manager::invalidate_kpis('competency_kpis');

                return [
                    'success'       => true,
                    'message'       => 'Visibilidad del marco actualizada a ' . ($existing->visible ? 'visible' : 'oculto'),
                    'affectedcount' => (int)$existing->visible,
                ];

            case 'hide':
                if (empty($params['frameworkid'])) {
                    return ['success' => false, 'message' => 'Se requiere el ID del marco.', 'affectedcount' => 0];
                }
                $existing = $DB->get_record('competency_framework', ['id' => $params['frameworkid']], '*', MUST_EXIST);
                $existing->visible = 0;
                $existing->timemodified = $now;
                $existing->usermodified = $USER->id;
                $DB->update_record('competency_framework', $existing);
                \tool_management_console\cache_manager::invalidate_kpis('competency_kpis');

                return [
                    'success'       => true,
                    'message'       => 'Marco de competencias ocultado.',
                    'affectedcount' => 0,
                ];

            case 'show':
                if (empty($params['frameworkid'])) {
                    return ['success' => false, 'message' => 'Se requiere el ID del marco.', 'affectedcount' => 0];
                }
                $existing = $DB->get_record('competency_framework', ['id' => $params['frameworkid']], '*', MUST_EXIST);
                $existing->visible = 1;
                $existing->timemodified = $now;
                $existing->usermodified = $USER->id;
                $DB->update_record('competency_framework', $existing);
                \tool_management_console\cache_manager::invalidate_kpis('competency_kpis');

                return [
                    'success'       => true,
                    'message'       => 'Marco de competencias hecho visible.',
                    'affectedcount' => 1,
                ];

            case 'delete':
                if (empty($params['frameworkid'])) {
                    return ['success' => false, 'message' => 'Se requiere el ID del marco a eliminar.', 'affectedcount' => 0];
                }

                // Eliminar competencias del marco
                $DB->delete_records('competency', ['competencyframeworkid' => $params['frameworkid']]);
                // Eliminar el marco
                $DB->delete_records('competency_framework', ['id' => $params['frameworkid']]);
                \tool_management_console\cache_manager::invalidate_kpis('competency_kpis');

                return [
                    'success'       => true,
                    'message'       => 'Marco y competencias eliminados exitosamente.',
                    'affectedcount' => 1,
                ];

            default:
                return ['success' => false, 'message' => 'Acción no reconocida: ' . $act, 'affectedcount' => 0];
        }
    }

    public static function competency_framework_action_returns() {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message'       => new external_value(PARAM_TEXT, 'Status description message'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of records affected or new ID'),
        ]);
    }

    // ==========================================
    // 5. GET FRAMEWORK DETAIL + LEVEL 1 COMPETENCIES
    // ==========================================
    public static function get_competency_framework_detail_parameters() {
        return new external_function_parameters([
            'frameworkid' => new external_value(PARAM_INT, 'Framework ID'),
            'search'      => new external_value(PARAM_TEXT, 'Filter competencies by search term', VALUE_DEFAULT, ''),
        ]);
    }

    public static function get_competency_framework_detail($frameworkid, $search = '') {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        $params = self::validate_parameters(self::get_competency_framework_detail_parameters(), [
            'frameworkid' => $frameworkid,
            'search'      => $search,
        ]);

        $detail = competency_repository::get_framework_detail($params['frameworkid'], $params['search']);
        if (!$detail) {
            throw new \moodle_exception('invalidrecord', 'error', '', 'competency_framework');
        }

        return $detail;
    }

    public static function get_competency_framework_detail_returns() {
        return new external_single_structure([
            'id'                 => new external_value(PARAM_INT, 'Framework ID'),
            'shortname'          => new external_value(PARAM_TEXT, 'Framework short name'),
            'idnumber'           => new external_value(PARAM_TEXT, 'Framework ID number'),
            'description'        => new external_value(PARAM_RAW, 'Framework description'),
            'visible'            => new external_value(PARAM_INT, 'Visibility (1 or 0)'),
            'scaleid'            => new external_value(PARAM_INT, 'Associated scale ID'),
            'scalename'          => new external_value(PARAM_TEXT, 'Associated scale name'),
            'scaleconfiguration' => new external_value(PARAM_RAW, 'Scale configuration JSON'),
            'taxonomies'         => new external_value(PARAM_RAW, 'Taxonomies JSON'),
            'timecreated'        => new external_value(PARAM_INT, 'Creation timestamp'),
            'timemodified'       => new external_value(PARAM_INT, 'Last modified timestamp'),
            'competenciescount'  => new external_value(PARAM_INT, 'Number of Level 1 competencies'),
            'pendingreviewscount'=> new external_value(PARAM_INT, 'Number of pending reviews in framework', VALUE_DEFAULT, 0),
            'competencies'       => new external_multiple_structure(
                new external_single_structure([
                    'id'                  => new external_value(PARAM_INT, 'Competency ID'),
                    'shortname'           => new external_value(PARAM_TEXT, 'Competency name'),
                    'idnumber'            => new external_value(PARAM_TEXT, 'Competency ID number'),
                    'description'         => new external_value(PARAM_RAW, 'Competency description'),
                    'parentid'            => new external_value(PARAM_INT, 'Parent competency ID (0 for Level 1)'),
                    'parentname'          => new external_value(PARAM_TEXT, 'Parent competency name', VALUE_DEFAULT, ''),
                    'level'               => new external_value(PARAM_INT, 'Hierarchy level (1 for root, 2+ for subcompetencies)', VALUE_DEFAULT, 1),
                    'path'                => new external_value(PARAM_TEXT, 'Hierarchical path'),
                    'sortorder'           => new external_value(PARAM_INT, 'Sort order'),
                    'coursescount'        => new external_value(PARAM_INT, 'Number of linked courses', VALUE_DEFAULT, 0),
                    'childrencount'       => new external_value(PARAM_INT, 'Number of direct subcompetencies', VALUE_DEFAULT, 0),
                    'ruletype'            => new external_value(PARAM_RAW, 'Rule type classname', VALUE_DEFAULT, ''),
                    'ruleoutcome'         => new external_value(PARAM_INT, 'Rule outcome', VALUE_DEFAULT, 1),
                    'pendingreviewscount' => new external_value(PARAM_INT, 'Number of pending reviews for this competency', VALUE_DEFAULT, 0),
                    'timecreated'         => new external_value(PARAM_INT, 'Creation timestamp'),
                    'timemodified'        => new external_value(PARAM_INT, 'Last modified timestamp'),
                ])
            ),
        ]);
    }

    // ==========================================
    // 6. COMPETENCY ACTION (CREATE/EDIT/DELETE/UPDATE_RULE)
    // ==========================================
    public static function competency_action_parameters() {
        return new external_function_parameters([
            'action'       => new external_value(PARAM_ALPHANUMEXT, 'Action: create, edit, delete, update_rule'),
            'competencyid' => new external_value(PARAM_INT, 'Competency ID (for edit/delete/update_rule)', VALUE_DEFAULT, 0),
            'frameworkid'  => new external_value(PARAM_INT, 'Framework ID (required for create)', VALUE_DEFAULT, 0),
            'parentid'     => new external_value(PARAM_INT, 'Parent competency ID (0 for root/level 1)', VALUE_DEFAULT, 0),
            'shortname'    => new external_value(PARAM_TEXT, 'Competency name', VALUE_DEFAULT, ''),
            'idnumber'     => new external_value(PARAM_TEXT, 'Competency ID number', VALUE_DEFAULT, ''),
            'description'  => new external_value(PARAM_RAW, 'Description', VALUE_DEFAULT, ''),
            'ruletype'     => new external_value(PARAM_RAW, 'Rule type classname or empty for none', VALUE_DEFAULT, ''),
            'ruleoutcome'  => new external_value(PARAM_INT, 'Rule outcome (0=None, 1=Evidence, 2=Complete, 3=Recommend)', VALUE_DEFAULT, 1),
            'ruleconfig'   => new external_value(PARAM_RAW, 'Rule configuration JSON', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Perform competency item mutation actions (create, edit, delete, move).
     *
     * @param string $action
     * @param int $competencyid
     * @param int $frameworkid
     * @param int $parentid
     * @param string $shortname
     * @param string $idnumber
     * @param string $description
     * @param string $ruletype
     * @param int $ruleoutcome
     * @param string $ruleconfig
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function competency_action($action, $competencyid = 0, $frameworkid = 0, $parentid = 0, $shortname = '', $idnumber = '', $description = '', $ruletype = '', $ruleoutcome = 1, $ruleconfig = '') {
        global $DB, $USER;

        $context = context_system::instance();
        self::validate_context($context);
        self::check_manage_capability($context);

        $params = self::validate_parameters(self::competency_action_parameters(), [
            'action'       => $action,
            'competencyid' => $competencyid,
            'frameworkid'  => $frameworkid,
            'parentid'     => $parentid,
            'shortname'    => $shortname,
            'idnumber'     => $idnumber,
            'description'  => $description,
            'ruletype'     => $ruletype,
            'ruleoutcome'  => $ruleoutcome,
            'ruleconfig'   => $ruleconfig,
        ]);

        $act = $params['action'];
        $now = time();

        switch ($act) {
            case 'create':
                if (empty($params['frameworkid'])) {
                    return ['success' => false, 'message' => 'Se requiere el ID del marco para crear la competencia.', 'affectedcount' => 0];
                }
                if (empty(trim($params['shortname']))) {
                    return ['success' => false, 'message' => 'El nombre de la competencia es obligatorio.', 'affectedcount' => 0];
                }

                // Comprobar que el marco existe
                $framework = $DB->get_record('competency_framework', ['id' => $params['frameworkid']], '*', MUST_EXIST);

                // Resolver jerarquía del padre si viene especificado
                $parent = null;
                $target_parentid = (int)$params['parentid'];
                if ($target_parentid > 0) {
                    $parent = $DB->get_record('competency', [
                        'id'                    => $target_parentid,
                        'competencyframeworkid' => $framework->id,
                    ], '*', MUST_EXIST);
                    if ((int)$parent->parentid > 0) {
                        return [
                            'success'       => false,
                            'message'       => 'Solo se permiten 2 niveles de jerarquía. La competencia seleccionada ya es una subcompetencia.',
                            'affectedcount' => 0,
                        ];
                    }
                }

                // Calcular siguiente sortorder entre hermanos
                $max_sort = (int)$DB->get_field_sql(
                    "SELECT MAX(sortorder) FROM {competency} WHERE competencyframeworkid = :fid AND parentid = :pid",
                    ['fid' => $framework->id, 'pid' => $target_parentid]
                );

                $record = new \stdClass();
                $record->shortname             = trim($params['shortname']);
                $record->idnumber              = trim($params['idnumber']);
                $record->description           = clean_text($params['description'], FORMAT_HTML);
                $record->descriptionformat     = FORMAT_HTML;
                $record->competencyframeworkid = $framework->id;
                $record->parentid              = $target_parentid;
                $record->path                  = $parent ? $parent->path : '/0/';
                $record->sortorder             = $max_sort + 1;
                $record->ruletype              = !empty($params['ruletype']) ? trim($params['ruletype']) : null;
                $record->ruleoutcome           = (int)($params['ruleoutcome'] ?? 1);
                $record->ruleconfig            = !empty($params['ruleconfig']) ? trim($params['ruleconfig']) : null;
                $record->scaleid               = null;
                $record->scaleconfiguration    = null;
                $record->timecreated           = $now;
                $record->timemodified          = $now;
                $record->usermodified          = $USER->id;

                $newid = $DB->insert_record('competency', $record);

                // Construir path canónico /0/id/ o /0/parent/id/
                $newpath = $parent ? ($parent->path . $newid . '/') : ('/0/' . $newid . '/');
                $DB->set_field('competency', 'path', $newpath, ['id' => $newid]);

                // Actualizar timestamp en el marco
                $DB->set_field('competency_framework', 'timemodified', $now, ['id' => $framework->id]);

                return [
                    'success'       => true,
                    'message'       => $target_parentid > 0 ? 'Subcompetencia creada exitosamente.' : 'Competencia creada exitosamente.',
                    'affectedcount' => (int)$newid,
                ];

            case 'edit':
                if (empty($params['competencyid'])) {
                    return ['success' => false, 'message' => 'Se requiere el ID de la competencia a editar.', 'affectedcount' => 0];
                }
                if (empty(trim($params['shortname']))) {
                    return ['success' => false, 'message' => 'El nombre de la competencia es obligatorio.', 'affectedcount' => 0];
                }

                $existing = $DB->get_record('competency', ['id' => $params['competencyid']], '*', MUST_EXIST);
                $existing->shortname    = trim($params['shortname']);
                $existing->idnumber     = trim($params['idnumber']);
                $existing->description  = clean_text($params['description'], FORMAT_HTML);
                if (isset($params['ruletype'])) {
                    $existing->ruletype = !empty($params['ruletype']) ? trim($params['ruletype']) : null;
                }
                if (isset($params['ruleoutcome'])) {
                    $existing->ruleoutcome = (int)$params['ruleoutcome'];
                }
                if (isset($params['ruleconfig'])) {
                    $existing->ruleconfig = !empty($params['ruleconfig']) ? trim($params['ruleconfig']) : null;
                }

                // Si se modifica el parentid, recalcular path y jerarquía de descendientes
                if (isset($params['parentid']) && (int)$params['parentid'] !== (int)$existing->parentid) {
                    $new_parentid = (int)$params['parentid'];
                    if ($new_parentid === (int)$existing->id) {
                        return ['success' => false, 'message' => 'Una competencia no puede ser padre de sí misma.', 'affectedcount' => 0];
                    }
                    if ($new_parentid > 0) {
                        // Comprobar si la competencia actual tiene subcompetencias
                        $has_children = $DB->record_exists('competency', ['parentid' => $existing->id]);
                        if ($has_children) {
                            return [
                                'success'       => false,
                                'message'       => 'Esta competencia tiene subcompetencias asociadas y no puede convertirse en subcompetencia.',
                                'affectedcount' => 0,
                            ];
                        }

                        $parent = $DB->get_record('competency', [
                            'id'                    => $new_parentid,
                            'competencyframeworkid' => $existing->competencyframeworkid,
                        ], '*', MUST_EXIST);

                        if ((int)$parent->parentid > 0) {
                            return [
                                'success'       => false,
                                'message'       => 'Solo se permiten 2 niveles de jerarquía. La competencia seleccionada ya es una subcompetencia.',
                                'affectedcount' => 0,
                            ];
                        }
                    }
                    $oldpath = $existing->path;
                    if ($new_parentid > 0) {
                        if (!empty($parent->path) && strpos($parent->path, $oldpath) === 0) {
                            return ['success' => false, 'message' => 'No se puede mover una competencia dentro de sus propias subcompetencias.', 'affectedcount' => 0];
                        }
                        $newpath = $parent->path . $existing->id . '/';
                    } else {
                        $newpath = '/0/' . $existing->id . '/';
                    }
                    $existing->parentid = $new_parentid;
                    $existing->path = $newpath;

                    // Actualizar paths de descendientes recursivamente
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
                $existing->usermodified = $USER->id;

                $DB->update_record('competency', $existing);
                $DB->set_field('competency_framework', 'timemodified', $now, ['id' => $existing->competencyframeworkid]);

                return [
                    'success'       => true,
                    'message'       => 'Competencia actualizada exitosamente.',
                    'affectedcount' => 1,
                ];

            case 'update_rule':
                if (empty($params['competencyid'])) {
                    return ['success' => false, 'message' => 'Se requiere el ID de la competencia para actualizar la regla.', 'affectedcount' => 0];
                }

                $existing = $DB->get_record('competency', ['id' => $params['competencyid']], '*', MUST_EXIST);
                $existing->ruletype     = !empty($params['ruletype']) ? trim($params['ruletype']) : null;
                $existing->ruleoutcome  = (int)($params['ruleoutcome'] ?? 2);
                $existing->ruleconfig   = !empty($params['ruleconfig']) ? trim($params['ruleconfig']) : null;
                $existing->timemodified = $now;
                $existing->usermodified = $USER->id;

                $DB->update_record('competency', $existing);
                $DB->set_field('competency_framework', 'timemodified', $now, ['id' => $existing->competencyframeworkid]);

                return [
                    'success'       => true,
                    'message'       => 'Regla de completado actualizada exitosamente.',
                    'affectedcount' => (int)$existing->id,
                ];

            case 'delete':
                if (empty($params['competencyid'])) {
                    return ['success' => false, 'message' => 'Se requiere el ID de la competencia a eliminar.', 'affectedcount' => 0];
                }

                $existing = $DB->get_record('competency', ['id' => $params['competencyid']], '*', MUST_EXIST);
                $fid = $existing->competencyframeworkid;

                // Eliminar competencia y posibles hijas jerárquicas
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
                return ['success' => false, 'message' => 'Acción no reconocida: ' . $act, 'affectedcount' => 0];
        }
    }

    public static function competency_action_returns() {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message'       => new external_value(PARAM_TEXT, 'Status description message'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of records affected or new ID'),
        ]);
    }

    // ==========================================
    // 7. GET COMPETENCY DETAIL
    // ==========================================
    public static function get_competency_detail_parameters() {
        return new external_function_parameters([
            'competencyid' => new external_value(PARAM_INT, 'Competency ID'),
        ]);
    }

    public static function get_competency_detail($competencyid) {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        $params = self::validate_parameters(self::get_competency_detail_parameters(), [
            'competencyid' => $competencyid,
        ]);

        $detail = competency_repository::get_competency_detail($params['competencyid']);
        if (!$detail) {
            throw new \moodle_exception('invalidrecord', 'error', '', 'competency');
        }

        return $detail;
    }

    public static function get_competency_detail_returns() {
        return new external_single_structure([
            'id'                    => new external_value(PARAM_INT, 'Competency ID'),
            'shortname'             => new external_value(PARAM_TEXT, 'Competency short name'),
            'idnumber'              => new external_value(PARAM_TEXT, 'Competency ID number'),
            'description'           => new external_value(PARAM_RAW, 'Competency description'),
            'parentid'              => new external_value(PARAM_INT, 'Parent competency ID'),
            'parentname'            => new external_value(PARAM_TEXT, 'Parent competency name', VALUE_DEFAULT, ''),
            'path'                  => new external_value(PARAM_TEXT, 'Hierarchy path'),
            'sortorder'             => new external_value(PARAM_INT, 'Sort order'),
            'competencyframeworkid' => new external_value(PARAM_INT, 'Framework ID'),
            'frameworkname'         => new external_value(PARAM_TEXT, 'Framework name'),
            'frameworkidnumber'     => new external_value(PARAM_TEXT, 'Framework ID number'),
            'frameworkvisible'      => new external_value(PARAM_INT, 'Framework visibility'),
            'scaleid'               => new external_value(PARAM_INT, 'Scale ID'),
            'scalename'             => new external_value(PARAM_TEXT, 'Scale name'),
            'ruletype'              => new external_value(PARAM_RAW, 'Rule type classname', VALUE_DEFAULT, ''),
            'ruleoutcome'           => new external_value(PARAM_INT, 'Rule outcome (0=None, 1=Evidence, 2=Complete, 3=Recommend)', VALUE_DEFAULT, 1),
            'ruleconfig'            => new external_value(PARAM_RAW, 'Rule configuration JSON', VALUE_DEFAULT, ''),
            'childrencount'         => new external_value(PARAM_INT, 'Number of direct children subcompetencies', VALUE_DEFAULT, 0),
            'pendingreviewscount'   => new external_value(PARAM_INT, 'Pending reviews count', VALUE_DEFAULT, 0),
            'timecreated'           => new external_value(PARAM_INT, 'Time created'),
            'timemodified'          => new external_value(PARAM_INT, 'Time modified'),
            'children'              => new external_multiple_structure(
                new external_single_structure([
                    'id'                  => new external_value(PARAM_INT, 'Subcompetency ID'),
                    'shortname'           => new external_value(PARAM_TEXT, 'Subcompetency short name'),
                    'idnumber'            => new external_value(PARAM_TEXT, 'Subcompetency ID number'),
                    'description'         => new external_value(PARAM_RAW, 'Subcompetency description'),
                    'parentid'            => new external_value(PARAM_INT, 'Parent ID'),
                    'path'                => new external_value(PARAM_TEXT, 'Path'),
                    'sortorder'           => new external_value(PARAM_INT, 'Sort order'),
                    'coursescount'        => new external_value(PARAM_INT, 'Linked courses count', VALUE_DEFAULT, 0),
                    'childrencount'       => new external_value(PARAM_INT, 'Nested subcompetencies count', VALUE_DEFAULT, 0),
                    'ruletype'            => new external_value(PARAM_RAW, 'Rule type classname', VALUE_DEFAULT, ''),
                    'ruleoutcome'         => new external_value(PARAM_INT, 'Rule outcome', VALUE_DEFAULT, 1),
                    'pendingreviewscount' => new external_value(PARAM_INT, 'Pending reviews count', VALUE_DEFAULT, 0),
                    'timecreated'         => new external_value(PARAM_INT, 'Time created'),
                    'timemodified'        => new external_value(PARAM_INT, 'Time modified'),
                ]),
                'Direct subcompetencies list',
                VALUE_DEFAULT,
                []
            ),
        ]);
    }

    // ==========================================
    // 8. GET COMPETENCY COURSES & ACTIVITIES
    // ==========================================
    public static function get_competency_courses_parameters() {
        return new external_function_parameters([
            'competencyid'           => new external_value(PARAM_INT, 'Competency ID'),
            'includesubcompetencies' => new external_value(PARAM_BOOL, 'Include courses from child subcompetencies', VALUE_DEFAULT, true),
        ]);
    }

    public static function get_competency_courses($competencyid, $includesubcompetencies = true) {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        $params = self::validate_parameters(self::get_competency_courses_parameters(), [
            'competencyid'           => $competencyid,
            'includesubcompetencies' => $includesubcompetencies,
        ]);

        $courses = competency_repository::get_competency_courses($params['competencyid']);
        $subcompetencycourses = [];
        if (!empty($params['includesubcompetencies'])) {
            $subcompetencycourses = competency_repository::get_subcompetencies_courses($params['competencyid']);
        }

        return [
            'courses'              => $courses,
            'subcompetencycourses' => $subcompetencycourses,
        ];
    }

    public static function get_competency_courses_returns() {
        return new external_single_structure([
            'courses' => new external_multiple_structure(
                new external_single_structure([
                    'id'           => new external_value(PARAM_INT, 'Course ID'),
                    'fullname'     => new external_value(PARAM_TEXT, 'Course full name'),
                    'shortname'    => new external_value(PARAM_TEXT, 'Course short name'),
                    'idnumber'     => new external_value(PARAM_RAW, 'Course ID number'),
                    'visible'      => new external_value(PARAM_INT, 'Course visibility'),
                    'category'     => new external_value(PARAM_INT, 'Category ID'),
                    'categoryname' => new external_value(PARAM_TEXT, 'Category name'),
                    'ruleoutcome'  => new external_value(PARAM_INT, 'Rule outcome on completion'),
                    'sortorder'    => new external_value(PARAM_INT, 'Sort order in course'),
                    'timecreated'  => new external_value(PARAM_INT, 'Linked time timestamp'),
                    'activities'   => new external_multiple_structure(
                        new external_single_structure([
                            'id'          => new external_value(PARAM_INT, 'Module competency ID'),
                            'cmid'        => new external_value(PARAM_INT, 'Course module ID'),
                            'modname'     => new external_value(PARAM_TEXT, 'Module type name'),
                            'name'        => new external_value(PARAM_TEXT, 'Activity title'),
                            'ruleoutcome' => new external_value(PARAM_INT, 'Rule outcome on activity completion'),
                            'sortorder'   => new external_value(PARAM_INT, 'Sort order'),
                            'timecreated' => new external_value(PARAM_INT, 'Linked timestamp'),
                        ]),
                        'Linked activities within this course',
                        VALUE_DEFAULT,
                        []
                    ),
                ])
            ),
            'subcompetencycourses' => new external_multiple_structure(
                new external_single_structure([
                    'competencyid'       => new external_value(PARAM_INT, 'Subcompetency ID'),
                    'competencyname'     => new external_value(PARAM_TEXT, 'Subcompetency name'),
                    'competencyidnumber' => new external_value(PARAM_RAW, 'Subcompetency ID number'),
                    'courses'            => new external_multiple_structure(
                        new external_single_structure([
                            'id'           => new external_value(PARAM_INT, 'Course ID'),
                            'fullname'     => new external_value(PARAM_TEXT, 'Course full name'),
                            'shortname'    => new external_value(PARAM_TEXT, 'Course short name'),
                            'idnumber'     => new external_value(PARAM_RAW, 'Course ID number'),
                            'visible'      => new external_value(PARAM_INT, 'Course visibility'),
                            'category'     => new external_value(PARAM_INT, 'Category ID'),
                            'categoryname' => new external_value(PARAM_TEXT, 'Category name'),
                            'ruleoutcome'  => new external_value(PARAM_INT, 'Rule outcome on completion'),
                            'sortorder'    => new external_value(PARAM_INT, 'Sort order in course'),
                            'timecreated'  => new external_value(PARAM_INT, 'Linked time timestamp'),
                            'activities'   => new external_multiple_structure(
                                new external_single_structure([
                                    'id'          => new external_value(PARAM_INT, 'Module competency ID'),
                                    'cmid'        => new external_value(PARAM_INT, 'Course module ID'),
                                    'modname'     => new external_value(PARAM_TEXT, 'Module type name'),
                                    'name'        => new external_value(PARAM_TEXT, 'Activity title'),
                                    'ruleoutcome' => new external_value(PARAM_INT, 'Rule outcome on activity completion'),
                                    'sortorder'   => new external_value(PARAM_INT, 'Sort order'),
                                    'timecreated' => new external_value(PARAM_INT, 'Linked timestamp'),
                                ]),
                                'Linked activities within this course',
                                VALUE_DEFAULT,
                                []
                            ),
                        ]),
                        'Courses linked to this subcompetency',
                        VALUE_DEFAULT,
                        []
                    ),
                ]),
                'Courses grouped by child subcompetency',
                VALUE_DEFAULT,
                []
            ),
        ]);
    }

    // ==========================================
    // 9. COMPETENCY COURSE ACTION (ADD/REMOVE/UPDATE_RULE)
    // ==========================================
    public static function competency_course_action_parameters() {
        return new external_function_parameters([
            'action'       => new external_value(PARAM_ALPHANUMEXT, 'Action: add, remove, update_rule'),
            'competencyid' => new external_value(PARAM_INT, 'Competency ID'),
            'courseids'    => new external_multiple_structure(new external_value(PARAM_INT, 'Course ID'), 'Array of course IDs'),
            'ruleoutcome'  => new external_value(PARAM_INT, 'Rule outcome on completion (default 1)', VALUE_DEFAULT, 1),
        ]);
    }

    /**
     * Perform competency-course link actions (add, remove).
     *
     * @param string $action
     * @param int $competencyid
     * @param array $courseids
     * @param int $ruleoutcome
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function competency_course_action($action, $competencyid, $courseids, $ruleoutcome = 1) {
        global $DB, $USER;

        $context = context_system::instance();
        self::validate_context($context);
        self::check_manage_capability($context);

        $params = self::validate_parameters(self::competency_course_action_parameters(), [
            'action'       => $action,
            'competencyid' => $competencyid,
            'courseids'    => $courseids,
            'ruleoutcome'  => $ruleoutcome,
        ]);

        $competency = $DB->get_record('competency', ['id' => $params['competencyid']], '*', MUST_EXIST);
        $act = $params['action'];
        $now = time();
        $affected = 0;

        switch ($act) {
            case 'add':
                foreach ($params['courseids'] as $cid) {
                    $cid = (int)$cid;
                    if ($cid <= 0 || $cid == SITEID) {
                        continue;
                    }
                    if (!$DB->record_exists('course', ['id' => $cid])) {
                        continue;
                    }
                    if (!$DB->record_exists('competency_coursecomp', ['competencyid' => $competency->id, 'courseid' => $cid])) {
                        $inserted = false;
                        if (class_exists('\core_competency\course_competency')) {
                            try {
                                $cc = new \core_competency\course_competency(0, (object)[
                                    'courseid'     => $cid,
                                    'competencyid' => $competency->id,
                                    'ruleoutcome'  => (int)$params['ruleoutcome'],
                                ]);
                                $cc->create();
                                $inserted = true;
                                $affected++;
                            } catch (\Exception $e) {
                                $inserted = false;
                            }
                        }

                        if (!$inserted) {
                            $max_sort = (int)$DB->count_records('competency_coursecomp', ['courseid' => $cid]);
                            $record = new \stdClass();
                            $record->courseid     = $cid;
                            $record->competencyid = $competency->id;
                            $record->ruleoutcome  = (int)$params['ruleoutcome'];
                            $record->sortorder    = $max_sort;
                            $record->timecreated  = $now;
                            $record->timemodified = $now;
                            $record->usermodified = !empty($USER->id) ? (int)$USER->id : 2;

                            $DB->insert_record('competency_coursecomp', $record);
                            $affected++;
                        }
                    }
                }

                return [
                    'success'       => true,
                    'message'       => "Se vincularon {$affected} curso(s) a la competencia.",
                    'affectedcount' => $affected,
                ];

            case 'remove':
                foreach ($params['courseids'] as $cid) {
                    $cid = (int)$cid;
                    if ($cid <= 0) {
                        continue;
                    }
                    $deleted = false;
                    if (class_exists('\core_competency\course_competency')) {
                        try {
                            $cc = \core_competency\course_competency::get_record([
                                'courseid'     => $cid,
                                'competencyid' => $competency->id,
                            ]);
                            if ($cc) {
                                $cc->delete();
                                $deleted = true;
                                $affected++;
                            }
                        } catch (\Exception $e) {
                            $deleted = false;
                        }
                    }
                    if (!$deleted) {
                        $DB->delete_records('competency_coursecomp', [
                            'competencyid' => $competency->id,
                            'courseid'     => $cid,
                        ]);
                        $affected++;
                    }
                }

                return [
                    'success'       => true,
                    'message'       => "Se desvincularon {$affected} curso(s) de la competencia.",
                    'affectedcount' => $affected,
                ];

            case 'update_rule':
                foreach ($params['courseids'] as $cid) {
                    $cid = (int)$cid;
                    if ($cid <= 0) {
                        continue;
                    }
                    $updated = false;
                    if (class_exists('\core_competency\course_competency')) {
                        try {
                            $cc = \core_competency\course_competency::get_record([
                                'courseid'     => $cid,
                                'competencyid' => $competency->id,
                            ]);
                            if ($cc) {
                                $cc->set('ruleoutcome', (int)$params['ruleoutcome']);
                                $cc->update();
                                $updated = true;
                                $affected++;
                            }
                        } catch (\Exception $e) {
                            $updated = false;
                        }
                    }
                    if (!$updated) {
                        $DB->set_field('competency_coursecomp', 'ruleoutcome', (int)$params['ruleoutcome'], [
                            'competencyid' => $competency->id,
                            'courseid'     => $cid,
                        ]);
                        $affected++;
                    }
                }

                return [
                    'success'       => true,
                    'message'       => "Regla de finalización del curso actualizada correctamente.",
                    'affectedcount' => $affected,
                ];

            default:
                return ['success' => false, 'message' => 'Acción no reconocida: ' . $act, 'affectedcount' => 0];
        }
    }

    public static function competency_course_action_returns() {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message'       => new external_value(PARAM_TEXT, 'Status description message'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of records affected'),
        ]);
    }

    // ==========================================
    // 10. GET COURSE AVAILABLE ACTIVITIES
    // ==========================================
    public static function get_course_available_activities_parameters() {
        return new external_function_parameters([
            'courseid'     => new external_value(PARAM_INT, 'Course ID'),
            'competencyid' => new external_value(PARAM_INT, 'Competency ID', VALUE_DEFAULT, 0),
        ]);
    }

    public static function get_course_available_activities($courseid, $competencyid = 0) {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        $params = self::validate_parameters(self::get_course_available_activities_parameters(), [
            'courseid'     => $courseid,
            'competencyid' => $competencyid,
        ]);

        $activities = competency_repository::get_course_available_activities($params['courseid'], $params['competencyid']);
        return ['activities' => $activities];
    }

    public static function get_course_available_activities_returns() {
        return new external_single_structure([
            'activities' => new external_multiple_structure(
                new external_single_structure([
                    'cmid'        => new external_value(PARAM_INT, 'Course module ID'),
                    'courseid'    => new external_value(PARAM_INT, 'Course ID'),
                    'modname'     => new external_value(PARAM_TEXT, 'Module name'),
                    'name'        => new external_value(PARAM_TEXT, 'Activity title'),
                    'visible'     => new external_value(PARAM_INT, 'Visibility (1 or 0)'),
                    'section'     => new external_value(PARAM_INT, 'Section number'),
                    'islinked'    => new external_value(PARAM_INT, '1 if linked to competency, 0 otherwise'),
                    'linkid'      => new external_value(PARAM_INT, 'Link ID if linked'),
                    'ruleoutcome' => new external_value(PARAM_INT, 'Rule outcome on completion'),
                ])
            ),
        ]);
    }

    // ==========================================
    // 11. MODULE COMPETENCY ACTION (ADD/REMOVE/UPDATE_RULE)
    // ==========================================
    public static function module_competency_action_parameters() {
        return new external_function_parameters([
            'action'       => new external_value(PARAM_ALPHANUMEXT, 'Action: add, remove, update_rule'),
            'competencyid' => new external_value(PARAM_INT, 'Competency ID'),
            'cmid'         => new external_value(PARAM_INT, 'Course module ID'),
            'ruleoutcome'  => new external_value(PARAM_INT, 'Rule outcome on completion (default 1)', VALUE_DEFAULT, 1),
        ]);
    }

    /**
     * Perform module-competency link actions (add, remove, update_rule).
     *
     * @param string $action
     * @param int $competencyid
     * @param int $cmid
     * @param int $ruleoutcome
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function module_competency_action($action, $competencyid, $cmid, $ruleoutcome = 1) {
        global $DB, $USER;

        $context = context_system::instance();
        self::validate_context($context);
        self::check_manage_capability($context);

        $params = self::validate_parameters(self::module_competency_action_parameters(), [
            'action'       => $action,
            'competencyid' => $competencyid,
            'cmid'         => $cmid,
            'ruleoutcome'  => $ruleoutcome,
        ]);

        $competency = $DB->get_record('competency', ['id' => $params['competencyid']], '*', MUST_EXIST);
        $cm = $DB->get_record('course_modules', ['id' => $params['cmid']], '*', MUST_EXIST);

        $act = $params['action'];
        $now = time();

        switch ($act) {
            case 'add':
                if (!$DB->record_exists('competency_modulecomp', ['competencyid' => $competency->id, 'cmid' => $cm->id])) {
                    $inserted = false;
                    if (class_exists('\core_competency\course_module_competency')) {
                        try {
                            $mc = new \core_competency\course_module_competency(0, (object)[
                                'cmid'         => $cm->id,
                                'competencyid' => $competency->id,
                                'ruleoutcome'  => (int)$params['ruleoutcome'],
                            ]);
                            $mc->create();
                            $inserted = true;
                        } catch (\Exception $e) {
                            $inserted = false;
                        }
                    }

                    if (!$inserted) {
                        $max_sort = (int)$DB->count_records('competency_modulecomp', ['cmid' => $cm->id]);
                        $record = new \stdClass();
                        $record->cmid         = $cm->id;
                        $record->competencyid = $competency->id;
                        $record->ruleoutcome  = (int)$params['ruleoutcome'];
                        $record->sortorder    = $max_sort;
                        $record->timecreated  = $now;
                        $record->timemodified = $now;
                        $record->usermodified = !empty($USER->id) ? (int)$USER->id : 2;

                        $DB->insert_record('competency_modulecomp', $record);
                    }
                }

                return [
                    'success'       => true,
                    'message'       => 'Actividad vinculada exitosamente a la competencia.',
                    'affectedcount' => 1,
                ];

            case 'remove':
                $deleted = false;
                if (class_exists('\core_competency\course_module_competency')) {
                    try {
                        $mc = \core_competency\course_module_competency::get_record([
                            'cmid'         => $cm->id,
                            'competencyid' => $competency->id,
                        ]);
                        if ($mc) {
                            $mc->delete();
                            $deleted = true;
                        }
                    } catch (\Exception $e) {
                        $deleted = false;
                    }
                }

                if (!$deleted) {
                    $DB->delete_records('competency_modulecomp', [
                        'competencyid' => $competency->id,
                        'cmid'         => $cm->id,
                    ]);
                }

                return [
                    'success'       => true,
                    'message'       => 'Actividad desvinculada de la competencia.',
                    'affectedcount' => 1,
                ];

            case 'update_rule':
                $updated = false;
                if (class_exists('\core_competency\course_module_competency')) {
                    try {
                        $mc = \core_competency\course_module_competency::get_record([
                            'cmid'         => $cm->id,
                            'competencyid' => $competency->id,
                        ]);
                        if ($mc) {
                            $mc->set('ruleoutcome', (int)$params['ruleoutcome']);
                            $mc->update();
                            $updated = true;
                        }
                    } catch (\Exception $e) {
                        $updated = false;
                    }
                }

                if (!$updated) {
                    $DB->set_field('competency_modulecomp', 'ruleoutcome', (int)$params['ruleoutcome'], [
                        'competencyid' => $competency->id,
                        'cmid'         => $cm->id,
                    ]);
                }

                return [
                    'success'       => true,
                    'message'       => 'Regla de la actividad actualizada correctamente.',
                    'affectedcount' => 1,
                ];

            default:
                return ['success' => false, 'message' => 'Acción no reconocida: ' . $act, 'affectedcount' => 0];
        }
    }

    public static function module_competency_action_returns() {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message'       => new external_value(PARAM_TEXT, 'Status description message'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of records affected'),
        ]);
    }

    // ==========================================
    // 12. GET COMPETENCY REVIEWS (PENDING / IN REVIEW)
    // ==========================================
    public static function get_competency_reviews_parameters() {
        return new external_function_parameters([
            'page'        => new external_value(PARAM_INT, 'Page number', VALUE_DEFAULT, 0),
            'perpage'     => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 20),
            'frameworkid' => new external_value(PARAM_INT, 'Filter by framework ID', VALUE_DEFAULT, 0),
            'competencyid'=> new external_value(PARAM_INT, 'Filter by competency ID', VALUE_DEFAULT, 0),
            'userid'      => new external_value(PARAM_INT, 'Filter by student user ID', VALUE_DEFAULT, 0),
            'search'      => new external_value(PARAM_TEXT, 'Search query', VALUE_DEFAULT, ''),
        ]);
    }

    public static function get_competency_reviews($page = 0, $perpage = 20, $frameworkid = 0, $competencyid = 0, $userid = 0, $search = '') {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        $params = self::validate_parameters(self::get_competency_reviews_parameters(), [
            'page'         => $page,
            'perpage'      => $perpage,
            'frameworkid'  => $frameworkid,
            'competencyid' => $competencyid,
            'userid'       => $userid,
            'search'       => $search,
        ]);

        $filters = [
            'frameworkid'  => $params['frameworkid'],
            'competencyid' => $params['competencyid'],
            'userid'       => $params['userid'],
            'search'       => trim($params['search']),
        ];

        return competency_repository::get_pending_reviews($filters, $params['page'], $params['perpage']);
    }

    public static function get_competency_reviews_returns() {
        return new external_single_structure([
            'totalcount' => new external_value(PARAM_INT, 'Total pending reviews count'),
            'page'       => new external_value(PARAM_INT, 'Current page index'),
            'perpage'    => new external_value(PARAM_INT, 'Items per page'),
            'reviews'    => new external_multiple_structure(
                new external_single_structure([
                    'usercompid'            => new external_value(PARAM_INT, 'User competency ID'),
                    'userid'                => new external_value(PARAM_INT, 'User ID'),
                    'userfullname'          => new external_value(PARAM_TEXT, 'User full name'),
                    'useremail'             => new external_value(PARAM_TEXT, 'User email'),
                    'competencyid'          => new external_value(PARAM_INT, 'Competency ID'),
                    'competencyname'        => new external_value(PARAM_TEXT, 'Competency short name'),
                    'competencyidnumber'    => new external_value(PARAM_RAW, 'Competency ID number'),
                    'competencyframeworkid' => new external_value(PARAM_INT, 'Framework ID'),
                    'frameworkname'         => new external_value(PARAM_TEXT, 'Framework short name'),
                    'status'                => new external_value(PARAM_INT, 'Review status (1=Waiting, 2=In Review)'),
                    'proficiency'           => new external_value(PARAM_INT, 'Proficiency (1 or 0)'),
                    'currentgrade'          => new external_value(PARAM_INT, 'Current grade in scale'),
                    'scaleid'               => new external_value(PARAM_INT, 'Scale ID'),
                    'scalename'             => new external_value(PARAM_TEXT, 'Scale name'),
                    'scaleoptions'          => new external_multiple_structure(
                        new external_single_structure([
                            'value' => new external_value(PARAM_INT, 'Scale item rating value'),
                            'name'  => new external_value(PARAM_TEXT, 'Scale item display label'),
                        ]),
                        'Scale grade options',
                        VALUE_DEFAULT,
                        []
                    ),
                    'latestevidence'        => new external_value(PARAM_RAW, 'Latest evidence note'),
                    'timemodified'          => new external_value(PARAM_INT, 'Timestamp requested/modified'),
                ])
            ),
        ]);
    }

    // ==========================================
    // 13. COMPETENCY REVIEW ACTION (EVALUATE / COMPLETE)
    // ==========================================
    public static function competency_review_action_parameters() {
        return new external_function_parameters([
            'action'      => new external_value(PARAM_ALPHANUMEXT, 'Action: evaluate, complete'),
            'usercompid'  => new external_value(PARAM_INT, 'User competency record ID'),
            'grade'       => new external_value(PARAM_INT, 'Grade value in scale', VALUE_DEFAULT, 1),
            'proficiency' => new external_value(PARAM_INT, 'Proficiency result (1=proficient, 0=not)', VALUE_DEFAULT, 1),
            'note'        => new external_value(PARAM_RAW, 'Review feedback / evidence note', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Perform competency review assessment action.
     *
     * @param string $action
     * @param int $usercompid
     * @param int $grade
     * @param int $proficiency
     * @param string $note
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function competency_review_action($action, $usercompid, $grade = 1, $proficiency = 1, $note = '') {
        global $USER;
        $context = context_system::instance();
        self::validate_context($context);
        self::check_manage_capability($context);

        $params = self::validate_parameters(self::competency_review_action_parameters(), [
            'action'      => $action,
            'usercompid'  => $usercompid,
            'grade'       => $grade,
            'proficiency' => $proficiency,
            'note'        => $note,
        ]);

        $success = competency_repository::evaluate_competency_review(
            $params['usercompid'],
            $params['grade'],
            $params['proficiency'],
            $params['note'],
            $USER->id
        );

        return [
            'success' => $success,
            'message' => $success ? 'Revisión de competencia completada exitosamente.' : 'Error al guardar revisión.',
        ];
    }

    public static function competency_review_action_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message' => new external_value(PARAM_TEXT, 'Status description message'),
        ]);
    }

    // ==========================================
    // 13. GET COMPETENCY USERS (ENROLLED & COMPETENCY PROGRESS + EVIDENCES)
    // ==========================================
    public static function get_competency_users_parameters() {
        return new external_function_parameters([
            'competencyid' => new external_value(PARAM_INT, 'Competency ID'),
            'search'       => new external_value(PARAM_RAW, 'Search by user name or email', VALUE_DEFAULT, ''),
            'status'       => new external_value(PARAM_ALPHANUMEXT, 'Filter status: all, proficient, not_proficient, in_review, pending_reviews', VALUE_DEFAULT, 'all'),
            'courseid'     => new external_value(PARAM_INT, 'Filter by specific course ID', VALUE_DEFAULT, 0),
            'page'         => new external_value(PARAM_INT, 'Page number', VALUE_DEFAULT, 0),
            'perpage'      => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 20),
            'sort'         => new external_value(PARAM_ALPHANUMEXT, 'Sort field', VALUE_DEFAULT, 'lastname'),
            'dir'          => new external_value(PARAM_ALPHA, 'Sort direction: ASC, DESC', VALUE_DEFAULT, 'ASC'),
        ]);
    }

    public static function get_competency_users($competencyid, $search = '', $status = 'all', $courseid = 0, $page = 0, $perpage = 20, $sort = 'lastname', $dir = 'ASC') {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        $params = self::validate_parameters(self::get_competency_users_parameters(), [
            'competencyid' => $competencyid,
            'search'       => $search,
            'status'       => $status,
            'courseid'     => $courseid,
            'page'         => $page,
            'perpage'      => $perpage,
            'sort'         => $sort,
            'dir'          => $dir,
        ]);
        $params['perpage'] = min(max(1, $params['perpage']), 200);

        return competency_repository::get_competency_users(
            $params['competencyid'],
            $params['search'],
            $params['status'],
            $params['courseid'],
            $params['page'],
            $params['perpage'],
            $params['sort'],
            $params['dir']
        );
    }

    public static function get_competency_users_returns() {
        return new external_single_structure([
            'totalcount' => new external_value(PARAM_INT, 'Total count of users matching criteria'),
            'page'       => new external_value(PARAM_INT, 'Current page'),
            'perpage'    => new external_value(PARAM_INT, 'Items per page'),
            'users'      => new external_multiple_structure(
                new external_single_structure([
                    'userid'                => new external_value(PARAM_INT, 'User ID'),
                    'fullname'              => new external_value(PARAM_TEXT, 'User full name'),
                    'email'                 => new external_value(PARAM_TEXT, 'User email'),
                    'usercompid'            => new external_value(PARAM_INT, 'User competency record ID'),
                    'status'                => new external_value(PARAM_INT, 'Competency review status'),
                    'pendingreviewscount'   => new external_value(PARAM_INT, 'Pending reviews count for user', VALUE_DEFAULT, 0),
                    'proficiency'           => new external_value(PARAM_INT, 'Is proficient (1=yes, 0=no)'),
                    'grade'                 => new external_value(PARAM_INT, 'Competency grade/scale value'),
                    'gradename'             => new external_value(PARAM_TEXT, 'Grade name in scale'),
                    'coursescount'          => new external_value(PARAM_INT, 'Count of enrolled courses linked'),
                    'completedcoursescount' => new external_value(PARAM_INT, 'Count of completed courses'),
                    'progress'              => new external_value(PARAM_INT, 'Overall average course completion percentage'),
                    'courses'               => new external_multiple_structure(
                        new external_single_structure([
                            'courseid'    => new external_value(PARAM_INT, 'Course ID'),
                            'fullname'    => new external_value(PARAM_TEXT, 'Course full name'),
                            'shortname'   => new external_value(PARAM_TEXT, 'Course short name'),
                            'completed'   => new external_value(PARAM_INT, 'Is course completed'),
                            'progress'    => new external_value(PARAM_INT, 'Course completion percentage'),
                            'proficiency' => new external_value(PARAM_INT, 'Course-level competency proficiency'),
                            'grade'       => new external_value(PARAM_INT, 'Course-level competency grade'),
                        ])
                    ),
                    'evidencescount'        => new external_value(PARAM_INT, 'Number of registered evidences'),
                    'evidences'             => new external_multiple_structure(
                        new external_single_structure([
                            'id'                 => new external_value(PARAM_INT, 'Evidence ID'),
                            'action'             => new external_value(PARAM_INT, 'Evidence action type'),
                            'actionname'         => new external_value(PARAM_TEXT, 'Evidence action name'),
                            'actionuserfullname' => new external_value(PARAM_TEXT, 'Action user full name'),
                            'descidentifier'     => new external_value(PARAM_TEXT, 'Description identifier'),
                            'note'               => new external_value(PARAM_RAW, 'Evidence note / feedback'),
                            'grade'              => new external_value(PARAM_INT, 'Evidence grade'),
                            'gradename'          => new external_value(PARAM_TEXT, 'Evidence grade name'),
                            'url'                => new external_value(PARAM_RAW, 'Evidence URL'),
                            'timecreated'        => new external_value(PARAM_INT, 'Evidence timestamp'),
                        ])
                    ),
                ])
            ),
            'scale'      => new external_single_structure([
                'id'    => new external_value(PARAM_INT, 'Scale ID'),
                'name'  => new external_value(PARAM_TEXT, 'Scale name'),
                'items' => new external_multiple_structure(new external_value(PARAM_TEXT, 'Scale item name')),
            ]),
        ]);
    }
}
