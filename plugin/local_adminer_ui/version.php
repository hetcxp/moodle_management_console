<?php
defined('MOODLE_INTERNAL') || die();

$plugin->component    = 'local_adminer_ui';
$plugin->version      = 2026083103;
$plugin->requires     = 2024100700;
$plugin->maturity     = MATURITY_STABLE;
$plugin->release      = '1.1.2';
$plugin->dependencies = [
    'local_adminer_api' => 2026083103,
];
