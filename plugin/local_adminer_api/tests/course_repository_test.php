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
 * Course repository tests for local_adminer_api.
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
require_once($CFG->dirroot . '/local/adminer_api/classes/repository/course_repository.php');

/**
 * Course repository test cases.
 *
 * @package    local_adminer_api
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_adminer_api\repository\course_repository
 */
class course_repository_test extends advanced_testcase {

    public function setUp(): void {
        $this->resetAfterTest();
    }

    public function test_course_repository_operations() {
        $this->resetAfterTest();
        $this->setAdminUser();

        // 1. Crear categoría, curso y usuario
        $cat = $this->getDataGenerator()->create_category(['name' => 'CourseRepo Cat']);
        $course = $this->getDataGenerator()->create_course([
            'fullname' => 'CourseRepo Fullname Test',
            'shortname' => 'CRTEST',
            'category' => $cat->id,
            'visible' => 1
        ]);
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Course', 'lastname' => 'Student']);
        $this->getDataGenerator()->enrol_user($user->id, $course->id, 'student');

        // 2. Probar get_course y get_course_strict
        $retrieved = \local_adminer_api\repository\course_repository::get_course($course->id);
        $this->assertEquals($course->id, $retrieved->id);

        $strict = \local_adminer_api\repository\course_repository::get_course_strict($course->id);
        $this->assertEquals($course->id, $strict->id);

        // 3. Probar get_courses_filtered
        list($records, $totalcount, $kpis) = \local_adminer_api\repository\course_repository::get_courses_filtered([
            'search' => 'CourseRepo',
            'category' => $cat->id,
            'visibility' => 1,
            'sort' => 'fullname',
            'dir' => 'ASC',
            'page' => 0,
            'perpage' => 10
        ]);
        $this->assertGreaterThanOrEqual(1, $totalcount);
        $this->assertNotEmpty($records);

        // 4. Probar usuarios matriculados
        $enrolled = \local_adminer_api\repository\course_repository::get_enrolled_users($course->id);
        $this->assertCount(1, $enrolled);
        $this->assertEquals($user->id, $enrolled[0]->id);

        // 5. Probar get_course_category_name
        $catname = \local_adminer_api\repository\course_repository::get_course_category_name($cat->id);
        $this->assertEquals('CourseRepo Cat', $catname);
    }
}
