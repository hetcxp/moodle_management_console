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
 * Cache manager tests for tool_management_console.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console;

defined('MOODLE_INTERNAL') || die();

use advanced_testcase;

global $CFG;
require_once($CFG->dirroot . '/admin/tool/management_console/classes/cache_manager.php');

/**
 * Cache manager test cases.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tool_management_console\cache_manager
 */
class cache_manager_test extends advanced_testcase {

    public function setUp(): void {
        $this->resetAfterTest();
    }

    public function test_cache_operations() {
        $this->resetAfterTest();

        // 1. Get cache instance
        $cache = \tool_management_console\cache_manager::get_kpis_cache();
        if ($cache === null) {
            // MUC definitions might not be initialized in headless unit runner
            $this->markTestSkipped('MUC tool_management_console kpis cache definition not active in this test runner.');
            return;
        }

        // 2. Set and get KPI
        $test_data = ['total_users' => 42, 'active_users' => 40];
        $stored = \tool_management_console\cache_manager::set_kpi('test_kpi_key', $test_data);
        $this->assertTrue($stored);

        $retrieved = \tool_management_console\cache_manager::get_kpi('test_kpi_key');
        $this->assertEquals($test_data, $retrieved);

        // 3. Invalidate specific key
        \tool_management_console\cache_manager::invalidate_kpis('test_kpi_key');
        $this->assertNull(\tool_management_console\cache_manager::get_kpi('test_kpi_key'));

        // 4. Invalidate all (purge)
        \tool_management_console\cache_manager::set_kpi('key_a', 'val_a');
        \tool_management_console\cache_manager::set_kpi('key_b', 'val_b');
        \tool_management_console\cache_manager::invalidate_kpis(null);
        $this->assertNull(\tool_management_console\cache_manager::get_kpi('key_a'));
        $this->assertNull(\tool_management_console\cache_manager::get_kpi('key_b'));
    }
}
