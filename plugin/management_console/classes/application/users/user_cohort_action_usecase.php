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
 * Use case for managing user cohort memberships within transactional boundaries.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\application\users;

use moodle_exception;
use required_capability_exception;
use Throwable;
use tool_management_console\repository\user_repository;

/**
 * User cohort action use case class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class user_cohort_action_usecase {
    /**
     * Execute cohort membership modification for a user.
     *
     * Validates input parameters, verifies membership actions ('add' or 'remove'),
     * and performs atomic database updates with safe rollback handling.
     *
     * @param array $params Parameter map with 'action', 'userid', and 'cohortids'.
     * @return array Result map with 'success', 'message', and 'affectedcount'.
     * @throws required_capability_exception If authorization checks fail.
     * @throws moodle_exception If permission checks fail.
     */
    public static function execute(array $params): array {
        global $DB;

        $userid = isset($params['userid']) ? (int)$params['userid'] : 0;
        if ($userid <= 0) {
            return [
                'success'       => false,
                'message'       => 'Valid user ID is required.',
                'affectedcount' => 0,
            ];
        }

        $action = isset($params['action']) ? (string)$params['action'] : '';
        $allowed = ['add', 'remove'];
        if (!in_array($action, $allowed, true)) {
            return [
                'success'       => false,
                'message'       => 'Invalid cohort action.',
                'affectedcount' => 0,
            ];
        }

        $rawcohortids = isset($params['cohortids']) ? (array)$params['cohortids'] : [];
        $cohortids = array_values(array_unique(array_filter(
            array_map('intval', $rawcohortids),
            fn($id) => $id > 0
        )));

        if (empty($cohortids)) {
            return [
                'success'       => true,
                'message'       => 'No cohorts to process.',
                'affectedcount' => 0,
            ];
        }

        [$incsql, $incparams] = $DB->get_in_or_equal($cohortids, SQL_PARAMS_NAMED);
        $existingcohorts = $DB->get_fieldset_sql("SELECT id FROM {cohort} WHERE id $incsql", $incparams) ?: [];
        $cohortids = array_values(array_intersect($cohortids, array_map('intval', $existingcohorts)));

        if (empty($cohortids)) {
            return [
                'success'       => false,
                'message'       => 'None of the specified cohorts exist.',
                'affectedcount' => 0,
            ];
        }

        $user = user_repository::get_user_strict($userid);
        $affected = 0;
        $transaction = null;

        try {
            $transaction = $DB->start_delegated_transaction();

            foreach ($cohortids as $cohortid) {
                if ($action === 'add') {
                    if (!cohort_is_member($cohortid, $user->id)) {
                        cohort_add_member($cohortid, $user->id);
                        $affected++;
                    }
                } else if ($action === 'remove') {
                    if (cohort_is_member($cohortid, $user->id)) {
                        cohort_remove_member($cohortid, $user->id);
                        $affected++;
                    }
                }
            }

            $transaction->allow_commit();

            return [
                'success'       => true,
                'message'       => 'Cohorts updated for user.',
                'affectedcount' => $affected,
            ];
        } catch (Throwable $e) {
            if ($transaction && !$transaction->is_disposed()) {
                try {
                    $transaction->rollback($e);
                } catch (Throwable $rollbackex) {
                    debugging('Transaction rollback failed: ' . $rollbackex->getMessage(), DEBUG_DEVELOPER);
                }
            }

            $isnoperm = ($e instanceof moodle_exception && $e->errorcode === 'nopermissions');
            if ($e instanceof required_capability_exception || $isnoperm) {
                throw $e;
            }

            debugging('Cohort update failed: ' . get_class($e) . ' (' . $e->getCode() . ')', DEBUG_DEVELOPER);
            return [
                'success'       => false,
                'message'       => 'Failed to update user cohorts.',
                'affectedcount' => 0,
            ];
        }
    }
}
