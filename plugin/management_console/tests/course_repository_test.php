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
 * Course repository tests for tool_management_console.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console;

use advanced_testcase;

/**
 * Course repository test cases.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tool_management_console\repository\course_repository
 * @covers     \tool_management_console\external\courses
 */
class course_repository_test extends advanced_testcase {
    public function setUp(): void {
        $this->resetAfterTest();
    }

    public function test_course_repository_operations(): void {
        $this->setAdminUser();

        // 1. Crear categoría, curso y usuario
        $cat = $this->getDataGenerator()->create_category(['name' => 'CourseRepo Cat']);
        $course = $this->getDataGenerator()->create_course([
            'fullname' => 'CourseRepo Fullname Test',
            'shortname' => 'CRTEST',
            'category' => $cat->id,
            'visible' => 1,
        ]);
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Course', 'lastname' => 'Student']);
        $this->getDataGenerator()->enrol_user($user->id, $course->id, 'student');

        // 2. Probar get_course y get_course_strict
        $retrieved = \tool_management_console\repository\course_repository::get_course($course->id);
        $this->assertEquals($course->id, $retrieved->id);

        $strict = \tool_management_console\repository\course_repository::get_course_strict($course->id);
        $this->assertEquals($course->id, $strict->id);

        // 2b. Vincular una competencia al curso
        $this->insert_test_record('competency_coursecomp', [
            'courseid'     => $course->id,
            'competencyid' => 101,
            'ruleoutcome'  => 1,
            'sortorder'    => 0,
            'timecreated'  => time(),
            'timemodified' => time(),
            'usermodified' => 2,
        ]);

        // 3. Probar get_courses_filtered
        [$records, $totalcount, $kpis] = \tool_management_console\repository\course_repository::get_courses_filtered([
            'search' => 'CourseRepo',
            'category' => $cat->id,
            'visibility' => 1,
            'sort' => 'fullname',
            'dir' => 'ASC',
            'page' => 0,
            'perpage' => 10,
        ]);
        $this->assertGreaterThanOrEqual(1, $totalcount);
        $this->assertNotEmpty($records);
        $firstrecord = reset($records);
        $this->assertEquals(1, (int)$firstrecord->competenciescount);

        // 4. Probar usuarios matriculados
        $enrolled = \tool_management_console\repository\course_repository::get_enrolled_users($course->id);
        $this->assertCount(1, $enrolled);
        $this->assertEquals($user->id, $enrolled[0]->id);

        // 5. Probar get_course_category_name
        $catname = \tool_management_console\repository\course_repository::get_course_category_name($cat->id);
        $this->assertEquals('CourseRepo Cat', $catname);

        // 6. Probar cálculo de progreso promedio con actividades rastreables y ordenamiento direccional.
        $course2 = $this->getDataGenerator()->create_course([
            'fullname'         => 'CourseRepo Completion Track Test',
            'shortname'        => 'CRTRACK',
            'category'         => $cat->id,
            'visible'          => 1,
            'enablecompletion' => 1,
        ]);
        $this->getDataGenerator()->enrol_user($user->id, $course2->id, 'student');

        $cm1 = $this->insert_test_record('course_modules', [
            'course'             => $course2->id,
            'module'             => 1,
            'instance'           => 1,
            'section'            => 1,
            'added'              => time(),
            'completion'         => 1,
            'deletioninprogress' => 0,
        ]);
        $cm2 = $this->insert_test_record('course_modules', [
            'course'             => $course2->id,
            'module'             => 1,
            'instance'           => 2,
            'section'            => 1,
            'added'              => time(),
            'completion'         => 1,
            'deletioninprogress' => 0,
        ]);

        // Completar 1 de 2 actividades (50% de progreso).
        $this->insert_test_record('course_modules_completion', [
            'coursemoduleid'  => $cm1,
            'userid'          => $user->id,
            'completionstate' => 1,
            'timemodified'    => time(),
        ]);

        [$records50] = \tool_management_console\repository\course_repository::get_courses_filtered([
            'category' => $cat->id,
            'sort'     => 'progress',
            'dir'      => 'DESC',
        ]);
        $this->assertEquals(50, (int)$records50[$course2->id]->progress_sort);
        $this->assertEquals(0, (int)$records50[$course2->id]->completedcount);

        $res50 = \tool_management_console\external\courses::get_courses(0, 10, 'progress', 'DESC', '', $cat->id);
        $this->assertCount(2, $res50['courses']);
        $this->assertEquals($course2->id, $res50['courses'][0]['id']);
        $this->assertEquals(50, $res50['courses'][0]['progress_percent']);
        $this->assertEquals(0, $res50['courses'][0]['completedcount']);
        $this->assertEquals($course->id, $res50['courses'][1]['id']);
        $this->assertEquals(0, $res50['courses'][1]['progress_percent']);

        // Verificar que dir => 'ASC' invierte el orden de los dos cursos.
        $resasc = \tool_management_console\external\courses::get_courses(0, 10, 'progress', 'ASC', '', $cat->id);
        $this->assertCount(2, $resasc['courses']);
        $this->assertEquals($course->id, $resasc['courses'][0]['id']);
        $this->assertEquals($course2->id, $resasc['courses'][1]['id']);

        // Completar 2 de 2 actividades (100% de progreso y completedcount = 1).
        $this->insert_test_record('course_modules_completion', [
            'coursemoduleid'  => $cm2,
            'userid'          => $user->id,
            'completionstate' => 1,
            'timemodified'    => time(),
        ]);

        [$records100] = \tool_management_console\repository\course_repository::get_courses_filtered([
            'category' => $cat->id,
            'sort'     => 'progress',
            'dir'      => 'DESC',
        ]);
        $this->assertEquals(100, (int)$records100[$course2->id]->progress_sort);
        $this->assertEquals(1, (int)$records100[$course2->id]->completedcount);

        $res100 = \tool_management_console\external\courses::get_courses(0, 10, 'progress', 'DESC', '', $cat->id);
        $this->assertEquals($course2->id, $res100['courses'][0]['id']);
        $this->assertEquals(100, $res100['courses'][0]['progress_percent']);
        $this->assertEquals(1, $res100['courses'][0]['completedcount']);
    }

