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
 * Library functions and pluginfile handlers for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Serves plugin files for tool_management_console.
 *
 * @param \stdClass $course Course object.
 * @param \stdClass $cm Course module object.
 * @param \context $context Context object.
 * @param string $filearea File area name.
 * @param array $args Extra arguments (itemid, filepath, filename).
 * @param bool $forcedownload Whether download is forced.
 * @param array $options Additional options.
 * @return bool False if file not found.
 */
function tool_management_console_pluginfile(
    $course,
    $cm,
    $context,
    $filearea,
    $args,
    $forcedownload,
    array $options = []
) {
    global $USER;

    if ($context->contextlevel != CONTEXT_SYSTEM) {
        return false;
    }

    // When accessed via webservice token (NO_MOODLE_COOKIES / WS_SERVER), session cookies are absent.
    if (defined('WS_SERVER') || defined('NO_MOODLE_COOKIES')) {
        if (!isloggedin() || isguestuser()) {
            return false;
        }
    } else {
        require_login();
    }
    require_capability('tool/management_console:access', $context);

    if ($filearea !== 'feedback_screenshot') {
        return false;
    }

    $itemid = (int)array_shift($args);

    $feedback = \tool_management_console\repository\feedback_repository::get_by_id($itemid);
    if (!$feedback) {
        return false;
    }
    if ((int)$feedback->userid !== (int)$USER->id && !has_capability('tool/management_console:manage_feedback', $context) && !is_siteadmin($USER)) {
        return false;
    }

    $filename = array_pop($args);
    $filepath = $args ? '/' . implode('/', $args) . '/' : '/';

    $fs = get_file_storage();
    $file = $fs->get_file($context->id, 'tool_management_console', $filearea, $itemid, $filepath, $filename);

    if (!$file || $file->is_directory()) {
        // Fallback: look for any stored file in this feedback area for the ticket.
        $files = $fs->get_area_files($context->id, 'tool_management_console', $filearea, $itemid, 'itemid', false);
        if (!empty($files)) {
            $file = reset($files);
        }
    }

    if (!$file || $file->is_directory()) {
        return false;
    }

    send_stored_file($file, 86400, 0, $forcedownload, $options);
    return true;
}
