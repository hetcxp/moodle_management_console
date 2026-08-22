<?php
if (file_exists('../../config.php')) {
    require_once('../../config.php');
} else if (file_exists(__DIR__ . '/../../../../Dev/moodle-dev/config.php')) {
    require_once(__DIR__ . '/../../../../Dev/moodle-dev/config.php');
} else {
    require_once('/Users/hectorteran/Dev/moodle-dev/config.php');
}
require_once($CFG->dirroot . '/user/lib.php');

$token = required_param('token', PARAM_ALPHANUM);
$redirect = required_param('redirect', PARAM_RAW);

global $DB;
$keyrecord = $DB->get_record('user_private_key', ['value' => $token, 'script' => 'core_message']);

if (!$keyrecord) {
    print_error('invalidtoken');
}
$userid = $keyrecord->userid;

$user = $DB->get_record('user', array('id' => $userid, 'deleted' => 0, 'suspended' => 0));

if (!$user) {
    print_error('invaliduser');
}

// Ensure the user is logged in
complete_user_login($user);

// Redirect to destination
$url = new moodle_url(urldecode($redirect));
redirect($url);
