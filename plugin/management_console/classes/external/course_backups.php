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
 * External service for course backup management and MBZ restore in tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\external;

defined('MOODLE_INTERNAL') || die();

use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Course backups and restore external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class course_backups extends external_api {

    /**
     * Parameter definition for list_server_backups.
     *
     * @return external_function_parameters
     */
    public static function list_server_backups_parameters() {
        return new external_function_parameters([]);
    }

    /**
     * List authorized .mbz backup archives available on the server.
     *
     * @return array
     */
    public static function list_server_backups() {
        global $CFG;

        $syscontext = context_system::instance();
        self::validate_context($syscontext);
        require_capability('moodle/course:create', $syscontext);

        $scratchdir = realpath($CFG->dirroot . '/../Documents/moodle_management_console/scratch');
        if (!$scratchdir || !is_dir($scratchdir)) {
            $scratchdir = realpath(__DIR__ . '/../../../../scratch');
        }

        $results = [];
        if ($scratchdir && is_dir($scratchdir)) {
            $files = scandir($scratchdir);
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') {
                    continue;
                }
                if (strtolower(pathinfo($file, PATHINFO_EXTENSION)) === 'mbz') {
                    $filepath = $scratchdir . '/' . $file;
                    $results[] = [
                        'name' => $file,
                        'path' => $filepath,
                        'size' => (int)filesize($filepath),
                        'date' => (int)filemtime($filepath),
                    ];
                }
            }
        }

        usort($results, function ($a, $b) {
            return $b['date'] <=> $a['date'];
        });

        return $results;
    }

    /**
     * Return definition for list_server_backups.
     *
     * @return external_multiple_structure
     */
    public static function list_server_backups_returns() {
        return new external_multiple_structure(
            new external_single_structure([
                'name' => new external_value(PARAM_TEXT, 'Backup file name'),
                'path' => new external_value(PARAM_RAW, 'Absolute file path on server'),
                'size' => new external_value(PARAM_INT, 'File size in bytes'),
                'date' => new external_value(PARAM_INT, 'Last modified timestamp'),
            ])
        );
    }

    /**
     * Parameter definition for restore_course_mbz.
     *
     * @return external_function_parameters
     */
    public static function restore_course_mbz_parameters() {
        return new external_function_parameters([
            'backupfile' => new external_value(PARAM_RAW, 'Server path to the .mbz backup archive'),
            'categoryid' => new external_value(PARAM_INT, 'Destination category ID'),
            'fullname'   => new external_value(PARAM_TEXT, 'Course full name (optional)', VALUE_DEFAULT, ''),
            'shortname'  => new external_value(PARAM_TEXT, 'Course short name (optional)', VALUE_DEFAULT, ''),
            'courseid'   => new external_value(PARAM_INT, 'Target course ID if restoring into existing course (0 = new)', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Restore a course from an authorized .mbz backup archive.
     *
     * @param string $backupfile
     * @param int $categoryid
     * @param string $fullname
     * @param string $shortname
     * @param int $courseid
     * @return array
     */
    public static function restore_course_mbz($backupfile, $categoryid, $fullname = '', $shortname = '', $courseid = 0) {
        global $CFG, $USER, $DB;

        $params = self::validate_parameters(self::restore_course_mbz_parameters(), [
            'backupfile' => $backupfile,
            'categoryid' => $categoryid,
            'fullname'   => $fullname,
            'shortname'  => $shortname,
            'courseid'   => $courseid,
        ]);

        $backupfile = $params['backupfile'];
        $categoryid = (int)$params['categoryid'];
        $fullname   = trim($params['fullname']);
        $shortname  = trim($params['shortname']);
        $courseid   = (int)$params['courseid'];

        $syscontext = context_system::instance();
        self::validate_context($syscontext);
        require_capability('moodle/course:create', $syscontext);

        $catcontext = \context_coursecat::instance($categoryid);
        require_capability('moodle/course:create', $catcontext);

        require_once($CFG->dirroot . '/backup/util/includes/restore_includes.php');

        $realbackupfile = realpath($backupfile);
        if (!$realbackupfile || !file_exists($realbackupfile)) {
            throw new \moodle_exception('filenotfound', 'error', '', null, $backupfile);
        }

        // Whitelist security check: only dataroot/temp/backup or project scratch/
        $tempdir = realpath($CFG->dataroot . '/temp/backup');
        $scratchdir = realpath($CFG->dirroot . '/../Documents/moodle_management_console/scratch');
        if (!$scratchdir) {
            $scratchdir = realpath(__DIR__ . '/../../../../scratch');
        }

        $is_allowed = false;
        if ($tempdir && str_starts_with($realbackupfile, $tempdir)) {
            $is_allowed = true;
        }
        if ($scratchdir && str_starts_with($realbackupfile, $scratchdir)) {
            $is_allowed = true;
        }

        if (!$is_allowed) {
            throw new \moodle_exception('error', 'tool_management_console', '', null, 'Unauthorized backup file path: ' . $realbackupfile);
        }

        // Prepare backup temporary extraction directory
        $fp = get_file_packer('application/vnd.moodle.backup');
        $backupdir = \restore_controller::get_tempdir_name(SITEID, $USER->id);
        $path = make_backup_temp_directory($backupdir);

        try {
            $extracted = $fp->extract_to_pathname($realbackupfile, $path);
            if (!$extracted) {
                throw new \moodle_exception('cannotextractfile', 'error');
            }

            // Inspect moodle_backup.xml if fullname or shortname are omitted
            $xmlfile = $path . '/moodle_backup.xml';
            if (file_exists($xmlfile)) {
                $xmlcontent = file_get_contents($xmlfile);
                if (empty($fullname) && preg_match('/<detail[^>]*name="course_fullname"[^>]*>([^<]+)<\/detail>/i', $xmlcontent, $m)) {
                    $fullname = trim($m[1]);
                }
                if (empty($shortname) && preg_match('/<detail[^>]*name="course_shortname"[^>]*>([^<]+)<\/detail>/i', $xmlcontent, $m)) {
                    $shortname = trim($m[1]);
                }
            }

            if (empty($fullname)) {
                $fullname = 'Restored Course ' . date('Y-m-d H:i');
            }
            if (empty($shortname)) {
                $shortname = 'REST_' . date('Ymd_His');
            }

            // Ensure shortname uniqueness
            $orig_shortname = $shortname;
            $counter = 1;
            while ($DB->record_exists('course', ['shortname' => $shortname])) {
                $shortname = $orig_shortname . '_' . $counter;
                $counter++;
            }

            // Create container course if not restoring into existing
            if (empty($courseid)) {
                $courseid = \restore_dbops::create_new_course($fullname, $shortname, $categoryid);
            }

            $rc = new \restore_controller(
                $backupdir,
                $courseid,
                \backup::INTERACTIVE_NO,
                \backup::MODE_GENERAL,
                $USER->id,
                \backup::TARGET_NEW_COURSE
            );

            $precheck = $rc->execute_precheck();
            $warnings = [];
            if (!$precheck) {
                $results = $rc->get_precheck_results();
                if (!empty($results['errors'])) {
                    $rc->destroy();
                    throw new \moodle_exception('restoreerror', 'backup', '', null, implode(', ', $results['errors']));
                }
                if (!empty($results['warnings'])) {
                    foreach ($results['warnings'] as $w) {
                        $warnings[] = is_string($w) ? $w : json_encode($w);
                    }
                }
            }

            $rc->execute_plan();
            $rc->destroy();

            // Passive cleanup of uploaded temp file if it was inside temp/backup
            if ($tempdir && str_starts_with($realbackupfile, $tempdir)) {
                @unlink($realbackupfile);
            }

            $course = $DB->get_record('course', ['id' => $courseid]);
            $courseurl = (new \moodle_url('/course/view.php', ['id' => $courseid]))->out(false);

            return [
                'success'   => true,
                'courseid'  => (int)$courseid,
                'fullname'  => $course ? $course->fullname : $fullname,
                'shortname' => $course ? $course->shortname : $shortname,
                'url'       => $courseurl,
                'warnings'  => $warnings,
            ];
        } finally {
            \fulldelete($path);
        }
    }

    /**
     * Return definition for restore_course_mbz.
     *
     * @return external_single_structure
     */
    public static function restore_course_mbz_returns() {
        return new external_single_structure([
            'success'   => new external_value(PARAM_BOOL, 'True if restore succeeded'),
            'courseid'  => new external_value(PARAM_INT, 'ID of restored course'),
            'fullname'  => new external_value(PARAM_TEXT, 'Full name of restored course'),
            'shortname' => new external_value(PARAM_TEXT, 'Short name of restored course'),
            'url'       => new external_value(PARAM_URL, 'URL to view the restored course'),
            'warnings'  => new external_multiple_structure(
                new external_value(PARAM_TEXT, 'Warning message'),
                'List of non-blocking warnings',
                VALUE_DEFAULT,
                []
            ),
        ]);
    }
}
