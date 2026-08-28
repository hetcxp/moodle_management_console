<?php
require_once('../../config.php');
require_once($CFG->dirroot . '/user/lib.php');

$token = required_param('token', PARAM_ALPHANUM);
$redirect = required_param('redirect', PARAM_URL); // Use PARAM_URL for basic sanitization

// Validate redirect destination
$allowed_external_hosts = [
    'admin.academyfactory.online',
    'reports.academyfactory.online'
];

$parsed = parse_url($redirect);
$is_valid_dest = false;

if (isset($parsed['host'])) {
    // External URL: must be HTTPS and in allowlist
    if (isset($parsed['scheme']) && $parsed['scheme'] === 'https') {
        if (in_array($parsed['host'], $allowed_external_hosts)) {
            $is_valid_dest = true;
        }
    }
} else {
    // Relative path: prevent scheme-relative URLs like '//evil.com'
    if (strpos($redirect, '//') !== 0 && strpos($redirect, '\\\\') !== 0) {
        $is_valid_dest = true;
    }
}

if (empty($redirect) || !$is_valid_dest) {
    print_error('invalidurl');
}

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
$url = new moodle_url($redirect);
redirect($url);
