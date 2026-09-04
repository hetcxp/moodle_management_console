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
 * User repository tests for local_adminer_api.
 *
 * @package    local_adminer_api
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_adminer_api;

defined('MOODLE_INTERNAL') || die();

use advanced_testcase;

global $CFG;
require_once($CFG->dirroot . '/local/adminer_api/classes/repository/user_repository.php');

/**
 * User repository test cases.
 *
 * @package    local_adminer_api
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_adminer_api\repository\user_repository
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
        $retrieved = \local_adminer_api\repository\user_repository::get_user($user->id);
        $this->assertNotEmpty($retrieved);
        $this->assertEquals($user->id, $retrieved->id);

        $strict = \local_adminer_api\repository\user_repository::get_user_strict($user->id);
        $this->assertEquals($user->id, $strict->id);

        // 3. Probar get_paginated_users
        $paginated = \local_adminer_api\repository\user_repository::get_paginated_users(0, 10, 'lastname', 'ASC', 'UserRepo');
        $this->assertGreaterThanOrEqual(1, $paginated['totalcount']);
        $this->assertEquals($user->id, $paginated['users'][0]['id']);

        // 4. Probar cursos matriculados
        $courses = \local_adminer_api\repository\user_repository::get_user_enrolled_courses($user->id);
        $this->assertCount(1, $courses);
        $this->assertEquals($course->id, $courses[0]->id);

        // 5. Probar get_users_kpi_stats
        $stats = \local_adminer_api\repository\user_repository::get_users_kpi_stats();
        $this->assertIsObject($stats);
        $this->assertGreaterThanOrEqual(1, (int)$stats->total_users);
    }
}
