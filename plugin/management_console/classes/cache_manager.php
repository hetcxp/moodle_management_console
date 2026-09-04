<?php
// This file is part of Moodle - http://moodle.org/
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

namespace tool_management_console;

defined('MOODLE_INTERNAL') || die();

/**
 * MUC Cache helper for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class cache_manager {

    /**
     * Get MUC cache instance for KPIs if available.
     *
     * @return \cache_application|\cache_store|null
     */
    public static function get_kpis_cache() {
        try {
            if (class_exists('\\cache')) {
                return \cache::make('tool_management_console', 'kpis');
            }
        } catch (\Exception $e) {
            // MUC definition might not be registered yet before plugin upgrade.
            return null;
        }
        return null;
    }

    /**
     * Retrieve cached KPI value if present.
     *
     * @param string $key
     * @return mixed|null
     */
    public static function get_kpi(string $key) {
        $cache = self::get_kpis_cache();
        if ($cache) {
            $val = $cache->get($key);
            if ($val !== false) {
                return $val;
            }
        }
        return null;
    }

    /**
     * Store KPI value into cache.
     *
     * @param string $key
     * @param mixed $data
     * @return bool
     */
    public static function set_kpi(string $key, $data): bool {
        $cache = self::get_kpis_cache();
        if ($cache) {
            return $cache->set($key, $data);
        }
        return false;
    }

    /**
     * Invalidate specific KPI key or purge all KPIs.
     *
     * @param string|null $key
     * @return void
     */
    public static function invalidate_kpis(?string $key = null): void {
        $cache = self::get_kpis_cache();
        if ($cache) {
            if ($key !== null) {
                $cache->delete($key);
            } else {
                $cache->purge();
            }
        }
    }
}
