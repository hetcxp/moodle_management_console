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
 * Category repository tests for tool_management_console.
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
require_once($CFG->dirroot . '/admin/tool/management_console/classes/repository/category_repository.php');

/**
 * Category repository test cases.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tool_management_console\repository\category_repository
 */
class category_repository_test extends advanced_testcase {

    public function setUp(): void {
        $this->resetAfterTest();
    }

    public function test_count_all() {
        $this->resetAfterTest();
        $this->setAdminUser();

        // Crear dos categorías
        $cat1 = $this->getDataGenerator()->create_category(['name' => 'Cat 1']);
        $cat2 = $this->getDataGenerator()->create_category(['name' => 'Cat 2']);

        $count = \tool_management_console\repository\category_repository::count_all();
        $this->assertGreaterThanOrEqual(2, $count);
    }

    public function test_get_paginated() {
        $this->resetAfterTest();
        $this->setAdminUser();

        $cat1 = $this->getDataGenerator()->create_category(['name' => 'Paginated Cat 1']);
        
        $records = \tool_management_console\repository\category_repository::get_paginated(0, 10);
        $this->assertNotEmpty($records);
        
        $found = false;
        foreach ($records as $r) {
            if ($r->name === 'Paginated Cat 1') {
                $found = true;
                break;
            }
        }
        $this->assertTrue($found);
    }
}
