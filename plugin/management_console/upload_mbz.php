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

// phpcs:ignore moodle.Files.RequireLogin.Missing
// Robust config.php locator supporting symlinked plugin directory.
$config_paths = [
    __DIR__ . '/../../../config.php',
];
if (isset($_SERVER['SCRIPT_FILENAME'])) {
    $config_paths[] = dirname(dirname(dirname($_SERVER['SCRIPT_FILENAME']))) . '/config.php';
    $config_paths[] = dirname(dirname(dirname(dirname($_SERVER['SCRIPT_FILENAME'])))) . '/config.php';
    $config_paths[] = dirname(dirname(dirname(dirname($_SERVER['SCRIPT_FILENAME'])))) . '/../config.php';
}
if (isset($_SERVER['DOCUMENT_ROOT'])) {
    $config_paths[] = $_SERVER['DOCUMENT_ROOT'] . '/../config.php';
    $config_paths[] = $_SERVER['DOCUMENT_ROOT'] . '/config.php';
}
$config_loaded = false;
foreach ($config_paths as $config_path) {
    if (file_exists($config_path)) {
        require_once($config_path);
        $config_loaded = true;
        break;
    }
}
if (!$config_loaded) {
    die('Failed to locate Moodle config.php for tool_management_console.');
}

header('Content-Type: application/json; charset=utf-8');

// Validate CORS: allow only origin matching Moodle wwwroot or explicit local dev origins.
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
    $allowedorigins = [
        rtrim($CFG->wwwroot, '/'),
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
    ];
    $parsedwww = parse_url($CFG->wwwroot);
    if (!empty($parsedwww['scheme']) && !empty($parsedwww['host'])) {
        $port = !empty($parsedwww['port']) ? ':' . $parsedwww['port'] : '';
        $allowedorigins[] = $parsedwww['scheme'] . '://' . $parsedwww['host'] . $port;
    }

    if (in_array($origin, $allowedorigins, true)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Methods: POST, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    }

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(in_array($origin, $allowedorigins, true) ? 200 : 403);
        exit(0);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Only POST is accepted.']);
    exit;
}

// Security TD-BKP-001: Strictly reject authentication tokens passed via query or body parameters.
if (isset($_GET['token']) || isset($_POST['token'])) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Passing authentication tokens via query or body parameters is strictly forbidden. ' .
            'Use the Authorization: Bearer <token> header.',
    ]);
    exit;
}

$token = '';
$authheader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if (!empty($authheader) && preg_match('/Bearer\s+([a-zA-Z0-9]+)/i', trim($authheader), $matches)) {
    $token = clean_param($matches[1], PARAM_ALPHANUM);
}

