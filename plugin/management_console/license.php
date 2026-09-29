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
 * Native settings and license administration page for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');
require_once($CFG->libdir . '/adminlib.php');

// 1. Auth and capability check.
require_login();
$context = context_system::instance();
require_capability('moodle/site:config', $context);

admin_externalpage_setup('tool_management_console_license');

$pageurl = new moodle_url('/admin/tool/management_console/license.php');
$consoleurl = new moodle_url('/admin/tool/management_console/index.php');

$error = null;
$action = optional_param('action', '', PARAM_ALPHA);

// 2. Handle POST mutations.
if ($action === 'activate' && data_submitted()) {
    require_sesskey();
    $key = optional_param('license_key', '', PARAM_RAW);
    $result = \tool_management_console\license_manager::save_license($key);
    if ($result['valid']) {
        redirect(
            $pageurl,
            get_string('license_saved', 'tool_management_console'),
            null,
            \core\output\notification::NOTIFY_SUCCESS
        );
    } else {
        $statuskey = 'license_status_' . $result['status'];
        if (get_string_manager()->string_exists($statuskey, 'tool_management_console')) {
            $error = get_string($statuskey, 'tool_management_console');
        } else {
            $error = get_string('license_status_invalid_format', 'tool_management_console');
        }
    }
} else if ($action === 'remove' && data_submitted()) {
    require_sesskey();
    \tool_management_console\license_manager::remove_license();
    redirect(
        $pageurl,
        get_string('license_removed', 'tool_management_console'),
        null,
        \core\output\notification::NOTIFY_INFO
    );
}

// 3. Page data.
$siteid = \tool_management_console\license_manager::get_site_identifier();
$license = \tool_management_console\license_manager::get_license_info();

// 4. Render output.
echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('license_management', 'tool_management_console'));

if (!empty($error)) {
    echo $OUTPUT->notification($error, \core\output\notification::NOTIFY_ERROR);
}

// Site Identifier Card.
echo html_writer::start_div('card mb-4');
echo html_writer::start_div('card-header font-weight-bold');
echo get_string('license_site_id', 'tool_management_console');
echo html_writer::end_div();
echo html_writer::start_div('card-body');
echo html_writer::tag(
    'p',
    'Proporcione este Identificador de Sitio a su proveedor para generar o renovar su clave de licencia:',
    ['class' => 'text-muted mb-2']
);
echo html_writer::start_div('input-group mb-2');
echo html_writer::empty_tag('input', [
    'type' => 'text',
    'id' => 'site-id-input',
    'class' => 'form-control font-monospace',
    'value' => $siteid,
    'readonly' => 'readonly',
]);
echo html_writer::start_div('input-group-append');
$copyonclick = "navigator.clipboard.writeText(document.getElementById('site-id-input').value)" .
    ".then(function() { alert('ID copiado al portapapeles'); });";
echo html_writer::tag('button', get_string('license_copy_site_id', 'tool_management_console'), [
    'class' => 'btn btn-outline-secondary',
    'type' => 'button',
    'onclick' => $copyonclick,
]);
echo html_writer::end_div();
echo html_writer::end_div();
echo html_writer::end_div();
echo html_writer::end_div();

// Current License Status Card.
echo html_writer::start_div('card mb-4');
echo html_writer::start_div('card-header font-weight-bold d-flex justify-content-between align-items-center');
echo html_writer::span(get_string('license_details', 'tool_management_console'));
if ($license['valid']) {
    echo html_writer::span(get_string('license_status_active', 'tool_management_console'), 'badge bg-success text-white');
} else {
    $statusstring = get_string('license_status_' . $license['status'], 'tool_management_console');
    echo html_writer::span($statusstring, 'badge bg-warning text-dark');
}
echo html_writer::end_div();
echo html_writer::start_div('card-body');

