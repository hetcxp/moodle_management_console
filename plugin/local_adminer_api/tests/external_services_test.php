<?php
namespace local_adminer_api;

use advanced_testcase;
use context_system;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/webservice/tests/helpers.php');

/**
 * Unit tests for local_adminer_api web services.
 *
 * @package    local_adminer_api
 * @category   test
 */
class external_services_test extends advanced_testcase {

    public function test_get_dashboard() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $result = \local_adminer_api\external\dashboard::get_dashboard();
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

        $res = \local_adminer_api\external\courses::get_courses(0, 10, 'fullname', 'ASC', 'Test Course');
        $this->assertGreaterThanOrEqual(2, $res['totalcount']);

        // Test hide
        $hide_res = \local_adminer_api\external\courses::course_action('hide', [$course1->id]);
        $this->assertTrue($hide_res['success']);
        $this->assertEquals(1, $hide_res['affectedcount']);

        // Test show
        $show_res = \local_adminer_api\external\courses::course_action('show', [$course1->id]);
        $this->assertTrue($show_res['success']);
    }

    public function test_get_categories() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $cat1 = $this->getDataGenerator()->create_category(['name' => 'Cat 1']);
        $res = \local_adminer_api\external\categories::get_categories(0, 10);
        $this->assertGreaterThanOrEqual(1, $res['totalcount']);

        $flat = \local_adminer_api\external\categories::get_categories_flat();
        $this->assertNotEmpty($flat['categories']);

        // Test category create
        $create_res = \local_adminer_api\external\categories::category_action('create', [], 0, 'New Cat');
        $this->assertTrue($create_res['success']);
        $this->assertEquals(1, $create_res['affectedcount']);

        // Test category delete
        $cat_to_delete = $this->getDataGenerator()->create_category(['name' => 'Delete Me']);
        $del_res = \local_adminer_api\external\categories::category_action('delete', [$cat_to_delete->id]);
        $this->assertTrue($del_res['success']);
        $this->assertEquals(1, $del_res['affectedcount']);
    }

    public function test_get_users_and_permissions() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $user = $this->getDataGenerator()->create_user(['firstname' => 'John', 'lastname' => 'Doe']);

        $res = \local_adminer_api\external\users::get_users(0, 10, 'lastaccess', 'DESC', 'John');
        $this->assertGreaterThanOrEqual(1, $res['totalcount']);

        // Test suspend user
        $susp_res = \local_adminer_api\external\users::user_action('suspend', [$user->id]);
        $this->assertTrue($susp_res['success']);
        
        // Test activate user
        $act_res = \local_adminer_api\external\users::user_action('activate', [$user->id]);
        $this->assertTrue($act_res['success']);

        $perm = \local_adminer_api\external\permissions::get_permissions();
        $this->assertEquals(1, $perm['is_siteadmin']);
        $this->assertEquals(1, $perm['can_config_site']);
    }
}
