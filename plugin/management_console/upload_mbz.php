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
 * Endpoint for uploading course MBZ backup archives.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('NO_MOODLE_COOKIES', true);
define('AJAX_SCRIPT', true);

$configpath = null;
if (file_exists('../../../config.php')) {
    $configpath = '../../../config.php';
} else if (file_exists(__DIR__ . '/../../../config.php')) {
    $configpath = __DIR__ . '/../../../config.php';
} else if (isset($_SERVER['SCRIPT_FILENAME']) && file_exists(dirname(dirname(dirname(dirname($_SERVER['SCRIPT_FILENAME'])))) . '/config.php')) {
    $configpath = dirname(dirname(dirname(dirname($_SERVER['SCRIPT_FILENAME'])))) . '/config.php';
} else if (isset($_SERVER['DOCUMENT_ROOT']) && file_exists($_SERVER['DOCUMENT_ROOT'] . '/config.php')) {
    $configpath = $_SERVER['DOCUMENT_ROOT'] . '/config.php';
} else if (getenv('MOODLE_DIR') && file_exists(getenv('MOODLE_DIR') . '/config.php')) {
    $configpath = getenv('MOODLE_DIR') . '/config.php';
}

if ($configpath) {
    require_once($configpath);
} else {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Moodle config.php could not be located.']);
    exit(1);
}

header('Content-Type: application/json; charset=utf-8');

// Enable CORS for Vite dev server if requested
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit(0);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Only POST is accepted.']);
    exit;
}

$token = optional_param('token', '', PARAM_ALPHANUM);
if (empty($token) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
    if (preg_match('/Bearer\s+(.*)$/i', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
        $token = clean_param($matches[1], PARAM_ALPHANUM);
    }
}

if (empty($token)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing authentication token.']);
    exit;
}

global $DB, $CFG;

$tokenrecord = $DB->get_record('external_tokens', ['token' => $token]);
if (!$tokenrecord) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid authentication token.']);
    exit;
}

if (!empty($tokenrecord->validuntil) && $tokenrecord->validuntil < time()) {
    http_response_code(401);
    echo json_encode(['error' => 'Token has expired.']);
    exit;
}

$user = $DB->get_record('user', ['id' => $tokenrecord->userid, 'deleted' => 0, 'suspended' => 0]);
if (!$user) {
    http_response_code(403);
    echo json_encode(['error' => 'User not found or suspended.']);
    exit;
}

\core\session\manager::set_user($user);
$syscontext = \context_system::instance();
if (!has_capability('moodle/course:create', $syscontext, $user)) {
    http_response_code(403);
    echo json_encode(['error' => 'Permission denied: moodle/course:create capability required.']);
    exit;
}

if (empty($_FILES['mbzfile']) || !is_uploaded_file($_FILES['mbzfile']['tmp_name'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file was uploaded or file is not valid.']);
    exit;
}

$file = $_FILES['mbzfile'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    $upload_errors = [
        UPLOAD_ERR_INI_SIZE   => 'The uploaded file exceeds the upload_max_filesize directive in php.ini',
        UPLOAD_ERR_FORM_SIZE  => 'The uploaded file exceeds the MAX_FILE_SIZE directive in the HTML form',
        UPLOAD_ERR_PARTIAL    => 'The uploaded file was only partially uploaded',
        UPLOAD_ERR_NO_FILE    => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the file upload',
    ];
    $msg = $upload_errors[$file['error']] ?? 'Unknown upload error code: ' . $file['error'];
    echo json_encode(['error' => $msg]);
    exit;
}

$orig_name = $file['name'];
$ext = strtolower(pathinfo($orig_name, PATHINFO_EXTENSION));
if ($ext !== 'mbz') {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file extension. Only .mbz files are permitted.']);
    exit;
}

$tempdir = $CFG->dataroot . '/temp/backup';
if (!is_dir($tempdir)) {
    mkdir($tempdir, 0777, true);
}

// Passive housekeeping: remove mbz_* files older than 2 hours in $tempdir
$now = time();
$twohoursago = $now - (2 * 3600);
if ($handle = opendir($tempdir)) {
    while (false !== ($entry = readdir($handle))) {
        if (str_starts_with($entry, 'mbz_') && str_ends_with($entry, '.mbz')) {
            $entrypath = $tempdir . '/' . $entry;
            if (is_file($entrypath) && filemtime($entrypath) < $twohoursago) {
                @unlink($entrypath);
            }
        }
    }
    closedir($handle);
}

$destfile = $tempdir . '/mbz_' . uniqid('', true) . '.mbz';
if (!move_uploaded_file($file['tmp_name'], $destfile)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to move uploaded file to temporary backup storage.']);
    exit;
}

echo json_encode([
    'success' => true,
    'tempfile' => $destfile
]);
