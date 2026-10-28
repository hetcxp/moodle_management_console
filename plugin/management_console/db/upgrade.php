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

/**
 * Execute tool_management_console upgrade from the given old version.
 *
 * @param int $oldversion
 * @return bool
 */
/**
 * Repairs cohort enrol instances created without a student role.
 *
 * @param \moodle_database $DB
 * @param \stdClass $CFG
 * @return void
 */
function tool_management_console_upgrade_cohort_enrols($DB, $CFG): void {
    $studentroleid = (int)$DB->get_field('role', 'id', ['shortname' => 'student']);
    if ($studentroleid) {
        $updatesql = "UPDATE {enrol} SET roleid = ? WHERE enrol = 'cohort' AND (roleid = 0 OR roleid IS NULL)";
        $DB->execute($updatesql, [$studentroleid]);
        require_once($CFG->dirroot . '/enrol/cohort/locallib.php');
        $trace = new \null_progress_trace();
        enrol_cohort_sync($trace);
        $trace->finished();
    }
}

/**
 * Creates the feedback reports database table.
 *
 * @param \moodle_database $DB
 * @return void
 */
function tool_management_console_upgrade_feedback_table($DB): void {
    $dbman = $DB->get_manager();
    $table = new xmldb_table('tool_mng_feedback');

    $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
    $table->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
    $table->add_field('type', XMLDB_TYPE_CHAR, '32', null, XMLDB_NOTNULL, null, 'issue');
    $table->add_field('description', XMLDB_TYPE_TEXT, null, null, XMLDB_NOTNULL, null, null);
    $table->add_field('admincomment', XMLDB_TYPE_TEXT, null, null, null, null, null);
    $table->add_field('pageurl', XMLDB_TYPE_CHAR, '255', null, null, null, null);
    $table->add_field('useragent', XMLDB_TYPE_CHAR, '255', null, null, null, null);
    $table->add_field('resolution', XMLDB_TYPE_CHAR, '32', null, null, null, null);
    $table->add_field('screenshotfileid', XMLDB_TYPE_INTEGER, '10', null, null, null, null);
    $table->add_field('status', XMLDB_TYPE_CHAR, '20', null, XMLDB_NOTNULL, null, 'new');
    $table->add_field('assignedto', XMLDB_TYPE_INTEGER, '10', null, null, null, null);
    $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
    $table->add_field('timemodified', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');

    $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);

    $table->add_index('userid_idx', XMLDB_INDEX_NOTUNIQUE, ['userid']);
    $table->add_index('status_idx', XMLDB_INDEX_NOTUNIQUE, ['status']);
    $table->add_index('timecreated_idx', XMLDB_INDEX_NOTUNIQUE, ['timecreated']);

    if (!$dbman->table_exists($table)) {
        $dbman->create_table($table);
    }
}

/**
 * Ensures external service flags allow file transfers.
 *
 * @param \moodle_database $DB
 * @return void
 */
function tool_management_console_upgrade_service_file_flags($DB): void {
    $service = $DB->get_record('external_services', ['shortname' => 'management_console_service']);
    if ($service && (empty($service->downloadfiles) || empty($service->uploadfiles))) {
        $DB->set_field('external_services', 'downloadfiles', 1, ['id' => $service->id]);
        $DB->set_field('external_services', 'uploadfiles', 1, ['id' => $service->id]);
    }
}

/**
 * Execute tool_management_console upgrade from the given old version.
 *
 * @param int $oldversion
 * @return bool
 */
function xmldb_tool_management_console_upgrade($oldversion) {
    global $DB, $CFG;

    if ($oldversion < 2026090701) {
        tool_management_console_upgrade_cohort_enrols($DB, $CFG);
        upgrade_plugin_savepoint(true, 2026090701, 'tool', 'management_console');
    }

    if ($oldversion < 2026092300) {
        upgrade_plugin_savepoint(true, 2026092300, 'tool', 'management_console');
    }

    if ($oldversion < 2026092902) {
        upgrade_plugin_savepoint(true, 2026092902, 'tool', 'management_console');
    }

    if ($oldversion < 2026092903) {
        upgrade_plugin_savepoint(true, 2026092903, 'tool', 'management_console');
    }

    if ($oldversion < 2026102801) {
        tool_management_console_upgrade_feedback_table($DB);
        upgrade_plugin_savepoint(true, 2026102801, 'tool', 'management_console');
    }

    if ($oldversion < 2026102803) {
        tool_management_console_upgrade_service_file_flags($DB);
        upgrade_plugin_savepoint(true, 2026102803, 'tool', 'management_console');
    }

    return true;
}
