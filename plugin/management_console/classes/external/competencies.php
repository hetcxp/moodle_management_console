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
use tool_management_console\repository\competency_framework_repository;

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
    // GET ALL COMPETENCIES (FLAT BULK)
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

    // ==========================================
    // COMPETENCY ACTION (CREATE/EDIT/DELETE/UPDATE_RULE)
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
    // GET COMPETENCY DETAIL
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
}
