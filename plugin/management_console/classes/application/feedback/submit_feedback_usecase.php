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
 * Submit feedback use case for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\application\feedback;

use tool_management_console\repository\feedback_repository;


/**
 * Handles validation, storage and dispatching of feedback reports.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class submit_feedback_usecase {
    /** @var int Maximum allowed decoded screenshot size (4 MB) */
    const MAX_SCREENSHOT_BYTES = 4194304;

    /**
     * Executes the feedback submission workflow.
     *
     * @param int $userid Reporting user ID.
     * @param string $type Issue type (error, issue, suggestion).
     * @param string $description Detailed description.
     * @param string $pageurl Active URL or SPA route.
     * @param string $useragent Client user agent.
     * @param string $resolution Viewport resolution string.
     * @param string $screenshotbase64 Optional base64-encoded image data.
     * @return array Result payload.
     */
    public static function execute(
        int $userid,
        string $type,
        string $description,
        string $pageurl = '',
        string $useragent = '',
        string $resolution = '',
        string $screenshotbase64 = ''
    ): array {
        global $DB;

        $validtypes = ['issue', 'error', 'suggestion'];
        $cleantype = clean_param($type, PARAM_ALPHA);
        if (!in_array($cleantype, $validtypes, true)) {
            $cleantype = 'issue';
        }

        $cleandesc = trim(clean_text($description, FORMAT_PLAIN));
        if (empty($cleandesc)) {
            return [
                'success'    => false,
                'feedbackid' => 0,
                'message'    => 'La descripción no puede estar vacía.',
            ];
        }
        if (mb_strlen($cleandesc) > 5000) {
            $cleandesc = mb_substr($cleandesc, 0, 5000);
        }

        $cleanurl = mb_substr(clean_param($pageurl, PARAM_RAW_TRIMMED), 0, 255);
        $cleanua = mb_substr(clean_param($useragent, PARAM_RAW_TRIMMED), 0, 255);
        $cleanres = mb_substr(clean_param($resolution, PARAM_ALPHANUMEXT), 0, 32);

        $submitter = $DB->get_record('user', ['id' => $userid, 'deleted' => 0]);
        if (!$submitter) {
            return [
                'success'    => false,
                'feedbackid' => 0,
                'message'    => 'Usuario inválido o no encontrado.',
            ];
        }

        // 1. Create ticket in database (SSOT).
        $feedbackid = feedback_repository::create([
            'userid'      => $userid,
            'type'        => $cleantype,
            'description' => $cleandesc,
            'pageurl'     => $cleanurl,
            'useragent'   => $cleanua,
            'resolution'  => $cleanres,
            'status'      => 'new',
        ]);

        $screenshoturl = null;

        // 2. Process screenshot if provided.
        if (!empty($screenshotbase64)) {
            $parsed = self::process_and_store_screenshot($feedbackid, $userid, $screenshotbase64);
            if ($parsed) {
                feedback_repository::attach_screenshot($feedbackid, $parsed['fileid']);
                $screenshoturl = $parsed['url'];
            }
        }

        // 3. Dispatch message notification to support.
        $feedback = feedback_repository::get_by_id($feedbackid);
        feedback_notification_service::notify_support($feedbackid, $feedback, $submitter, $screenshoturl);

        return [
            'success'    => true,
            'feedbackid' => $feedbackid,
            'message'    => 'Reporte enviado con éxito.',
        ];
    }

    /**
     * Safely decodes and stores the screenshot into Moodle File API.
     *
     * @param int $feedbackid Ticket ID.
     * @param int $userid Submitter ID.
     * @param string $dataurl Base64 data URL.
     * @return array|null Array with fileid and url, or null on failure.
     */
    private static function process_and_store_screenshot(int $feedbackid, int $userid, string $dataurl): ?array {
        // Expected format: data:image/(webp|jpeg|png);base64,...
        if (!preg_match('#^data:image/(webp|jpeg|png);base64,(.+)$#i', $dataurl, $matches)) {
            return null;
        }

        $subtype = strtolower($matches[1]);
        $base64data = $matches[2];
        $binary = base64_decode($base64data, true);

        if ($binary === false || strlen($binary) === 0 || strlen($binary) > self::MAX_SCREENSHOT_BYTES) {
            return null;
        }

        $ext = ($subtype === 'jpeg') ? 'jpg' : $subtype;
        $mimetype = 'image/' . $subtype;
        $filename = "screenshot_{$feedbackid}.{$ext}";

        try {
            $fs = get_file_storage();
            $context = \context_system::instance();

            $filerecord = [
                'contextid' => $context->id,
                'component' => 'tool_management_console',
                'filearea'  => 'feedback_screenshot',
                'itemid'    => $feedbackid,
                'filepath'  => '/',
                'filename'  => $filename,
                'mimetype'  => $mimetype,
                'userid'    => $userid,
            ];

            // Clean any existing file for this itemid.
            $fs->delete_area_files($context->id, 'tool_management_console', 'feedback_screenshot', $feedbackid);
            $storedfile = $fs->create_file_from_string($filerecord, $binary);

            $url = \moodle_url::make_pluginfile_url(
                $context->id,
                'tool_management_console',
                'feedback_screenshot',
                $feedbackid,
                '/',
                $filename
            )->out(false);

            return [
                'fileid' => $storedfile->get_id(),
                'url'    => $url,
            ];
        } catch (\Exception $e) {
            debugging('Error saving feedback screenshot to File API: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return null;
        }
    }
}
