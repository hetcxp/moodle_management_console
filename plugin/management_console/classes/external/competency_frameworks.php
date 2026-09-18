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
use tool_management_console\repository\competency_repository;
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
     */
    public static function competency_action($action, $competencyid = 0, $frameworkid = 0, $parentid = 0, $shortname = '', $idnumber = '', $description = '', $ruletype = '', $ruleoutcome = 1, $ruleconfig = '') {
        global $USER;

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

        return competency_repository::competency_action(
            (string)$params['action'],
            (int)$params['competencyid'],
            (int)$params['frameworkid'],
            (int)$params['parentid'],
            (string)$params['shortname'],
            (string)$params['idnumber'],
            (string)$params['description'],
            (string)($params['ruletype'] ?? ''),
            (int)($params['ruleoutcome'] ?? 1),
            (string)($params['ruleconfig'] ?? ''),
            !empty($USER->id) ? (int)$USER->id : 0
        );
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
     */
    public static function competency_course_action($action, $competencyid, $courseids, $ruleoutcome = 1) {
        global $USER;

        $context = context_system::instance();
        self::validate_context($context);
        self::check_manage_capability($context);

        $params = self::validate_parameters(self::competency_course_action_parameters(), [
            'action'       => $action,
            'competencyid' => $competencyid,
            'courseids'    => $courseids,
            'ruleoutcome'  => $ruleoutcome,
        ]);

        return competency_repository::competency_course_action(
            (string)$params['action'],
            (int)$params['competencyid'],
            (array)$params['courseids'],
            (int)$params['ruleoutcome'],
            !empty($USER->id) ? (int)$USER->id : 0
        );
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
     */
    public static function module_competency_action($action, $competencyid, $cmid, $ruleoutcome = 1) {
        global $USER;

        $context = context_system::instance();
        self::validate_context($context);
        self::check_manage_capability($context);

        $params = self::validate_parameters(self::module_competency_action_parameters(), [
            'action'       => $action,
            'competencyid' => $competencyid,
            'cmid'         => $cmid,
            'ruleoutcome'  => $ruleoutcome,
        ]);

        return competency_repository::module_competency_action(
            (string)$params['action'],
            (int)$params['competencyid'],
            (int)$params['cmid'],
            (int)$params['ruleoutcome'],
            !empty($USER->id) ? (int)$USER->id : 0
        );
    }

    public static function module_competency_action_returns() {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message'       => new external_value(PARAM_TEXT, 'Status description message'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of records affected'),
        ]);
    }

    // ==========================================
    // 16. GET ALL COMPETENCIES (FLAT BULK)
    // ==========================================
    public static function get_all_competencies_parameters() {
        return new external_function_parameters([
            'frameworkid' => new external_value(PARAM_INT, 'Optional framework ID filter, 0 for all', VALUE_DEFAULT, 0),
        ]);
    }

    public static function get_all_competencies($frameworkid = 0) {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        $params = self::validate_parameters(self::get_all_competencies_parameters(), [
            'frameworkid' => $frameworkid,
        ]);

        $competencies = competency_framework_repository::get_all_competencies_flat();

        if (!empty($params['frameworkid'])) {
            $competencies = array_values(array_filter($competencies, function($c) use ($params) {
                return (int)$c['frameworkid'] === (int)$params['frameworkid'];
            }));
        }

        return [
            'competencies' => $competencies,
            'total'        => count($competencies),
        ];
    }

    public static function get_all_competencies_returns() {
        return new external_single_structure([
            'competencies' => new external_multiple_structure(
                new external_single_structure([
                    'id'                => new external_value(PARAM_INT, 'Competency ID'),
                    'shortname'         => new external_value(PARAM_TEXT, 'Competency short name'),
                    'idnumber'          => new external_value(PARAM_RAW, 'Competency ID number'),
                    'description'       => new external_value(PARAM_RAW, 'Competency description'),
                    'descriptionformat' => new external_value(PARAM_INT, 'Description format'),
                    'frameworkid'       => new external_value(PARAM_INT, 'Framework ID'),
                    'frameworkname'     => new external_value(PARAM_TEXT, 'Framework short name'),
                    'frameworkidnumber' => new external_value(PARAM_RAW, 'Framework ID number'),
                ])
            ),
            'total' => new external_value(PARAM_INT, 'Total competencies count'),
        ]);
    }
}