if ($license['valid']) {
    echo html_writer::start_tag('table', ['class' => 'table table-bordered mb-3']);
    echo html_writer::start_tag('tbody');
    $clientth = html_writer::tag('th', get_string('license_client', 'tool_management_console'), ['style' => 'width:30%']);
    echo html_writer::tag('tr', $clientth . html_writer::tag('td', s($license['client_name'])));
    $tierth = html_writer::tag('th', get_string('license_tier', 'tool_management_console'));
    echo html_writer::tag('tr', $tierth . html_writer::tag('td', s(strtoupper($license['tier']))));
    $idth = html_writer::tag('th', 'ID de Licencia');
    echo html_writer::tag('tr', $idth . html_writer::tag('td', html_writer::tag('code', s($license['license_id']))));
    $expth = html_writer::tag('th', get_string('license_expires', 'tool_management_console'));
    echo html_writer::tag('tr', $expth . html_writer::tag('td', userdate($license['expires_at'])));
    $daysth = html_writer::tag('th', get_string('license_days_remaining', 'tool_management_console'));
    echo html_writer::tag('tr', $daysth . html_writer::tag('td', $license['days_left'] . ' días'));
    echo html_writer::end_tag('tbody');
    echo html_writer::end_tag('table');
} else {
    echo html_writer::tag('p', get_string('license_required_for_actions', 'tool_management_console'), ['class' => 'text-muted']);
}

echo html_writer::end_div();
echo html_writer::end_div();

// License Activation / Update Form Card.
echo html_writer::start_div('card mb-4');
echo html_writer::start_div('card-header font-weight-bold');
echo $license['valid'] ? 'Actualizar Clave de Licencia' : get_string('license_activate_title', 'tool_management_console');
echo html_writer::end_div();
echo html_writer::start_div('card-body');
echo html_writer::start_tag('form', ['method' => 'post', 'action' => $pageurl->out(false)]);
echo html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'sesskey', 'value' => sesskey()]);
echo html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'action', 'value' => 'activate']);

echo html_writer::start_div('form-group mb-3');
echo html_writer::tag('label', get_string('license_key_input', 'tool_management_console'), ['for' => 'license-key']);
echo html_writer::tag('textarea', '', [
    'name' => 'license_key',
    'id' => 'license-key',
    'rows' => 4,
    'class' => 'form-control font-monospace',
    'placeholder' => 'TMC-eyJ...',
    'required' => 'required',
]);
echo html_writer::end_div();

$btntext = $license['valid'] ? 'Actualizar Licencia' : get_string('license_activate_btn', 'tool_management_console');
echo html_writer::tag('button', $btntext, [
    'type' => 'submit',
    'class' => 'btn btn-primary',
]);
echo html_writer::end_tag('form');
echo html_writer::end_div();
echo html_writer::end_div();

// If license is valid or key is present, provide Remove License option.
if (!empty(get_config('tool_management_console', 'license_key'))) {
    echo html_writer::start_div('card border-danger mb-4');
    echo html_writer::start_div('card-header bg-danger text-white font-weight-bold');
    echo get_string('license_remove', 'tool_management_console');
    echo html_writer::end_div();
    echo html_writer::start_div('card-body');
    $removemsg = 'Si remueve la clave de licencia, la Consola de Gestión volverá a operar en modo solo lectura.';
    echo html_writer::tag('p', $removemsg, ['class' => 'text-muted mb-3']);
    $confirmjs = "return confirm('" . addslashes_js(get_string('license_remove_confirm', 'tool_management_console')) . "');";
    echo html_writer::start_tag('form', [
        'method' => 'post',
        'action' => $pageurl->out(false),
        'onsubmit' => $confirmjs,
    ]);
    echo html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'sesskey', 'value' => sesskey()]);
    echo html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'action', 'value' => 'remove']);
    echo html_writer::tag('button', get_string('license_remove', 'tool_management_console'), [
        'type' => 'submit',
        'class' => 'btn btn-danger',
    ]);
    echo html_writer::end_tag('form');
    echo html_writer::end_div();
    echo html_writer::end_div();
}

// Navigation back link.
echo html_writer::start_div('mb-4');
$backlabel = '← ' . get_string('license_back_console', 'tool_management_console');
echo html_writer::link($consoleurl, $backlabel, ['class' => 'btn btn-secondary']);
echo html_writer::end_div();

echo $OUTPUT->footer();
