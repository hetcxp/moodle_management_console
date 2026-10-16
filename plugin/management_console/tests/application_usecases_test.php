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
 * Unit tests for application use cases in tool_management_console.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console;

use advanced_testcase;
use tool_management_console\application\courses\course_action_usecase;
use tool_management_console\application\courses\get_course_detail_usecase;
use tool_management_console\application\users\user_action_usecase;
use tool_management_console\application\users\user_cohort_action_usecase;
use tool_management_console\application\users\get_user_detail_usecase;

/**
 * Test cases verifying application use cases behavior and security boundaries.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tool_management_console\application\courses\course_action_usecase
 * @covers     \tool_management_console\application\courses\get_course_detail_usecase
 * @covers     \tool_management_console\application\users\user_action_usecase
 * @covers     \tool_management_console\application\users\user_cohort_action_usecase
 * @covers     \tool_management_console\application\users\get_user_detail_usecase
 */
class application_usecases_test extends advanced_testcase {
    public function test_course_action_visibility_and_dates(): void {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $cat = $this->getDataGenerator()->create_category(['name' => 'UseCase Cat']);
        $course = $this->getDataGenerator()->create_course(['category' => $cat->id, 'visible' => 1]);

        $hideres = course_action_usecase::execute(['action' => 'hide', 'courseids' => [$course->id]]);
        $this->assertTrue($hideres['success']);
        $this->assertEquals(1, $hideres['affectedcount']);

        $showres = course_action_usecase::execute(['action' => 'show', 'courseids' => [$course->id]]);
        $this->assertTrue($showres['success']);
        $this->assertEquals(1, $showres['affectedcount']);

        $dateres = course_action_usecase::execute([
            'action'    => 'update_dates',
            'courseids' => [$course->id],
            'startdate' => 1700000000,
            'enddate'   => 1800000000,
        ]);
        $this->assertTrue($dateres['success']);
        $this->assertEquals(1, $dateres['affectedcount']);
    }

    public function test_course_action_create_validation(): void {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $invalidres = course_action_usecase::execute([
            'action'     => 'create',
            'fullname'   => '',
            'shortname'  => '',
            'categoryid' => 0,
        ]);
        $this->assertFalse($invalidres['success']);

        $nocatres = course_action_usecase::execute([
            'action'     => 'create',
            'fullname'   => 'Valid Full Name',
            'shortname'  => 'VFN1',
            'categoryid' => 999999,
        ]);
        $this->assertFalse($nocatres['success']);
        $this->assertStringContainsString('Category does not exist', $nocatres['message']);

        $cat = $this->getDataGenerator()->create_category(['name' => 'Creation Cat']);
        $validres = course_action_usecase::execute([
            'action'     => 'create',
            'fullname'   => 'Course By UseCase',
            'shortname'  => 'CBUC',
            'categoryid' => $cat->id,
        ]);
        $this->assertTrue($validres['success']);
        $this->assertEquals(1, $validres['affectedcount']);
    }

    public function test_course_action_security_enforcement(): void {
        $this->resetAfterTest(true);
        $regularuser = $this->getDataGenerator()->create_user();
        $this->setUser($regularuser);

        $cat = $this->getDataGenerator()->create_category(['name' => 'Sec Cat']);
        $course = $this->getDataGenerator()->create_course(['category' => $cat->id]);

        $this->expectException(\required_capability_exception::class);
        course_action_usecase::execute(['action' => 'delete', 'courseids' => [$course->id]]);
    }

    public function test_user_action_lifecycle(): void {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $targetuser = $this->getDataGenerator()->create_user();

        $suspendres = user_action_usecase::execute('suspend', [$targetuser->id]);
        $this->assertTrue($suspendres['success']);
        $this->assertEquals(1, $suspendres['affectedcount']);

        $activateres = user_action_usecase::execute('activate', [$targetuser->id]);
        $this->assertTrue($activateres['success']);
        $this->assertEquals(1, $activateres['affectedcount']);

        $unknownres = user_action_usecase::execute('unsupported_action', [$targetuser->id]);
        $this->assertFalse($unknownres['success']);
    }

    public function test_get_course_detail_usecase(): void {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $cat = $this->getDataGenerator()->create_category(['name' => 'Detail Cat']);
        $course = $this->getDataGenerator()->create_course(['category' => $cat->id]);
        $user = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($user->id, $course->id);

        $detail = get_course_detail_usecase::execute($course->id, 0, 20);
        $this->assertIsArray($detail);
        $this->assertEquals($course->id, $detail['id']);
        $this->assertArrayHasKey('users', $detail);
        $this->assertArrayHasKey('cohorts', $detail);
        $this->assertNotEmpty($detail['users']);
    }

    public function test_get_user_detail_usecase(): void {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $cat = $this->getDataGenerator()->create_category(['name' => 'UserDetail Cat']);
        $course = $this->getDataGenerator()->create_course(['category' => $cat->id]);
        $user = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($user->id, $course->id);

        $detail = get_user_detail_usecase::execute($user->id, 0, 20);
        $this->assertIsArray($detail);
        $this->assertEquals($user->id, $detail['id']);
        $this->assertArrayHasKey('courses', $detail);
        $this->assertArrayHasKey('cohorts', $detail);
    }

    public function test_user_cohort_action_usecase(): void {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $user = $this->getDataGenerator()->create_user();
        $cohort = $this->getDataGenerator()->create_cohort();

        $addres = user_cohort_action_usecase::execute([
            'action'    => 'add',
            'userid'    => $user->id,
            'cohortids' => [$cohort->id],
        ]);
        $this->assertTrue($addres['success']);
        $this->assertEquals(1, $addres['affectedcount']);

        $removeres = user_cohort_action_usecase::execute([
            'action'    => 'remove',
            'userid'    => $user->id,
            'cohortids' => [$cohort->id],
        ]);
        $this->assertTrue($removeres['success']);
        $this->assertEquals(1, $removeres['affectedcount']);

        $invalidres = user_cohort_action_usecase::execute([
            'action'    => 'invalid_op',
            'userid'    => $user->id,
            'cohortids' => [$cohort->id],
        ]);
        $this->assertFalse($invalidres['success']);
    }

    public function test_course_action_invalid_batch_ids(): void {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $res = course_action_usecase::execute([
            'action'    => 'hide',
            'courseids' => [-1, 'abc', 0],
        ]);
        $this->assertFalse($res['success']);
        $this->assertStringContainsString('No valid course IDs provided', $res['message']);
    }

    public function test_user_action_invalid_batch_ids(): void {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $res = user_action_usecase::execute('suspend', [-1, 0, 'invalid']);
        $this->assertFalse($res['success']);
        $this->assertStringContainsString('No valid user IDs provided', $res['message']);
    }

    public function test_user_action_security_enforcement(): void {
        $this->resetAfterTest(true);
        $regularuser = $this->getDataGenerator()->create_user();
        $targetuser = $this->getDataGenerator()->create_user();
        $this->setUser($regularuser);

        $this->expectException(\required_capability_exception::class);
        user_action_usecase::execute('delete', [$targetuser->id]);
    }
}
