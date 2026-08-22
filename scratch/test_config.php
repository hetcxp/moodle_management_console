<?php
define('CLI_SCRIPT', true);
// Need to find config.php
$config = null;
$paths = [
    '/moodle/config.php',
    __DIR__ . '/../../moodle/config.php',
    '/var/www/html/config.php',
    '/Users/hectorteran/Documents/moodle/config.php'
];
// Wait, I can search for it
