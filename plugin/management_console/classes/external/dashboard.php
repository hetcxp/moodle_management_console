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
 * External service for dashboard in tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\external;

use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Dashboard external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class dashboard extends external_api {
    /**
     * Describes the parameters for get_dashboard.
     *
     * @return external_function_parameters
     */
    public static function get_dashboard_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Returns dashboard metrics and statistics.
     *
     * @return array
     */
    public static function get_dashboard(): array {
        global $DB, $CFG;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/site:config', $context);

        $coursestotal = (int)$DB->count_records_select('course', 'id <> 1');
        $coursesactive = (int)$DB->count_records_select('course', 'id <> 1 AND visible = 1');
        $coursesinactive = (int)$DB->count_records_select('course', 'id <> 1 AND visible = 0');

        $guestid = $CFG->siteguest ?? 0;
        $usersql = 'deleted = 0 AND id <> 1 AND id <> ?';
        $userstotal = (int)$DB->count_records_select('user', $usersql, [$guestid]);
        $usersactivesql = 'deleted = 0 AND suspended = 0 AND id <> 1 AND id <> ?';
        $usersactive = (int)$DB->count_records_select('user', $usersactivesql, [$guestid]);
        $usersinactivesql = 'deleted = 0 AND suspended = 1 AND id <> 1 AND id <> ?';
        $usersinactive = (int)$DB->count_records_select('user', $usersinactivesql, [$guestid]);

        $cohortstotal = (int)$DB->count_records('cohort');
        $cohortsuserstotal = (int)$DB->count_records('cohort_members');

        $categoriestotal = (int)$DB->count_records('course_categories');

        return [
            'courses_total'       => $coursestotal,
            'courses_active'      => $coursesactive,
            'courses_inactive'    => $coursesinactive,
            'users_total'         => $userstotal,
            'users_active'        => $usersactive,
            'users_inactive'      => $usersinactive,
            'cohorts_total'       => $cohortstotal,
            'cohorts_users_total' => $cohortsuserstotal,
            'categories_total'    => $categoriestotal,
        ];
    }

    /**
     * Describes the return structure for get_dashboard.
     *
     * @return external_single_structure
     */
    public static function get_dashboard_returns(): external_single_structure {
        return new external_single_structure([
            'courses_total'       => new external_value(PARAM_INT, 'Total courses excluding frontpage'),
            'courses_active'      => new external_value(PARAM_INT, 'Visible courses'),
            'courses_inactive'    => new external_value(PARAM_INT, 'Hidden courses'),
            'users_total'         => new external_value(PARAM_INT, 'Total non-deleted users'),
            'users_active'        => new external_value(PARAM_INT, 'Active users'),
            'users_inactive'      => new external_value(PARAM_INT, 'Suspended users'),
            'cohorts_total'       => new external_value(PARAM_INT, 'Total cohorts'),
            'cohorts_users_total' => new external_value(PARAM_INT, 'Total members across all cohorts'),
            'categories_total'    => new external_value(PARAM_INT, 'Total course categories'),
        ]);
    }
}
