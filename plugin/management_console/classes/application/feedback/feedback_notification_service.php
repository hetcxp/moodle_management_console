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
 * Feedback notification service for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\application\feedback;

use core\message\message;


/**
 * Dispatches notifications for feedback reports and resolutions.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class feedback_notification_service {
    /**
     * Resolves the designated support user recipient (with fallback to site admin).
     *
     * @return \stdClass User record.
     */
    public static function resolve_support_user(): \stdClass {
        global $DB;

        $supportuserid = (int)get_config('tool_management_console', 'supportuserid');
        if ($supportuserid > 0) {
            $user = $DB->get_record('user', ['id' => $supportuserid, 'deleted' => 0, 'suspended' => 0]);
            if ($user) {
                return $user;
            }
        }

        // Fallback: Primary site administrator.
        return get_admin();
    }

    /**
     * Dispatches notification to the support team for a newly submitted feedback.
     *
     * @param int $feedbackid Ticket ID.
     * @param \stdClass $feedback Feedback record.
     * @param \stdClass $submitter Submitter user record.
     * @param string|null $screenshoturl URL to the stored screenshot.
     * @return bool True if message dispatched.
     */
    public static function notify_support(
        int $feedbackid,
        \stdClass $feedback,
        \stdClass $submitter,
        ?string $screenshoturl = null
    ): bool {
        global $CFG;

        $recipient = self::resolve_support_user();
        if (!$recipient || empty($recipient->id)) {
            return false;
        }

        $type = ucfirst($feedback->type ?? 'issue');
        $subject = "[Consola de Gestión] Nuevo reporte #{$feedbackid}: {$type}";

        $text = "Nuevo reporte enviado desde la Consola de Gestión:\n\n";
        $text .= "Ticket ID: #{$feedbackid}\n";
        $text .= "Tipo: {$type}\n";
        $text .= "Usuario: " . fullname($submitter) . " ({$submitter->email})\n";
        $text .= "Página / Ruta: {$feedback->pageurl}\n";
        $text .= "Navegador: {$feedback->useragent}\n";
        $text .= "Resolución: {$feedback->resolution}\n\n";
        $text .= "Descripción:\n{$feedback->description}\n\n";
        if ($screenshoturl) {
            $text .= "Captura de pantalla: {$screenshoturl}\n";
        }

        $html = "<div style=\"font-family: sans-serif; font-size: 14px; line-height: 1.5;\">";
        $html .= "<h3 style=\"color: #0f172a; margin-bottom: 8px;\">Nuevo reporte #{$feedbackid} ({$type})</h3>";
        $html .= "<p><strong>Usuario:</strong> " . s(fullname($submitter)) . " (" . s($submitter->email) . ")<br>";
        $html .= "<strong>Ruta:</strong> <code>" . s($feedback->pageurl) . "</code><br>";
        $html .= "<strong>Resolución:</strong> " . s($feedback->resolution) . "</p>";
        $html .= "<div style=\"background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px; margin: 12px 0;\">";
        $html .= nl2br(s($feedback->description));
        $html .= "</div>";
        if ($screenshoturl) {
            $html .= "<p><a href=\"" . s($screenshoturl) . "\" target=\"_blank\" style=\"color: #2563eb; font-weight: bold;\">" .
                     "Ver captura de pantalla adjunta</a></p>";
        }
        $html .= "</div>";

        $message = new message();
        $message->component         = 'moodle';
        $message->name              = 'instantmessage';
        $message->userfrom          = \core_user::get_noreply_user();
        $message->userto            = $recipient;
        $message->notification      = 1;
        $message->subject           = $subject;
        $message->fullmessage       = $text;
        $message->fullmessageformat = FORMAT_HTML;
        $message->fullmessagehtml   = $html;
        $message->smallmessage      = substr(strip_tags($text), 0, 250);

        try {
            message_send($message);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Notifies the reporting user that their ticket has been updated or resolved.
     *
     * @param int $feedbackid Ticket ID.
     * @param \stdClass $feedback Feedback record.
     * @param string $newstatus New status string.
     * @param string $admincomment Resolution or response notes.
     * @param \stdClass $resolver Admin user record.
     * @return bool True if message dispatched.
     */
    public static function notify_user_resolution(
        int $feedbackid,
        \stdClass $feedback,
        string $newstatus,
        string $admincomment,
        \stdClass $resolver
    ): bool {
        global $DB;

        $submitter = $DB->get_record('user', ['id' => $feedback->userid, 'deleted' => 0]);
        if (!$submitter) {
            return false;
        }

        $statuslabels = [
            'in_review' => 'En revisión',
            'resolved'  => 'Resuelto',
            'rejected'  => 'Desestimado',
        ];
        $statuslabel = $statuslabels[$newstatus] ?? ucfirst($newstatus);

        $subject = "[Consola de Gestión] Actualización de tu reporte #{$feedbackid} ({$statuslabel})";

        $text = "Tu reporte #{$feedbackid} ha sido actualizado a: {$statuslabel}\n\n";
        if (!empty($admincomment)) {
            $text .= "Respuesta del equipo de soporte:\n{$admincomment}\n\n";
        }
        $text .= "Atendido por: " . fullname($resolver) . "\n";

        $html = "<div style=\"font-family: sans-serif; font-size: 14px; line-height: 1.5;\">";
        $html .= "<h3 style=\"color: #0f172a;\">Tu reporte #{$feedbackid} ha sido actualizado</h3>";
        $badge = "<span style=\"background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: bold;\">" .
                 "{$statuslabel}</span>";
        $html .= "<p><strong>Nuevo estado:</strong> {$badge}</p>";
        if (!empty($admincomment)) {
            $html .= "<div style=\"background: #f1f5f9; border-left: 4px solid #10b981; padding: 12px; margin: 12px 0;\">";
            $html .= "<strong>Respuesta de soporte:</strong><br>" . nl2br(s($admincomment));
            $html .= "</div>";
        }
        $html .= "<p style=\"color: #64748b; font-size: 12px;\">Atendido por: " . s(fullname($resolver)) . "</p>";
        $html .= "</div>";

        $message = new message();
        $message->component         = 'moodle';
        $message->name              = 'instantmessage';
        $message->userfrom          = \core_user::get_noreply_user();
        $message->userto            = $submitter;
        $message->notification      = 1;
        $message->subject           = $subject;
        $message->fullmessage       = $text;
        $message->fullmessageformat = FORMAT_HTML;
        $message->fullmessagehtml   = $html;
        $message->smallmessage      = substr(strip_tags($text), 0, 250);

        try {
            message_send($message);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }
}
