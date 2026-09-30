<?php
// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Performance and pagination contract tests (TD-PERF-001, TD-ARCH-002).
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console;

use advanced_testcase;
use tool_management_console\repository\course_repository;
use tool_management_console\repository\course_enrolment_repository;
use tool_management_console\repository\cohort_repository;
use tool_management_console\repository\user_repository;

defined('MOODLE_INTERNAL') || die();

/**
 * Tests verifying that detail queries support pagination and limits.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class performance_contract_test extends advanced_testcase {

    public function setUp(): void {
        $this->resetAfterTest(true);
    }

    /**
     * Test course_repository::get_enrolled_users backwards compatibility and overload.
     */
    public function test_get_enrolled_users_overload() {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $user1 = $this->getDataGenerator()->create_user();
        $user2 = $this->getDataGenerator()->create_user();

        $this->getDataGenerator()->enrol_user($user1->id, $course->id);
        $this->getDataGenerator()->enrol_user($user2->id, $course->id);

        // 1-argument call (as used in tests and simple queries)
        $enrolled1 = course_repository::get_enrolled_users($course->id);
        $this->assertCount(2, $enrolled1);

        // 2-argument call with custom SQL
        $sql = "SELECT u.id, u.username FROM {user} u JOIN {user_enrolments} ue ON ue.userid = u.id JOIN {enrol} e ON e.id = ue.enrolid WHERE e.courseid = :courseid";
        $enrolled2 = course_repository::get_enrolled_users($sql, $course->id);
        $this->assertCount(2, $enrolled2);
    }

    /**
     * Test that course_enrolment_repository supports limit and offset.
     */
    public function test_enrolled_users_pagination() {
        $course = $this->getDataGenerator()->create_course();
        for ($i = 0; $i < 5; $i++) {
            $u = $this->getDataGenerator()->create_user(['lastname' => "User{$i}"]);
            $this->getDataGenerator()->enrol_user($u->id, $course->id);
        }

        // Fetch with limit 2, offset 0
        $page1 = course_enrolment_repository::get_course_enrolled_users_detail($course->id, 0, 2);
        $this->assertCount(2, $page1);

        // Fetch with limit 2, offset 2
        $page2 = course_enrolment_repository::get_course_enrolled_users_detail($course->id, 2, 2);
        $this->assertCount(2, $page2);

        // Fetch remaining
        $page3 = course_enrolment_repository::get_course_enrolled_users_detail($course->id, 4, 2);
        $this->assertCount(1, $page3);
    }

    /**
     * Test cohort members pagination.
     */
    public function test_cohort_members_pagination() {
        $cohort = $this->getDataGenerator()->create_cohort();
        for ($i = 0; $i < 4; $i++) {
            $u = $this->getDataGenerator()->create_user(['lastname' => "CohortUser{$i}"]);
            cohort_add_member($cohort->id, $u->id);
        }

        $limited = cohort_repository::get_cohort_members($cohort->id, 0, 2);
        $this->assertCount(2, $limited);
    }

    /**
     * Test user enrolled courses pagination.
     */
    public function test_user_enrolled_courses_pagination() {
        $user = $this->getDataGenerator()->create_user();
        for ($i = 0; $i < 3; $i++) {
            $c = $this->getDataGenerator()->create_course(['fullname' => "Course {$i}"]);
            $this->getDataGenerator()->enrol_user($user->id, $c->id);
        }

        $courses_paged = user_repository::get_user_enrolled_courses($user->id, 0, 2);
        $this->assertCount(2, $courses_paged);
    }

    /**
     * Test course maps bounded by userids (TD-DATA-001 / TD-PERF-001).
     */
    public function test_course_detail_maps_bounded_by_userids() {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $cohort = $this->getDataGenerator()->create_cohort();
        $user1 = $this->getDataGenerator()->create_user();
        $user2 = $this->getDataGenerator()->create_user();

        $this->getDataGenerator()->enrol_user($user1->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($user2->id, $course->id, 'editingteacher');
        cohort_add_member($cohort->id, $user1->id);

        // Synchronize cohort with course
        $enrolplugin = enrol_get_plugin('cohort');
        if ($enrolplugin) {
            $enrolplugin->add_instance($course, ['customint1' => $cohort->id]);
        }

        // Unbounded call: should return all or empty
        $all_cohorts = course_enrolment_repository::get_course_user_cohort_map($course->id);
        $this->assertIsArray($all_cohorts);

        // Bounded call with specific userids
        $bounded_cohorts = course_enrolment_repository::get_course_user_cohort_map($course->id, [$user1->id]);
        $this->assertIsArray($bounded_cohorts);
        $this->assertArrayNotHasKey($user2->id, $bounded_cohorts);

        // Enrolments bounded
        $all_enrolments = course_enrolment_repository::get_course_all_enrolments($course->id);
        $this->assertGreaterThanOrEqual(2, count($all_enrolments));

        $bounded_enrolments = course_enrolment_repository::get_course_all_enrolments($course->id, [$user1->id]);
        foreach ($bounded_enrolments as $e) {
            $this->assertEquals($user1->id, $e->userid);
        }

        // Roles bounded
        $bounded_roles = course_enrolment_repository::get_course_user_roles_map($course->id, [$user2->id]);
        $this->assertArrayHasKey($user2->id, $bounded_roles);
        $this->assertArrayNotHasKey($user1->id, $bounded_roles);
    }

    /**
     * Test learning path detail pagination (TD-DATA-001 / TD-PERF-001).
     */
    public function test_learning_path_detail_pagination() {
        $catid = \tool_management_console\repository\learning_path_repository::get_or_create_lp_category();
        $lp_course = $this->getDataGenerator()->create_course(['category' => $catid, 'format' => 'topics']);

        for ($i = 0; $i < 5; $i++) {
            $u = $this->getDataGenerator()->create_user(['lastname' => "LpUser{$i}"]);
            $this->getDataGenerator()->enrol_user($u->id, $lp_course->id);
        }

        $detail_p1 = \tool_management_console\repository\learning_path_repository::get_learning_path_detail($lp_course->id, 0, 2);
        $this->assertCount(2, $detail_p1->users);

        $detail_p2 = \tool_management_console\repository\learning_path_repository::get_learning_path_detail($lp_course->id, 2, 2);
        $this->assertCount(2, $detail_p2->users);

        $detail_p3 = \tool_management_console\repository\learning_path_repository::get_learning_path_detail($lp_course->id, 4, 2);
        $this->assertCount(1, $detail_p3->users);
    }
}
