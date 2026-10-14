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
 * Security and isolation tests for course backups and MBZ upload.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console;

use advanced_testcase;
use tool_management_console\external\course_backups;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/webservice/tests/helpers.php');

/**
 * Tests verifying TD-SEC-002 and TD-SEC-003 security boundaries.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class backup_security_test extends advanced_testcase {
    public function setUp(): void {
        $this->resetAfterTest(true);
    }

    /**
     * Test that user only lists their own isolated backups.
     */
    public function test_user_backup_isolation() {
        global $CFG, $USER;

        $user1 = $this->getDataGenerator()->create_user();
        $user2 = $this->getDataGenerator()->create_user();

        // Assign course:create to both.
        $syscontext = \context_system::instance();
        $roleid = $this->getDataGenerator()->create_role();
        assign_capability('moodle/course:create', CAP_ALLOW, $roleid, $syscontext->id);
        role_assign($roleid, $user1->id, $syscontext->id);
        role_assign($roleid, $user2->id, $syscontext->id);

        // Setup backup directory for user1.
        $user1dir = $CFG->dataroot . '/temp/backup/tool_management_console/' . $user1->id;
        @mkdir($user1dir, 0777, true);
        file_put_contents($user1dir . '/user1_backup.mbz', 'dummy-mbz-content');

        // Setup backup directory for user2.
        $user2dir = $CFG->dataroot . '/temp/backup/tool_management_console/' . $user2->id;
        @mkdir($user2dir, 0777, true);
        file_put_contents($user2dir . '/user2_backup.mbz', 'dummy-mbz-content');

        // As user1, list backups.
        $this->setUser($user1);
        $backupsu1 = course_backups::list_server_backups();

        $namesu1 = array_column($backupsu1, 'name');
        $this->assertContains('user1_backup.mbz', $namesu1);
        $this->assertNotContains('user2_backup.mbz', $namesu1);

        // As user2, list backups.
        $this->setUser($user2);
        $backupsu2 = course_backups::list_server_backups();

        $namesu2 = array_column($backupsu2, 'name');
        $this->assertContains('user2_backup.mbz', $namesu2);
        $this->assertNotContains('user1_backup.mbz', $namesu2);
    }

    /**
     * Test that path traversal and unauthorized files are rejected.
     */
    public function test_restore_rejects_unauthorized_paths() {
        global $CFG;

        $user = $this->getDataGenerator()->create_user();
        $syscontext = \context_system::instance();
        $roleid = $this->getDataGenerator()->create_role();
        assign_capability('moodle/course:create', CAP_ALLOW, $roleid, $syscontext->id);
        role_assign($roleid, $user->id, $syscontext->id);

        $this->setUser($user);

        // Attempting to restore a path with traversal or outside allowed dir.
        $this->expectException(\moodle_exception::class);
        course_backups::restore_course_mbz('../../../etc/passwd', 1);
    }
}
