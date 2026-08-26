<?php
defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $ADMIN->add('localplugins',
        new admin_externalpage(
            'local_adminer_ui',
            get_string('pluginname', 'local_adminer_ui'),
            new moodle_url('/local/adminer_ui/index.php'),
            'local/adminer_ui:access'
        )
    );
}
