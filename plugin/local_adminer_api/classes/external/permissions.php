<?php
namespace local_adminer_api\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use context_system;

defined('MOODLE_INTERNAL') || die();

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
        ]);
    }
}
