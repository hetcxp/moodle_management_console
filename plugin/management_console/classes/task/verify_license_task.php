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
 * Scheduled task: verify license and refresh time watermark.
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
        $this->refresh_time_watermark();
        $this->check_license_status();
    }

    /**
     * Resolve and validate trusted network time URL.
     *
     * @return string Validated HTTPS URL.
     */
    protected function resolve_time_url(): string {
        $url = get_config('tool_management_console', 'license_time_url');
        if (empty($url)) {
            return 'https://www.google.com';
        }
        $parsed = parse_url($url);
        $trustedhosts = ['www.google.com', 'google.com', 'time.cloudflare.com', 'cloudflare.com'];
        $scheme = isset($parsed['scheme']) ? strtolower($parsed['scheme']) : '';
        $host = isset($parsed['host']) ? strtolower($parsed['host']) : '';
        if ($scheme !== 'https') {
            return 'https://www.google.com';
        }
        if (!in_array($host, $trustedhosts, true)) {
            return 'https://www.google.com';
        }
        return $url;
    }

    /**
     * Parse timestamp from HTTP response headers.
     *
     * @param array $headers Response headers array.
     * @return int Parsed Unix timestamp or 0.
     */
    protected function extract_nettime_from_headers(array $headers): int {
        $dateheader = null;
        if (isset($headers['date'])) {
            $dateheader = $headers['date'];
        } else if (isset($headers['Date'])) {
            $dateheader = $headers['Date'];
        }
        if (is_array($dateheader)) {
            $dateheader = end($dateheader);
        }
        if (empty($dateheader)) {
            return 0;
        }
        $parsed = (int)strtotime($dateheader);
        return max(0, $parsed);
    }

    /**
     * Attempt to anchor the watermark to a trusted network time source.
     *
     * @return void
     */
    protected function refresh_time_watermark(): void {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');

        $url = $this->resolve_time_url();

        try {
            $curl = new \curl();
            $curl->head($url, [
                'CURLOPT_TIMEOUT' => 4,
                'CURLOPT_CONNECTTIMEOUT' => 3,
            ]);
            $headers = $curl->getResponse();
            $nettime = $this->extract_nettime_from_headers($headers);
            if ($nettime > 0) {
                $watermark = (int)get_config('tool_management_console', 'license_time_watermark');
                set_config('license_time_watermark', max($watermark, $nettime), 'tool_management_console');
            }
        } catch (\Throwable $e) {
            unset($e);
        }
    }

    /**
     * Check current license status and emit warning event on problems.
     *
     * @return void
     */
    protected function check_license_status(): void {
        $info = \tool_management_console\license_manager::get_license_info();
        if (in_array($info['status'], ['expired', 'tampered'], true)) {
            $event = \tool_management_console\event\license_status_warning::create([
                'context' => \core\context\system::instance(),
                'other'   => ['status' => $info['status']],
            ]);
            $event->trigger();
        }
    }
}
