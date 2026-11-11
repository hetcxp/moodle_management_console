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
 * Privacy provider implementation for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\privacy;

use context;
use core\context\system;
use core_privacy\local\metadata\collection;
use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\approved_userlist;
use core_privacy\local\request\contextlist;
use core_privacy\local\request\transform;
use core_privacy\local\request\userlist;
use core_privacy\local\request\writer;
use tool_management_console\repository\feedback_repository;

/**
 * Privacy API provider for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class provider implements
    \core_privacy\local\metadata\provider,
    \core_privacy\local\request\core_userlist_provider,
    \core_privacy\local\request\plugin\provider {
    /**
     * Returns metadata about the personal data stored by this plugin.
     *
     * @param collection $collection The initialised collection to add items to.
     * @return collection A listing of user data stored through this plugin.
     */
    public static function get_metadata(collection $collection): collection {
        $collection->link_subsystem('core_files', 'privacy:metadata:core_files');

        $collection->add_database_table(
            'tool_mng_feedback',
            [
                'userid'       => 'privacy:metadata:tool_mng_feedback:userid',
                'type'         => 'privacy:metadata:tool_mng_feedback:type',
                'description'  => 'privacy:metadata:tool_mng_feedback:description',
                'admincomment' => 'privacy:metadata:tool_mng_feedback:admincomment',
                'pageurl'      => 'privacy:metadata:tool_mng_feedback:pageurl',
                'useragent'    => 'privacy:metadata:tool_mng_feedback:useragent',
                'resolution'   => 'privacy:metadata:tool_mng_feedback:resolution',
                'status'       => 'privacy:metadata:tool_mng_feedback:status',
                'assignedto'   => 'privacy:metadata:tool_mng_feedback:assignedto',
                'timecreated'  => 'privacy:metadata:tool_mng_feedback:timecreated',
                'timemodified' => 'privacy:metadata:tool_mng_feedback:timemodified',
            ],
            'privacy:metadata:tool_mng_feedback'
        );

        return $collection;
    }

    /**
     * Get the list of contexts that contain user information for the specified user.
     *
     * @param int $userid The user to search.
     * @return contextlist The contextlist containing the list of contexts.
     */
    public static function get_contexts_for_userid(int $userid): contextlist {
        $contextlist = new contextlist();

        if (feedback_repository::has_user_data($userid)) {
            $contextlist->add_system_context();
        }

        return $contextlist;
    }

    /**
     * Get the list of users who have data within a specific context.
     *
     * @param userlist $userlist The userlist to add users to.
     * @return void
     */
    public static function get_users_in_context(userlist $userlist): void {
        $context = $userlist->get_context();
        if ($context->contextlevel != CONTEXT_SYSTEM) {
            return;
        }

        $userids = feedback_repository::get_all_involved_userids();
        if (!empty($userids)) {
            $userlist->add_users($userids);
        }
    }

    /**
     * Export all user data for the specified user, in the specified contexts.
     *
     * @param approved_contextlist $contextlist The approved contexts to export information for.
     * @return void
     */
    public static function export_user_data(approved_contextlist $contextlist): void {
        $sysctx = system::instance();
        if (!in_array($sysctx->id, $contextlist->get_contextids())) {
            return;
        }

        $user = $contextlist->get_user();
        $userid = (int)$user->id;
        $records = feedback_repository::get_user_privacy_records($userid);
        if (empty($records)) {
            return;
        }

        $subcontext = [
            get_string('pluginname', 'tool_management_console'),
            get_string('privacy:feedbackpath', 'tool_management_console'),
        ];

        $writer = writer::with_context($sysctx);

        foreach ($records as $record) {
            $ticketcontext = array_merge($subcontext, ["ticket_{$record->id}"]);
            $ticketdata = (object)[
                'type'         => $record->type,
                'description'  => $record->description,
                'admincomment' => $record->admincomment,
                'pageurl'      => $record->pageurl,
                'useragent'    => $record->useragent,
                'resolution'   => $record->resolution,
                'status'       => $record->status,
                'assignedto'   => $record->assignedto,
                'timecreated'  => transform::datetime($record->timecreated),
                'timemodified' => transform::datetime($record->timemodified),
            ];

            $writer->export_data($ticketcontext, $ticketdata);

            if ((int)$record->userid === $userid) {
                $writer->export_area_files(
                    $ticketcontext,
                    'tool_management_console',
                    'feedback_screenshot',
                    $record->id
                );
            }
        }
    }

    /**
     * Delete all data for all users in the specified context.
     *
     * @param context $context The specific context to delete data for.
     * @return void
     */
    public static function delete_data_for_all_users_in_context(context $context): void {
        if ($context->contextlevel != CONTEXT_SYSTEM) {
            return;
        }

        $userids = feedback_repository::get_all_involved_userids();
        if (empty($userids)) {
            return;
        }

        $sysctx = system::instance();
        $ticketids = feedback_repository::get_feedback_ids_by_userids($userids);
        $fs = get_file_storage();

        foreach ($ticketids as $ticketid) {
            $fs->delete_area_files($sysctx->id, 'tool_management_console', 'feedback_screenshot', $ticketid);
        }

        feedback_repository::anonymize_users_feedback($userids);

        $fallbackadminid = self::resolve_fallback_admin_id([]);
        feedback_repository::reassign_assigned_tickets($userids, $fallbackadminid);
    }

    /**
     * Delete all user data for the specified user, in the specified contexts.
     *
     * @param approved_contextlist $contextlist The approved contexts and user information to delete information for.
     * @return void
     */
    public static function delete_data_for_user(approved_contextlist $contextlist): void {
        $sysctx = system::instance();
        if (!in_array($sysctx->id, $contextlist->get_contextids())) {
            return;
        }

        $userid = (int)$contextlist->get_user()->id;
        self::anonymize_and_reassign([$userid]);
    }

    /**
     * Delete multiple users within a single context.
     *
     * @param approved_userlist $userlist The approved context and user information to delete information for.
     * @return void
     */
    public static function delete_data_for_users(approved_userlist $userlist): void {
        if ($userlist->get_context()->contextlevel != CONTEXT_SYSTEM) {
            return;
        }

        self::anonymize_and_reassign($userlist->get_userids());
    }

    /**
     * Anonymize feedback tickets and reassign tickets for specified user IDs.
     *
     * @param array $userids Array of user IDs.
     * @return void
     */
    protected static function anonymize_and_reassign(array $userids): void {
        $userids = array_values(array_unique(array_filter(array_map('intval', $userids), function (int $id): bool {
            return $id > 0;
        })));

        if (empty($userids)) {
            return;
        }

        $sysctx = system::instance();
        $ticketids = feedback_repository::get_feedback_ids_by_userids($userids);
        $fs = get_file_storage();

        foreach ($ticketids as $ticketid) {
            $fs->delete_area_files($sysctx->id, 'tool_management_console', 'feedback_screenshot', $ticketid);
        }

        feedback_repository::anonymize_users_feedback($userids);

        $fallbackadminid = self::resolve_fallback_admin_id($userids);
        feedback_repository::reassign_assigned_tickets($userids, $fallbackadminid);
    }

    /**
     * Resolve the fallback admin ID when reassigning tickets.
     *
     * @param int[] $deleteduserids User IDs being deleted/anonymized.
     * @return int|null Primary or first available admin ID not in deleted list, or null.
     */
    protected static function resolve_fallback_admin_id(array $deleteduserids): ?int {
        $admin = get_admin();
        if ($admin && !in_array((int)$admin->id, $deleteduserids, true)) {
            return (int)$admin->id;
        }

        $admins = get_admins();
        foreach ($admins as $item) {
            if (!in_array((int)$item->id, $deleteduserids, true)) {
                return (int)$item->id;
            }
        }

        return null;
    }
}
