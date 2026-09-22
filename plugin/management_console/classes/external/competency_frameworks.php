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
 * External service for competency frameworks in tool_management_console.
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
use tool_management_console\repository\competency_framework_repository;

/**
 * Competency frameworks external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class competency_frameworks extends external_api {

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
    // 2. GET KPIS
    // ==========================================
    public static function get_competency_kpis_parameters() {
        return new external_function_parameters([]);
    }

    public static function get_competency_kpis() {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        return competency_framework_repository::get_kpis();
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

        return competency_framework_repository::get_paginated_frameworks(
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
     */
    public static function competency_framework_action($action, $frameworkid = 0, $shortname = '', $idnumber = '', $description = '', $scaleid = 0, $visible = 1) {
        global $USER;

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

        return competency_framework_repository::framework_action(
            (string)$params['action'],
            (int)$params['frameworkid'],
            (string)$params['shortname'],
            (string)$params['idnumber'],
            (string)$params['description'],
            (int)$params['scaleid'],
            (int)$params['visible'],
            (int)$context->id,
            !empty($USER->id) ? (int)$USER->id : 0
        );
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

        $detail = competency_framework_repository::get_framework_detail($params['frameworkid'], $params['search']);
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
    // BACKWARD COMPATIBILITY PROXY DELEGATIONS
    // ==========================================

    public static function competency_action_parameters() {
        return competencies::competency_action_parameters();
    }

    public static function competency_action($action, $competencyid = 0, $frameworkid = 0, $parentid = 0, $shortname = '', $idnumber = '', $description = '', $ruletype = '', $ruleoutcome = 1, $ruleconfig = '') {
        return competencies::competency_action($action, $competencyid, $frameworkid, $parentid, $shortname, $idnumber, $description, $ruletype, $ruleoutcome, $ruleconfig);
    }

    public static function competency_action_returns() {
        return competencies::competency_action_returns();
    }

    public static function get_competency_detail_parameters() {
        return competencies::get_competency_detail_parameters();
    }

    public static function get_competency_detail($competencyid) {
        return competencies::get_competency_detail($competencyid);
    }

    public static function get_competency_detail_returns() {
        return competencies::get_competency_detail_returns();
    }

    public static function get_competency_courses_parameters() {
        return competency_courses::get_competency_courses_parameters();
    }

    public static function get_competency_courses($competencyid, $includesubcompetencies = true) {
        return competency_courses::get_competency_courses($competencyid, $includesubcompetencies);
    }

    public static function get_competency_courses_returns() {
        return competency_courses::get_competency_courses_returns();
    }

    public static function competency_course_action_parameters() {
        return competency_courses::competency_course_action_parameters();
    }

    public static function competency_course_action($action, $competencyid, $courseids, $ruleoutcome = 1) {
        return competency_courses::competency_course_action($action, $competencyid, $courseids, $ruleoutcome);
    }

    public static function competency_course_action_returns() {
        return competency_courses::competency_course_action_returns();
    }

    public static function get_course_available_activities_parameters() {
        return competency_courses::get_course_available_activities_parameters();
    }

    public static function get_course_available_activities($courseid, $competencyid = 0) {
        return competency_courses::get_course_available_activities($courseid, $competencyid);
    }

    public static function get_course_available_activities_returns() {
        return competency_courses::get_course_available_activities_returns();
    }

    public static function module_competency_action_parameters() {
        return competency_courses::module_competency_action_parameters();
    }

    public static function module_competency_action($action, $competencyid, $cmid, $ruleoutcome = 1) {
        return competency_courses::module_competency_action($action, $competencyid, $cmid, $ruleoutcome);
    }

    public static function module_competency_action_returns() {
        return competency_courses::module_competency_action_returns();
    }

    public static function get_all_competencies_parameters() {
        return competencies::get_all_competencies_parameters();
    }

    public static function get_all_competencies($frameworkid = 0) {
        return competencies::get_all_competencies($frameworkid);
    }

    public static function get_all_competencies_returns() {
        return competencies::get_all_competencies_returns();
    }
}
