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
 * Update feedback status use case for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\application\feedback;

use tool_management_console\repository\feedback_repository;

/**
 * Handles updating feedback ticket status and notifying the reporting user.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class update_feedback_status_usecase {
    /**
     * Executes ticket status transition.
     *
     * @param int $feedbackid Ticket ID.
     * @param string $status New status ('in_review', 'resolved', 'rejected').
     * @param string $admincomment Resolution response comment.
     * @param int $resolverid User ID of the admin modifying the ticket.
     * @return array Result payload.
     */
    public static function execute(
        int $feedbackid,
        string $status,
        string $admincomment = '',
        int $resolverid = 0
    ): array {
        global $DB;

        $feedback = feedback_repository::get_by_id($feedbackid);
        if (!$feedback) {
            return [
                'success' => false,
                'message' => 'Ticket no encontrado.',
            ];
        }

        $validstatuses = ['new', 'in_review', 'resolved', 'rejected'];
        if (!in_array($status, $validstatuses, true)) {
            return [
                'success' => false,
                'message' => 'Estado no válido.',
            ];
        }

        $resolver = $DB->get_record('user', ['id' => $resolverid, 'deleted' => 0]);
        if (!$resolver) {
            return [
                'success' => false,
                'message' => 'Usuario resolutor no válido.',
            ];
        }

        $cleancomment = trim(clean_text($admincomment, FORMAT_PLAIN));
        if (mb_strlen($cleancomment) > 5000) {
            $cleancomment = mb_substr($cleancomment, 0, 5000);
        }

        // 1. Update in repository.
        $updated = feedback_repository::update_status($feedbackid, $status, $cleancomment, $resolverid);
        if (!$updated) {
            return [
                'success' => false,
                'message' => 'No se pudo actualizar el ticket en base de datos.',
            ];
        }

        // 2. Notify the original reporting user if status has changed.
        if (in_array($status, ['in_review', 'resolved', 'rejected'], true)) {
            feedback_notification_service::notify_user_resolution(
                $feedbackid,
                $feedback,
                $status,
                $cleancomment,
                $resolver
            );
        }

        return [
            'success' => true,
            'message' => 'Ticket actualizado correctamente.',
        ];
    }
}
