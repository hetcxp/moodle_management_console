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
 * Permissions tests for tool_management_console.
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
 * Granular permissions and invalid input tests for tool_management_console.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tool_management_console\external\permissions
 */
class permissions_test extends advanced_testcase {
    public function test_course_action_requires_capability() {
        $this->resetAfterTest(true);
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $cat = $this->getDataGenerator()->create_category(['name' => 'Cat']);
        $course = $this->getDataGenerator()->create_course(['category' => $cat->id]);

        $this->expectException(\required_capability_exception::class);
        \tool_management_console\external\courses::course_action('delete', [$course->id]);
    }

    public function test_user_action_requires_capability() {
        $this->resetAfterTest(true);
        $user = $this->getDataGenerator()->create_user();
        $targetuser = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(\required_capability_exception::class);
        \tool_management_console\external\users::user_action('delete', [$targetuser->id]);
    }

    public function test_category_action_requires_capability() {
        $this->resetAfterTest(true);
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $cat = $this->getDataGenerator()->create_category(['name' => 'Protected Cat']);

        $this->expectException(\required_capability_exception::class);
        \tool_management_console\external\categories::category_action('delete', [$cat->id]);
    }

    public function test_cohort_action_requires_capability() {
        $this->resetAfterTest(true);
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $cohort = $this->getDataGenerator()->create_cohort();

        $this->expectException(\required_capability_exception::class);
        \tool_management_console\external\cohorts::cohort_action('delete', $cohort->id);
    }

    public function test_competency_action_requires_capability() {
        $this->resetAfterTest(true);
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(\required_capability_exception::class);
        \tool_management_console\external\competency_frameworks::competency_framework_action('create', 0, 'Test Framework');
    }

    public function test_action_with_nonexistent_ids() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        // Non-existent course ID in action.
        $res = \tool_management_console\external\courses::course_action('hide', [999999]);
        $this->assertTrue($res['success']);
        $this->assertEquals(0, $res['affectedcount']);

        // Non-existent user ID in action.
        $userres = \tool_management_console\external\users::user_action('suspend', [999999]);
        $this->assertTrue($userres['success']);
        $this->assertEquals(0, $userres['affectedcount']);
    }

    public function test_invalid_action_name() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $res = \tool_management_console\external\courses::course_action('unknown_action', [1]);
        $this->assertFalse($res['success']);

        $userres = \tool_management_console\external\users::user_action('unknown_action', [1]);
        $this->assertFalse($userres['success']);
    }

    public function test_admin_tree_hierarchy_and_visibility() {
        global $CFG, $DB;
        require_once($CFG->libdir . '/adminlib.php');

        $this->resetAfterTest(true);

        // 1. Verify tree structure under Site Admin.
        $this->setAdminUser();
        $adminroot = admin_get_root(true, true);

        $category = $adminroot->locate('tool_management_console_category');
        $this->assertInstanceOf(\admin_category::class, $category);

        $consolepage = $adminroot->locate('tool_management_console');
        $this->assertInstanceOf(\admin_externalpage::class, $consolepage);
        $this->assertTrue($consolepage->check_access());

        // License page has been unified into settingspage; standalone external page must NOT exist.
        $licensepage = $adminroot->locate('tool_management_console_license');
        $this->assertNull($licensepage);

        $settingspage = $adminroot->locate('tool_management_console_settings');
        $this->assertInstanceOf(\admin_settingpage::class, $settingspage);
        $this->assertTrue($settingspage->check_access());

        // Category children must contain exactly console and settings pages.
        $children = $category->get_children();
        $this->assertCount(2, $children);
        $this->assertContains($consolepage, $children);
        $this->assertContains($settingspage, $children);

        // Verify unified settings page hierarchy and order of settings.
        $settingslist = array_values((array)$settingspage->settings);
        $this->assertCount(5, $settingslist);

        // 1° Section: Feedback & Support.
        $this->assertInstanceOf(\admin_setting_heading::class, $settingslist[0]);
        $this->assertEquals('feedback_heading', $settingslist[0]->name);
        $this->assertEquals('tool_management_console', $settingslist[0]->plugin);

        $this->assertInstanceOf(\admin_setting_configcheckbox::class, $settingslist[1]);
        $this->assertEquals('enable_feedback', $settingslist[1]->name);
        $this->assertEquals('tool_management_console', $settingslist[1]->plugin);

        $this->assertInstanceOf(\admin_setting_configselect::class, $settingslist[2]);
        $this->assertEquals('supportuserid', $settingslist[2]->name);
        $this->assertEquals('tool_management_console', $settingslist[2]->plugin);

        // 2° Section: License Management.
        $this->assertInstanceOf(\admin_setting_heading::class, $settingslist[3]);
        $this->assertEquals('license_heading', $settingslist[3]->name);
        $this->assertEquals('tool_management_console', $settingslist[3]->plugin);

        $this->assertInstanceOf(\tool_management_console\admin\license_setting::class, $settingslist[4]);
        $this->assertEquals('license_panel', $settingslist[4]->name);
        $this->assertEquals('tool_management_console', $settingslist[4]->plugin);

        // 2. Verify visibility under Manager role (has tool/management_console:access, no moodle/site:config).
        $manager = $this->getDataGenerator()->create_user();
        $managerrole = $DB->get_record('role', ['shortname' => 'manager']);
        role_assign($managerrole->id, $manager->id, \context_system::instance()->id);
        $this->setUser($manager);

        $adminrootmanager = admin_get_root(true, false);
        $categorymanager = $adminrootmanager->locate('tool_management_console_category');
        $this->assertInstanceOf(\admin_category::class, $categorymanager);
        // Category should be accessible because console child is accessible.
        $this->assertTrue($categorymanager->check_access());

        $consolepagemanager = $adminrootmanager->locate('tool_management_console');
        $this->assertInstanceOf(\admin_externalpage::class, $consolepagemanager);
        $this->assertTrue($consolepagemanager->check_access());

        // License and settings pages must NOT be accessible to manager.
        $licensepagemanager = $adminrootmanager->locate('tool_management_console_license');
        $this->assertNull($licensepagemanager);

        $settingspagemanager = $adminrootmanager->locate('tool_management_console_settings');
        $this->assertNull($settingspagemanager);
    }
}
