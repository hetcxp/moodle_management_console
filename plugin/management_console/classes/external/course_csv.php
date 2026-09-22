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
 * External service for bulk course CSV imports in tool_management_console.
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
use core_external\external_single_structure;
use core_external\external_value;
use stdClass;

/**
 * Course CSV upload external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class course_csv extends external_api {

    public static function upload_courses_csv_parameters() {
        return new external_function_parameters([
            'fileContent' => new external_value(PARAM_RAW, 'Base64 encoded CSV file content'),
        ]);
    }

    /**
     * Bulk upload courses via base64 encoded CSV string.
     *
     * @param string $fileContent
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function upload_courses_csv($fileContent) {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/course/lib.php');

        $context = context_system::instance();
        self::validate_context($context);
        
        $params = self::validate_parameters(self::upload_courses_csv_parameters(), [
            'fileContent' => $fileContent
        ]);

        $csvContent = base64_decode($params['fileContent'], true);
        if ($csvContent === false) {
            return ['success' => false, 'message' => 'Invalid base64 encoding'];
        }

        if (strlen($csvContent) > 5242880) { // 5MB limit
            return ['success' => false, 'message' => 'File too large (limit 5MB)'];
        }

        $lines = explode("\n", str_replace("\r", "", $csvContent));
        if (count($lines) < 2) {
            return ['success' => false, 'message' => 'Empty CSV or missing header'];
        }

        $header = str_getcsv(array_shift($lines));
        $header = array_map('trim', $header);

        $shortnameIdx = array_search('shortname', $header);
        $fullnameIdx = array_search('fullname', $header);
        $categoryIdx = array_search('category', $header);

        if ($shortnameIdx === false || $fullnameIdx === false || $categoryIdx === false) {
            return ['success' => false, 'message' => 'Missing required columns: shortname, fullname, category'];
        }

        $successCount = 0;
        $errorCount = 0;
        $errors = [];
        $processed_shortnames = [];

        foreach ($lines as $lineNum => $line) {
            $line = trim($line);
            if (empty($line)) continue;

            $data = str_getcsv($line);
            if (count($data) < count($header)) {
                $errorCount++;
                $errors[] = "Row " . ($lineNum + 2) . ": Incomplete data";
                continue;
            }

            $shortname = trim($data[$shortnameIdx]);
            $fullname = trim($data[$fullnameIdx]);
            $category = trim($data[$categoryIdx]);

            if (isset($processed_shortnames[$shortname])) {
                $errorCount++;
                $errors[] = "Row " . ($lineNum + 2) . ": Duplicate shortname in CSV ($shortname)";
                continue;
            }
            if ($DB->record_exists('course', ['shortname' => $shortname])) {
                $errorCount++;
                $errors[] = "Row " . ($lineNum + 2) . ": Shortname already exists ($shortname)";
                continue;
            }
            
            $processed_shortnames[$shortname] = true;

            $courseData = new stdClass();
            $courseData->shortname = $shortname;
            $courseData->fullname = $fullname;
            $courseData->category = (int)$category;
            $courseData->visible = 1;

            try {
                $catcontext = \context_coursecat::instance($courseData->category);
                require_capability('moodle/course:create', $catcontext);
                
                create_course($courseData);
                $successCount++;
            } catch (\Exception $e) {
                $errorCount++;
                $errors[] = "Row " . ($lineNum + 2) . " ($shortname): " . $e->getMessage();
            }
        }

        $msg = "Created $successCount courses. ";
        if ($errorCount > 0) {
            $msg .= "$errorCount errors. " . implode("; ", array_slice($errors, 0, 3)) . (count($errors) > 3 ? "..." : "");
        }

        return [
            'success' => $errorCount === 0,
            'message' => $msg
        ];
    }

    public static function upload_courses_csv_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'True if operation completely succeeded'),
            'message' => new external_value(PARAM_TEXT, 'Status description message'),
        ]);
    }
}
