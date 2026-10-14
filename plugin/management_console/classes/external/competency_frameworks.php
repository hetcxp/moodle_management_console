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
     * Helper to verify view capabilities.
     *
     * @param \context $context
     * @return void
     * @throws \moodle_exception
     */
    protected static function check_view_capability($context): void {
        if (is_siteadmin()) {
            return;
        }
        if (
            has_capability('moodle/competency:competencymanage', $context) ||
            has_capability('moodle/competency:competencyview', $context)
        ) {
            return;
        }
        throw new \moodle_exception('nopermissions', 'error', '', 'view competencies');
    }

    /**
     * Helper to verify manage capabilities.
     *
     * @param \context $context
     * @return void
     * @throws \required_capability_exception
     */
    protected static function check_manage_capability($context): void {
        if (is_siteadmin()) {
            return;
        }
        require_capability('moodle/competency:competencymanage', $context);
    }

    /**
     * Describes the parameters for get_competency_kpis.
     *
     * @return external_function_parameters
     */
    public static function get_competency_kpis_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Get aggregate KPIs for competency frameworks.
     *
     * @return array
     */
    public static function get_competency_kpis(): array {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        return competency_framework_repository::get_kpis();
    }

    /**
     * Describes the return structure for get_competency_kpis.
     *
     * @return external_single_structure
     */
    public static function get_competency_kpis_returns(): external_single_structure {
        return new external_single_structure([
            'total_frameworks'   => new external_value(PARAM_INT, 'Total frameworks count'),
            'visible_frameworks' => new external_value(PARAM_INT, 'Visible frameworks count'),
            'hidden_frameworks'  => new external_value(PARAM_INT, 'Hidden frameworks count'),
            'total_competencies' => new external_value(PARAM_INT, 'Total competencies count'),
            'pending_reviews'    => new external_value(PARAM_INT, 'Total pending competency reviews count', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Describes the parameters for get_competency_frameworks.
     *
     * @return external_function_parameters
     */
    public static function get_competency_frameworks_parameters(): external_function_parameters {
        return new external_function_parameters([
            'page'    => new external_value(PARAM_INT, 'Page index', VALUE_DEFAULT, 0),
            'perpage' => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 50),
            'sort'    => new external_value(PARAM_ALPHA, 'Sort column', VALUE_DEFAULT, 'shortname'),
            'dir'     => new external_value(PARAM_ALPHA, 'Sort direction', VALUE_DEFAULT, 'ASC'),
            'search'  => new external_value(PARAM_TEXT, 'Search term', VALUE_DEFAULT, ''),
            'filters' => new external_value(PARAM_RAW, 'JSON filters', VALUE_DEFAULT, '{}'),
        ]);
    }

    /**
     * Get paginated competency frameworks.
     *
     * @param int $page
     * @param int $perpage
     * @param string $sort
     * @param string $dir
     * @param string $search
     * @param string $filters
     * @return array
     */
    public static function get_competency_frameworks(
        int $page = 0,
        int $perpage = 50,
        string $sort = 'shortname',
        string $dir = 'ASC',
        string $search = '',
        string $filters = '{}'
    ): array {
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

        $decodedfilters = json_decode($params['filters'], true);
        if (!is_array($decodedfilters)) {
            $decodedfilters = [];
        }

        return competency_framework_repository::get_paginated_frameworks(
            $params['page'],
            $params['perpage'],
            $params['sort'],
            $params['dir'],
            $params['search'],
            $decodedfilters
        );
    }

    /**
     * Describes the return structure for get_competency_frameworks.
     *
     * @return external_single_structure
     */
    public static function get_competency_frameworks_returns(): external_single_structure {
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

    /**
     * Describes the parameters for competency_framework_action.
     *
     * @return external_function_parameters
     */
    public static function competency_framework_action_parameters(): external_function_parameters {
        return new external_function_parameters([
            'action'      => new external_value(
                PARAM_ALPHANUMEXT,
                'Action: create, edit, delete, toggle_visibility, hide, show'
            ),
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
     */
    public static function competency_framework_action(
        string $action,
        int $frameworkid = 0,
        string $shortname = '',
        string $idnumber = '',
        string $description = '',
        int $scaleid = 0,
        int $visible = 1
    ): array {
        global $USER;

        $context = context_system::instance();
        self::validate_context($context);
        self::check_manage_capability($context);
        \tool_management_console\license_manager::require_active_license();

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

    /**
     * Describes the return structure for competency_framework_action.
     *
     * @return external_single_structure
     */
    public static function competency_framework_action_returns(): external_single_structure {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message'       => new external_value(PARAM_TEXT, 'Status description message'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of records affected or new ID'),
        ]);
    }

    /**
     * Describes the parameters for get_competency_framework_detail.
     *
     * @return external_function_parameters
     */
    public static function get_competency_framework_detail_parameters(): external_function_parameters {
        return new external_function_parameters([
            'frameworkid' => new external_value(PARAM_INT, 'Framework ID'),
            'search'      => new external_value(PARAM_TEXT, 'Filter competencies by search term', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Get detail and level 1 competencies of a framework.
     *
     * @param int $frameworkid
     * @param string $search
     * @return array
     */
    public static function get_competency_framework_detail(int $frameworkid, string $search = ''): array {
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

    /**
     * Describes the return structure for get_competency_framework_detail.
     *
     * @return external_single_structure
     */
    public static function get_competency_framework_detail_returns(): external_single_structure {
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
            'pendingreviewscount' => new external_value(PARAM_INT, 'Number of pending reviews in framework', VALUE_DEFAULT, 0),
            'competencies'       => new external_multiple_structure(
                new external_single_structure([
                    'id'                  => new external_value(PARAM_INT, 'Competency ID'),
                    'shortname'           => new external_value(PARAM_TEXT, 'Competency name'),
                    'idnumber'            => new external_value(PARAM_TEXT, 'Competency ID number'),
                    'description'         => new external_value(PARAM_RAW, 'Competency description'),
                    'parentid'            => new external_value(PARAM_INT, 'Parent competency ID (0 for Level 1)'),
                    'parentname'          => new external_value(PARAM_TEXT, 'Parent competency name', VALUE_DEFAULT, ''),
                    'level'               => new external_value(
                        PARAM_INT,
                        'Hierarchy level (1 for root, 2+ for subcompetencies)',
                        VALUE_DEFAULT,
                        1
                    ),
                    'path'                => new external_value(PARAM_TEXT, 'Hierarchical path'),
                    'sortorder'           => new external_value(PARAM_INT, 'Sort order'),
                    'coursescount'        => new external_value(PARAM_INT, 'Number of linked courses', VALUE_DEFAULT, 0),
                    'childrencount'       => new external_value(PARAM_INT, 'Number of direct subcompetencies', VALUE_DEFAULT, 0),
                    'ruletype'            => new external_value(PARAM_RAW, 'Rule type classname', VALUE_DEFAULT, ''),
                    'ruleoutcome'         => new external_value(PARAM_INT, 'Rule outcome', VALUE_DEFAULT, 1),
                    'pendingreviewscount' => new external_value(
                        PARAM_INT,
                        'Number of pending reviews for this competency',
                        VALUE_DEFAULT,
                        0
                    ),
                    'timecreated'         => new external_value(PARAM_INT, 'Creation timestamp'),
                    'timemodified'        => new external_value(PARAM_INT, 'Last modified timestamp'),
                ])
            ),
        ]);
    }
}
