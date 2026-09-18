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
 * External service for user learning plans in tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\external;

defined('MOODLE_INTERNAL') || die();

use context_user;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * User learning plans external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class user_plans extends external_api {

    /**
     * Parameter definition for user_plan_action.
     *
     * @return external_function_parameters
     */
    public static function user_plan_action_parameters() {
        return new external_function_parameters([
            'action'       => new external_value(PARAM_ALPHANUMEXT, 'Action: assign_competency, remove_competency'),
            'userid'       => new external_value(PARAM_INT, 'User ID (for single user operation)', VALUE_DEFAULT, 0),
            'competencyid' => new external_value(PARAM_INT, 'Competency ID'),
            'userids'      => new external_multiple_structure(
                new external_value(PARAM_INT, 'User ID'),
                'List of user IDs for batch operations',
                VALUE_DEFAULT,
                []
            ),
        ]);
    }

    /**
     * Assign or remove a competency to/from a user's dedicated personal learning plan.
     *
     * @param string $action
     * @param int $userid
     * @param int $competencyid
     * @param array $userids
     * @return array
     * @throws \moodle_exception
     */
    public static function user_plan_action($action, $userid = 0, $competencyid = 0, $userids = []) {
        global $DB;

        $params = self::validate_parameters(self::user_plan_action_parameters(), [
            'action'       => $action,
            'userid'       => $userid,
            'competencyid' => $competencyid,
            'userids'      => $userids,
        ]);

        $act = $params['action'];
        $cid = (int)$params['competencyid'];
        $batch_uids = !empty($params['userids']) ? $params['userids'] : [];

        if (!empty($batch_uids)) {
            $uids = array_values(array_filter(array_unique(array_map('intval', $batch_uids))));
        } else if (!empty($params['userid'])) {
            $uids = [(int)$params['userid']];
        } else {
            throw new \moodle_exception('missingparam', 'error', '', 'userid');
        }

        $planname = 'Plan de Competencias Personales';
        $last_planid = 0;
        $any_already_existed = false;

        foreach ($uids as $uid) {
            $context = context_user::instance($uid);
            self::validate_context($context);
            require_capability('moodle/competency:planmanage', $context);

            // 1. Localizar plan ad-hoc individual (sin plantilla asociada)
            $targetplan = null;
            $plans = \core_competency\api::list_user_plans($uid);
            foreach ($plans as $p) {
                $name = is_object($p) && method_exists($p, 'get') ? $p->get('name') : ($p->name ?? '');
                $templateid = is_object($p) && method_exists($p, 'get') ? $p->get('templateid') : ($p->templateid ?? null);
                if (empty($templateid) && $name === $planname) {
                    $targetplan = $p;
                    break;
                }
            }

            if ($act === 'assign_competency') {
                // Si no existe, crear el plan ad-hoc
                if (!$targetplan) {
                    $record = new \stdClass();
                    $record->userid = $uid;
                    $record->name = $planname;
                    $record->description = 'Plan individual ad-hoc para seguimiento y acreditación de competencias personales.';
                    $record->descriptionformat = FORMAT_HTML;
                    $record->status = defined('\core_competency\plan::STATUS_ACTIVE') ? \core_competency\plan::STATUS_ACTIVE : 1;

                    $targetplan = \core_competency\api::create_plan($record);
                }

                $planid = is_object($targetplan) && method_exists($targetplan, 'get') ? (int)$targetplan->get('id') : (int)$targetplan->id;
                $last_planid = $planid;

                // Si el plan existe pero está completado, reabrirlo
                $status = is_object($targetplan) && method_exists($targetplan, 'get') ? (int)$targetplan->get('status') : (int)($targetplan->status ?? 1);
                $complete_status = defined('\core_competency\plan::STATUS_COMPLETE') ? \core_competency\plan::STATUS_COMPLETE : 2;
                if ($status === $complete_status) {
                    \core_competency\api::reopen_plan($planid);
                }

                // Verificar si ya está vinculada la competencia al plan
                $exists = $DB->record_exists('competency_plancomp', [
                    'planid'       => $planid,
                    'competencyid' => $cid,
                ]);

                if ($exists) {
                    $any_already_existed = true;
                } else {
                    \core_competency\api::add_competency_to_plan($planid, $cid);
                }

            } else if ($act === 'remove_competency') {
                $planid = 0;
                if ($targetplan) {
                    $planid = is_object($targetplan) && method_exists($targetplan, 'get') ? (int)$targetplan->get('id') : (int)$targetplan->id;

                    $exists = $DB->record_exists('competency_plancomp', [
                        'planid'       => $planid,
                        'competencyid' => $cid,
                    ]);

                    if ($exists) {
                        \core_competency\api::remove_competency_from_plan($planid, $cid);
                    }

                    // Si no quedan competencias en el plan ad-hoc, eliminar el plan para evitar residuos
                    $remaining = $DB->count_records('competency_plancomp', ['planid' => $planid]);
                    if ($remaining === 0) {
                        \core_competency\api::delete_plan($planid);
                        $planid = 0;
                    }
                }
                $last_planid = $planid;

            } else {
                throw new \moodle_exception('invalidaction', 'error');
            }
        }

        return [
            'planid'          => (int)$last_planid,
            'competencyid'    => $cid,
            'already_existed' => (bool)$any_already_existed,
            'success'         => true,
            'processed_count' => count($uids),
        ];
    }

    /**
     * Return structure for user_plan_action.
     *
     * @return external_single_structure
     */
    public static function user_plan_action_returns() {
        return new external_single_structure([
            'planid'          => new external_value(PARAM_INT, 'Plan ID'),
            'competencyid'    => new external_value(PARAM_INT, 'Competency ID'),
            'already_existed' => new external_value(PARAM_BOOL, 'True if already in plan'),
            'success'         => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'processed_count' => new external_value(PARAM_INT, 'Count of processed users', VALUE_DEFAULT, 1),
        ]);
    }
}
