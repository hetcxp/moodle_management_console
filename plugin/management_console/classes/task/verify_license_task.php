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
 * Scheduled task: verify license and update time watermark.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\task;

/**
 * Verifies the stored license key once per day and anchors the time watermark
 * to a trusted network source.
 *
 * Authorization NEVER depends on this task having run — it is a best-effort
 * background operation. Network failures are silently ignored.
 */
class verify_license_task extends \core\task\scheduled_task {
    /**
     * Get task name.
     *
     * @return string
     */
    public function get_name(): string {
        return get_string('verifylicensetask', 'tool_management_console');
    }

    /**
     * Execute scheduled task.
     *
     * @return void
     */
    public function execute(): void {
        // 1. Attempt to anchor the watermark to a trusted network time source.
        $url = get_config('tool_management_console', 'license_time_url') ?: 'https://www.google.com';
        $parsed = parse_url($url);
        $trusted_hosts = ['www.google.com', 'google.com', 'time.cloudflare.com', 'cloudflare.com'];
        if (empty($parsed['scheme']) || strtolower($parsed['scheme']) !== 'https' ||
            empty($parsed['host']) || !in_array(strtolower($parsed['host']), $trusted_hosts, true)) {
            $url = 'https://www.google.com';
        }
        $ctx = stream_context_create(['http' => ['method' => 'HEAD', 'timeout' => 3]]);

        // Suppress warnings — failures are intentionally ignored.
        $headers = @get_headers($url, 1, $ctx);

        if ($headers && isset($headers['Date'])) {
            $nettime = strtotime($headers['Date']);
            if ($nettime > 0) {
                $watermark = (int) get_config('tool_management_console', 'license_time_watermark');
                set_config(
                    'license_time_watermark',
                    max($watermark, $nettime),
                    'tool_management_console'
                );
            }
        }

        // 2. Check current license status and emit an event on problems.
        $info = \tool_management_console\license_manager::get_license_info();
        if (in_array($info['status'], ['expired', 'tampered'], true)) {
            $event = \tool_management_console\event\license_status_warning::create([
                'context' => \context_system::instance(),
                'other'   => ['status' => $info['status']],
            ]);
            $event->trigger();
        }
    }
}
