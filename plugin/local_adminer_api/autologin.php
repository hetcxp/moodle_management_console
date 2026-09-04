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
 * Autologin endpoint for local_adminer_api.
 *
 * @package    local_adminer_api
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$configpath = null;
if (file_exists(__DIR__ . '/../../config.php')) {
    $configpath = __DIR__ . '/../../config.php';
} else if (isset($_SERVER['SCRIPT_FILENAME']) && file_exists(dirname(dirname(dirname($_SERVER['SCRIPT_FILENAME']))) . '/config.php')) {
    $configpath = dirname(dirname(dirname($_SERVER['SCRIPT_FILENAME']))) . '/config.php';
} else if (isset($_SERVER['DOCUMENT_ROOT']) && file_exists($_SERVER['DOCUMENT_ROOT'] . '/config.php')) {
    $configpath = $_SERVER['DOCUMENT_ROOT'] . '/config.php';
} else if (getenv('MOODLE_DIR') && file_exists(getenv('MOODLE_DIR') . '/config.php')) {
    $configpath = getenv('MOODLE_DIR') . '/config.php';
} else if (file_exists('../../config.php')) {
    $configpath = '../../config.php';
}

if ($configpath) {
    require_once($configpath);
} else {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Moodle config.php could not be located.']);
    exit(1);
}
require_once($CFG->dirroot . '/user/lib.php');

$token = required_param('token', PARAM_ALPHANUM);
$redirect = required_param('redirect', PARAM_URL); // Use PARAM_URL for basic sanitization

// Validate redirect destination
$configured_hosts = get_config('local_adminer_api', 'allowed_hosts');
if (!empty($configured_hosts)) {
    $allowed_external_hosts = array_filter(array_map('trim', explode(',', $configured_hosts)));
} else {
    $allowed_external_hosts = [
        'admin.academyfactory.online',
        'reports.academyfactory.online'
    ];
}

$parsed = parse_url($redirect);
$is_valid_dest = false;

if (isset($parsed['host'])) {
    // External URL: must be HTTPS and in allowlist
    if (isset($parsed['scheme']) && $parsed['scheme'] === 'https') {
        if (in_array($parsed['host'], $allowed_external_hosts)) {
            $is_valid_dest = true;
        }
    }
} else {
    // Relative path: prevent scheme-relative URLs like '//evil.com'
    if (strpos($redirect, '//') !== 0 && strpos($redirect, '\\\\') !== 0) {
        $is_valid_dest = true;
    }
}

if (empty($redirect) || !$is_valid_dest) {
    throw new \moodle_exception('invalidurl');
}

global $DB;
$keyrecord = $DB->get_record('user_private_key', ['value' => $token, 'script' => 'core_message']);

if (!$keyrecord) {
    throw new \moodle_exception('invalidtoken');
}
$userid = $keyrecord->userid;

$user = $DB->get_record('user', array('id' => $userid, 'deleted' => 0, 'suspended' => 0));

if (!$user) {
    throw new \moodle_exception('invaliduser');
}

// Ensure the user is logged in
complete_user_login($user);

// Redirect to destination
$url = new moodle_url($redirect);
redirect($url);
