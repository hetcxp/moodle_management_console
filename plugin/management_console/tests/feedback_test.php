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
 * Feedback system unit tests for tool_management_console.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console;

use advanced_testcase;
use tool_management_console\repository\feedback_repository;
use tool_management_console\application\feedback\submit_feedback_usecase;
use tool_management_console\application\feedback\update_feedback_status_usecase;
use tool_management_console\application\feedback\feedback_notification_service;

/**
 * Feedback system tests.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tool_management_console\repository\feedback_repository
 * @covers     \tool_management_console\application\feedback\submit_feedback_usecase
 * @covers     \tool_management_console\application\feedback\update_feedback_status_usecase
 * @covers     \tool_management_console\application\feedback\feedback_notification_service
 */
class feedback_test extends advanced_testcase {
    public function setUp(): void {
        $this->resetAfterTest();
    }

    public function test_feedback_repository_lifecycle() {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();

        $user = $this->getDataGenerator()->create_user();

        // 1. Create ticket.
        $feedbackid = feedback_repository::create([
            'userid'      => $user->id,
            'type'        => 'issue',
            'description' => 'Test issue description',
            'pageurl'     => '/courses/10',
            'useragent'   => 'PHPUnit Browser',
            'resolution'  => '1920x1080',
        ]);

        $this->assertGreaterThan(0, $feedbackid);

        // 2. Read ticket.
        $record = feedback_repository::get_by_id($feedbackid);
        $this->assertNotNull($record);
        $this->assertEquals($user->id, $record->userid);
        $this->assertEquals('issue', $record->type);
        $this->assertEquals('new', $record->status);

        // 3. Update status.
        $updated = feedback_repository::update_status($feedbackid, 'resolved', 'Fixed in patch');
        $this->assertTrue($updated);

        $recordafter = feedback_repository::get_by_id($feedbackid);
        $this->assertEquals('resolved', $recordafter->status);
        $this->assertEquals('Fixed in patch', $recordafter->admincomment);
    }

    public function test_submit_feedback_usecase_validation() {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();

        // Empty description should fail.
        $res = submit_feedback_usecase::execute($user->id, 'error', '');
        $this->assertFalse($res['success']);
        $this->assertEquals(0, $res['feedbackid']);

        // Valid submission.
        $resvalid = submit_feedback_usecase::execute($user->id, 'error', 'Valid error description');
        $this->assertTrue($resvalid['success']);
        $this->assertGreaterThan(0, $resvalid['feedbackid']);
    }

    public function test_support_user_resolution_fallback() {
        $this->resetAfterTest();
        unset_config('supportuserid', 'tool_management_console');

        $supportuser = feedback_notification_service::resolve_support_user();
        $this->assertNotNull($supportuser);
        $this->assertTrue(is_siteadmin($supportuser));
    }

    public function test_external_submit_feedback() {
        $this->resetAfterTest();
        $this->setAdminUser();

        $res = \tool_management_console\external\feedback::submit_feedback(
            'issue',
            'Test external submission from UI',
            '/app/dashboard',
            'Mozilla/5.0 Test',
            '1920x1080',
            ''
        );

        $this->assertTrue($res['success']);
        $this->assertGreaterThan(0, $res['feedbackid']);

        $feedback = feedback_repository::get_by_id($res['feedbackid']);
        $this->assertNotNull($feedback);
        $this->assertEquals('issue', $feedback->type);
        $this->assertEquals('Test external submission from UI', $feedback->description);
    }

    public function test_external_submit_feedback_with_screenshot() {
        $this->resetAfterTest();
        $this->setAdminUser();

        // 1x1 transparent PNG base64
        $pngbase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

        $res = \tool_management_console\external\feedback::submit_feedback(
            'error',
            'Test with screenshot',
            '/app/courses',
            'Mozilla/5.0 Test',
            '1440x900',
            $pngbase64
        );

        $this->assertTrue($res['success']);
        $this->assertGreaterThan(0, $res['feedbackid']);

        $feedback = feedback_repository::get_by_id($res['feedbackid']);
        $this->assertNotNull($feedback);
        $this->assertNotEmpty($feedback->screenshotfileid);
    }
}

