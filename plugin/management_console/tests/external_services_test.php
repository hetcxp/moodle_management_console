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
 * Unit tests for tool_management_console web services.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console;

defined('MOODLE_INTERNAL') || die();

use advanced_testcase;
use context_system;

global $CFG;
require_once($CFG->dirroot . '/webservice/tests/helpers.php');

/**
 * Unit tests for tool_management_console web services.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tool_management_console\external\dashboard
 */
class external_services_test extends advanced_testcase {

    public function test_get_dashboard() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $result = \tool_management_console\external\dashboard::get_dashboard();
        $this->assertIsArray($result);
        $this->assertArrayHasKey('courses_total', $result);
        $this->assertArrayHasKey('users_total', $result);
        $this->assertArrayHasKey('cohorts_total', $result);
    }

    public function test_get_courses_and_actions() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $cat = $this->getDataGenerator()->create_category(['name' => 'Test Cat']);
        $course1 = $this->getDataGenerator()->create_course(['fullname' => 'Test Course A', 'category' => $cat->id, 'visible' => 1]);
        $course2 = $this->getDataGenerator()->create_course(['fullname' => 'Test Course B', 'category' => $cat->id, 'visible' => 0]);

        $res = \tool_management_console\external\courses::get_courses(0, 10, 'fullname', 'ASC', 'Test Course');
        $this->assertGreaterThanOrEqual(2, $res['totalcount']);

        // Test hide
        $hide_res = \tool_management_console\external\courses::course_action('hide', [$course1->id]);
        $this->assertTrue($hide_res['success']);
        $this->assertEquals(1, $hide_res['affectedcount']);

        // Test show
        $show_res = \tool_management_console\external\courses::course_action('show', [$course1->id]);
        $this->assertTrue($show_res['success']);

        // Test move
        $targetcat = $this->getDataGenerator()->create_category(['name' => 'Target Cat']);
        $move_res = \tool_management_console\external\courses::course_action('move', [$course1->id], $targetcat->id);
        $this->assertTrue($move_res['success']);
        $this->assertEquals(1, $move_res['affectedcount']);
    }

    public function test_get_categories() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $cat1 = $this->getDataGenerator()->create_category(['name' => 'Cat 1']);
        $res = \tool_management_console\external\categories::get_categories(0, 10);
        $this->assertGreaterThanOrEqual(1, $res['totalcount']);

        $flat = \tool_management_console\external\categories::get_categories_flat();
        $this->assertNotEmpty($flat['categories']);

        // Test category create
        $create_res = \tool_management_console\external\categories::category_action('create', [], 0, 'New Cat');
        $this->assertTrue($create_res['success']);
        $this->assertEquals(1, $create_res['affectedcount']);

        // Test category delete
        $cat_to_delete = $this->getDataGenerator()->create_category(['name' => 'Delete Me']);
        $del_res = \tool_management_console\external\categories::category_action('delete', [$cat_to_delete->id]);
        $this->assertTrue($del_res['success']);
        $this->assertEquals(1, $del_res['affectedcount']);
    }

    public function test_get_users_and_permissions() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $user = $this->getDataGenerator()->create_user(['firstname' => 'John', 'lastname' => 'Doe']);

        $res = \tool_management_console\external\users::get_users(0, 10, 'lastaccess', 'DESC', 'John');
        $this->assertGreaterThanOrEqual(1, $res['totalcount']);

        // Test suspend user
        $susp_res = \tool_management_console\external\users::user_action('suspend', [$user->id]);
        $this->assertTrue($susp_res['success']);
        
        // Test activate user
        $act_res = \tool_management_console\external\users::user_action('activate', [$user->id]);
        $this->assertTrue($act_res['success']);

        $perm = \tool_management_console\external\permissions::get_permissions();
        $this->assertEquals(1, $perm['is_siteadmin']);
        $this->assertEquals(1, $perm['can_config_site']);
    }

    public function test_get_users_kpis() {
        $this->resetAfterTest(true);
        $this->setAdminUser();
        $this->getDataGenerator()->create_user(['suspended' => 0]);
        $this->getDataGenerator()->create_user(['suspended' => 1]);

        $res = \tool_management_console\external\users::get_users_kpis();
        $this->assertIsArray($res);
        $this->assertArrayHasKey('total_users', $res);
        $this->assertArrayHasKey('active_users', $res);
        $this->assertArrayHasKey('suspended_users', $res);
        $this->assertArrayHasKey('avg_progress', $res);
        $this->assertGreaterThanOrEqual(2, $res['total_users']);
        $this->assertGreaterThanOrEqual(1, $res['suspended_users']);
    }

    public function test_get_user_detail_enriched() {
        $this->resetAfterTest(true);
        $this->setAdminUser();
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Detail', 'lastname' => 'Test']);

        $res = \tool_management_console\external\users::get_user_detail($user->id);
        $this->assertArrayHasKey('username', $res);
        $this->assertArrayHasKey('suspended', $res);
        $this->assertArrayHasKey('is_active', $res);
        $this->assertArrayHasKey('lastaccess', $res);
        $this->assertArrayHasKey('progress', $res);
        $this->assertArrayHasKey('system_roles', $res);
        $this->assertEquals(1, $res['is_active']);
    }

    public function test_user_action_message() {
        $this->resetAfterTest(true);
        $this->setAdminUser();
        $user = $this->getDataGenerator()->create_user();
        
        // Redirect messages to sink for testing
        $sink = $this->redirectMessages();

        $res = \tool_management_console\external\users::user_action('message', [$user->id], 'Test message');
        $this->assertTrue($res['success']);
        $this->assertEquals(1, $res['affectedcount']);

        $messages = $sink->get_messages();
        $this->assertCount(1, $messages);
        $this->assertEquals('Test message', $messages[0]->fullmessage);
        $sink->close();
    }

    public function test_user_action_send_temp_password() {
        $this->resetAfterTest(true);
        $this->setAdminUser();
        $user = $this->getDataGenerator()->create_user(['email' => 'temppass@example.com']);

        $sink = $this->redirectEmails();

        $res = \tool_management_console\external\users::user_action('send_temp_password', [$user->id]);
        $this->assertTrue($res['success']);
        $this->assertEquals(1, $res['affectedcount']);

        $emails = $sink->get_emails();
        $this->assertCount(1, $emails);
        $this->assertEquals('temppass@example.com', $emails[0]->to);
        $sink->close();
    }

    public function test_get_course_detail_and_enrolled_progress() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $course = $this->getDataGenerator()->create_course(['fullname' => 'Detail Course', 'enablecompletion' => 1]);
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Student', 'lastname' => 'One']);

        $this->getDataGenerator()->enrol_user($user->id, $course->id, 'student');

        $res = \tool_management_console\external\courses::get_course_detail($course->id);
        $this->assertIsArray($res);
        $this->assertEquals($course->id, $res['id']);
        $this->assertNotEmpty($res['users']);
        $this->assertEquals($user->id, $res['users'][0]['id']);
        $this->assertEquals(0, $res['users'][0]['progress']);
    }

    public function test_user_course_action_transaction() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();

        $enrol_res = \tool_management_console\external\users::user_course_action('add', $user->id, [$course->id]);
        $this->assertTrue($enrol_res['success']);

        $unenrol_res = \tool_management_console\external\users::user_course_action('remove', $user->id, [$course->id]);
        $this->assertTrue($unenrol_res['success']);
    }

    public function test_unauthorized_user_access() {
        $this->resetAfterTest(true);
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(\required_capability_exception::class);
        \tool_management_console\external\dashboard::get_dashboard();
    }

    public function test_cohort_detail_and_actions() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $cohort = $this->getDataGenerator()->create_cohort(['name' => 'Cohort Performance Test']);
        $user = $this->getDataGenerator()->create_user();
        cohort_add_member($cohort->id, $user->id);

        $list_res = \tool_management_console\external\cohorts::get_cohorts(0, 10, 'name', 'ASC', 'Cohort Performance');
        $this->assertNotEmpty($list_res['cohorts']);
        $this->assertEquals(1, $list_res['cohorts'][0]['memberscount']);

        $detail_res = \tool_management_console\external\cohorts::get_cohort_detail($cohort->id);
        $this->assertEquals($cohort->id, $detail_res['id']);
        $this->assertCount(1, $detail_res['members']);
        $this->assertEquals($user->id, $detail_res['members'][0]['id']);

        $act_res = \tool_management_console\external\cohorts::cohort_action('edit', $cohort->id, 'Updated Cohort');
        $this->assertTrue($act_res['success']);
    }

    public function test_category_detail_progress() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $cat = $this->getDataGenerator()->create_category(['name' => 'Cat Detail Test']);
        $course = $this->getDataGenerator()->create_course(['category' => $cat->id]);

        $res = \tool_management_console\external\categories::get_category_detail($cat->id);
        $this->assertIsArray($res);
        $this->assertEquals($cat->id, $res['id']);
        $this->assertCount(1, $res['courses']);
        $this->assertEquals($course->id, $res['courses'][0]['id']);
    }
}
