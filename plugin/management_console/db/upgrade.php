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
 * Upgrade steps for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Execute tool_management_console upgrade from the given old version.
 *
 * @param int $oldversion
 * @return bool
 */
function xmldb_tool_management_console_upgrade($oldversion) {
    global $DB, $CFG;

    if ($oldversion < 2026090701) {
        // Repair any cohort enrol instances that were created without a student role.
        $studentroleid = (int)$DB->get_field('role', 'id', ['shortname' => 'student']);
        if ($studentroleid) {
            $DB->execute("UPDATE {enrol} SET roleid = ? WHERE enrol = 'cohort' AND (roleid = 0 OR roleid IS NULL)", [$studentroleid]);
            require_once($CFG->dirroot . '/enrol/cohort/locallib.php');
            $trace = new \null_progress_trace();
            enrol_cohort_sync($trace);
            $trace->finished();
        }

        upgrade_plugin_savepoint(true, 2026090701, 'tool', 'management_console');
    }

    return true;
}
