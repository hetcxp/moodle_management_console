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
 * External service for cohorts in tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\external;

use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use tool_management_console\repository\cohort_repository;

/**
 * Cohorts external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class cohorts extends external_api {
    /**
     * Describes the parameters for get_cohorts.
     *
     * @return external_function_parameters
     */
    public static function get_cohorts_parameters(): external_function_parameters {
        return new external_function_parameters([
            'page'    => new external_value(PARAM_INT, 'Page index', VALUE_DEFAULT, 0),
            'perpage' => new external_value(PARAM_INT, 'Cohorts per page', VALUE_DEFAULT, 50),
            'sort'    => new external_value(PARAM_ALPHA, 'Sort field', VALUE_DEFAULT, 'name'),
            'dir'     => new external_value(PARAM_ALPHA, 'Sort direction', VALUE_DEFAULT, 'ASC'),
            'search'  => new external_value(PARAM_TEXT, 'Search query', VALUE_DEFAULT, ''),
            'filters' => new external_value(PARAM_RAW, 'JSON encoded filters string', VALUE_DEFAULT, '{}'),
        ]);
    }

    /**
     * Get paginated cohorts with optional filtering.
     *
     * @param int $page
     * @param int $perpage
     * @param string $sort
     * @param string $dir
     * @param string $search
     * @param string $filters
     * @return array
     */
    public static function get_cohorts(
        int $page = 0,
        int $perpage = 50,
        string $sort = 'name',
        string $dir = 'ASC',
        string $search = '',
        string $filters = '{}'
    ): array {
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/cohort:view', $context);

        $params = self::validate_parameters(self::get_cohorts_parameters(), [
            'page'    => $page,
            'perpage' => $perpage,
            'sort'    => $sort,
            'dir'     => $dir,
            'search'  => $search,
            'filters' => $filters,
        ]);
        $params['perpage'] = min(max(1, $params['perpage']), 200);

        [$records, $totalcount] = cohort_repository::get_cohorts_filtered($params);

        $cohortids = array_keys($records);
        $progressmap = cohort_repository::get_cohorts_progress_map($cohortids);

        $cohorts = [];
        foreach ($records as $r) {
            $progress = 0;
            if ($r->memberscount > 0 && $r->coursescount > 0) {
                $progress = isset($progressmap[$r->id]) ? (int)$progressmap[$r->id] : 0;
            }

            $cohorts[] = [
                'id'           => (int)$r->id,
                'name'         => (string)$r->name,
                'idnumber'     => (string)($r->idnumber ?? ''),
                'description'  => (string)($r->description ?? ''),
                'memberscount' => (int)$r->memberscount,
                'coursescount' => (int)($r->coursescount ?? 0),
                'progress'     => $progress,
            ];
        }

        return [
            'totalcount' => $totalcount,
            'page'       => (int)$params['page'],
            'perpage'    => (int)$params['perpage'],
            'cohorts'    => $cohorts,
        ];
    }

    /**
     * Describes the return structure for get_cohorts.
     *
     * @return external_single_structure
     */
    public static function get_cohorts_returns(): external_single_structure {
        return new external_single_structure([
            'totalcount' => new external_value(PARAM_INT, 'Total cohorts count'),
            'page'       => new external_value(PARAM_INT, 'Current page index'),
            'perpage'    => new external_value(PARAM_INT, 'Items per page'),
            'cohorts'    => new external_multiple_structure(
                new external_single_structure([
                    'id'           => new external_value(PARAM_INT, 'Cohort ID'),
                    'name'         => new external_value(PARAM_TEXT, 'Cohort name'),
                    'idnumber'     => new external_value(PARAM_TEXT, 'ID number'),
                    'description'  => new external_value(PARAM_RAW, 'Description'),
                    'memberscount' => new external_value(PARAM_INT, 'Number of users in cohort'),
                    'coursescount' => new external_value(PARAM_INT, 'Number of linked courses'),
                    'progress'     => new external_value(PARAM_INT, 'Average progress percentage', VALUE_OPTIONAL),
                ])
            ),
        ]);
    }

    /**
     * Describes the parameters for cohort_action.
     *
     * @return external_function_parameters
     */
    public static function cohort_action_parameters(): external_function_parameters {
        return new external_function_parameters([
            'action'      => new external_value(PARAM_ALPHA, 'Action: create, edit, delete'),
            'cohortid'    => new external_value(PARAM_INT, 'Cohort ID for edit/delete', VALUE_DEFAULT, 0),
            'name'        => new external_value(PARAM_TEXT, 'Cohort name', VALUE_DEFAULT, ''),
            'idnumber'    => new external_value(PARAM_TEXT, 'ID number', VALUE_DEFAULT, ''),
            'description' => new external_value(PARAM_RAW, 'Description', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Perform cohort actions (create, edit, delete).
     *
     * @param string $action
     * @param int $cohortid
     * @param string $name
     * @param string $idnumber
     * @param string $description
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function cohort_action(
        string $action,
        int $cohortid = 0,
        string $name = '',
        string $idnumber = '',
        string $description = ''
    ): array {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/cohort/lib.php');

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/cohort:manage', $context);
        \tool_management_console\license_manager::require_active_license();

        $params = self::validate_parameters(self::cohort_action_parameters(), [
            'action'      => $action,
            'cohortid'    => $cohortid,
            'name'        => $name,
            'idnumber'    => $idnumber,
            'description' => $description,
        ]);

        $act = $params['action'];
        $affected = 0;

        $transaction = $DB->start_delegated_transaction();
        try {
            switch ($act) {
                case 'create':
                    if (empty($params['name'])) {
                        $transaction->allow_commit();
                        return ['success' => false, 'message' => 'Cohort name is required', 'affectedcount' => 0];
                    }
                    $data = new \stdClass();
                    $data->name = $params['name'];
                    $data->idnumber = $params['idnumber'];
                    $data->description = clean_text($params['description'], FORMAT_HTML);
                    $data->descriptionformat = FORMAT_HTML;
                    $data->contextid = $context->id;

                    $id = cohort_add_cohort($data);
                    $transaction->allow_commit();
                    return [
                        'success'       => true,
                        'message'       => 'Cohort created successfully with ID ' . $id,
                        'affectedcount' => 1,
                    ];

                case 'edit':
                    if (empty($params['cohortid']) || empty($params['name'])) {
                        $transaction->allow_commit();
                        return ['success' => false, 'message' => 'cohortid and name are required', 'affectedcount' => 0];
                    }
                    $data = new \stdClass();
                    $data->id = $params['cohortid'];
                    $data->name = $params['name'];
                    $data->idnumber = $params['idnumber'];
                    $data->description = clean_text($params['description'], FORMAT_HTML);
                    $data->descriptionformat = FORMAT_HTML;
                    $data->contextid = $context->id;

                    cohort_update_cohort($data);
                    $transaction->allow_commit();
                    return [
                        'success'       => true,
                        'message'       => 'Cohort updated successfully',
                        'affectedcount' => 1,
                    ];

                case 'delete':
                    if (empty($params['cohortid'])) {
                        $transaction->allow_commit();
                        return ['success' => false, 'message' => 'cohortid is required', 'affectedcount' => 0];
                    }
                    $cohort = cohort_repository::get_cohort($params['cohortid']);
                    if ($cohort) {
                        cohort_delete_cohort($cohort);
                        $affected = 1;
                    }
                    break;

                default:
                    $transaction->allow_commit();
                    return ['success' => false, 'message' => 'Unknown action: ' . $act, 'affectedcount' => 0];
            }
            $transaction->allow_commit();
            \tool_management_console\cache_manager::invalidate_kpis('cohort_kpis');
        } catch (\Exception $e) {
            $transaction->rollback($e);
            return ['success' => false, 'message' => $e->getMessage(), 'affectedcount' => 0];
        }

        return [
            'success'       => true,
            'message'       => "Action {$act} executed successfully.",
            'affectedcount' => $affected,
        ];
    }

    /**
     * Describes the return structure for cohort_action.
     *
     * @return external_single_structure
     */
    public static function cohort_action_returns(): external_single_structure {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message'       => new external_value(PARAM_TEXT, 'Status description message'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of records affected'),
        ]);
    }

    /**
     * Describes the parameters for get_cohort_detail.
     *
     * @return external_function_parameters
     */
    public static function get_cohort_detail_parameters(): external_function_parameters {
        return new external_function_parameters([
            'cohortid'  => new external_value(PARAM_INT, 'Cohort ID'),
            'limitfrom' => new external_value(PARAM_INT, 'Offset for cohort members', VALUE_DEFAULT, 0),
            'limitnum'  => new external_value(PARAM_INT, 'Limit for cohort members (max 500, default 200)', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Get details, members and linked courses for a cohort.
     *
     * @param int $cohortid
     * @param int $limitfrom
     * @param int $limitnum
     * @return array
     */
    public static function get_cohort_detail(int $cohortid, int $limitfrom = 0, int $limitnum = 0): array {
        $params = self::validate_parameters(self::get_cohort_detail_parameters(), [
            'cohortid'  => $cohortid,
            'limitfrom' => $limitfrom,
            'limitnum'  => $limitnum,
        ]);

        $cohort = cohort_repository::get_cohort_strict($params['cohortid']);
        $context = \context::instance_by_id($cohort->contextid, IGNORE_MISSING) ?: context_system::instance();
        self::validate_context($context);
        require_capability('moodle/cohort:view', $context);

        // Security TD-DATA-001: Server-side bounded pagination with ceiling of 500.
        $offset = max(0, (int)$params['limitfrom']);
        $reqlimit = (int)$params['limitnum'];
        $limit = ($reqlimit > 0 && $reqlimit <= 500) ? $reqlimit : 200;

        // Cursos sincronizados (acotados a 100).
        $coursesrecords = cohort_repository::get_cohort_synced_courses($cohort->id, 0, 100);

        // Miembros de la cohorte con límite y offset.
        $membersrecords = cohort_repository::get_cohort_members($cohort->id, $offset, $limit);

        $memberids = array_keys($membersrecords);
        $progressdata = cohort_repository::get_cohort_members_progress_data($memberids, array_values($coursesrecords));

        $canviewemail = is_siteadmin() || has_capability('moodle/site:viewuseridentity', $context);

        $members = [];
        $coursecount = count($coursesrecords);

        foreach ($membersrecords as $u) {
            $u->firstnamephonetic = $u->firstnamephonetic ?? '';
            $u->lastnamephonetic = $u->lastnamephonetic ?? '';
            $u->middlename = $u->middlename ?? '';
            $u->alternatename = $u->alternatename ?? '';
            $u->email = $u->email ?? '';
            $u->lastaccess = $u->lastaccess ?? 0;
            $u->suspended = $u->suspended ?? 0;

            $usercourseprogress = [];
            $totalprogress = 0;

            foreach ($coursesrecords as $c) {
                $progval = $progressdata[$u->id][$c->id] ?? 0;
                $totalprogress += $progval;

                $usercourseprogress[] = [
                    'courseid' => (int)$c->id,
                    'progress' => $progval,
                ];
            }

            $progress = $coursecount > 0 ? (int)round($totalprogress / $coursecount) : 0;

            $members[] = [
                'id' => (int)$u->id,
                'fullname' => fullname($u),
                'email' => $canviewemail ? (string)$u->email : '',
                'lastaccess' => (int)$u->lastaccess,
                'suspended' => (int)$u->suspended,
                'progress' => $progress,
                'course_progresses' => $usercourseprogress,
            ];
        }

        $courses = [];
        $membercount = count($membersrecords);
        foreach ($coursesrecords as $c) {
            $coursetotalprogress = 0;
            foreach ($membersrecords as $u) {
                $coursetotalprogress += ($progressdata[$u->id][$c->id] ?? 0);
            }
            $courseprogress = $membercount > 0 ? (int)round($coursetotalprogress / $membercount) : 0;

            $courses[] = [
                'id' => (int)$c->id,
                'fullname' => (string)$c->fullname,
                'shortname' => (string)$c->shortname,
                'enrolid' => (int)$c->enrolid,
                'enrolledcount' => (int)($c->enrolledcount ?? 0),
                'progress' => $courseprogress,
            ];
        }

        $overallprogress = ($coursecount > 0 && $membercount > 0)
            ? (int)round(array_sum(array_column($members, 'progress')) / $membercount)
            : 0;

        return [
            'id' => (int)$cohort->id,
            'name' => (string)$cohort->name,
            'idnumber' => (string)$cohort->idnumber,
            'description' => (string)$cohort->description,
            'progress' => $overallprogress,
            'members' => $members,
            'courses' => $courses,
        ];
    }

    /**
     * Describes the return structure for get_cohort_detail.
     *
     * @return external_single_structure
     */
    public static function get_cohort_detail_returns(): external_single_structure {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Cohort ID'),
            'name' => new external_value(PARAM_TEXT, 'Cohort name'),
            'idnumber' => new external_value(PARAM_TEXT, 'ID number'),
            'description' => new external_value(PARAM_RAW, 'Description'),
            'progress' => new external_value(PARAM_INT, 'Average progress percentage', VALUE_OPTIONAL),
            'members' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'User ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'User fullname'),
                    'email' => new external_value(PARAM_TEXT, 'User email'),
                    'lastaccess' => new external_value(PARAM_INT, 'User lastaccess time'),
                    'suspended' => new external_value(PARAM_INT, 'Is user suspended'),
                    'progress' => new external_value(PARAM_INT, 'Progress percentage', VALUE_OPTIONAL),
                    'course_progresses' => new external_multiple_structure(
                        new external_single_structure([
                            'courseid' => new external_value(PARAM_INT, 'Course ID'),
                            'progress' => new external_value(PARAM_INT, 'Progress percentage'),
                        ]),
                        'List of course progress percentages for this user',
                        VALUE_OPTIONAL
                    ),
                ])
            ),
            'courses' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Course ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'Course fullname'),
                    'shortname' => new external_value(PARAM_TEXT, 'Course shortname'),
                    'enrolid' => new external_value(PARAM_INT, 'Enrol instance ID'),
                    'enrolledcount' => new external_value(PARAM_INT, 'Enrolled users count'),
                    'progress' => new external_value(PARAM_INT, 'Average course progress for cohort members', VALUE_OPTIONAL),
                ])
            ),
        ]);
    }

    /**
     * Describes the parameters for get_cohorts_kpis.
     *
     * @return external_function_parameters
     */
    public static function get_cohorts_kpis_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Get aggregate KPIs for cohorts.
     *
     * @return array
     */
    public static function get_cohorts_kpis(): array {
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/cohort:view', $context);

        return cohort_repository::get_kpis();
    }

    /**
     * Describes the return structure for get_cohorts_kpis.
     *
     * @return external_single_structure
     */
    public static function get_cohorts_kpis_returns(): external_single_structure {
        return new external_single_structure([
            'total_cohorts'  => new external_value(PARAM_INT, 'Total cohorts'),
            'total_members'  => new external_value(PARAM_INT, 'Total members across all cohorts'),
            'avg_members'    => new external_value(PARAM_FLOAT, 'Average members per cohort'),
            'empty_cohorts'  => new external_value(PARAM_INT, 'Cohorts without members'),
            'synced_courses' => new external_value(PARAM_INT, 'Cohorts linked to courses'),
        ]);
    }
}
