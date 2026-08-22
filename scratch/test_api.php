<?php
define('CLI_SCRIPT', true);
require('/Users/hectorteran/Dev/moodle-dev/config.php');
require_once($CFG->dirroot . '/local/adminer_api/classes/external/courses.php');

try {
    $result = local_adminer_api\external\courses::course_cohort_action('add', 2, [1]);
    print_r($result);
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
