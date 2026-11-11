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
 * Privacy provider tests for tool_management_console.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console;

use core\context\system;
use core_privacy\local\metadata\collection;
use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\approved_userlist;
use core_privacy\local\request\userlist;
use core_privacy\local\request\writer;
use tool_management_console\privacy\provider;
use tool_management_console\repository\feedback_repository;

/**
 * Privacy provider testcase for tool_management_console.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversClass(\tool_management_console\privacy\provider::class)]
final class privacy_provider_test extends \core_privacy\tests\provider_testcase {
    /**
     * Test provider metadata collection.
     *
     * @return void
     */
    public function test_get_metadata(): void {
        $collection = new collection('tool_management_console');
        $result = provider::get_metadata($collection);
        $this->assertSame($collection, $result);
        $items = $result->get_collection();
        $this->assertNotEmpty($items);
    }

    /**
     * Test retrieving contexts for a user and exporting user data.
     *
     * @return void
     */
    public function test_get_contexts_for_userid_and_export(): void {
        $this->resetAfterTest(true);

        $user = $this->getDataGenerator()->create_user();
        $sysctx = system::instance();

        // Initially no context exists for this user.
        $contextlist = provider::get_contexts_for_userid((int)$user->id);
        $this->assertEmpty($contextlist->get_contextids());

        // Create feedback ticket for the user.
        $ticketid = feedback_repository::create([
            'userid'      => $user->id,
            'type'        => 'issue',
            'description' => 'Test bug description',
            'pageurl'     => 'https://example.com/test',
            'useragent'   => 'PHPUnit Browser Agent',
            'resolution'  => '1920x1080',
            'status'      => 'new',
        ]);
        $this->assertGreaterThan(0, $ticketid);

        // Verify context list includes system context.
        $contextlist = provider::get_contexts_for_userid((int)$user->id);
        $this->assertContains((int)$sysctx->id, array_map('intval', $contextlist->get_contextids()));

        // Verify userlist in context.
        $userlist = new userlist($sysctx, 'tool_management_console');
        provider::get_users_in_context($userlist);
        $this->assertContains((int)$user->id, array_map('intval', $userlist->get_userids()));

        // Test export data.
        $approvedcontextlist = new approved_contextlist($user, 'tool_management_console', [$sysctx->id]);
        provider::export_user_data($approvedcontextlist);

        $subcontext = [
            get_string('pluginname', 'tool_management_console'),
            get_string('privacy:feedbackpath', 'tool_management_console'),
            "ticket_{$ticketid}",
        ];
        $writer = writer::with_context($sysctx);
        $this->assertTrue($writer->has_any_data());
        $exporteddata = $writer->get_data($subcontext);
        $this->assertNotEmpty($exporteddata);
        $this->assertSame('Test bug description', $exporteddata->description);
    }

    /**
     * Test deleting user data anonymizes records and preserves ticket content.
     *
     * @return void
     */
    public function test_delete_data_for_user_anonymizes_and_preserves_ticket(): void {
        global $DB;
        $this->resetAfterTest(true);

        $user = $this->getDataGenerator()->create_user();
        $sysctx = system::instance();

        $ticketid = feedback_repository::create([
            'userid'      => $user->id,
            'type'        => 'suggestion',
            'description' => 'Preserved suggestion content',
            'pageurl'     => 'https://example.com/form',
            'useragent'   => 'Mozilla/5.0 Test Browser',
            'resolution'  => '1280x720',
            'status'      => 'in_progress',
        ]);

        // Attach a screenshot file via file storage to test file deletion.
        $fs = get_file_storage();
        $filerecord = [
            'contextid' => $sysctx->id,
            'component' => 'tool_management_console',
            'filearea'  => 'feedback_screenshot',
            'itemid'    => $ticketid,
            'filepath'  => '/',
            'filename'  => 'screenshot.png',
        ];
        $file = $fs->create_file_from_string($filerecord, 'fake-image-content');
        feedback_repository::attach_screenshot($ticketid, $file->get_id());

        $this->assertTrue(
            $fs->file_exists($sysctx->id, 'tool_management_console', 'feedback_screenshot', $ticketid, '/', 'screenshot.png')
        );

        // Execute delete_data_for_user.
        $approvedcontextlist = new approved_contextlist($user, 'tool_management_console', [$sysctx->id]);
        provider::delete_data_for_user($approvedcontextlist);

        // Verify ticket still exists in tool_mng_feedback.
        $record = $DB->get_record('tool_mng_feedback', ['id' => $ticketid]);
        $this->assertNotEmpty($record);
        $this->assertSame(0, (int)$record->userid);
        $this->assertNull($record->useragent);
        $this->assertNull($record->screenshotfileid);
        $this->assertSame('Preserved suggestion content', $record->description);
        $this->assertSame('in_progress', $record->status);

        // Verify screenshot file was deleted.
        $this->assertFalse(
            $fs->file_exists($sysctx->id, 'tool_management_console', 'feedback_screenshot', $ticketid, '/', 'screenshot.png')
        );
    }

    /**
     * Test deleting assigned admin reassigns tickets to the primary administrator.
     *
     * @return void
     */
    public function test_delete_assigned_admin_reassigns_to_primary_admin(): void {
        global $CFG, $DB;
        $this->resetAfterTest(true);

        $primaryadmin = get_admin();
        $this->assertNotEmpty($primaryadmin);

        // Create a secondary admin user.
        $secondaryadmin = $this->getDataGenerator()->create_user();
        $siteadmins = explode(',', (string)($CFG->siteadmins ?? $primaryadmin->id));
        $siteadmins[] = (string)$secondaryadmin->id;
        set_config('siteadmins', implode(',', array_unique($siteadmins)));

        $submitter = $this->getDataGenerator()->create_user();
        $sysctx = system::instance();

        // Create ticket assigned to secondary admin.
        $ticketid = feedback_repository::create([
            'userid'      => $submitter->id,
            'type'        => 'issue',
            'description' => 'Ticket assigned to secondary admin',
            'status'      => 'assigned',
            'assignedto'  => $secondaryadmin->id,
        ]);

        $ticketbefore = $DB->get_record('tool_mng_feedback', ['id' => $ticketid]);
        $this->assertSame((int)$secondaryadmin->id, (int)$ticketbefore->assignedto);

        // Execute delete_data_for_user for the secondary admin.
        $approvedcontextlist = new approved_contextlist($secondaryadmin, 'tool_management_console', [$sysctx->id]);
        provider::delete_data_for_user($approvedcontextlist);

        // Verify ticket was reassigned to primary admin.
        $updated = $DB->get_record('tool_mng_feedback', ['id' => $ticketid]);
        $this->assertNotEmpty($updated);
        $this->assertSame((int)$primaryadmin->id, (int)$updated->assignedto);
        $this->assertSame((int)$submitter->id, (int)$updated->userid);
    }

    /**
     * Test delete_data_for_users anonymizes batch of users.
     *
     * @return void
     */
    public function test_delete_data_for_users(): void {
        global $DB;
        $this->resetAfterTest(true);

        $user1 = $this->getDataGenerator()->create_user();
        $user2 = $this->getDataGenerator()->create_user();
        $sysctx = system::instance();

        $ticket1 = feedback_repository::create([
            'userid'      => $user1->id,
            'description' => 'User 1 ticket',
            'useragent'   => 'Agent 1',
        ]);
        $ticket2 = feedback_repository::create([
            'userid'      => $user2->id,
            'description' => 'User 2 ticket',
            'useragent'   => 'Agent 2',
        ]);

        $approveduserlist = new approved_userlist($sysctx, 'tool_management_console', [$user1->id, $user2->id]);
        provider::delete_data_for_users($approveduserlist);

        $rec1 = $DB->get_record('tool_mng_feedback', ['id' => $ticket1]);
        $rec2 = $DB->get_record('tool_mng_feedback', ['id' => $ticket2]);

        $this->assertSame(0, (int)$rec1->userid);
        $this->assertSame(0, (int)$rec2->userid);
        $this->assertNull($rec1->useragent);
        $this->assertNull($rec2->useragent);
    }
}
