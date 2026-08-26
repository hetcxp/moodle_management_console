<?php
if (file_exists('../../config.php')) {
    require_once('../../config.php');
} else if (file_exists(__DIR__ . '/../../../../Dev/moodle-dev/config.php')) {
    require_once(__DIR__ . '/../../../../Dev/moodle-dev/config.php');
} else {
    require_once('/Users/hectorteran/Dev/moodle-dev/config.php');
}

// 1. Auth + capability check
require_login();
$context = context_system::instance();
require_capability('local/adminer_ui:access', $context);

// 2. Page setup — embedded = fullscreen, sin sidebar Moodle
$PAGE->set_url(new moodle_url('/local/adminer_ui/index.php'));
$PAGE->set_context($context);
$PAGE->set_pagelayout('embedded');
$PAGE->set_title(get_string('pluginname', 'local_adminer_ui'));

// 3. Generar wstoken para el usuario actual
//    Usar external_generate_token() con el servicio adminer_service
global $DB, $USER, $CFG, $OUTPUT;
require_once($CFG->libdir . '/externallib.php');

$service = $DB->get_record('external_services', ['shortname' => 'adminer_service'], '*', MUST_EXIST);
// Buscar token existente o crear uno nuevo
$token = external_generate_token(
    EXTERNAL_TOKEN_PERMANENT,
    $service,
    $USER->id,
    $context
);

// 4. Escanear directorio app/assets/ para encontrar los archivos compilados
//    (los nombres incluyen hashes que cambian en cada build)
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
    <title>' . get_string('pluginname', 'local_adminer_ui') . '</title>';

// Inyectar CSS
if ($cssfile) {
    echo '<link rel="stylesheet" href="' .
         (new moodle_url("/local/adminer_ui/app/assets/{$cssfile}"))->out() . '">';
}

// Inyectar config JS global (ANTES del bundle)
echo '<script>
window.ADMINER_CONFIG = {
    token: ' . json_encode($token) . ',
    moodleUrl: ' . json_encode($CFG->wwwroot) . ',
    serviceName: "adminer_service",
    embedded: true
};
</script>';

// Google Fonts (mismas que usa la app standalone)
echo '<link rel="preconnect" href="https://fonts.googleapis.com">';
echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
echo '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">';

// Cargar chunks lazy-loaded
if (is_dir($appdir)) {
    foreach (scandir($appdir) as $file) {
        if (str_ends_with($file, '.js') && !str_starts_with($file, 'index-')) {
            echo '<link rel="modulepreload" href="' .
                 (new moodle_url("/local/adminer_ui/app/assets/{$file}"))->out() . '">';
        }
    }
}

echo '</head>
<body>
    <div id="root"></div>';

// Bundle JS principal
if ($jsfile) {
    echo '<script type="module" src="' .
         (new moodle_url("/local/adminer_ui/app/assets/{$jsfile}"))->out() . '"></script>';
}

echo '</body>
</html>';
