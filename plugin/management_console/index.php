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
 * Main entry point for the Management Console admin tool plugin.
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
} else if (isset($_SERVER['DOCUMENT_ROOT']) && file_exists($_SERVER['DOCUMENT_ROOT'] . '/config.php')) {
    $configpath = $_SERVER['DOCUMENT_ROOT'] . '/config.php';
} else if (getenv('MOODLE_DIR') && file_exists(getenv('MOODLE_DIR') . '/config.php')) {
    $configpath = getenv('MOODLE_DIR') . '/config.php';
}

if ($configpath) {
    require_once($configpath);
} else {
    http_response_code(500);
    die('Moodle config.php could not be located.');
}

// 1. Auth + capability check
require_login();
$context = context_system::instance();
require_capability('tool/management_console:access', $context);

// 2. Page setup — embedded = fullscreen, sin sidebar Moodle
$PAGE->set_url(new moodle_url('/admin/tool/management_console/index.php'));
$PAGE->set_context($context);
$PAGE->set_pagelayout('embedded');
$PAGE->set_title(get_string('pluginname', 'tool_management_console'));

// 3. Generar wstoken para el usuario actual
global $DB, $USER, $CFG, $OUTPUT;
require_once($CFG->libdir . '/externallib.php');

$service = $DB->get_record('external_services', ['shortname' => 'management_console_service']);
if (!$service) {
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    die('<html lang="es"><body style="font-family:sans-serif;padding:2rem;max-width:600px;margin:auto">
        <h1>Servicio no disponible</h1>
        <p>El servicio web <code>management_console_service</code> no está habilitado en Moodle.</p>
        <p>Ve a <strong>Administración → Servidor → Servicios web → Servicios externos</strong> y activa el servicio.</p>
    </body></html>');
}
// Buscar token existente o crear uno nuevo
$token = external_generate_token(
    EXTERNAL_TOKEN_PERMANENT,
    $service,
    $USER->id,
    $context
);

// Registrar evento de log de acceso
try {
    if (class_exists('\core\event\user_loggedin')) {
        $logevent = \core\event\user_loggedin::create([
            'userid' => $USER->id,
            'context' => $context,
            'other' => [
                'username' => $USER->username,
                'tool' => 'tool_management_console'
            ]
        ]);
        $logevent->trigger();
    }
} catch (\Exception $e) {
    // Fallback silencioso para evitar interrupciones de sesión existente
}

// 4. Escanear directorio app/assets/ para encontrar los archivos compilados
$appdir = __DIR__ . '/app/assets';
$cssfile = '';
$jsfile  = '';
if (is_dir($appdir)) {
    foreach (scandir($appdir) as $file) {
        if (str_starts_with($file, 'index-') && str_ends_with($file, '.css')) {
            $cssfile = $file;
        }
        if (str_starts_with($file, 'index-') && str_ends_with($file, '.js')) {
            $jsfile = $file;
        }
    }
}

// 5. Render: We skip $OUTPUT->header() to avoid Moodle's CSS interfering with the SPA's Tailwind CSS.
$nonce = base64_encode(random_bytes(16));
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{$nonce}' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:;");
header('Content-Type: text/html; charset=utf-8');

echo '<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>' . get_string('pluginname', 'tool_management_console') . '</title>';

// Inyectar CSS
if ($cssfile) {
    echo '<link rel="stylesheet" href="' .
         (new moodle_url("/admin/tool/management_console/app/assets/{$cssfile}"))->out() . '">';
}

$userinfo = [
    'userid'    => (int)$USER->id,
    'username'  => $USER->username,
    'fullname'  => fullname($USER),
    'firstname' => $USER->firstname,
    'lastname'  => $USER->lastname,
];
$moodleurl = $CFG->wwwroot;
if (is_https() && str_starts_with($moodleurl, 'http://')) {
    $moodleurl = 'https://' . substr($moodleurl, 7);
}

// Inyectar config JS global (ANTES del bundle)
echo "<script nonce=\"{$nonce}\">\n";
echo "window.MANAGEMENT_CONSOLE_CONFIG = {\n";
echo "    token: " . json_encode($token) . ",\n";
echo "    moodleUrl: " . json_encode($moodleurl) . ",\n";
echo "    serviceName: \"management_console_service\",\n";
echo "    basePath: " . json_encode((new moodle_url('/admin/tool/management_console/index.php'))->out_as_local_url(false)) . ",\n";
echo "    embedded: true,\n";
echo "    user: " . json_encode($userinfo) . "\n";
echo "};\n";
echo "window.ADMINER_CONFIG = window.MANAGEMENT_CONSOLE_CONFIG;\n";
echo "</script>";

// Google Fonts
echo '<link rel="preconnect" href="https://fonts.googleapis.com">';
echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
echo '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">';

// Cargar chunks lazy-loaded
if (is_dir($appdir)) {
    foreach (scandir($appdir) as $file) {
        if (str_ends_with($file, '.js') && !str_starts_with($file, 'index-')) {
            echo '<link rel="modulepreload" href="' .
                 (new moodle_url("/admin/tool/management_console/app/assets/{$file}"))->out() . '">';
        }
    }
}

echo '</head>
<body>
    <noscript>
      <div style="font-family:sans-serif;padding:2rem;text-align:center">
        <p>Esta aplicación requiere JavaScript. Por favor habilítalo en tu navegador.</p>
      </div>
    </noscript>
    <div id="root"></div>';

// Bundle JS principal
if ($jsfile) {
    echo '<script type="module" src="' .
         (new moodle_url("/admin/tool/management_console/app/assets/{$jsfile}"))->out() . '"></script>';
}

echo '</body>
</html>';
