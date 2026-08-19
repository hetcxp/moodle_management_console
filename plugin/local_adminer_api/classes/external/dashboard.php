<?php
namespace local_adminer_api\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use context_system;

defined('MOODLE_INTERNAL') || die();

class dashboard extends external_api {

    public static function get_dashboard_parameters() {
        return new external_function_parameters([]);
    }

    public static function get_dashboard() {
        global $DB, $CFG;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/site:config', $context);

        $courses_total = (int)$DB->count_records_select('course', 'id <> 1');
        $courses_active = (int)$DB->count_records_select('course', 'id <> 1 AND visible = 1');
        $courses_inactive = (int)$DB->count_records_select('course', 'id <> 1 AND visible = 0');

        $guestid = $CFG->siteguest ?? 0;
        $users_total = (int)$DB->count_records_select('user', 'deleted = 0 AND id <> 1 AND id <> ?', [$guestid]);
        $users_active = (int)$DB->count_records_select('user', 'deleted = 0 AND suspended = 0 AND id <> 1 AND id <> ?', [$guestid]);
        $users_inactive = (int)$DB->count_records_select('user', 'deleted = 0 AND suspended = 1 AND id <> 1 AND id <> ?', [$guestid]);

        $cohorts_total = (int)$DB->count_records('cohort');
        $cohorts_users_total = (int)$DB->count_records('cohort_members');

        $categories_total = (int)$DB->count_records('course_categories');

        return [
            'courses_total'       => $courses_total,
            'courses_active'      => $courses_active,
            'courses_inactive'    => $courses_inactive,
            'users_total'         => $users_total,
            'users_active'        => $users_active,
            'users_inactive'      => $users_inactive,
            'cohorts_total'       => $cohorts_total,
            'cohorts_users_total' => $cohorts_users_total,
            'categories_total'    => $categories_total,
        ];
    }

    public static function get_dashboard_returns() {
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
