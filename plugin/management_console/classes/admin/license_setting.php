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

namespace tool_management_console\admin;

use admin_setting;
use html_writer;
use moodle_url;
use tool_management_console\license_manager;

/**
 * Custom admin setting for Management Console license lifecycle management.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class license_setting extends admin_setting {
    /**
     * Constructor for the license setting control.
     *
     * @param string $name Setting identifier
     * @param string|null $visiblename Human readable title
     * @param string|null $description Setting description
     */
    public function __construct(
        $name = 'tool_management_console/license_panel',
        $visiblename = null,
        $description = null
    ) {
        $visiblename = $visiblename ?? get_string('license_management', 'tool_management_console');
        $description = $description ?? get_string('license_setting_desc', 'tool_management_console');
        parent::__construct($name, $visiblename, $description, '');
    }

    /**
     * Return current setting value.
     * Empty string by default so the activation textarea is not prefilled with existing key.
     *
     * @return string
     */
    public function get_setting() {
        return '';
    }

    /**
     * Validate and persist a submitted license key.
     * Empty input is treated as a no-op to allow other settings on the page to save safely.
     *
     * @param mixed $data Submitted license string
     * @return string Empty string on success, error message on failure
     */
    public function write_setting($data) {
        $trimmed = trim((string)$data);
        if ($trimmed === '') {
            return '';
        }

        $result = license_manager::save_license($trimmed);
        if (!empty($result['valid'])) {
            return '';
        }

        $statuskey = 'license_status_' . ($result['status'] ?? 'invalid_format');
        if (get_string_manager()->string_exists($statuskey, 'tool_management_console')) {
            return get_string($statuskey, 'tool_management_console');
        }

        return get_string('license_status_invalid_format', 'tool_management_console');
    }

    /**
     * Render the license management panel HTML inside the Moodle admin setting page.
     * Note: Form tags are strictly avoided because admin settings pages are already wrapped in a form.
     *
     * @param mixed $data Value passed from request/database
     * @param string $query Search query for highlighting
     * @return string HTML output
     */
    public function output_html($data, $query = '') {
        $siteid = license_manager::get_site_identifier();
        $license = license_manager::get_license_info();
        $hasstoredkey = !empty(get_config('tool_management_console', 'license_key'));
        $removelicenseurl = new moodle_url('/admin/tool/management_console/license.php');

        $content = '';

        // 1. Site Identifier Card.
        $content .= html_writer::start_div('card mb-3');
        $content .= html_writer::start_div('card-header font-weight-bold');
        $content .= get_string('license_site_id', 'tool_management_console');
        $content .= html_writer::end_div();
        $content .= html_writer::start_div('card-body');
        $content .= html_writer::tag(
            'p',
            get_string('license_site_id_help', 'tool_management_console'),
            ['class' => 'text-muted mb-2']
        );
        $content .= html_writer::start_div('input-group mb-2');
        $content .= html_writer::empty_tag('input', [
            'type' => 'text',
            'id' => 'tmc-site-id-input',
            'class' => 'form-control font-monospace',
            'value' => $siteid,
            'readonly' => 'readonly',
        ]);
        $content .= html_writer::start_div('input-group-append');
        $copyjs = "navigator.clipboard.writeText(document.getElementById('tmc-site-id-input').value)" .
            ".then(function() { alert('" .
            addslashes_js(get_string('license_copied_clipboard', 'tool_management_console')) . "'); });";
        $content .= html_writer::tag('button', get_string('license_copy_site_id', 'tool_management_console'), [
            'class' => 'btn btn-outline-secondary',
            'type' => 'button',
            'onclick' => $copyjs,
        ]);
        $content .= html_writer::end_div(); // Input-group-append.
        $content .= html_writer::end_div(); // Input-group.
        $content .= html_writer::end_div(); // Card-body.
        $content .= html_writer::end_div(); // Card.

        // 2. Current License Status Card.
        $content .= html_writer::start_div('card mb-3');
        $content .= html_writer::start_div('card-header font-weight-bold d-flex justify-content-between align-items-center');
        $content .= html_writer::span(get_string('license_details', 'tool_management_console'));
        if (!empty($license['valid'])) {
            $content .= html_writer::span(
                get_string('license_status_active', 'tool_management_console'),
                'badge bg-success text-white'
            );
        } else {
            $statuslabel = get_string('license_status_' . ($license['status'] ?? 'missing'), 'tool_management_console');
            $content .= html_writer::span($statuslabel, 'badge bg-warning text-dark');
        }
        $content .= html_writer::end_div(); // Card-header.
        $content .= html_writer::start_div('card-body');

        if (!empty($license['valid'])) {
            $content .= html_writer::start_tag('table', ['class' => 'table table-bordered mb-0']);
            $content .= html_writer::start_tag('tbody');

            $clientth = html_writer::tag('th', get_string('license_client', 'tool_management_console'), ['style' => 'width:30%']);
            $content .= html_writer::tag('tr', $clientth . html_writer::tag('td', s($license['client_name'] ?? '')));

            $tierth = html_writer::tag('th', get_string('license_tier', 'tool_management_console'));
            $content .= html_writer::tag('tr', $tierth . html_writer::tag('td', s(strtoupper($license['tier'] ?? ''))));

            $idth = html_writer::tag('th', get_string('license_id', 'tool_management_console'));
            $idval = html_writer::tag('code', s($license['license_id'] ?? ''));
            $content .= html_writer::tag('tr', $idth . html_writer::tag('td', $idval));

            $expth = html_writer::tag('th', get_string('license_expires', 'tool_management_console'));
            $expiresformatted = !empty($license['expires_at']) ? userdate($license['expires_at']) : '-';
            $content .= html_writer::tag('tr', $expth . html_writer::tag('td', $expiresformatted));

            $daysth = html_writer::tag('th', get_string('license_days_remaining', 'tool_management_console'));
            $daysleft = ($license['days_left'] ?? 0) . ' ' . get_string('license_days', 'tool_management_console');
            $content .= html_writer::tag('tr', $daysth . html_writer::tag('td', $daysleft));

            $content .= html_writer::end_tag('tbody');
            $content .= html_writer::end_tag('table');
        } else {
            $content .= html_writer::tag(
                'p',
                get_string('license_required_for_actions', 'tool_management_console'),
                ['class' => 'text-muted mb-0']
            );
        }
        $content .= html_writer::end_div(); // Card-body.
        $content .= html_writer::end_div(); // Card.

        // 3. License Activation / Update Card.
        $content .= html_writer::start_div('card mb-3');
        $content .= html_writer::start_div('card-header font-weight-bold');
        $cardtitle = !empty($license['valid']) ?
            get_string('license_update_title', 'tool_management_console') :
            get_string('license_activate_title', 'tool_management_console');
        $content .= $cardtitle;
        $content .= html_writer::end_div();
        $content .= html_writer::start_div('card-body');

        $content .= html_writer::tag(
            'label',
            get_string('license_key_input', 'tool_management_console'),
            ['for' => $this->get_id(), 'class' => 'form-label']
        );
        $content .= html_writer::tag('textarea', s((string)$data), [
            'name' => $this->get_full_name(),
            'id' => $this->get_id(),
            'rows' => 4,
            'class' => 'form-control font-monospace mb-2',
            'placeholder' => 'TMC-eyJ...',
        ]);
        $content .= html_writer::tag(
            'small',
            get_string('license_setting_desc', 'tool_management_console'),
            ['class' => 'form-text text-muted']
        );
        $content .= html_writer::end_div(); // Card-body.
        $content .= html_writer::end_div(); // Card.

        // 4. Remove License Action (formaction to license.php).
        if ($hasstoredkey) {
            $content .= html_writer::start_div('card border-danger mb-3');
            $content .= html_writer::start_div('card-header bg-danger text-white font-weight-bold');
            $content .= get_string('license_remove', 'tool_management_console');
            $content .= html_writer::end_div();
            $content .= html_writer::start_div('card-body');
            $content .= html_writer::tag(
                'p',
                get_string('license_remove_warning', 'tool_management_console'),
                ['class' => 'text-muted mb-3']
            );
            $confirmremove = "return confirm('" .
                addslashes_js(get_string('license_remove_confirm', 'tool_management_console')) . "');";
            $content .= html_writer::empty_tag('input', [
                'type' => 'submit',
                'name' => 'action',
                'value' => 'remove',
                'formaction' => $removelicenseurl->out(false),
                'class' => 'btn btn-danger',
                'onclick' => $confirmremove,
            ]);
            $content .= html_writer::end_div(); // Card-body.
            $content .= html_writer::end_div(); // Card.
        }

        return format_admin_setting(
            $this,
            $this->visiblename,
            $content,
            $this->description,
            false,
            '',
            null,
            $query
        );
    }
}
