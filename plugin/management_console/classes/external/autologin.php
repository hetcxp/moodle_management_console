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
 * External service for autologin in tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\external;

defined('MOODLE_INTERNAL') || die();

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Autologin external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class autologin extends external_api {
    public static function get_autologin_url_parameters() {
        return new external_function_parameters([
            'destination' => new external_value(PARAM_URL, 'Destination path')
        ]);
    }

    public static function get_autologin_url($destination) {
        global $USER, $CFG;

        $params = self::validate_parameters(self::get_autologin_url_parameters(), [
            'destination' => $destination
        ]);

        require_once($CFG->dirroot . '/user/lib.php');

        $key = get_user_key('core_message', $USER->id);
        if (!$key) {
            $key = create_user_key('core_message', $USER->id, null, $CFG->sessiontimeout);
        }

        // Endpoint de autologin en plugin root: admin/tool/management_console/autologin.php
        $autologin_url = new \moodle_url('/admin/tool/management_console/autologin.php', [
            'token' => $key,
            'redirect' => $params['destination']
        ]);

        return [
            'url' => $autologin_url->out(false)
        ];
    }

    public static function get_autologin_url_returns() {
        return new external_single_structure([
            'url' => new external_value(PARAM_URL, 'Autologin URL')
        ]);
    }
}
