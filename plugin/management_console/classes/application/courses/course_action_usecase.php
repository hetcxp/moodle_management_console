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
 * Use case for course actions (create, hide, show, delete, move, update).
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\application\courses;

use context_coursecat;
use context_course;
use moodle_exception;
use stdClass;
use tool_management_console\license_manager;

/**
 * Executes course domain actions with transactional safety.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class course_action_usecase {
    /**
     * Execute course action with strict rollback governance.
     *
     * @param array $params Validated parameters for course action.
     * @return array Result payload with success, message, and affectedcount.
     */
    public static function execute(array $params): array {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/course/lib.php');

        $act = isset($params['action']) ? (string)$params['action'] : '';
        $allowed = ['create', 'move', 'hide', 'show', 'delete', 'update', 'update_dates'];
        if (!in_array($act, $allowed, true)) {
            return [
                'success'       => false,
                'message'       => 'Unknown action: ' . $act,
                'affectedcount' => 0,
            ];
        }

        $transaction = $DB->start_delegated_transaction();
        try {
            $result = self::dispatch($params);
            $transaction->allow_commit();
            return $result;
        } catch (\Throwable $e) {
            try {
                $transaction->rollback($e);
            } catch (\Throwable $rollbackex) {
                if ($rollbackex !== $e) {
                    throw $rollbackex;
                }
            }
            $isnoperm = ($e instanceof \moodle_exception && $e->errorcode === 'nopermissions');
            if ($e instanceof \required_capability_exception || $isnoperm) {
                throw $e;
            }
            if ($e instanceof \dml_exception) {
                debugging(get_class($e) . ': Database query execution error', DEBUG_DEVELOPER);
            } else {
                debugging($e->getMessage(), DEBUG_DEVELOPER);
            }
            $message = ($e instanceof \moodle_exception && !($e instanceof \dml_exception))
                ? $e->getMessage()
                : 'An error occurred while processing the course action.';
            return [
                'success'       => false,
                'message'       => $message,
                'affectedcount' => 0,
            ];
        }
    }

    /**
     * Dispatch course action to dedicated handlers.
     *
     * @param array $params
     * @return array
     */
    private static function dispatch(array $params): array {
        $act = isset($params['action']) ? $params['action'] : '';
        if ($act === 'create') {
            return self::handle_create($params);
        }
        if ($act === 'move') {
            return self::handle_move($params);
        }
        return self::dispatch_batch($act, $params);
    }

    /**
     * Dispatch batch course visibility actions.
     *
     * @param string $act Action key.
     * @param array $params Parameters.
     * @return array
     */
    private static function dispatch_batch(string $act, array $params): array {
        $rawids = isset($params['courseids']) ? (array)$params['courseids'] : [];
        $courseids = array_values(array_unique(array_filter(array_map('intval', $rawids), fn($id) => $id > 0)));
        if (!empty($rawids) && empty($courseids)) {
            return [
                'success'       => false,
                'message'       => 'No valid course IDs provided.',
                'affectedcount' => 0,
            ];
        }
        if ($act === 'hide') {
            return self::make_response($act, self::handle_visibility($courseids, false));
        }
        if ($act === 'show') {
            return self::make_response($act, self::handle_visibility($courseids, true));
        }
        return self::dispatch_mutation($act, $params, $courseids);
    }

    /**
     * Dispatch course mutation actions with separated update_dates handler.
     *
     * @param string $act Action key.
     * @param array $params Parameters.
     * @param array $courseids Target course IDs.
     * @return array
     */
    private static function dispatch_mutation(string $act, array $params, array $courseids): array {
        if ($act === 'delete') {
            return self::make_response($act, self::handle_delete($courseids));
        }
        if ($act === 'update') {
            return self::make_response($act, self::handle_update($courseids, $params));
        }
        if ($act === 'update_dates') {
            return self::make_response($act, self::handle_update_dates($courseids, $params));
        }
        return [
            'success'       => false,
            'message'       => 'Unknown action: ' . $act,
            'affectedcount' => 0,
        ];
    }

    /**
     * Build standard response array.
     *
     * @param string $act
     * @param int $affected
     * @return array
     */
    private static function make_response(string $act, int $affected): array {
        return [
            'success'       => true,
            'message'       => "Action {$act} executed on {$affected} courses.",
            'affectedcount' => $affected,
        ];
    }

    /**
     * Handle course creation with strong category validation.
     *
     * @param array $params Creation parameters.
     * @return array
     */
    private static function handle_create(array $params): array {
        global $DB;
        if (!self::validate_create_params($params)) {
            return [
                'success'       => false,
                'message'       => 'fullname, shortname and categoryid are required.',
                'affectedcount' => 0,
            ];
        }

        $catid = (int)$params['categoryid'];
        $catcontext = context_coursecat::instance($catid, IGNORE_MISSING);
        if (!$catcontext) {
            return [
                'success'       => false,
                'message'       => 'Category does not exist: ' . $catid,
                'affectedcount' => 0,
            ];
        }

        require_capability('moodle/course:create', $catcontext);
        license_manager::require_active_license();

        $data = self::build_new_course_data($params, $catid);
        $newcourse = create_course($data);

        return [
            'success'       => true,
            'message'       => 'Course created successfully with ID ' . $newcourse->id,
            'affectedcount' => 1,
        ];
    }

    /**
     * Validate create parameters with strict type checking.
     *
     * @param array $params
     * @return bool
     */
    private static function validate_create_params(array $params): bool {
        $catid = isset($params['categoryid']) ? (int)$params['categoryid'] : 0;
        if ($catid <= 0) {
            return false;
        }
        if (empty($params['fullname'])) {
            return false;
        }
        if (empty($params['shortname'])) {
            return false;
        }
        return true;
    }

    /**
     * Build new course data object.
     *
     * @param array $params
     * @param int $catid
     * @return stdClass
     */
    private static function build_new_course_data(array $params, int $catid): stdClass {
        $data = new stdClass();
        $data->fullname = $params['fullname'];
        $data->shortname = $params['shortname'];
        $data->category = $catid;
        $data->summary = isset($params['summary']) ? $params['summary'] : '';
        $data->visible = isset($params['visible']) ? (int)$params['visible'] : 1;
        self::attach_create_dates($data, $params);
        return $data;
    }

    /**
     * Attach start and end dates if provided.
     *
     * @param stdClass $data
     * @param array $params
     * @return void
     */
    private static function attach_create_dates(stdClass $data, array $params): void {
        $start = isset($params['startdate']) ? (int)$params['startdate'] : 0;
        $end = isset($params['enddate']) ? (int)$params['enddate'] : 0;
        if ($start > 0) {
            $data->startdate = $start;
        }
        if ($end > 0) {
            $data->enddate = $end;
        }
    }

    /**
     * Handle visibility change for multiple courses.
     *
     * @param array $courseids Array of course IDs.
     * @param bool $visible Target visibility.
     * @return int Count of affected courses.
     */
    private static function handle_visibility(array $courseids, bool $visible): int {
        $affected = 0;
        foreach ($courseids as $cid) {
            if ($cid <= 1) {
                continue;
            }
            $cctx = context_course::instance($cid, IGNORE_MISSING);
            if (!$cctx) {
                continue;
            }
            require_capability('moodle/course:visibility', $cctx);
            license_manager::require_active_license();
            course_change_visibility($cid, $visible);
            $affected++;
        }
        return $affected;
    }

    /**
     * Safe helper to fetch single course record.
     *
     * @param int $cid Course ID.
     * @return stdClass|null
     */
    private static function get_course_record(int $cid): ?stdClass {
        global $DB;
        $record = $DB->get_record('course', ['id' => $cid]);
        return $record ?: null;
    }

    /**
     * Handle deletion of multiple courses.
     *
     * @param array $courseids Array of course IDs.
     * @return int Count of affected courses.
     */
    private static function handle_delete(array $courseids): int {
        $affected = 0;
        foreach ($courseids as $cid) {
            if ($cid <= 1) {
                continue;
            }
            $cctx = context_course::instance($cid, IGNORE_MISSING);
            if (!$cctx) {
                continue;
            }
            require_capability('moodle/course:delete', $cctx);
            license_manager::require_active_license();
            $course = self::get_course_record($cid);
            if ($course) {
                delete_course($course, false);
                $affected++;
            }
        }
        return $affected;
    }

    /**
     * Handle moving courses to target category.
     *
     * @param array $params Move parameters with courseids and categoryid.
     * @return array
     */
    private static function handle_move(array $params): array {
        global $DB;
        $targetid = isset($params['categoryid']) ? (int)$params['categoryid'] : 0;
        if ($targetid <= 0) {
            return [
                'success'       => false,
                'message'       => 'Valid categoryid is required to move courses.',
                'affectedcount' => 0,
            ];
        }

        $targetcatctx = context_coursecat::instance($targetid, IGNORE_MISSING);
        if (!$targetcatctx) {
            return [
                'success'       => false,
                'message'       => 'Valid categoryid is required to move courses.',
                'affectedcount' => 0,
            ];
        }

        require_capability('moodle/category:manage', $targetcatctx);
        license_manager::require_active_license();

        $courseids = isset($params['courseids']) ? $params['courseids'] : [];
        $validcids = self::collect_movable_courses($courseids);
        $affected = 0;
        if (!empty($validcids) && move_courses($validcids, $targetid)) {
            $affected = count($validcids);
        }

        return [
            'success'       => true,
            'message'       => 'Action move executed successfully.',
            'affectedcount' => $affected,
        ];
    }

    /**
     * Collect valid course IDs that current user has permission to update.
     *
     * @param array $courseids
     * @return array
     */
    private static function collect_movable_courses(array $courseids): array {
        $valid = [];
        foreach ($courseids as $cid) {
            if ($cid > 1 && self::can_move_course((int)$cid)) {
                $valid[] = (int)$cid;
            }
        }
        return $valid;
    }

    /**
     * Check if single course can be moved.
     *
     * @param int $cid
     * @return bool
     */
    private static function can_move_course(int $cid): bool {
        $cctx = context_course::instance($cid, IGNORE_MISSING);
        if (!$cctx) {
            return false;
        }
        require_capability('moodle/course:update', $cctx);
        return true;
    }

    /**
     * Handle updating course fields.
     *
     * @param array $courseids
     * @param array $params Update parameters.
     * @return int Count of affected courses.
     */
    private static function handle_update(array $courseids, array $params): int {
        $affected = 0;
        foreach ($courseids as $cid) {
            if ($cid > 1 && self::update_single_course((int)$cid, $params)) {
                $affected++;
            }
        }
        return $affected;
    }

    /**
     * Handle updating course start and end dates exclusively.
     *
     * @param array $courseids
     * @param array $params Update parameters.
     * @return int Count of affected courses.
     */
    private static function handle_update_dates(array $courseids, array $params): int {
        $affected = 0;
        foreach ($courseids as $cid) {
            if ($cid > 1 && self::update_single_course_dates((int)$cid, $params)) {
                $affected++;
            }
        }
        return $affected;
    }

    /**
     * Update single course entity.
     *
     * @param int $cid Course ID.
     * @param array $params Update parameters.
     * @return bool True if updated.
     */
    private static function update_single_course(int $cid, array $params): bool {
        $cctx = context_course::instance($cid, IGNORE_MISSING);
        if (!$cctx) {
            return false;
        }
        require_capability('moodle/course:update', $cctx);
        license_manager::require_active_license();

        $course = self::get_course_record($cid);
        if (!$course) {
            return false;
        }

        $data = self::build_update_data($cid, $params);
        update_course($data);
        return true;
    }

    /**
     * Update single course start and end dates only.
     *
     * @param int $cid Course ID.
     * @param array $params Update parameters.
     * @return bool True if updated.
     */
    private static function update_single_course_dates(int $cid, array $params): bool {
        $cctx = context_course::instance($cid, IGNORE_MISSING);
        if (!$cctx) {
            return false;
        }
        require_capability('moodle/course:update', $cctx);
        license_manager::require_active_license();

        $course = self::get_course_record($cid);
        if (!$course) {
            return false;
        }

        $data = new stdClass();
        $data->id = $cid;
        self::assign_date_fields($data, $params);
        update_course($data);
        return true;
    }

    /**
     * Build update data object.
     *
     * @param int $cid Course ID.
     * @param array $params Update parameters.
     * @return stdClass
     */
    private static function build_update_data(int $cid, array $params): stdClass {
        $data = new stdClass();
        $data->id = $cid;
        self::assign_text_fields($data, $params);
        self::assign_date_fields($data, $params);
        return $data;
    }

    /**
     * Assign text fields to course update object.
     *
     * @param stdClass $data
     * @param array $params
     * @return void
     */
    private static function assign_text_fields(stdClass $data, array $params): void {
        if (!empty($params['fullname'])) {
            $data->fullname = $params['fullname'];
        }
        if (!empty($params['shortname'])) {
            $data->shortname = $params['shortname'];
        }
        if (!empty($params['categoryid'])) {
            $data->category = $params['categoryid'];
        }
        if (isset($params['summary']) && $params['summary'] !== '') {
            $data->summary = $params['summary'];
        }
    }

    /**
     * Assign date fields to course update object.
     *
     * @param stdClass $data
     * @param array $params
     * @return void
     */
    private static function assign_date_fields(stdClass $data, array $params): void {
        $start = isset($params['startdate']) ? (int)$params['startdate'] : 0;
        $end = isset($params['enddate']) ? (int)$params['enddate'] : 0;
        $data->startdate = max(0, $start);
        $data->enddate = max(0, $end);
    }
}
