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

$ADMIN->add(
    'tools',
    new admin_category(
        'tool_management_console_category',
        get_string('pluginname', 'tool_management_console')
    )
);

$ADMIN->add(
    'tool_management_console_category',
    new admin_externalpage(
        'tool_management_console',
        get_string('access_console', 'tool_management_console'),
        new moodle_url('/admin/tool/management_console/index.php'),
        'tool/management_console:access'
    )
);

if ($hassiteconfig) {
    $settings = new admin_settingpage(
        'tool_management_console_settings',
        get_string('settings', 'tool_management_console')
    );
    if ($ADMIN->fulltree) {
        // 1. Feedback & Support Section.
        $settings->add(new admin_setting_heading(
            'tool_management_console/feedback_heading',
            get_string('feedback_settings_heading', 'tool_management_console'),
            get_string('feedback_settings_heading_desc', 'tool_management_console')
        ));

        $settings->add(new admin_setting_configcheckbox(
            'tool_management_console/enable_feedback',
            get_string('enable_feedback', 'tool_management_console'),
            get_string('enable_feedback_desc', 'tool_management_console'),
            1
        ));

        $adminoptions = [
            0 => get_string('supportuserid_default', 'tool_management_console'),
        ];
        foreach (get_admins() as $admin) {
            $adminoptions[(int)$admin->id] = fullname($admin) . ' (' . $admin->email . ')';
        }

        $settings->add(new admin_setting_configselect(
            'tool_management_console/supportuserid',
            get_string('supportuserid', 'tool_management_console'),
            get_string('supportuserid_desc', 'tool_management_console'),
            0,
            $adminoptions
        ));

        // 2. License Management Section.
        $settings->add(new admin_setting_heading(
            'tool_management_console/license_heading',
            get_string('license_settings_heading', 'tool_management_console'),
            get_string('license_settings_heading_desc', 'tool_management_console')
        ));

        $settings->add(new \tool_management_console\admin\license_setting(
            'tool_management_console/license_panel',
            get_string('license_management', 'tool_management_console'),
            get_string('license_setting_desc', 'tool_management_console')
        ));
    }
    $ADMIN->add('tool_management_console_category', $settings);
}
