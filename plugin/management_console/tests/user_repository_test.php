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
 * @covers     \tool_management_console\external\users
 */
class user_repository_test extends advanced_testcase {
    public function setUp(): void {
        $this->resetAfterTest();
    }

    public function test_user_repository_operations() {
        $this->resetAfterTest();
        $this->setAdminUser();

        // 1. Crear usuario y curso.
        $user = $this->getDataGenerator()->create_user([
            'firstname' => 'Test',
            'lastname' => 'UserRepo',
            'email' => 'userrepo@example.com',
        ]);
        $course = $this->getDataGenerator()->create_course(['fullname' => 'UserRepo Course']);
        $this->getDataGenerator()->enrol_user($user->id, $course->id, 'student');

        // 2. Probar get_user y get_user_strict.
        $retrieved = \tool_management_console\repository\user_repository::get_user($user->id);
        $this->assertNotEmpty($retrieved);
        $this->assertEquals($user->id, $retrieved->id);

        $strict = \tool_management_console\repository\user_repository::get_user_strict($user->id);
        $this->assertEquals($user->id, $strict->id);

        // 3. Probar get_users_filtered.
        [$records, $totalcount] = \tool_management_console\repository\user_repository::get_users_filtered([
            'page' => 0,
            'perpage' => 10,
            'sort' => 'lastname',
            'dir' => 'ASC',
            'search' => 'UserRepo',
        ]);
        $this->assertGreaterThanOrEqual(1, $totalcount);
        $this->assertArrayHasKey($user->id, $records);

        // 4. Probar cursos matriculados.
        $courses = \tool_management_console\repository\user_repository::get_user_enrolled_courses($user->id);
        $this->assertCount(1, $courses);
        $this->assertEquals($course->id, reset($courses)->id);

        // 5. Probar get_users_kpi_stats.
        $stats = \tool_management_console\repository\user_repository::get_users_kpi_stats();
        $this->assertIsObject($stats);
        $this->assertGreaterThanOrEqual(1, (int)$stats->total_users);

        // 6. Probar get_user_competencies.
        $usercomps = \tool_management_console\repository\user_repository::get_user_competencies($user->id);
        $this->assertIsArray($usercomps);

        // 7. Probar cálculo de cursos completados, progreso y ordenamiento direccional por progreso.
        $user2 = $this->getDataGenerator()->create_user([
            'firstname' => 'User2',
            'lastname'  => 'ProgressTest',
            'email'     => 'user2@example.com',
        ]);
        $course2 = $this->getDataGenerator()->create_course([
            'fullname'         => 'Course 2 Completion',
            'enablecompletion' => 1,
        ]);

        $this->getDataGenerator()->enrol_user($user->id, $course2->id, 'student');
        $this->getDataGenerator()->enrol_user($user2->id, $course->id, 'student');

        $cmid = $this->insert_test_record('course_modules', [
            'course'             => $course2->id,
            'module'             => 1,
            'instance'           => 1,
            'section'            => 1,
            'added'              => time(),
            'completion'         => 1,
            'deletioninprogress' => 0,
        ]);

        $this->insert_test_record('course_modules_completion', [
            'coursemoduleid'  => $cmid,
            'userid'          => $user->id,
            'completionstate' => 1,
            'timemodified'    => time(),
        ]);

        [$recordsdesc] = \tool_management_console\repository\user_repository::get_users_filtered([
            'sort' => 'progress',
            'dir'  => 'DESC',
        ]);
        $this->assertArrayHasKey($user->id, $recordsdesc);
        $this->assertArrayHasKey($user2->id, $recordsdesc);
        $this->assertEquals(2, (int)$recordsdesc[$user->id]->enrolled_courses);
        $this->assertEquals(1, (int)$recordsdesc[$user->id]->completed_courses);
        $this->assertEquals(50, (int)$recordsdesc[$user->id]->progress_sort);
        $this->assertEquals(1, (int)$recordsdesc[$user2->id]->enrolled_courses);
        $this->assertEquals(0, (int)$recordsdesc[$user2->id]->completed_courses);
        $this->assertEquals(0, (int)$recordsdesc[$user2->id]->progress_sort);

        $resdesc = \tool_management_console\external\users::get_users(0, 10, 'progress', 'DESC');
        $this->assertGreaterThanOrEqual(2, count($resdesc['users']));
        $userpos = $this->find_user_index($resdesc['users'], (int)$user->id);
        $user2pos = $this->find_user_index($resdesc['users'], (int)$user2->id);
        $this->assertNotNull($userpos);
        $this->assertNotNull($user2pos);
        $this->assertEquals(50, (int)$resdesc['users'][$userpos]['progress']);
        $this->assertEquals(1, (int)$resdesc['users'][$userpos]['completed_courses']);
        $this->assertEquals(2, (int)$resdesc['users'][$userpos]['enrolled_courses']);
        $this->assertEquals(0, (int)$resdesc['users'][$user2pos]['progress']);
        $this->assertLessThan($user2pos, $userpos, 'User with 50% progress must appear before user with 0% in DESC order');

        $resasc = \tool_management_console\external\users::get_users(0, 10, 'progress', 'ASC');
        $userposasc = $this->find_user_index($resasc['users'], (int)$user->id);
        $user2posasc = $this->find_user_index($resasc['users'], (int)$user2->id);
        $this->assertNotNull($userposasc);
        $this->assertNotNull($user2posasc);
        $this->assertLessThan($userposasc, $user2posasc, 'User with 0% progress must appear before user with 50% in ASC order');

        // 8. Probar invocación de external users::get_users con sorts ampliados requeridos por Copilot Gate.
        $sortstotest = ['cohorts_count', 'competencies_count', 'enrolled_courses', 'completed_courses', 'progress'];
        foreach ($sortstotest as $st) {
            $res = \tool_management_console\external\users::get_users(0, 10, $st, 'DESC');
            $this->assertNotEmpty($res['users'], "Sorting by $st should return users without error");
        }
    }

    /**
     * Find index of a user in the external api users result list.
     *
     * @param array $users
     * @param int $userid
     * @return int|null
     */
    private function find_user_index(array $users, int $userid): ?int {
        foreach ($users as $idx => $item) {
            if ((int)$item['id'] === $userid) {
                return $idx;
            }
        }
        return null;
    }

    /**
     * Insert a test record into the given table.
     *
     * @param string $table
     * @param array $data
     * @return int
     */
    private function insert_test_record(string $table, array $data): int {
        global $DB;
        $record = (object)$data;
        return (int)$DB->insert_record($table, $record);
    }
}
