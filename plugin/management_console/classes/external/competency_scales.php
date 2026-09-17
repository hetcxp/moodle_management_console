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
 * External service for competency scales in tool_management_console.
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
 * Competency scales external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class competency_scales extends external_api {

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

        $scales = competency_framework_repository::get_scales();
        return ['scales' => $scales];
    }

    public static function get_scales_returns() {
        return new external_single_structure([
            'scales' => new external_multiple_structure(
                new external_single_structure([
                    'id'               => new external_value(PARAM_INT, 'Scale ID'),
                    'name'             => new external_value(PARAM_TEXT, 'Scale name'),
                    'isdefault'        => new external_value(PARAM_INT, '1 if this is the default standard scale'),
                    'items'            => new external_multiple_structure(new external_value(PARAM_TEXT, 'Scale grade label')),
                    'locked'           => new external_value(PARAM_INT, '1 if scale is locked due to records', VALUE_DEFAULT, 0),
                    'frameworks_count' => new external_value(PARAM_INT, 'Count of frameworks using this scale', VALUE_DEFAULT, 0),
                ])
            ),
        ]);
    }

    // ==========================================
    // 1B. SCALE ACTION (CRUD)
    // ==========================================
    public static function scale_action_parameters() {
        return new external_function_parameters([
            'action'  => new external_value(PARAM_ALPHA, 'Action: create, update, delete'),
            'scaleid' => new external_value(PARAM_INT, 'Scale ID (for update or delete)', VALUE_DEFAULT, 0),
            'name'    => new external_value(PARAM_TEXT, 'Scale name (for create or update)', VALUE_DEFAULT, ''),
            'items'   => new external_value(PARAM_TEXT, 'Comma-separated scale items ordered from lowest to highest', VALUE_DEFAULT, ''),
        ]);
    }

    public static function scale_action($action, $scaleid = 0, $name = '', $items = '') {
        global $USER;
        $context = context_system::instance();
        self::validate_context($context);
        self::check_manage_capability($context);

        $params = self::validate_parameters(self::scale_action_parameters(), [
            'action'  => $action,
            'scaleid' => $scaleid,
            'name'    => $name,
            'items'   => $items,
        ]);

        return competency_framework_repository::scale_action(
            (string)$params['action'],
            (int)$params['scaleid'],
            trim((string)$params['name']),
            trim((string)$params['items']),
            !empty($USER->id) ? (int)$USER->id : 0
        );
    }

    public static function scale_action_returns() {
        return new external_single_structure([
            'success'          => new external_value(PARAM_INT, '1 on success'),
            'scaleid'          => new external_value(PARAM_INT, 'Affected scale ID'),
            'locked'           => new external_value(PARAM_INT, '1 if scale was locked', VALUE_DEFAULT, 0),
            'frameworks_count' => new external_value(PARAM_INT, 'Number of frameworks linked to scale', VALUE_DEFAULT, 0),
        ]);
    }
}
