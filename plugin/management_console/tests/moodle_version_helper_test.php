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
 * Tests for moodle_version_helper and transactional governance.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console;

use advanced_testcase;
use coding_exception;
use context_system;
use RuntimeException;
use stdClass;

/**
 * Version helper and transaction test case.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class moodle_version_helper_test extends advanced_testcase {
    /**
     * Set up tests.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest(true);
    }

    /**
     * Test version detection helpers and constants.
     */
    public function test_version_detection(): void {
        $version = moodle_version_helper::get_moodle_version();
        $this->assertIsInt($version);
        $this->assertGreaterThan(2020000000, $version);

        $this->assertTrue(moodle_version_helper::is_version_at_least(2020010100));
        $this->assertFalse(moodle_version_helper::is_version_at_least(9999123100));

        $this->assertTrue(moodle_version_helper::is_moodle_41_or_newer());
        $this->assertIsBool(moodle_version_helper::is_moodle_45_or_newer());
        $this->assertIsBool(moodle_version_helper::is_moodle_5_or_newer());
        $this->assertIsBool(moodle_version_helper::is_moodle_53_or_newer());
    }

    /**
     * Test user update adapter across Moodle versions.
     */
    public function test_update_user(): void {
        $user = $this->getDataGenerator()->create_user([
            'firstname' => 'OriginalFirst',
            'lastname'  => 'OriginalLast',
        ]);

        $update = clone $user;
        $update->firstname = 'ModifiedFirst';
        moodle_version_helper::update_user($update, false, false);

        global $DB;
        $persisted = $DB->get_record('user', ['id' => $user->id]);
        $this->assertEquals('ModifiedFirst', $persisted->firstname);

        $invalid = new stdClass();
        $this->expectException(coding_exception::class);
        moodle_version_helper::update_user($invalid);
    }

    /**
     * Test completion helper across courses.
     */
    public function test_completion_helpers(): void {
        $course = $this->getDataGenerator()->create_course(['enablecompletion' => 1]);
        $user = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($user->id, $course->id, 'student');

        $cinfo = moodle_version_helper::get_completion_info($course);
        $this->assertInstanceOf(\completion_info::class, $cinfo);
        $this->assertTrue((bool)$cinfo->is_enabled());

        $iscomplete = moodle_version_helper::is_course_complete($cinfo, $user);
        $this->assertFalse($iscomplete);

        $iscompleteid = moodle_version_helper::is_course_complete($cinfo, $user->id);
        $this->assertFalse($iscompleteid);
    }

    /**
     * Test completion helper rejects invalid course.
     */
    public function test_completion_helpers_invalid_course(): void {
        $invalidcourse = new stdClass();
        $this->expectException(coding_exception::class);
        moodle_version_helper::get_completion_info($invalidcourse);
    }

    /**
     * Test completion helper rejects invalid user.
     */
    public function test_completion_helpers_invalid_user(): void {
        $course = $this->getDataGenerator()->create_course(['enablecompletion' => 1]);
        $cinfo = moodle_version_helper::get_completion_info($course);

        $this->expectException(coding_exception::class);
        moodle_version_helper::is_course_complete($cinfo, 0);
    }

    /**
     * Test manual enrolment instance resolution.
     */
    public function test_get_manual_enrol_instance(): void {
        $course = $this->getDataGenerator()->create_course();
        $instance = moodle_version_helper::get_manual_enrol_instance($course->id);
        $this->assertNotNull($instance);
        $this->assertEquals('manual', $instance->enrol);
        $this->assertEquals($course->id, $instance->courseid);

        $this->assertNull(moodle_version_helper::get_manual_enrol_instance(0));
    }

    /**
     * Test capability helpers.
     */
    public function test_capability_helpers(): void {
        $this->setAdminUser();
        $context = context_system::instance();

        $this->assertTrue(moodle_version_helper::has_capability('moodle/site:config', $context));
        moodle_version_helper::require_capability('moodle/site:config', $context);

        $regularuser = $this->getDataGenerator()->create_user();
        $this->setUser($regularuser);

        $this->assertFalse(moodle_version_helper::has_capability('moodle/site:config', $context));
        $this->expectException(\required_capability_exception::class);
        moodle_version_helper::require_capability('moodle/site:config', $context);
    }

    /**
     * Test execute_transaction commits successfully with 0 and 1 arguments.
     */
    public function test_execute_transaction_commit(): void {
        global $DB;

        $result = moodle_version_helper::execute_transaction(function () use ($DB) {
            $cat = $this->getDataGenerator()->create_category(['name' => 'TxCommitCategoryNoArg']);
            return $cat->id;
        });

        $this->assertGreaterThan(0, $result);
        $exists = $DB->record_exists('course_categories', ['id' => $result]);
        $this->assertTrue($exists);

        $resultwithtx = moodle_version_helper::execute_transaction(function ($tx) use ($DB) {
            $cat = $this->getDataGenerator()->create_category(['name' => 'TxCommitCategoryWithArg']);
            return $cat->id;
        });
        $this->assertGreaterThan(0, $resultwithtx);
        $existswithtx = $DB->record_exists('course_categories', ['id' => $resultwithtx]);
        $this->assertTrue($existswithtx);
    }

    /**
     * Test execute_transaction rolls back safely on Throwable without leaving open transactions.
     */
    public function test_execute_transaction_rollback(): void {
        global $DB;

        $createdid = 0;
        $failed = false;

        try {
            moodle_version_helper::execute_transaction(function () use ($DB, &$createdid) {
                $cat = $this->getDataGenerator()->create_category(['name' => 'TxRollbackCategory']);
                $createdid = $cat->id;
                throw new RuntimeException('Intentional rollback failure');
            });
        } catch (RuntimeException $e) {
            $failed = true;
            $this->assertEquals('Intentional rollback failure', $e->getMessage());
        }

        $this->assertTrue($failed);
        $this->assertGreaterThan(0, $createdid);
        $exists = $DB->record_exists('course_categories', ['id' => $createdid]);
        $this->assertFalse($exists);
    }

    /**
     * Test execute_transaction with an array callable ([object, method]).
     */
    public function test_execute_transaction_array_callable(): void {
        $result = moodle_version_helper::execute_transaction([$this, 'sample_transaction_action']);
        $this->assertEquals('sample_success', $result);
    }

    /**
     * Sample helper for array callable testing.
     *
     * @return string
     */
    public function sample_transaction_action(): string {
        return 'sample_success';
    }

    /**
     * Test capability helpers reject invalid user arguments.
     */
    public function test_capability_helpers_invalid_user(): void {
        $context = context_system::instance();
        $this->expectException(coding_exception::class);
        moodle_version_helper::has_capability('moodle/site:config', $context, -5);
    }

    /**
     * Test sync_cohort_enrolments rejects negative course IDs.
     */
    public function test_sync_cohort_enrolments_negative_id(): void {
        $this->expectException(coding_exception::class);
        moodle_version_helper::sync_cohort_enrolments(-1);
    }
}
