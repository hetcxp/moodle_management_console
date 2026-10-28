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
 * External feedback API for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\external;

use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use tool_management_console\application\feedback\submit_feedback_usecase;
use tool_management_console\application\feedback\update_feedback_status_usecase;
use tool_management_console\repository\feedback_repository;

/**
 * Feedback external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class feedback extends external_api {
    /**
     * Structure for a single feedback item.
     *
     * @return external_single_structure
     */
    private static function feedback_item_structure(): external_single_structure {
        return new external_single_structure([
            'id'               => new external_value(PARAM_INT, 'Ticket ID'),
            'userid'           => new external_value(PARAM_INT, 'User ID'),
            'type'             => new external_value(PARAM_ALPHA, 'Type: error, issue, suggestion'),
            'description'      => new external_value(PARAM_RAW, 'Description'),
            'admincomment'     => new external_value(PARAM_RAW, 'Admin comment', VALUE_OPTIONAL),
            'pageurl'          => new external_value(PARAM_RAW_TRIMMED, 'Page URL', VALUE_OPTIONAL),
            'useragent'        => new external_value(PARAM_RAW_TRIMMED, 'User Agent', VALUE_OPTIONAL),
            'resolution'       => new external_value(PARAM_ALPHANUMEXT, 'Resolution', VALUE_OPTIONAL),
            'screenshotfileid' => new external_value(PARAM_INT, 'Screenshot File ID', VALUE_OPTIONAL),
            'screenshoturl'    => new external_value(PARAM_URL, 'Direct screenshot URL', VALUE_OPTIONAL),
            'status'           => new external_value(PARAM_ALPHAEXT, 'Status'),
            'assignedto'       => new external_value(PARAM_INT, 'Assigned user ID', VALUE_OPTIONAL),
            'timecreated'      => new external_value(PARAM_INT, 'Creation timestamp'),
            'timemodified'     => new external_value(PARAM_INT, 'Modification timestamp'),
            'userfullname'     => new external_value(PARAM_TEXT, 'Submitter fullname', VALUE_OPTIONAL),
            'useremail'        => new external_value(PARAM_RAW, 'Submitter email', VALUE_OPTIONAL),
        ]);
    }

    /**
     * Parameters for submit_feedback.
     *
     * @return external_function_parameters
     */
    public static function submit_feedback_parameters(): external_function_parameters {
        return new external_function_parameters([
            'type'              => new external_value(PARAM_ALPHA, 'Report type: error, issue, suggestion'),
            'description'       => new external_value(PARAM_RAW, 'Detailed description'),
            'pageurl'           => new external_value(PARAM_RAW_TRIMMED, 'Current page URL or route', VALUE_DEFAULT, ''),
            'useragent'         => new external_value(PARAM_RAW_TRIMMED, 'Client user agent', VALUE_DEFAULT, ''),
            'resolution'        => new external_value(PARAM_ALPHANUMEXT, 'Client viewport resolution', VALUE_DEFAULT, ''),
            'screenshot_base64' => new external_value(PARAM_RAW, 'Base64 image data', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Submit a feedback report with optional viewport screenshot.
     *
     * @param string $type
     * @param string $description
     * @param string $pageurl
     * @param string $useragent
     * @param string $resolution
     * @param string $screenshotbase64
     * @return array
     */
    public static function submit_feedback(
        string $type,
        string $description,
        string $pageurl = '',
        string $useragent = '',
        string $resolution = '',
        string $screenshot_base64 = ''
    ): array {
        global $USER;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('tool/management_console:access', $context);

        $params = self::validate_parameters(self::submit_feedback_parameters(), [
            'type'              => $type,
            'description'       => $description,
            'pageurl'           => $pageurl,
            'useragent'         => $useragent,
            'resolution'        => $resolution,
            'screenshot_base64' => $screenshot_base64,
        ]);

        return submit_feedback_usecase::execute(
            (int)$USER->id,
            $params['type'],
            $params['description'],
            $params['pageurl'],
            $params['useragent'],
            $params['resolution'],
            $params['screenshot_base64']
        );
    }

    /**
     * Returns for submit_feedback.
     *
     * @return external_single_structure
     */
    public static function submit_feedback_returns(): external_single_structure {
        return new external_single_structure([
            'success'    => new external_value(PARAM_BOOL, 'True on success'),
            'feedbackid' => new external_value(PARAM_INT, 'Generated ticket ID'),
            'message'    => new external_value(PARAM_TEXT, 'Status message'),
        ]);
    }

    /**
     * Parameters for get_my_feedback.
     *
     * @return external_function_parameters
     */
    public static function get_my_feedback_parameters(): external_function_parameters {
        return new external_function_parameters([
            'page'    => new external_value(PARAM_INT, 'Page index (0-based)', VALUE_DEFAULT, 0),
            'perpage' => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 50),
        ]);
    }

    /**
     * Get tickets submitted by the current authenticated user.
     *
     * @param int $page
     * @param int $perpage
     * @return array
     */
    public static function get_my_feedback(int $page = 0, int $perpage = 50): array {
        global $USER;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('tool/management_console:access', $context);

        $params = self::validate_parameters(self::get_my_feedback_parameters(), [
            'page'    => $page,
            'perpage' => $perpage,
        ]);

        $records = feedback_repository::get_user_feedback((int)$USER->id, $params['page'], $params['perpage']);
        $total = feedback_repository::count_all('', '', (int)$USER->id);

        $items = [];
        $fs = get_file_storage();
        foreach ($records as $r) {
            $item = (array)$r;
            if (!empty($r->screenshotfileid)) {
                $item['screenshoturl'] = self::get_screenshot_url($context, $r, $fs);
            }
            $items[] = $item;
        }

        return [
            'items' => $items,
            'total' => $total,
        ];
    }

    /**
     * Returns for get_my_feedback.
     *
     * @return external_single_structure
     */
    public static function get_my_feedback_returns(): external_single_structure {
        return new external_single_structure([
            'items' => new external_multiple_structure(self::feedback_item_structure()),
            'total' => new external_value(PARAM_INT, 'Total user tickets'),
        ]);
    }

    /**
     * Parameters for get_feedback_tickets.
     *
     * @return external_function_parameters
     */
    public static function get_feedback_tickets_parameters(): external_function_parameters {
        return new external_function_parameters([
            'status'  => new external_value(PARAM_ALPHAEXT, 'Filter status', VALUE_DEFAULT, ''),
            'type'    => new external_value(PARAM_ALPHA, 'Filter type', VALUE_DEFAULT, ''),
            'page'    => new external_value(PARAM_INT, 'Page index', VALUE_DEFAULT, 0),
            'perpage' => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 50),
        ]);
    }

    /**
     * Get all platform feedback tickets (for managers and admins).
     *
     * @param string $status
     * @param string $type
     * @param int $page
     * @param int $perpage
     * @return array
     */
    public static function get_feedback_tickets(
        string $status = '',
        string $type = '',
        int $page = 0,
        int $perpage = 50
    ): array {
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('tool/management_console:manage_feedback', $context);

        $params = self::validate_parameters(self::get_feedback_tickets_parameters(), [
            'status'  => $status,
            'type'    => $type,
            'page'    => $page,
            'perpage' => $perpage,
        ]);

        $records = feedback_repository::get_all_feedback(
            $params['status'],
            $params['type'],
            $params['page'],
            $params['perpage']
        );
        $total = feedback_repository::count_all($params['status'], $params['type']);

        $items = [];
        $fs = get_file_storage();
        foreach ($records as $r) {
            $item = (array)$r;
            $item['userfullname'] = trim(($r->firstname ?? '') . ' ' . ($r->lastname ?? ''));
            $item['useremail']    = $r->email ?? '';
            if (!empty($r->screenshotfileid)) {
                $item['screenshoturl'] = self::get_screenshot_url($context, $r, $fs);
            }
            $items[] = $item;
        }

        return [
            'items' => $items,
            'total' => $total,
        ];
    }

    /**
     * Returns for get_feedback_tickets.
     *
     * @return external_single_structure
     */
    public static function get_feedback_tickets_returns(): external_single_structure {
        return new external_single_structure([
            'items' => new external_multiple_structure(self::feedback_item_structure()),
            'total' => new external_value(PARAM_INT, 'Total tickets count'),
        ]);
    }

    /**
     * Parameters for update_feedback_status.
     *
     * @return external_function_parameters
     */
    public static function update_feedback_status_parameters(): external_function_parameters {
        return new external_function_parameters([
            'feedbackid'   => new external_value(PARAM_INT, 'Ticket ID'),
            'status'       => new external_value(PARAM_ALPHAEXT, 'New status: in_review, resolved, rejected'),
            'admincomment' => new external_value(PARAM_RAW, 'Resolution response', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Update ticket status and optionally notify reporting user.
     *
     * @param int $feedbackid
     * @param string $status
     * @param string $admincomment
     * @return array
     */
    public static function update_feedback_status(int $feedbackid, string $status, string $admincomment = ''): array {
        global $USER;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('tool/management_console:manage_feedback', $context);

        $params = self::validate_parameters(self::update_feedback_status_parameters(), [
            'feedbackid'   => $feedbackid,
            'status'       => $status,
            'admincomment' => $admincomment,
        ]);

        return update_feedback_status_usecase::execute(
            $params['feedbackid'],
            $params['status'],
            $params['admincomment'],
            (int)$USER->id
        );
    }

    /**
     * Returns for update_feedback_status.
     *
     * @return external_single_structure
     */
    public static function update_feedback_status_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'True on success'),
            'message' => new external_value(PARAM_TEXT, 'Status description'),
        ]);
    }

    /**
     * Builds the external screenshot URL resolving stored file properties.
     *
     * @param \context $context Context instance.
     * @param \stdClass $record Feedback record.
     * @param \file_storage $fs File storage instance.
     * @return string Screenshot URL.
     */
    private static function get_screenshot_url(\context $context, \stdClass $record, \file_storage $fs): string {
        $filename = "screenshot_{$record->id}.webp";
        if (!empty($record->screenshotfileid)) {
            $file = $fs->get_file_by_id((int)$record->screenshotfileid);
            if ($file && !$file->is_directory()) {
                $filename = $file->get_filename();
            }
        }

        if (method_exists('\moodle_url', 'make_webservice_pluginfile_url')) {
            $url = \moodle_url::make_webservice_pluginfile_url(
                $context->id,
                'tool_management_console',
                'feedback_screenshot',
                $record->id,
                '/',
                $filename
            );
        } else {
            $url = \moodle_url::make_pluginfile_url(
                $context->id,
                'tool_management_console',
                'feedback_screenshot',
                $record->id,
                '/',
                $filename
            );
        }

        return $url->out(false);
    }
}
