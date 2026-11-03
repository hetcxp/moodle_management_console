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
 * License endpoint handler and backward-compatibility redirect for tool_management_console.
 *
 * Directs GET traffic to the unified admin setting page and handles direct POST actions.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// Robust config.php locator supporting symlinked plugin directory.
// @codingStandardsIgnoreLine
$candidate = __DIR__ . '/../../../config.php';
if (!file_exists($candidate) && isset($_SERVER['SCRIPT_FILENAME'])) {
    $candidate = dirname($_SERVER['SCRIPT_FILENAME'], 3) . '/config.php';
}
if (!file_exists($candidate) && isset($_SERVER['DOCUMENT_ROOT'])) {
    $candidate = $_SERVER['DOCUMENT_ROOT'] . '/../config.php';
}
if (!file_exists($candidate)) {
    die('Failed to locate Moodle config.php for tool_management_console.');
}
require_once($candidate);
require_once($CFG->libdir . '/adminlib.php');

// 1. Auth and capability check.
require_login();
$context = context_system::instance();
require_capability('moodle/site:config', $context);

$settingsurl = new moodle_url('/admin/settings.php', ['section' => 'tool_management_console_settings']);
$action = optional_param('action', '', PARAM_ALPHA);

// 2. Handle POST mutations.
if ($action === 'activate' && data_submitted()) {
    require_sesskey();
    $key = optional_param('license_key', '', PARAM_RAW);
    $result = \tool_management_console\license_manager::save_license($key);
    if (!empty($result['valid'])) {
        redirect(
            $settingsurl,
            get_string('license_saved', 'tool_management_console'),
            null,
            \core\output\notification::NOTIFY_SUCCESS
        );
    }

    $statuskey = 'license_status_' . ($result['status'] ?? 'invalid_format');
    $error = get_string_manager()->string_exists($statuskey, 'tool_management_console')
        ? get_string($statuskey, 'tool_management_console')
        : get_string('license_status_invalid_format', 'tool_management_console');

    redirect(
        $settingsurl,
        $error,
        null,
        \core\output\notification::NOTIFY_ERROR
    );
}

if ($action === 'remove' && data_submitted()) {
    require_sesskey();
    \tool_management_console\license_manager::remove_license();
    redirect(
        $settingsurl,
        get_string('license_removed', 'tool_management_console'),
        null,
        \core\output\notification::NOTIFY_INFO
    );
}

// 3. Fallback: Any GET request redirects to unified settings page.
redirect($settingsurl);