    /**
     * Test that filters on non-filterable calculated columns are ignored safely.
     */
    public function test_course_filters_calculated_columns_ignored(): void {
        $this->setAdminUser();
        $cat = $this->getDataGenerator()->create_category(['name' => 'Filter Calc Cat']);
        $this->getDataGenerator()->create_course([
            'fullname' => 'Filter Calc Course',
            'category' => $cat->id,
        ]);

        $filters = json_encode([
            'progress'          => '50',
            'enrolledcount'     => '10',
            'completedcount'    => '5',
            'cohortscount'      => '2',
            'competenciescount' => '3',
            'invalid_column'    => 'ignore_me',
        ]);

        [$records, $totalcount] = \tool_management_console\repository\course_repository::get_courses_filtered([
            'category' => $cat->id,
            'filters'  => $filters,
        ]);

        $this->assertGreaterThanOrEqual(1, $totalcount);
        $this->assertNotEmpty($records);
    }

    /**
     * Test that external courses::get_courses enforces moodle/course:view capability.
     */
    public function test_get_courses_capability_required(): void {
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(\required_capability_exception::class);
        \tool_management_console\external\courses::get_courses();
    }

    /**
     * Test that deep, oversized, or malformed JSON filters are safely handled in courses::get_courses.
     */
    public function test_get_courses_filters_sanitization(): void {
        $this->setAdminUser();
        $cat = $this->getDataGenerator()->create_category(['name' => 'Sanitize Cat']);
        $course = $this->getDataGenerator()->create_course([
            'fullname' => 'Sanitize Course Target',
            'category' => $cat->id,
        ]);

        // Malformed JSON.
        $resmalformed = \tool_management_console\external\courses::get_courses(
            0,
            10,
            'timecreated',
            'DESC',
            '',
            $cat->id,
            -1,
            '{invalid json'
        );
        $this->assertGreaterThanOrEqual(1, $resmalformed['totalcount']);

        // Deep JSON (>4 levels depth).
        $deepjson = json_encode(['level1' => ['level2' => ['level3' => ['level4' => ['level5' => 'nested']]]]]);
        $resdeep = \tool_management_console\external\courses::get_courses(
            0,
            10,
            'timecreated',
            'DESC',
            '',
            $cat->id,
            -1,
            $deepjson
        );
        $this->assertGreaterThanOrEqual(1, $resdeep['totalcount']);

        // Oversized JSON (>4096 characters).
        $oversized = json_encode(['fullname' => str_repeat('A', 4100)]);
        $resover = \tool_management_console\external\courses::get_courses(
            0,
            10,
            'timecreated',
            'DESC',
            '',
            $cat->id,
            -1,
            $oversized
        );
        $this->assertGreaterThanOrEqual(1, $resover['totalcount']);

        // Test scalar and non scalar values normalization.
        $scalartypespayload = json_encode([
            'null_value'  => null,
            'bool_true'   => true,
            'bool_false'  => false,
            'int_zero'    => 0,
            'int_one'     => 1,
            'float_val'   => 1.5,
            'string_val'  => 'abc',
            'array_empty' => [],
            'obj_empty'   => new \stdClass(),
        ]);
        $resscalar = \tool_management_console\external\courses::get_courses(
            0,
            10,
            'timecreated',
            'DESC',
            '',
            $cat->id,
            -1,
            $scalartypespayload
        );
        $this->assertGreaterThanOrEqual(1, $resscalar['totalcount']);

        $decoded = json_decode($scalartypespayload, true, 4);
        $this->assertArrayHasKey('null_value', $decoded);
        $this->assertNull($decoded['null_value']);
        $this->assertArrayHasKey('array_empty', $decoded);
        $this->assertArrayHasKey('obj_empty', $decoded);

        // Verify that courses::get_courses strips out non-scalar/non-null structures safely.
        $this->assertIsArray($resscalar['courses']);
        $this->assertGreaterThanOrEqual(1, $resscalar['totalcount']);
        $reswithoutnested = \tool_management_console\external\courses::get_courses(
            0,
            10,
            'timecreated',
            'DESC',
            '',
            $cat->id,
            -1,
            '{}'
        );
        $this->assertSame($reswithoutnested['totalcount'], $resscalar['totalcount']);

        // Valid filterable column should filter accurately.
        $validfilter = json_encode(['fullname' => 'Target']);
        $resvalid = \tool_management_console\external\courses::get_courses(
            0,
            10,
            'timecreated',
            'DESC',
            '',
            $cat->id,
            -1,
            $validfilter
        );
        $this->assertCount(1, $resvalid['courses']);
        $this->assertEquals($course->id, $resvalid['courses'][0]['id']);
    }

    /**
     * Test filters depth greater than four is rejected or neutralised.
     */
    public function test_filters_depth_greater_than_four_is_rejected(): void {
        $this->resetAfterTest(true);
        $this->setAdminUser();
        $cat = $this->getDataGenerator()->create_category();
        $this->getDataGenerator()->create_course(['category' => $cat->id, 'fullname' => 'Depth Course']);

        $deepjson = '{"a":{"b":{"c":{"d":{"e":"x"}}}}}';
        $res = \tool_management_console\external\courses::get_courses(
            0,
            10,
            'timecreated',
            'DESC',
            '',
            $cat->id,
            -1,
            $deepjson
        );
        $resdefault = \tool_management_console\external\courses::get_courses(
            0,
            10,
            'timecreated',
            'DESC',
            '',
            $cat->id,
            -1,
            '{}'
        );
        $this->assertSame($resdefault['totalcount'], $res['totalcount']);
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
