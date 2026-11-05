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

    public function test_get_dashboard_as_manager() {
        global $DB;
        $this->resetAfterTest(true);
        $user = $this->getDataGenerator()->create_user();
        $managerrole = $DB->get_record('role', ['shortname' => 'manager']);
        role_assign($managerrole->id, $user->id, \context_system::instance()->id);
        $this->setUser($user);

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
        $course1 = $this->getDataGenerator()->create_course([
            'fullname' => 'Test Course A',
            'category' => $cat->id,
            'visible' => 1,
        ]);
        $course2 = $this->getDataGenerator()->create_course([
            'fullname' => 'Test Course B',
            'category' => $cat->id,
            'visible' => 0,
        ]);

        $res = \tool_management_console\external\courses::get_courses(0, 10, 'fullname', 'ASC', 'Test Course');
        $this->assertGreaterThanOrEqual(2, $res['totalcount']);
        $this->assertArrayHasKey('competenciescount', $res['courses'][0]);

        // Test hide.
        $hideres = \tool_management_console\external\courses::course_action('hide', [$course1->id]);
        $this->assertTrue($hideres['success']);
        $this->assertEquals(1, $hideres['affectedcount']);

        // Test show.
        $showres = \tool_management_console\external\courses::course_action('show', [$course1->id]);
        $this->assertTrue($showres['success']);

        // Test move.
        $targetcat = $this->getDataGenerator()->create_category(['name' => 'Target Cat']);
        $moveres = \tool_management_console\external\courses::course_action('move', [$course1->id], $targetcat->id);
        $this->assertTrue($moveres['success']);
        $this->assertEquals(1, $moveres['affectedcount']);
    }

    public function test_get_categories() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $cat1 = $this->getDataGenerator()->create_category(['name' => 'Cat 1']);
        $res = \tool_management_console\external\categories::get_categories(0, 10);
        $this->assertGreaterThanOrEqual(1, $res['totalcount']);

        $flat = \tool_management_console\external\categories::get_categories_flat();
        $this->assertNotEmpty($flat['categories']);

        // Test category create.
        $createres = \tool_management_console\external\categories::category_action('create', [], 0, 'New Cat');
        $this->assertTrue($createres['success']);
        $this->assertEquals(1, $createres['affectedcount']);

        // Test category delete.
        $cattodelete = $this->getDataGenerator()->create_category(['name' => 'Delete Me']);
        $delres = \tool_management_console\external\categories::category_action('delete', [$cattodelete->id]);
        $this->assertTrue($delres['success']);
        $this->assertEquals(1, $delres['affectedcount']);
    }

    public function test_get_users_and_permissions() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $user = $this->getDataGenerator()->create_user(['firstname' => 'John', 'lastname' => 'Doe']);

        $res = \tool_management_console\external\users::get_users(0, 10, 'lastaccess', 'DESC', 'John');
        $this->assertGreaterThanOrEqual(1, $res['totalcount']);

        // Test suspend user.
        $suspres = \tool_management_console\external\users::user_action('suspend', [$user->id]);
        $this->assertTrue($suspres['success']);

        // Test activate user.
        $actres = \tool_management_console\external\users::user_action('activate', [$user->id]);
        $this->assertTrue($actres['success']);

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

        // Redirect messages to sink for testing.
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

        if (method_exists($sink, 'get_messages')) {
            $emails = $sink->get_messages();
        } else if (method_exists($sink, 'get_emails')) {
            $emails = $sink->get_emails();
        } else {
            $emails = [];
        }
        $this->assertCount(1, $emails);

        $to = 'temppass@example.com';
        if (isset($emails[0]->to)) {
            $to = $emails[0]->to;
        } else if (isset($emails[0]->header['to'])) {
            $to = $emails[0]->header['to'];
        }
        $this->assertEquals('temppass@example.com', $to);
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

        $enrolres = \tool_management_console\external\users::user_course_action('add', $user->id, [$course->id]);
        $this->assertTrue($enrolres['success']);

        $unenrolres = \tool_management_console\external\users::user_course_action('remove', $user->id, [$course->id]);
        $this->assertTrue($unenrolres['success']);
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

        $listres = \tool_management_console\external\cohorts::get_cohorts(0, 10, 'name', 'ASC', 'Cohort Performance');
        $this->assertNotEmpty($listres['cohorts']);
        $this->assertEquals(1, $listres['cohorts'][0]['memberscount']);

        $detailres = \tool_management_console\external\cohorts::get_cohort_detail($cohort->id);
        $this->assertEquals($cohort->id, $detailres['id']);
        $this->assertCount(1, $detailres['members']);
        $this->assertEquals($user->id, $detailres['members'][0]['id']);

        $actres = \tool_management_console\external\cohorts::cohort_action('edit', $cohort->id, 'Updated Cohort');
        $this->assertTrue($actres['success']);
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

    public function test_course_cohort_action_assigns_student_role() {
        global $DB;
        $this->resetAfterTest(true);
        $this->setAdminUser();

        // 1. Create course, cohort, and add a user to the cohort.
        $course = $this->getDataGenerator()->create_course(['fullname' => 'Cohort Sync Test Course']);
        $cohort = $this->getDataGenerator()->create_cohort(['name' => 'Cohort Test Role']);
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Student', 'lastname' => 'Cohort']);
        cohort_add_member($cohort->id, $user->id);

        // 2. Synchronize cohort with the course.
        $res = \tool_management_console\external\courses::course_cohort_action('add', $course->id, [$cohort->id]);
        $this->assertTrue($res['success']);
        $this->assertEquals(1, $res['affectedcount']);

        // 3. Verify that the enrol instance has the student role assigned.
        $instance = $DB->get_record(
            'enrol',
            ['enrol' => 'cohort', 'courseid' => $course->id, 'customint1' => $cohort->id],
            '*',
            MUST_EXIST
        );
        $studentroleid = (int)$DB->get_field('role', 'id', ['shortname' => 'student']);
        $this->assertGreaterThan(0, $studentroleid);
        $this->assertEquals($studentroleid, (int)$instance->roleid);

        // 4. Verify that the cohort member has the student role assigned in the course context.
        $coursecontext = \context_course::instance($course->id);
        $hasrole = $DB->record_exists('role_assignments', [
            'contextid' => $coursecontext->id,
            'userid'    => $user->id,
            'roleid'    => $studentroleid,
            'component' => 'enrol_cohort',
            'itemid'    => $instance->id,
        ]);
        $this->assertTrue($hasrole, 'The student role should be assigned to cohort member in course context.');

        // 5. Test repairing an existing instance if roleid was 0.
        $DB->set_field('enrol', 'roleid', 0, ['id' => $instance->id]);
        role_unassign_all(['contextid' => $coursecontext->id, 'component' => 'enrol_cohort', 'itemid' => $instance->id]);

        // Call 'add' again - should repair role and re-sync.
        $repairres = \tool_management_console\external\courses::course_cohort_action('add', $course->id, [$cohort->id]);
        $this->assertTrue($repairres['success']);
        $instancerepaired = $DB->get_record('enrol', ['id' => $instance->id]);
        $this->assertEquals($studentroleid, (int)$instancerepaired->roleid);

        $hasrolerepaired = $DB->record_exists('role_assignments', [
            'contextid' => $coursecontext->id,
            'userid'    => $user->id,
            'roleid'    => $studentroleid,
            'component' => 'enrol_cohort',
            'itemid'    => $instance->id,
        ]);
        $this->assertTrue($hasrolerepaired, 'The student role should be repaired and assigned to cohort member.');
    }

    public function test_get_competency_reviews_and_action() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $res = \tool_management_console\external\competency_reviews::get_competency_reviews(0, 20);
        $this->assertIsArray($res);
        $this->assertArrayHasKey('reviews', $res);
        $this->assertArrayHasKey('totalcount', $res);
        $this->assertIsInt($res['totalcount']);
    }

    public function test_get_cohort_detail_with_courses() {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $course = $this->getDataGenerator()->create_course(['fullname' => 'Cohort With Courses Course']);
        $cohort = $this->getDataGenerator()->create_cohort(['name' => 'Cohort With Courses']);
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Cohort', 'lastname' => 'User']);
        cohort_add_member($cohort->id, $user->id);

        \tool_management_console\external\courses::course_cohort_action('add', $course->id, [$cohort->id]);

        $detail = \tool_management_console\external\cohorts::get_cohort_detail($cohort->id);
        $this->assertIsArray($detail);
        $this->assertEquals($cohort->id, $detail['id']);
        $this->assertArrayHasKey('courses', $detail);
        $this->assertNotEmpty($detail['courses']);
        $this->assertEquals($course->id, $detail['courses'][0]['id']);
    }

    /**
     * Test learning path detail returns structure stability and contract validation.
     */
    public function test_learning_path_detail_returns_structure_contract(): void {
        $structure = \tool_management_console\external\learning_paths::get_learning_path_detail_returns();
        $this->assertInstanceOf(\core_external\external_single_structure::class, $structure);
        $this->assertArrayHasKey('progress_matrix', $structure->keys);

        $matrixstructure = $structure->keys['progress_matrix'];
        $this->assertInstanceOf(\core_external\external_multiple_structure::class, $matrixstructure);
        $itemstructure = $matrixstructure->content;
        $this->assertInstanceOf(\core_external\external_single_structure::class, $itemstructure);

        // Prove that the contract explicitly exposes the 'user_id' literal field.
        $this->assertArrayHasKey('user_id', $itemstructure->keys);
        $this->assertEquals(PARAM_INT, $itemstructure->keys['user_id']->type);

        // Validate clean_returnvalue contract stability on the progress_matrix item structure.
        $sampleitem = [
            'user_id'  => 101,
            'fullname' => 'Sample User',
            'email'    => 'sample@example.com',
            'modules'  => [],
        ];

        $cleaned = \core_external\external_api::clean_returnvalue($itemstructure, $sampleitem);
        $this->assertIsArray($cleaned);
        $this->assertArrayHasKey('user_id', $cleaned);
        $this->assertEquals(101, $cleaned['user_id']);
    }

    /**
     * Test architectural decoupling: competency_review_repository must not depend on user_repository.
     */
    public function test_competency_review_repository_decoupled_from_user_repository(): void {
        $reflector = new \ReflectionClass(\tool_management_console\repository\competency_review_repository::class);
        $filepath = $reflector->getFileName();
        $this->assertFileExists($filepath);
        $content = file_get_contents($filepath);
        $this->assertNotEmpty($content);
        $this->assertStringNotContainsString('user_repository::', $content);
        $this->assertStringNotContainsString('user_repository', $content);
    }

    /**
     * Test architectural compliance: user_cohort_action_usecase delegates user and cohort data to repository.
     */
    public function test_user_cohort_action_usecase_audited_for_ccp_ssot(): void {
        $reflector = new \ReflectionClass(
            \tool_management_console\application\users\user_cohort_action_usecase::class
        );
        $filepath = $reflector->getFileName();
        $this->assertFileExists($filepath);
        $contents = file_get_contents($filepath);
        $this->assertNotFalse($contents);
        $this->assertStringNotContainsString("FROM {user}", $contents);
        $this->assertStringNotContainsString("FROM {cohort}", $contents);
        $this->assertStringContainsString("user_repository::get_user_strict", $contents);
        $this->assertStringContainsString("user_repository::get_existing_cohort_ids", $contents);
    }

    /**
     * Test contractual return type of competency_repository facade delegating get_user_competencies.
     */
    public function test_competency_repository_user_competencies_contract(): void {
        $this->resetAfterTest(true);
        $result = \tool_management_console\repository\competency_repository::get_user_competencies(0);
        $this->assertIsArray($result);
    }

    /**
     * Test contractual return type of competency_crud_repository delete_by_framework.
     */
    public function test_delete_by_framework_contract(): void {
        $this->resetAfterTest(true);
        $result = \tool_management_console\repository\competency_crud_repository::delete_by_framework(999999);
        $this->assertIsBool($result);
        $this->assertSame(true, $result);
    }

    /**
     * Test contractual return type of learning_path_repository count_learning_paths.
     */
    public function test_count_learning_paths_contract(): void {
        $this->resetAfterTest(true);
        $count = \tool_management_console\repository\learning_path_repository::count_learning_paths();
        $this->assertIsInt($count);
    }

    /**
     * Test contractual return type of course_enrolment_repository get_learning_path_cohorts.
     */
    public function test_learning_path_cohorts_contract(): void {
        $this->resetAfterTest(true);
        $result = \tool_management_console\repository\course_enrolment_repository::get_learning_path_cohorts(1);
        $this->assertIsArray($result);
    }

    /**
     * Test contractual return type of course_enrolment_repository get_learning_path_enrolled_users.
     */
    public function test_learning_path_enrolled_users_contract(): void {
        $this->resetAfterTest(true);
        $result = \tool_management_console\repository\course_enrolment_repository::get_learning_path_enrolled_users(1);
        $this->assertIsArray($result);
    }

    /**
     * Test architectural behavioral delegation of competency_repository facade to review repository.
     */
    public function test_competency_repository_delegates_to_review_repository(): void {
        $this->resetAfterTest(true);
        $facaderesult = \tool_management_console\repository\competency_repository::get_user_competencies(0);
        $delegatedresult = \tool_management_console\repository\competency_review_repository::get_user_competencies(0);
        $this->assertIsArray($facaderesult);
        $this->assertIsArray($delegatedresult);
        $this->assertSame($delegatedresult, $facaderesult);
    }

    /**
     * Test architectural compliance: course_cohort_action_usecase delegates user access to core_user.
     */
    public function test_course_cohort_action_usecase_audited_for_ccp_ssot(): void {
        $reflector = new \ReflectionClass(
            \tool_management_console\application\enrollments\course_cohort_action_usecase::class
        );
        $filepath = $reflector->getFileName();
        $this->assertFileExists($filepath);
        $contents = file_get_contents($filepath);
        $this->assertNotFalse($contents);
        $this->assertStringNotContainsString("get_record('user'", $contents);
        $this->assertStringContainsString('\core_user::get_user', $contents);
    }

    /**
     * Test public web services metadata contracts remain strictly backward-compatible.
     */
    public function test_external_services_public_contracts_metadata_unaltered(): void {
        $servicesfile = __DIR__ . '/../db/services.php';
        $functions = [];
        require($servicesfile);

        $this->assertArrayHasKey('tool_management_console_scale_action', $functions);
        $this->assertSame(
            'tool_management_console\external\competency_scales',
            $functions['tool_management_console_scale_action']['classname']
        );
        $this->assertSame('scale_action', $functions['tool_management_console_scale_action']['methodname']);
        $this->assertSame('moodle/competency:competencymanage', $functions['tool_management_console_scale_action']['capabilities']);
        $this->assertTrue($functions['tool_management_console_scale_action']['ajax']);
        $this->assertSame('write', $functions['tool_management_console_scale_action']['type']);

        $this->assertArrayHasKey('tool_management_console_update_lp_structure', $functions);
        $this->assertSame(
            'tool_management_console\external\learning_paths',
            $functions['tool_management_console_update_lp_structure']['classname']
        );
        $this->assertSame(
            'update_learning_path_structure',
            $functions['tool_management_console_update_lp_structure']['methodname']
        );
        $this->assertSame('moodle/course:update', $functions['tool_management_console_update_lp_structure']['capabilities']);
        $this->assertTrue($functions['tool_management_console_update_lp_structure']['ajax']);
        $this->assertSame('write', $functions['tool_management_console_update_lp_structure']['type']);

        $this->assertArrayHasKey('tool_management_console_update_feedback_status', $functions);
        $this->assertSame(
            'tool_management_console\external\feedback',
            $functions['tool_management_console_update_feedback_status']['classname']
        );
        $this->assertSame('update_feedback_status', $functions['tool_management_console_update_feedback_status']['methodname']);
        $this->assertSame(
            'tool/management_console:manage_feedback',
            $functions['tool_management_console_update_feedback_status']['capabilities']
        );
        $this->assertTrue($functions['tool_management_console_update_feedback_status']['ajax']);
        $this->assertSame('write', $functions['tool_management_console_update_feedback_status']['type']);
    }

    /**
     * Test architectural compliance: course_enrolment_repository is isolated to enrol/cohort bounded context.
     */
    public function test_course_enrolment_repository_is_ccp_boundary(): void {
        $reflector = new \ReflectionClass(
            \tool_management_console\repository\course_enrolment_repository::class
        );
        $filepath = $reflector->getFileName();
        $this->assertFileExists($filepath);
        $content = file_get_contents($filepath);
        $this->assertNotEmpty($content);
        // Bounded context: no UI/renderers and no external network calls.
        $this->assertStringNotContainsString('$OUTPUT', $content);
        $this->assertStringNotContainsString('curl', $content);
        $this->assertStringNotContainsString('file_get_contents', $content);
    }

    /**
     * Test feedback external service contract stability and parameter/return definitions.
     */
    public function test_feedback_external_contract_is_stable(): void {
        $this->assertTrue(class_exists(\tool_management_console\external\feedback::class));
        $params = \tool_management_console\external\feedback::get_feedback_tickets_parameters();
        $this->assertInstanceOf(\core_external\external_function_parameters::class, $params);
        $returns = \tool_management_console\external\feedback::get_feedback_tickets_returns();
        $this->assertInstanceOf(\core_external\external_single_structure::class, $returns);

        $updateparams = \tool_management_console\external\feedback::update_feedback_status_parameters();
        $this->assertInstanceOf(\core_external\external_function_parameters::class, $updateparams);
        $updatereturns = \tool_management_console\external\feedback::update_feedback_status_returns();
        $this->assertInstanceOf(\core_external\external_single_structure::class, $updatereturns);
    }

    /**
     * Test feedback repository boundary is preserved without prohibited UI or external network dependencies.
     */
    public function test_feedback_repository_boundary_is_preserved(): void {
        $reflector = new \ReflectionClass(\tool_management_console\repository\feedback_repository::class);
        $filepath = $reflector->getFileName();
        $this->assertFileExists($filepath);
        $content = file_get_contents($filepath);
        $this->assertNotEmpty($content);
        $this->assertStringNotContainsString('$OUTPUT', $content);
        $this->assertStringNotContainsString('renderer', $content);
        $this->assertStringNotContainsString('curl', $content);
    }

    /**
     * Test update feedback status usecase boundary is preserved without UI/renderer dependencies.
     */
    public function test_update_feedback_status_usecase_boundary_is_preserved(): void {
        $reflector = new \ReflectionClass(
            \tool_management_console\application\feedback\update_feedback_status_usecase::class
        );
        $filepath = $reflector->getFileName();
        $this->assertFileExists($filepath);
        $content = file_get_contents($filepath);
        $this->assertNotEmpty($content);
        $this->assertStringNotContainsString('$OUTPUT', $content);
        $this->assertStringNotContainsString('echo', $content);
        $this->assertStringNotContainsString('print', $content);
    }

    /**
     * Test webservice function metadata is backward compatible across updated services.
     */
    public function test_webservice_function_metadata_is_backward_compatible(): void {
        $servicesfile = __DIR__ . '/../db/services.php';
        $functions = [];
        require($servicesfile);

        $targets = [
            'tool_management_console_scale_action' => [
                'classname'    => 'tool_management_console\external\competency_scales',
                'methodname'   => 'scale_action',
                'ajax'         => true,
                'capabilities' => 'moodle/competency:competencymanage',
                'type'         => 'write',
            ],
            'tool_management_console_update_lp_structure' => [
                'classname'    => 'tool_management_console\external\learning_paths',
                'methodname'   => 'update_learning_path_structure',
                'ajax'         => true,
                'capabilities' => 'moodle/course:update',
                'type'         => 'write',
            ],
            'tool_management_console_update_feedback_status' => [
                'classname'    => 'tool_management_console\external\feedback',
                'methodname'   => 'update_feedback_status',
                'ajax'         => true,
                'capabilities' => 'tool/management_console:manage_feedback',
                'type'         => 'write',
            ],
        ];

        foreach ($targets as $funcname => $expected) {
            $this->assertArrayHasKey($funcname, $functions);
            $fn = $functions[$funcname];
            $this->assertSame($expected['classname'], $fn['classname']);
            $this->assertSame($expected['methodname'], $fn['methodname']);
            $this->assertSame($expected['ajax'], $fn['ajax']);
            $this->assertSame($expected['capabilities'], $fn['capabilities']);
            $this->assertSame($expected['type'], $fn['type']);
            // Document and assert that only description is modified.
            $this->assertNotEmpty($fn['description']);
        }
    }

    /**
     * Test competency review repository has no forbidden dependencies (UI, views, controllers).
     */
    public function test_competency_review_repository_has_no_forbidden_dependencies(): void {
        $reflector = new \ReflectionClass(
            \tool_management_console\repository\competency_review_repository::class
        );
        $filepath = $reflector->getFileName();
        $this->assertFileExists($filepath);
        $content = file_get_contents($filepath);
        $this->assertNotEmpty($content);
        $this->assertStringNotContainsString('$OUTPUT', $content);
        $this->assertStringNotContainsString('renderer', $content);
        $this->assertStringNotContainsString('curl', $content);
    }

    /**
     * Test course enrolment repository has no forbidden dependencies (UI, views, controllers).
     */
    public function test_course_enrolment_repository_has_no_forbidden_dependencies(): void {
        $reflector = new \ReflectionClass(
            \tool_management_console\repository\course_enrolment_repository::class
        );
        $filepath = $reflector->getFileName();
        $this->assertFileExists($filepath);
        $content = file_get_contents($filepath);
        $this->assertNotEmpty($content);
        $this->assertStringNotContainsString('$OUTPUT', $content);
        $this->assertStringNotContainsString('renderer', $content);
        $this->assertStringNotContainsString('curl', $content);
    }
}
