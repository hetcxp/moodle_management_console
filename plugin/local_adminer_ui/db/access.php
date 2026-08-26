<?php
defined('MOODLE_INTERNAL') || die();

$capabilities = [
    'local/adminer_ui:access' => [
        'riskbitmask'  => RISK_CONFIG,
        'captype'      => 'read',
        'contextlevel' => CONTEXT_SYSTEM,
        'archetypes'   => [
            'manager' => CAP_ALLOW,
        ],
    ],
];
