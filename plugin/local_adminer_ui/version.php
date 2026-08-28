<?php
defined('MOODLE_INTERNAL') || die();

$plugin->component    = 'local_adminer_ui';
$plugin->version      = 2026082600;
$plugin->requires     = 2024100700;
$plugin->maturity     = MATURITY_STABLE;
$plugin->release      = '1.0.0';
$plugin->dependencies = [
    'local_adminer_api' => 2026082601,
];