if (empty($token)) {
    http_response_code(401);
    echo json_encode(['error' => 'Missing or invalid Authorization header.']);
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

// Security TD-SEC-002: Verify token belongs to management_console_service.
$service = $DB->get_record('external_services', ['id' => $tokenrecord->externalserviceid, 'enabled' => 1]);
if (!$service || $service->shortname !== 'management_console_service') {
    http_response_code(403);
    echo json_encode(['error' => 'Token is not authorized for management_console_service.']);
    exit;
}

if (!empty($tokenrecord->iprestriction) && !address_in_subnet(getremoteaddr(), $tokenrecord->iprestriction)) {
    http_response_code(403);
    echo json_encode(['error' => 'IP restriction violation for token.']);
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

try {
    \tool_management_console\license_manager::require_active_license();
} catch (\moodle_exception $e) {
    http_response_code(403);
    echo json_encode(['error' => 'An active license is required to perform this action.']);
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
    $uploaderrors = [
        UPLOAD_ERR_INI_SIZE   => 'The uploaded file exceeds the upload_max_filesize directive in php.ini',
        UPLOAD_ERR_FORM_SIZE  => 'The uploaded file exceeds the MAX_FILE_SIZE directive in the HTML form',
        UPLOAD_ERR_PARTIAL    => 'The uploaded file was only partially uploaded',
        UPLOAD_ERR_NO_FILE    => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the file upload',
    ];
    $msg = $uploaderrors[$file['error']] ?? 'Unknown upload error code: ' . $file['error'];
    echo json_encode(['error' => $msg]);
    exit;
}

// Security TD-BKP-002: Verify file extension.
$origname = $file['name'];
$ext = strtolower(pathinfo($origname, PATHINFO_EXTENSION));
if ($ext !== 'mbz') {
    @unlink($file['tmp_name']);
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file extension. Only .mbz files are permitted.']);
    exit;
}

// Security TD-BKP-002: Server-side file size ceiling check.
require_once($CFG->libdir . '/filelib.php');
$maxbytes = get_max_upload_file_size($CFG->maxbytes);
if (!empty($maxbytes) && $file['size'] > $maxbytes) {
    @unlink($file['tmp_name']);
    http_response_code(400);
    echo json_encode(['error' => "Uploaded file exceeds the maximum allowed size ({$maxbytes} bytes)."]);
    exit;
}

// Security TD-BKP-002: MIME validation via finfo.
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimetype = $finfo ? finfo_file($finfo, $file['tmp_name']) : '';
if ($finfo) {
    finfo_close($finfo);
}

$allowedmimes = [
    'application/gzip',
    'application/x-gzip',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-tar',
    'application/octet-stream',
];
if (!empty($mimetype) && !in_array($mimetype, $allowedmimes, true)) {
    @unlink($file['tmp_name']);
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file MIME type for MBZ backup archive.']);
    exit;
}

// Security TD-BKP-002: Verify archive magic bytes signature (gzip: \x1f\x8b, zip: PK).
$handle = @fopen($file['tmp_name'], 'rb');
if (!$handle) {
    @unlink($file['tmp_name']);
    http_response_code(500);
    echo json_encode(['error' => 'Cannot read uploaded file for archive validation.']);
    exit;
}
$magic = fread($handle, 4);
fclose($handle);

$isgzip = (substr($magic, 0, 2) === "\x1f\x8b");
$iszip = (substr($magic, 0, 2) === "PK");
if (!$isgzip && !$iszip) {
    @unlink($file['tmp_name']);
    http_response_code(400);
    echo json_encode(['error' => 'Invalid MBZ archive format: missing gzip/zip compression signature.']);
    exit;
}

// Security TD-SEC-003: Isolate uploaded backups in a dedicated per-user namespace.
$tempdir = $CFG->dataroot . '/temp/backup/tool_management_console/' . (int)$user->id;
if (!is_dir($tempdir)) {
    if (!mkdir($tempdir, 0750, true)) {
        @unlink($file['tmp_name']);
        http_response_code(500);
        echo json_encode(['error' => 'Failed to initialize secure upload destination directory.']);
        exit;
    }
}

if (!is_writable($tempdir)) {
    @unlink($file['tmp_name']);
    http_response_code(500);
    echo json_encode(['error' => 'Destination directory is not writable.']);
    exit;
}

// Passive housekeeping: remove mbz_* files older than 2 hours in user's $tempdir.
$now = time();
$twohoursago = $now - (2 * 3600);
if ($dirhandle = opendir($tempdir)) {
    while (false !== ($entry = readdir($dirhandle))) {
        if (str_starts_with($entry, 'mbz_') && str_ends_with($entry, '.mbz')) {
            $entrypath = $tempdir . '/' . $entry;
            if (is_file($entrypath) && filemtime($entrypath) < $twohoursago) {
                @unlink($entrypath);
            }
        }
    }
    closedir($dirhandle);
}

$filename = 'mbz_' . (int)$user->id . '_' . bin2hex(random_bytes(16)) . '.mbz';
$destfile = $tempdir . '/' . $filename;
if (!move_uploaded_file($file['tmp_name'], $destfile)) {
    @unlink($file['tmp_name']);
    http_response_code(500);
    echo json_encode(['error' => 'Failed to move uploaded file to temporary backup storage.']);
    exit;
}

echo json_encode([
    'success' => true,
    'filename' => $filename,
    'tempfile' => $filename, // Returns opaque filename instead of leaking full server path.
]);
