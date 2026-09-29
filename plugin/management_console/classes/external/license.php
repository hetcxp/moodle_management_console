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
 * External API for license management in tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\external;

use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * License external API class.
 *
 * Provides two webservice methods:
 *  - save_license  — requires moodle/site:config
 *  - get_license_info — requires tool/management_console:access
 */
class license extends external_api {
    /**
     * Shared return structure for both webservice methods.
     *
     * @return external_single_structure
     */
    private static function license_returns(): external_single_structure {
        return new external_single_structure([
            'valid'       => new external_value(PARAM_BOOL, 'Whether the license is currently valid'),
            'status'      => new external_value(PARAM_TEXT, 'License status string'),
            'expires_at'  => new external_value(PARAM_INT, 'Unix timestamp of license expiry'),
            'issued_at'   => new external_value(PARAM_INT, 'Unix timestamp of license issue'),
            'days_left'   => new external_value(PARAM_INT, 'Days remaining on the license'),
            'client_name' => new external_value(PARAM_TEXT, 'Client name embedded in the license'),
            'tier'        => new external_value(PARAM_TEXT, 'License tier'),
            'license_id'  => new external_value(PARAM_TEXT, 'Unique license identifier'),
            'key_id'      => new external_value(PARAM_TEXT, 'Public key identifier used to sign'),
        ]);
    }

    /**
     * Parameter definition for save_license.
     *
     * @return external_function_parameters
     */
    public static function save_license_parameters(): external_function_parameters {
        return new external_function_parameters([
            'key' => new external_value(PARAM_RAW, 'License activation key'),
        ]);
    }

    /**
     * Validate and persist a license key.
     *
     * @param string $key Raw activation key
     * @return array Normalised result
     */
    public static function save_license(string $key): array {
        require_login();
        $ctx = context_system::instance();
        self::validate_context($ctx);
        require_capability('moodle/site:config', $ctx);

        $key = clean_param(substr(trim($key), 0, 2048), PARAM_RAW);
        return \tool_management_console\license_manager::save_license($key);
    }

    /**
     * Return definition for save_license.
     *
     * @return external_single_structure
     */
    public static function save_license_returns(): external_single_structure {
        return self::license_returns();
    }

    /**
     * Parameter definition for get_license_info.
     *
     * @return external_function_parameters
     */
    public static function get_license_info_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Return current license status.
     *
     * @return array Normalised result
     */
    public static function get_license_info(): array {
        require_login();
        $ctx = context_system::instance();
        self::validate_context($ctx);
        require_capability('tool/management_console:access', $ctx);

        return \tool_management_console\license_manager::get_license_info();
    }

    /**
     * Return definition for get_license_info.
     *
     * @return external_single_structure
     */
    public static function get_license_info_returns(): external_single_structure {
        return self::license_returns();
    }

    /**
     * Parameter definition for remove_license.
     *
     * @return external_function_parameters
     */
    public static function remove_license_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Remove/revoke the stored license key.
     *
     * @return array Result indicating success
     */
    public static function remove_license(): array {
        require_login();
        $ctx = context_system::instance();
        self::validate_context($ctx);
        require_capability('moodle/site:config', $ctx);

        $success = \tool_management_console\license_manager::remove_license();
        return ['success' => $success];
    }

    /**
     * Return definition for remove_license.
     *
     * @return external_single_structure
     */
    public static function remove_license_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Whether the license was successfully removed'),
        ]);
    }
}
