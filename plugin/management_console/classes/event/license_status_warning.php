<?php
// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Event fired when an expired or tampered license is detected by the cron task.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\event;

/**
 * License status warning event.
 *
 * Emitted by the scheduled task when the stored license is expired or tampered.
 */
class license_status_warning extends \core\event\base {
    /**
     * Initialise event data.
     */
    protected function init() {
        $this->data['crud']        = 'r';
        $this->data['edulevel']    = self::LEVEL_OTHER;
        $this->data['objecttable'] = null;
    }

    /**
     * Return localised event name.
     *
     * @return string
     */
    public static function get_name(): string {
        return get_string('event_license_status_warning', 'tool_management_console');
    }

    /**
     * Return event description.
     *
     * @return string
     */
    public function get_description(): string {
        $status = $this->other['status'] ?? 'unknown';
        return "License status warning detected by scheduled task: {$status}.";
    }

    /**
     * Return object ID mapping.
     *
     * @return array
     */
    public static function get_objectid_mapping() {
        return ['db' => null, 'restore' => \core\event\base::NOT_MAPPED];
    }
}
