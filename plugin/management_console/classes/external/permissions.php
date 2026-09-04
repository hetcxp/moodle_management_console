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
 * External service for permissions in tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\external;

defined('MOODLE_INTERNAL') || die();

use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Permissions external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class permissions extends external_api {

    public static function get_permissions_parameters() {
        return new external_function_parameters([]);
    }

    public static function get_permissions() {
        global $USER;

        $context = context_system::instance();
        self::validate_context($context);

        return [
            'is_siteadmin'          => is_siteadmin($USER->id) ? 1 : 0,
            'can_config_site'       => has_capability('moodle/site:config', $context) ? 1 : 0,
            'can_view_courses'      => has_capability('moodle/course:view', $context) ? 1 : 0,
            'can_create_courses'    => has_capability('moodle/course:create', $context) ? 1 : 0,
            'can_update_courses'    => (has_capability('moodle/course:update', $context) || has_capability('moodle/course:visibility', $context)) ? 1 : 0,
            'can_delete_courses'    => has_capability('moodle/course:delete', $context) ? 1 : 0,
            'can_manage_categories' => has_capability('moodle/category:manage', $context) ? 1 : 0,
            'can_view_users'        => has_capability('moodle/user:viewalldetails', $context) ? 1 : 0,
            'can_update_users'      => has_capability('moodle/user:update', $context) ? 1 : 0,
            'can_delete_users'      => has_capability('moodle/user:delete', $context) ? 1 : 0,
            'can_view_cohorts'      => has_capability('moodle/cohort:view', $context) ? 1 : 0,
            'can_view_competencies' => (has_capability('moodle/competency:competencyview', $context) || has_capability('moodle/competency:competencymanage', $context) || is_siteadmin($USER->id)) ? 1 : 0,
            'can_manage_competencies' => (has_capability('moodle/competency:competencymanage', $context) || is_siteadmin($USER->id)) ? 1 : 0,
        ];
    }

    public static function get_permissions_returns() {
        return new external_single_structure([
            'is_siteadmin'          => new external_value(PARAM_INT, '1 if site administrator'),
            'can_config_site'       => new external_value(PARAM_INT, '1 if user can configure site'),
            'can_view_courses'      => new external_value(PARAM_INT, '1 if user can view courses'),
            'can_create_courses'    => new external_value(PARAM_INT, '1 if user can create courses'),
            'can_update_courses'    => new external_value(PARAM_INT, '1 if user can edit/hide courses'),
            'can_delete_courses'    => new external_value(PARAM_INT, '1 if user can delete courses'),
            'can_manage_categories' => new external_value(PARAM_INT, '1 if user can manage categories'),
            'can_view_users'        => new external_value(PARAM_INT, '1 if user can view users list'),
            'can_update_users'      => new external_value(PARAM_INT, '1 if user can edit/suspend users'),
            'can_delete_users'      => new external_value(PARAM_INT, '1 if user can delete users'),
            'can_view_cohorts'      => new external_value(PARAM_INT, '1 if user can view cohorts'),
            'can_view_competencies' => new external_value(PARAM_INT, '1 if user can view competencies'),
            'can_manage_competencies' => new external_value(PARAM_INT, '1 if user can manage competencies'),
        ]);
    }
}
