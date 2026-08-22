<?php
namespace local_adminer_api\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_value;
use core_external\external_single_structure;

defined('MOODLE_INTERNAL') || die();

class autologin extends external_api {
    public static function get_autologin_url_parameters() {
        return new external_function_parameters([
            'destination' => new external_value(PARAM_RAW, 'Destination path')
        ]);
    }

    public static function get_autologin_url($destination) {
        global $USER, $CFG;

        $params = self::validate_parameters(self::get_autologin_url_parameters(), [
            'destination' => $destination
        ]);

        require_once($CFG->dirroot . '/user/lib.php');

        $key = get_user_key('core_message', $USER->id);
        if (!$key) {
            $key = create_user_key('core_message', $USER->id, null, $CFG->sessiontimeout);
        }

        // We will create an autologin script at plugin root: local/adminer_api/autologin.php
        $autologin_url = new \moodle_url('/local/adminer_api/autologin.php', [
            'token' => $key,
            'redirect' => urlencode($params['destination'])
        ]);

        return [
            'url' => $autologin_url->out(false)
        ];
    }

    public static function get_autologin_url_returns() {
        return new external_single_structure([
            'url' => new external_value(PARAM_URL, 'Autologin URL')
        ]);
    }
}
