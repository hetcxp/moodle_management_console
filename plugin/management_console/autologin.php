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
 * Autologin endpoint for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

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
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Moodle config.php could not be located.']);
    exit(1);
}
require_once($CFG->dirroot . '/user/lib.php');

/**
 * Render an accessible HTML error page for autologin failures.
 *
 * @param string $title
 * @param string $message
 * @param int $httpcode
 */
function render_autologin_error(string $title, string $message, int $httpcode = 400): void {
    http_response_code($httpcode);
    header('Content-Type: text/html; charset=utf-8');
    $moodleurl = new \moodle_url('/admin/tool/management_console/index.php');
    echo '<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; padding: 1rem; }
        .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 2rem; max-width: 440px; width: 100%; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); text-align: center; }
        h1 { font-size: 1.25rem; font-weight: 700; color: #e11d48; margin-top: 0; margin-bottom: 0.75rem; }
        p { font-size: 0.875rem; color: #64748b; line-height: 1.5; margin-bottom: 1.5rem; }
        a { display: inline-flex; align-items: center; justify-content: center; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 0.875rem; padding: 0.625rem 1.25rem; border-radius: 0.5rem; transition: background 0.15s; }
        a:hover { background: #1d4ed8; }
    </style>
</head>
<body>
    <main role="alert" class="card">
        <h1>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</h1>
        <p>' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</p>
        <a href="' . $moodleurl->out() . '">Volver al Management Console</a>
    </main>
</body>
</html>';
    exit;
}

$token = required_param('token', PARAM_ALPHANUM);
$redirect = required_param('redirect', PARAM_URL);

// Reject dangerous schemes
if (stripos($redirect, 'javascript:') !== false || stripos($redirect, 'data:') !== false) {
    render_autologin_error('Enlace no permitido', 'La dirección de redirección solicitada no es segura.', 400);
}

// Validate redirect destination
$configured_hosts = get_config('tool_management_console', 'allowed_hosts');
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
    render_autologin_error('Destino no autorizado', 'El destino de redirección no se encuentra en la lista de dominios permitidos.', 400);
}

global $DB;
$keyrecord = $DB->get_record('user_private_key', [
    'value'  => $token,
    'script' => 'tool/management_console'
]);

if (!$keyrecord) {
    render_autologin_error('Token inválido', 'El token de acceso no existe o no corresponde a esta herramienta.', 401);
}

if (!empty($keyrecord->validuntil) && $keyrecord->validuntil < time()) {
    render_autologin_error('Token expirado', 'La sesión temporal de autologin ha caducado. Por favor ingresa nuevamente desde la consola.', 401);
}
$userid = $keyrecord->userid;

$user = $DB->get_record('user', array('id' => $userid, 'deleted' => 0, 'suspended' => 0));

if (!$user) {
    render_autologin_error('Usuario no disponible', 'La cuenta de usuario asociada no existe o ha sido suspendida.', 403);
}

// Ensure the user is logged in
complete_user_login($user);

// Redirect to destination
$url = new moodle_url($redirect);
redirect($url);
