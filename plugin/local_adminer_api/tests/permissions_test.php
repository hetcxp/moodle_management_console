<?php
namespace local_adminer_api;

use advanced_testcase;
use context_system;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/webservice/tests/helpers.php');

/**
 * Granular permissions and invalid input tests for local_adminer_api.
 *
 * @package    local_adminer_api
 * @category   test
 */
class permissions_test extends advanced_testcase {

    public function test_course_action_requires_capability() {
        $this->resetAfterTest(true);
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $cat = $this->getDataGenerator()->create_category(['name' => 'Cat']);
        $course = $this->getDataGenerator()->create_course(['category' => $cat->id]);

        $this->expectException(\required_capability_exception::class);
        \local_adminer_api\external\courses::course_action('delete', [$course->id]);
    }

    public function test_user_action_requires_capability() {
        $this->resetAfterTest(true);
        $user = $this->getDataGenerator()->create_user();
        $target_user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(\required_capability_exception::class);
        \local_adminer_api\external\users::user_action('delete', [$target_user->id]);
    }

    public function test_category_action_requires_capability() {
        $this->resetAfterTest(true);
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $cat = $this->getDataGenerator()->create_category(['name' => 'Protected Cat']);

        $this->expectException(\required_capability_exception::class);
        \local_adminer_api\external\categories::category_action('delete', [$cat->id]);
    }

    public function test_cohort_action_requires_capability() {
        $this->resetAfterTest(true);
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $cohort = $this->getDataGenerator()->create_cohort();

        $this->expectException(\required_capability_exception::class);
        \local_adminer_api\external\cohorts::cohort_action('delete', $cohort->id);
    }

    public function test_action_with_nonexistent_ids() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        // Non-existent course ID in action
        $res = \local_adminer_api\external\courses::course_action('hide', [999999]);
        $this->assertTrue($res['success']);
        $this->assertEquals(0, $res['affectedcount']);

        // Non-existent user ID in action
        $user_res = \local_adminer_api\external\users::user_action('suspend', [999999]);
        $this->assertTrue($user_res['success']);
        $this->assertEquals(0, $user_res['affectedcount']);
    }

    public function test_invalid_action_name() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $res = \local_adminer_api\external\courses::course_action('unknown_action', [1]);
        $this->assertFalse($res['success']);

        $user_res = \local_adminer_api\external\users::user_action('unknown_action', [1]);
        $this->assertFalse($user_res['success']);
    }
}
