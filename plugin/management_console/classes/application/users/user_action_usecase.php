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
 * Use case for user management actions (suspend, activate, delete, message, reset password).
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\application\users;

use context_system;
use core\message\message;
use stdClass;
use tool_management_console\cache_manager;
use tool_management_console\license_manager;
use tool_management_console\moodle_version_helper;
use tool_management_console\repository\user_repository;

/**
 * Domain use case for executing operations on users.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class user_action_usecase {
    /**
     * Execute user action with transaction safety.
     *
     * @param string $action Action key.
     * @param array $userids Array of target user IDs.
     * @param string $messagetext Optional message content.
     * @return array
     */
    public static function execute(string $action, array $userids, string $messagetext = ''): array {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/user/lib.php');

        $allowed = ['suspend', 'activate', 'delete', 'message', 'send_temp_password', 'reset_password'];
        if (!in_array($action, $allowed, true)) {
            return [
                'success'       => false,
                'message'       => 'Invalid action: ' . $action,
                'affectedcount' => 0,
            ];
        }

        $rawuserids = (array)$userids;
        $cleanuserids = array_values(array_filter(array_map('intval', $rawuserids), fn($id) => $id > 0));
        if (!empty($rawuserids) && empty($cleanuserids)) {
            return [
                'success'       => false,
                'message'       => 'No valid user IDs provided.',
                'affectedcount' => 0,
            ];
        }
        $context = context_system::instance();
        $transaction = $DB->start_delegated_transaction();

        try {
            $affected = self::dispatch_action($action, $cleanuserids, $messagetext, $context);
            if ($affected === -1) {
                $transaction->allow_commit();
                return [
                    'success'       => false,
                    'message'       => 'Invalid action: ' . $action,
                    'affectedcount' => 0,
                ];
            }

            self::post_action_cleanup($action);
            $transaction->allow_commit();

            return [
                'success'       => true,
                'message'       => "User action {$action} executed on {$affected} users.",
                'affectedcount' => $affected,
            ];
        } catch (\Throwable $e) {
            try {
                $transaction->rollback($e);
            } catch (\Throwable $rollbackex) {
                if ($rollbackex !== $e) {
                    throw $rollbackex;
                }
            }
            $isnoperm = ($e instanceof \moodle_exception && $e->errorcode === 'nopermissions');
            if ($e instanceof \required_capability_exception || $isnoperm) {
                throw $e;
            }
            if ($e instanceof \dml_exception) {
                debugging(get_class($e) . ': Database query execution error', DEBUG_DEVELOPER);
            } else {
                debugging($e->getMessage(), DEBUG_DEVELOPER);
            }
            $message = ($e instanceof \moodle_exception && !($e instanceof \dml_exception))
                ? $e->getMessage()
                : 'An error occurred while processing the user action.';
            return [
                'success'       => false,
                'message'       => $message,
                'affectedcount' => 0,
            ];
        }
    }

    /**
     * Dispatch user action to status or communication handlers.
     *
     * @param string $action
     * @param array $userids
     * @param string $messagetext
     * @param context_system $context
     * @return int Affected count, or -1 if invalid.
     */
    private static function dispatch_action(
        string $action,
        array $userids,
        string $messagetext,
        context_system $context
    ): int {
        if ($action === 'suspend' || $action === 'activate' || $action === 'delete') {
            return self::dispatch_status_action($action, $userids, $context);
        }
        return self::dispatch_comm_action($action, $userids, $messagetext, $context);
    }

    /**
     * Dispatch status change actions.
     *
     * @param string $action
     * @param array $userids
     * @param context_system $context
     * @return int
     */
    private static function dispatch_status_action(string $action, array $userids, context_system $context): int {
        if ($action === 'suspend') {
            return self::handle_suspend($userids, $context);
        }
        if ($action === 'activate') {
            return self::handle_activate($userids, $context);
        }
        if ($action === 'delete') {
            return self::handle_delete($userids, $context);
        }
        return -1;
    }

    /**
     * Dispatch communication and password actions.
     *
     * @param string $action
     * @param array $userids
     * @param string $messagetext
     * @param context_system $context
     * @return int
     */
    private static function dispatch_comm_action(
        string $action,
        array $userids,
        string $messagetext,
        context_system $context
    ): int {
        if ($action === 'message') {
            return self::handle_message($userids, $messagetext);
        }
        if ($action === 'send_temp_password' || $action === 'reset_password') {
            return self::handle_password_reset($userids, $context);
        }
        return -1;
    }

    /**
     * Invalidate caches if relevant.
     *
     * @param string $action
     * @return void
     */
    private static function post_action_cleanup(string $action): void {
        if ($action !== 'send_temp_password' && $action !== 'reset_password') {
            cache_manager::invalidate_kpis('user_kpis');
        }
    }

    /**
     * Suspend active users.
     *
     * @param array $userids User IDs.
     * @param context_system $context System context.
     * @return int Count of affected users.
     */
    private static function handle_suspend(array $userids, context_system $context): int {
        require_capability('moodle/user:update', $context);
        license_manager::require_active_license();

        $affected = 0;
        foreach ($userids as $uid) {
            if ($uid <= 1 || is_siteadmin($uid)) {
                continue;
            }
            $user = user_repository::get_user($uid);
            if ($user && !$user->suspended) {
                $user->suspended = 1;
                self::update_user_record($user);
                $affected++;
            }
        }
        return $affected;
    }

    /**
     * Activate suspended users.
     *
     * @param array $userids User IDs.
     * @param context_system $context System context.
     * @return int Count of affected users.
     */
    private static function handle_activate(array $userids, context_system $context): int {
        require_capability('moodle/user:update', $context);
        license_manager::require_active_license();

        $affected = 0;
        foreach ($userids as $uid) {
            if ($uid <= 1) {
                continue;
            }
            $user = user_repository::get_user($uid);
            if ($user && $user->suspended) {
                $user->suspended = 0;
                self::update_user_record($user);
                $affected++;
            }
        }
        return $affected;
    }

    /**
     * Delete users.
     *
     * @param array $userids User IDs.
     * @param context_system $context System context.
     * @return int Count of affected users.
     */
    private static function handle_delete(array $userids, context_system $context): int {
        require_capability('moodle/user:delete', $context);
        license_manager::require_active_license();

        $affected = 0;
        foreach ($userids as $uid) {
            if ($uid <= 1 || is_siteadmin($uid)) {
                continue;
            }
            $user = user_repository::get_user($uid);
            if ($user) {
                delete_user($user);
                $affected++;
            }
        }
        return $affected;
    }

    /**
     * Send direct message to users.
     *
     * @param array $userids User IDs.
     * @param string $messagetext Message body.
     * @return int Count of sent messages.
     */
    private static function handle_message(array $userids, string $messagetext): int {
        global $USER;
        license_manager::require_active_license();

        if (empty($messagetext)) {
            return 0;
        }

        $cleanmsg = clean_text(substr($messagetext, 0, 65535), FORMAT_HTML);
        $affected = 0;

        foreach ($userids as $uid) {
            $recipient = user_repository::get_user($uid);
            if (!$recipient) {
                continue;
            }

            $message = new message();
            $message->component         = 'moodle';
            $message->name              = 'instantmessage';
            $message->userfrom          = $USER;
            $message->userto            = $recipient;
            $message->subject           = 'Mensaje';
            $message->fullmessage       = $cleanmsg;
            $message->fullmessageformat = FORMAT_HTML;
            $message->fullmessagehtml   = $cleanmsg;
            $message->smallmessage      = strip_tags($cleanmsg);

            message_send($message);
            $affected++;
        }
        return $affected;
    }

    /**
     * Reset password and notify user via email.
     *
     * @param array $userids User IDs.
     * @param context_system $context System context.
     * @return int Count of sent emails.
     */
    private static function handle_password_reset(array $userids, context_system $context): int {
        require_capability('moodle/user:update', $context);
        license_manager::require_active_license();

        $affected = 0;
        foreach ($userids as $uid) {
            if ($uid <= 1) {
                continue;
            }
            $user = user_repository::get_user($uid);
            if ($user && empty($user->deleted) && $user->auth !== 'nologin') {
                if (setnew_password_and_mail($user)) {
                    $affected++;
                }
            }
        }
        return $affected;
    }

    /**
     * Helper to safely call Moodle user update function depending on version.
     *
     * @param stdClass $user User object.
     * @return void
     */
    private static function update_user_record(stdClass $user): void {
        moodle_version_helper::update_user($user, false, false);
    }
}
