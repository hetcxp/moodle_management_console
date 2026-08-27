<?php

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/local/adminer_api/classes/repository/category_repository.php');

class category_repository_test extends \advanced_testcase {

    public function setUp(): void {
        $this->resetAfterTest();
    }

    public function test_count_all() {
        $this->resetAfterTest();
        $this->setAdminUser();

        // Crear dos categorías
        $cat1 = $this->getDataGenerator()->create_category(['name' => 'Cat 1']);
        $cat2 = $this->getDataGenerator()->create_category(['name' => 'Cat 2']);

        $count = \local_adminer_api\repository\category_repository::count_all();
        $this->assertGreaterThanOrEqual(2, $count);
    }

    public function test_get_paginated() {
        $this->resetAfterTest();
        $this->setAdminUser();

        $cat1 = $this->getDataGenerator()->create_category(['name' => 'Paginated Cat 1']);
        
        $records = \local_adminer_api\repository\category_repository::get_paginated(0, 10);
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
