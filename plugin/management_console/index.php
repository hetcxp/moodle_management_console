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

$service = $DB->get_record('external_services', ['shortname' => 'management_console_service'], '*', MUST_EXIST);
// Buscar token existente o crear uno nuevo
$token = external_generate_token(
    EXTERNAL_TOKEN_PERMANENT,
    $service,
    $USER->id,
    $context
);

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

// Inyectar config JS global (ANTES del bundle)
echo '<script>
window.MANAGEMENT_CONSOLE_CONFIG = {
    token: ' . json_encode($token) . ',
    moodleUrl: ' . json_encode($CFG->wwwroot) . ',
    serviceName: "management_console_service",
    basePath: ' . json_encode((new moodle_url('/admin/tool/management_console/index.php'))->out_as_local_url(false)) . ',
    embedded: true
};
window.ADMINER_CONFIG = window.MANAGEMENT_CONSOLE_CONFIG;
</script>';

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
    <div id="root"></div>';

// Bundle JS principal
if ($jsfile) {
    echo '<script type="module" src="' .
         (new moodle_url("/admin/tool/management_console/app/assets/{$jsfile}"))->out() . '"></script>';
}

echo '</body>
</html>';
