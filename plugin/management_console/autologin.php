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
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
               display: flex; align-items: center; justify-content: center; min-height: 100vh;
               margin: 0; background: #f8fafc; color: #1e293b; padding: 1rem; }
        .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 1rem;
                padding: 2rem; max-width: 440px; width: 100%;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); text-align: center; }
        h1 { font-size: 1.25rem; font-weight: 700; color: #e11d48; margin-top: 0; margin-bottom: 0.75rem; }
        p { font-size: 0.875rem; color: #64748b; line-height: 1.5; margin-bottom: 1.5rem; }
        a { display: inline-flex; align-items: center; justify-content: center;
            background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600;
            font-size: 0.875rem; padding: 0.625rem 1.25rem; border-radius: 0.5rem;
            transition: background 0.15s; }
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

$parsed = parse_url($redirect);
if ($parsed === false) {
    render_autologin_error('Enlace inválido', 'La dirección de redirección tiene un formato incorrecto.', 400);
}

// Reject dangerous schemes.
$scheme = isset($parsed['scheme']) ? strtolower($parsed['scheme']) : '';
if (
    in_array($scheme, ['javascript', 'data', 'vbscript'], true) ||
    stripos($redirect, 'javascript:') !== false ||
    stripos($redirect, 'data:') !== false
) {
    render_autologin_error('Enlace no permitido', 'La dirección de redirección solicitada no es segura.', 400);
}

// Validate redirect destination.
$configuredhosts = get_config('tool_management_console', 'allowed_hosts');
if (!empty($configuredhosts)) {
    $allowedexternalhosts = array_filter(array_map('trim', explode(',', $configuredhosts)));
} else {
    $allowedexternalhosts = [
        'admin.academyfactory.online',
        'reports.academyfactory.online',
    ];
}

$isvaliddest = false;

if (!empty($parsed['host'])) {
    // External URL: must be HTTPS and in allowlist (case-insensitive DNS host).
    if ($scheme === 'https') {
        $host = strtolower($parsed['host']);
        $allowedlower = array_map('strtolower', $allowedexternalhosts);
        if (in_array($host, $allowedlower, true)) {
            $isvaliddest = true;
        }
    }
} else {
    // Relative path: scheme must be empty and prevent scheme-relative URLs like '//evil.com'.
    if ($scheme === '' && strpos($redirect, '//') !== 0 && strpos($redirect, '\\\\') !== 0) {
        $isvaliddest = true;
    }
}

if (empty($redirect) || !$isvaliddest) {
    $errormsg = 'El destino de redirección no se encuentra en la lista de dominios permitidos.';
    render_autologin_error('Destino no autorizado', $errormsg, 400);
}

global $DB;
$keyrecord = $DB->get_record('user_private_key', [
    'value'  => $token,
    'script' => 'tool/management_console',
]);

if (!$keyrecord) {
    render_autologin_error('Token inválido', 'El token de acceso no existe o no corresponde a esta herramienta.', 401);
}

if (!empty($keyrecord->validuntil) && $keyrecord->validuntil < time()) {
    $expiremsg = 'La sesión temporal de autologin ha caducado. Por favor ingresa nuevamente desde la consola.';
    render_autologin_error('Token expirado', $expiremsg, 401);
}
$userid = $keyrecord->userid;

$user = $DB->get_record('user', ['id' => $userid, 'deleted' => 0, 'suspended' => 0]);

if (!$user) {
    render_autologin_error('Usuario no disponible', 'La cuenta de usuario asociada no existe o ha sido suspendida.', 403);
}

// Ensure the user is logged in.
complete_user_login($user);

// Redirect to destination.
$url = new moodle_url($redirect);
redirect($url);
