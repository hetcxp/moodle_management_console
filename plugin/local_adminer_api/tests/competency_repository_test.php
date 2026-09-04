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
 * Competency repository tests for local_adminer_api.
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
require_once($CFG->dirroot . '/local/adminer_api/classes/repository/competency_repository.php');

/**
 * Competency repository test cases.
 *
 * @package    local_adminer_api
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_adminer_api\repository\competency_repository
 */
class competency_repository_test extends advanced_testcase {

    public function setUp(): void {
        $this->resetAfterTest();
    }

    public function test_get_scales() {
        $this->resetAfterTest();
        $this->setAdminUser();

        $scales = \local_adminer_api\repository\competency_repository::get_scales();
        $this->assertIsArray($scales);
        if (!empty($scales)) {
            $this->assertArrayHasKey('id', $scales[0]);
            $this->assertArrayHasKey('name', $scales[0]);
            $this->assertArrayHasKey('items', $scales[0]);
        }
    }

    public function test_get_kpis() {
        $this->resetAfterTest();
        $this->setAdminUser();

        $kpis = \local_adminer_api\repository\competency_repository::get_kpis();
        $this->assertIsArray($kpis);
        $this->assertArrayHasKey('total_frameworks', $kpis);
        $this->assertArrayHasKey('visible_frameworks', $kpis);
        $this->assertArrayHasKey('hidden_frameworks', $kpis);
        $this->assertArrayHasKey('total_competencies', $kpis);
        $this->assertArrayHasKey('pending_reviews', $kpis);
    }

    public function test_framework_and_competency_crud_and_batch_queries() {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();

        // 1. Crear un marco de competencias en base de datos
        $framework = new \stdClass();
        $framework->shortname = 'Framework Test';
        $framework->idnumber = 'FWTEST1';
        $framework->description = 'Test framework description';
        $framework->descriptionformat = FORMAT_HTML;
        $framework->visible = 1;
        $framework->scaleid = 1;
        $framework->scaleconfiguration = json_encode([['scaleid' => 1]]);
        $framework->contextid = \context_system::instance()->id;
        $framework->timecreated = time();
        $framework->timemodified = time();
        $framework->usermodified = 2;
        $framework->id = $DB->insert_record('competency_framework', $framework);

        $res = \local_adminer_api\repository\competency_repository::get_paginated_frameworks(0, 10, 'shortname', 'ASC', 'Framework Test');
        $this->assertGreaterThanOrEqual(1, $res['totalcount']);
        $this->assertEquals('Framework Test', $res['frameworks'][0]['shortname']);

        // 2. Crear una competencia padre y una hija
        $competency = new \stdClass();
        $competency->shortname = 'Competency Parent';
        $competency->idnumber = 'COMP1';
        $competency->description = 'Parent comp';
        $competency->descriptionformat = FORMAT_HTML;
        $competency->competencyframeworkid = $framework->id;
        $competency->parentid = 0;
        $competency->path = '/0/';
        $competency->sortorder = 1;
        $competency->ruletype = null;
        $competency->ruleoutcome = 1;
        $competency->ruleconfig = null;
        $competency->scaleid = null;
        $competency->scaleconfiguration = null;
        $competency->timecreated = time();
        $competency->timemodified = time();
        $competency->usermodified = 2;
        $compid = $DB->insert_record('competency', $competency);
        $DB->set_field('competency', 'path', '/' . $compid . '/', ['id' => $compid]);

        $subcomp = clone $competency;
        $subcomp->shortname = 'Competency Child';
        $subcomp->idnumber = 'COMP1.1';
        $subcomp->parentid = $compid;
        $subcomp->path = '/' . $compid . '/';
        $subcompid = $DB->insert_record('competency', $subcomp);

        // 3. Crear un curso y vincularlo
        $course = $this->getDataGenerator()->create_course(['fullname' => 'Competency Linked Course']);
        $coursecomp = new \stdClass();
        $coursecomp->courseid = $course->id;
        $coursecomp->competencyid = $compid;
        $coursecomp->ruleoutcome = 1;
        $coursecomp->sortorder = 1;
        $coursecomp->timecreated = time();
        $coursecomp->timemodified = time();
        $coursecomp->usermodified = 2;
        $DB->insert_record('competency_coursecomp', $coursecomp);

        // 4. Test get_competency_courses y get_subcompetencies_courses (con batch query de módulos)
        $courses = \local_adminer_api\repository\competency_repository::get_competency_courses($compid);
        $this->assertCount(1, $courses);
        $this->assertEquals($course->id, $courses[0]['id']);

        $subcourses = \local_adminer_api\repository\competency_repository::get_subcompetencies_courses($compid);
        $this->assertIsArray($subcourses);

        // 5. Test count_pending_reviews_by_framework
        $count = \local_adminer_api\repository\competency_repository::count_pending_reviews_by_framework($framework->id);
        $this->assertEquals(0, $count);
    }
}
