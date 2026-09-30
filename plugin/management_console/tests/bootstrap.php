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
 * Portable PHPUnit test bootstrap loader for tool_management_console.
 *
 * Dynamically resolves Moodle core phpunit bootstrap across standalone repos,
 * symlinked installations, classic layouts, and modern Moodle 5+ public/ layouts
 * without hardcoded system paths.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || define('MOODLE_INTERNAL', true);

$candidates = [];

// 1. Explicit environment overrides
if ($bootstrap_file = getenv('MOODLE_BOOTSTRAP')) {
    $candidates[] = $bootstrap_file;
}

if ($moodle_dir = getenv('MOODLE_DIR')) {
    $candidates[] = rtrim($moodle_dir, '/') . '/public/lib/phpunit/bootstrap.php';
    $candidates[] = rtrim($moodle_dir, '/') . '/lib/phpunit/bootstrap.php';
}

// 2. Working directory (cwd when executing from Moodle root)
$cwd = getcwd();
if ($cwd) {
    $candidates[] = $cwd . '/public/lib/phpunit/bootstrap.php';
    $candidates[] = $cwd . '/lib/phpunit/bootstrap.php';
}

// 3. Traversal from cwd upwards (handles running from within plugin or subdirectories)
$search_dir = $cwd;
for ($i = 0; $i < 5 && $search_dir && $search_dir !== '/' && $search_dir !== '.'; $i++) {
    $candidates[] = $search_dir . '/public/lib/phpunit/bootstrap.php';
    $candidates[] = $search_dir . '/lib/phpunit/bootstrap.php';
    $search_dir = dirname($search_dir);
}

// 4. Relative to plugin directory (when directly placed or symlinked inside Moodle)
// Classic layout: <moodle>/admin/tool/management_console/tests (4 levels up to <moodle>)
$candidates[] = dirname(__DIR__, 4) . '/lib/phpunit/bootstrap.php';
// Modern layout: <moodle>/public/admin/tool/management_console/tests (5 levels up to <moodle>)
$candidates[] = dirname(__DIR__, 5) . '/public/lib/phpunit/bootstrap.php';
$candidates[] = dirname(__DIR__, 5) . '/lib/phpunit/bootstrap.php';

// Deduplicate candidates
$candidates = array_unique(array_filter($candidates));

$bootstrapped = false;
foreach ($candidates as $candidate) {
    if (file_exists($candidate)) {
        require_once($candidate);
        $bootstrapped = true;
        break;
    }
}

if (!$bootstrapped) {
    fwrite(STDERR, "Error: Moodle PHPUnit bootstrap could not be located.\n");
    fwrite(STDERR, "Please set MOODLE_DIR or MOODLE_BOOTSTRAP environment variable.\n");
    exit(1);
}
