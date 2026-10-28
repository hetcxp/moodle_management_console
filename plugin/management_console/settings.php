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
 * Settings configuration for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $ADMIN->add(
        'tools',
        new admin_externalpage(
            'tool_management_console',
            get_string('pluginname', 'tool_management_console'),
            new moodle_url('/admin/tool/management_console/index.php'),
            'tool/management_console:access'
        )
    );
    $ADMIN->add(
        'tools',
        new admin_externalpage(
            'tool_management_console_license',
            get_string('license_settings', 'tool_management_console'),
            new moodle_url('/admin/tool/management_console/license.php'),
            'moodle/site:config'
        )
    );

    $settings = new admin_settingpage(
        'tool_management_console_settings',
        get_string('settings', 'tool_management_console')
    );
    $settings->add(new admin_setting_configcheckbox(
        'tool_management_console/enable_feedback',
        get_string('enable_feedback', 'tool_management_console'),
        get_string('enable_feedback_desc', 'tool_management_console'),
        1
    ));
    $settings->add(new admin_setting_configtext(
        'tool_management_console/supportuserid',
        get_string('supportuserid', 'tool_management_console'),
        get_string('supportuserid_desc', 'tool_management_console'),
        '',
        PARAM_INT
    ));
    $ADMIN->add('tools', $settings);
}
