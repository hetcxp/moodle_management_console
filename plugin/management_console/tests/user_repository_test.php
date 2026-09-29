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
 * User repository tests for tool_management_console.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console;

defined('MOODLE_INTERNAL') || die();

use advanced_testcase;

global $CFG;
require_once($CFG->dirroot . '/admin/tool/management_console/classes/repository/user_repository.php');

/**
 * User repository test cases.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tool_management_console\repository\user_repository
 */
class user_repository_test extends advanced_testcase {

    public function setUp(): void {
        $this->resetAfterTest();
    }

    public function test_user_repository_operations() {
        $this->resetAfterTest();
        $this->setAdminUser();

        // 1. Crear usuario y curso
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Test', 'lastname' => 'UserRepo', 'email' => 'userrepo@example.com']);
        $course = $this->getDataGenerator()->create_course(['fullname' => 'UserRepo Course']);
        $this->getDataGenerator()->enrol_user($user->id, $course->id, 'student');

        // 2. Probar get_user y get_user_strict
        $retrieved = \tool_management_console\repository\user_repository::get_user($user->id);
        $this->assertNotEmpty($retrieved);
        $this->assertEquals($user->id, $retrieved->id);

        $strict = \tool_management_console\repository\user_repository::get_user_strict($user->id);
        $this->assertEquals($user->id, $strict->id);

        // 3. Probar get_users_filtered
        list($records, $totalcount) = \tool_management_console\repository\user_repository::get_users_filtered(['page' => 0, 'perpage' => 10, 'sort' => 'lastname', 'dir' => 'ASC', 'search' => 'UserRepo']);
        $this->assertGreaterThanOrEqual(1, $totalcount);
        $this->assertArrayHasKey($user->id, $records);

        // 4. Probar cursos matriculados
        $courses = \tool_management_console\repository\user_repository::get_user_enrolled_courses($user->id);
        $this->assertCount(1, $courses);
        $this->assertEquals($course->id, reset($courses)->id);

        // 5. Probar get_users_kpi_stats
        $stats = \tool_management_console\repository\user_repository::get_users_kpi_stats();
        $this->assertIsObject($stats);
        $this->assertGreaterThanOrEqual(1, (int)$stats->total_users);

        // 6. Probar get_user_competencies
        $user_comps = \tool_management_console\repository\user_repository::get_user_competencies($user->id);
        $this->assertIsArray($user_comps);
    }
}
