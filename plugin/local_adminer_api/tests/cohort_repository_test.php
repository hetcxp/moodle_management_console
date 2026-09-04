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
 * Cohort repository tests for local_adminer_api.
 *
 * @package    local_adminer_api
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_adminer_api;

defined('MOODLE_INTERNAL') || die();

use advanced_testcase;

global $CFG;
require_once($CFG->dirroot . '/local/adminer_api/classes/repository/cohort_repository.php');

/**
 * Cohort repository test cases.
 *
 * @package    local_adminer_api
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_adminer_api\repository\cohort_repository
 */
class cohort_repository_test extends advanced_testcase {

    public function setUp(): void {
        $this->resetAfterTest();
    }

    public function test_cohort_repository_operations() {
        $this->resetAfterTest();
        $this->setAdminUser();

        // 1. Crear cohorte con un miembro
        $cohort = $this->getDataGenerator()->create_cohort(['name' => 'Cohort Repo Test', 'idnumber' => 'CRTEST']);
        $user = $this->getDataGenerator()->create_user();
        cohort_add_member($cohort->id, $user->id);

        // 2. Probar get_kpis
        $kpis = \local_adminer_api\repository\cohort_repository::get_kpis();
        $this->assertIsArray($kpis);
        $this->assertGreaterThanOrEqual(1, $kpis['total_cohorts']);
        $this->assertGreaterThanOrEqual(1, $kpis['total_members']);

        // 3. Probar get_paginated_cohorts y get_cohort_strict
        $paginated = \local_adminer_api\repository\cohort_repository::get_paginated_cohorts(0, 10, 'name', 'ASC', 'Cohort Repo');
        $this->assertGreaterThanOrEqual(1, $paginated['totalcount']);
        $this->assertEquals($cohort->id, $paginated['cohorts'][0]['id']);

        $strict = \local_adminer_api\repository\cohort_repository::get_cohort_strict($cohort->id);
        $this->assertEquals($cohort->id, $strict->id);

        // 4. Probar miembros
        $members = \local_adminer_api\repository\cohort_repository::get_cohort_members($cohort->id);
        $this->assertCount(1, $members);
        $this->assertEquals($user->id, $members[0]['id']);
    }
}
