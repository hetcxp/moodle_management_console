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
 * External service for users in tool_management_console.
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
use tool_management_console\application\users\user_action_usecase;
use tool_management_console\application\users\user_cohort_action_usecase;
use tool_management_console\application\users\get_user_detail_usecase;
use tool_management_console\repository\user_repository;
use tool_management_console\repository\course_enrolment_repository;

/**
 * Users external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class users extends external_api {
    /**
     * Parameter definition for get_users_kpis.
     *
     * @return external_function_parameters
     */
    public static function get_users_kpis_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Get aggregated KPI counters for users.
     *
     * @return array
     */
    public static function get_users_kpis(): array {
        global $CFG;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/user:viewalldetails', $context);

        $cached = \tool_management_console\cache_manager::get_kpi('user_kpis');
        if ($cached !== null) {
            return $cached;
        }

        $primaryadmin = get_admin();
        $adminid = $primaryadmin ? (int)$primaryadmin->id : 1;
        $guestid = $CFG->siteguest ?? 0;
        $sqlparams = ['adminid' => $adminid, 'guestid' => $guestid];

        $recentthreshold = time() - (30 * 86400); // 30 days.
        $sqlparams['recent'] = $recentthreshold;

        $stats = user_repository::get_users_kpi_stats($sqlparams);
        $progress = user_repository::get_users_kpi_avg_progress($sqlparams);

        $result = [
            'total_users'     => (int)($stats->total_users ?? 0),
            'active_users'    => (int)($stats->active_users ?? 0),
            'suspended_users' => (int)($stats->suspended_users ?? 0),
            'recent_active'   => (int)($stats->recent_active ?? 0),
            'avg_progress'    => (float)($progress ?? 0),
        ];

        \tool_management_console\cache_manager::set_kpi('user_kpis', $result);
        return $result;
    }

    /**
     * Return structure for get_users_kpis.
     *
     * @return external_single_structure
     */
    public static function get_users_kpis_returns(): external_single_structure {
        return new external_single_structure([
            'total_users'     => new external_value(PARAM_INT, 'Total valid users'),
            'active_users'    => new external_value(PARAM_INT, 'Active users'),
            'suspended_users' => new external_value(PARAM_INT, 'Suspended users'),
            'recent_active'   => new external_value(PARAM_INT, 'Users active in last 30 days'),
            'avg_progress'    => new external_value(PARAM_FLOAT, 'Average progress across enrolled courses'),
        ]);
    }

    /**
     * Parameter definition for get_users.
     *
     * @return external_function_parameters
     */
    public static function get_users_parameters(): external_function_parameters {
        return new external_function_parameters([
            'page'    => new external_value(PARAM_INT, 'Page number index', VALUE_DEFAULT, 0),
            'perpage' => new external_value(PARAM_INT, 'Users per page', VALUE_DEFAULT, 20),
            'sort'    => new external_value(PARAM_ALPHA, 'Sort column', VALUE_DEFAULT, 'lastaccess'),
            'dir'     => new external_value(PARAM_ALPHA, 'Sort direction ASC or DESC', VALUE_DEFAULT, 'DESC'),
            'search'  => new external_value(PARAM_TEXT, 'Search query for name or email', VALUE_DEFAULT, ''),
            'filters' => new external_value(PARAM_RAW, 'JSON encoded filters string', VALUE_DEFAULT, '{}'),
        ]);
    }

    /**
     * Get paginated and filtered users list.
     *
     * @param int $page Page index.
     * @param int $perpage Users per page.
     * @param string $sort Sort field.
     * @param string $dir Sort direction ASC or DESC.
     * @param string $search Search query string.
     * @param string $filters JSON encoded filter criteria.
     * @return array
     */
    public static function get_users(
        int $page = 0,
        int $perpage = 20,
        string $sort = 'lastaccess',
        string $dir = 'DESC',
        string $search = '',
        string $filters = '{}'
    ): array {
        global $CFG;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/user:viewalldetails', $context);

        $params = self::validate_parameters(self::get_users_parameters(), [
            'page'    => $page,
            'perpage' => $perpage,
            'sort'    => $sort,
            'dir'     => $dir,
            'search'  => $search,
            'filters' => $filters,
        ]);

        $params['page'] = max(0, (int)$params['page']);
        $params['perpage'] = min(max(1, (int)$params['perpage']), 200);

        $allowedsorts = [
            'id', 'firstname', 'lastname', 'email', 'suspended',
            'lastaccess', 'cohorts', 'competencies', 'courses', 'progress',
        ];
        if (!in_array($params['sort'], $allowedsorts, true)) {
            $params['sort'] = 'lastaccess';
        }

        $params['dir'] = strtoupper($params['dir']) === 'ASC' ? 'ASC' : 'DESC';

        if (is_string($params['filters'])) {
            $decoded = json_decode($params['filters'], true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
                $params['filters'] = '{}';
            }
        }

        [$records, $totalcount] = user_repository::get_users_filtered($params);

        $siteadmins = explode(',', $CFG->siteadmins ?? '');

        $users = [];
        foreach ($records as $u) {
            $fullname = fullname($u);
            $enrolled = (int)$u->enrolled_courses;
            $completed = (int)$u->completed_courses;
            $progress = ($enrolled > 0) ? min(100, round(($completed / $enrolled) * 100)) : 0;
            $isadmin = in_array($u->id, $siteadmins);

            $cleanemail = trim(preg_replace('/[\s\x{00a0}]+/u', '', (string)$u->email));

            $users[] = [
                'id'                 => (int)$u->id,
                'username'           => (string)$u->username,
                'firstname'          => (string)$u->firstname,
                'lastname'           => (string)$u->lastname,
                'fullname'           => (string)$fullname,
                'email'              => (string)$cleanemail,
                'suspended'          => (int)$u->suspended,
                'is_active'          => empty($u->suspended) ? 1 : 0,
                'is_admin'           => $isadmin ? 1 : 0,
                'lastaccess'         => (int)$u->lastaccess,
                'cohorts_count'      => (int)$u->cohorts_count,
                'competencies_count' => (int)($u->competencies_count ?? 0),
                'enrolled_courses'   => $enrolled,
                'completed_courses'  => $completed,
                'progress'           => (int)$progress,
            ];
        }

        return [
            'totalcount' => $totalcount,
            'page'       => (int)$params['page'],
            'perpage'    => (int)$params['perpage'],
            'users'      => $users,
        ];
    }

    /**
     * Return structure for get_users.
     *
     * @return external_single_structure
     */
    public static function get_users_returns(): external_single_structure {
        return new external_single_structure([
            'totalcount' => new external_value(PARAM_INT, 'Total users matching query'),
            'page'       => new external_value(PARAM_INT, 'Current page index'),
            'perpage'    => new external_value(PARAM_INT, 'Users per page'),
            'users'      => new external_multiple_structure(
                new external_single_structure([
                    'id'                 => new external_value(PARAM_INT, 'User ID'),
                    'username'           => new external_value(PARAM_TEXT, 'Username'),
                    'firstname'          => new external_value(PARAM_TEXT, 'First name'),
                    'lastname'           => new external_value(PARAM_TEXT, 'Last name'),
                    'fullname'           => new external_value(PARAM_TEXT, 'Display full name'),
                    'email'              => new external_value(PARAM_TEXT, 'Email address'),
                    'suspended'          => new external_value(PARAM_INT, '1 if suspended, 0 if active'),
                    'is_active'          => new external_value(PARAM_INT, '1 if active, 0 if suspended'),
                    'is_admin'           => new external_value(PARAM_INT, '1 if site admin, 0 otherwise'),
                    'lastaccess'         => new external_value(PARAM_INT, 'Last login timestamp'),
                    'cohorts_count'      => new external_value(PARAM_INT, 'Number of cohort memberships'),
                    'competencies_count' => new external_value(
                        PARAM_INT,
                        'Number of assigned competencies',
                        VALUE_DEFAULT,
                        0
                    ),
                    'enrolled_courses'   => new external_value(PARAM_INT, 'Number of enrolled courses'),
                    'completed_courses'  => new external_value(PARAM_INT, 'Number of completed courses'),
                    'progress'           => new external_value(PARAM_INT, 'Average completion percentage'),
                ])
            ),
        ]);
    }

    /**
     * Parameter definition for user_action.
     *
     * @return external_function_parameters
     */
    public static function user_action_parameters(): external_function_parameters {
        return new external_function_parameters([
            'action'  => new external_value(
                PARAM_ALPHANUMEXT,
                'Action: suspend, activate, delete, message, send_temp_password, reset_password'
            ),
            'userids' => new external_multiple_structure(
                new external_value(PARAM_INT, 'User ID'),
                'List of user IDs to act upon'
            ),
            'message_text' => new external_value(PARAM_RAW, 'Message text', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Perform user actions (suspend, activate, delete, etc.).
     *
     * @param string $action Action name.
     * @param array $userids Array of user IDs.
     * @param string $messagetext Message text.
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function user_action(string $action, array $userids = [], string $messagetext = ''): array {
        $context = context_system::instance();
        self::validate_context($context);

        $params = self::validate_parameters(self::user_action_parameters(), [
            'action'  => $action,
            'userids' => $userids,
            'message_text' => $messagetext,
        ]);

        return user_action_usecase::execute(
            $params['action'],
            $params['userids'],
            $params['message_text']
        );
    }

    /**
     * Return structure for user_action.
     *
     * @return external_single_structure
     */
    public static function user_action_returns(): external_single_structure {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation completed'),
            'message'       => new external_value(PARAM_TEXT, 'Status description'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of users modified'),
        ]);
    }

    /**
     * Parameter definition for get_user_detail.
     *
     * @return external_function_parameters
     */
    public static function get_user_detail_parameters(): external_function_parameters {
        return new external_function_parameters([
            'userid'    => new external_value(PARAM_INT, 'User ID'),
            'limitfrom' => new external_value(PARAM_INT, 'Offset for enrolled courses', VALUE_DEFAULT, 0),
            'limitnum'  => new external_value(
                PARAM_INT,
                'Limit for enrolled courses (max 500, default 200)',
                VALUE_DEFAULT,
                0
            ),
        ]);
    }

    /**
     * Get detailed user record with courses, cohorts and competencies.
     *
     * @param int $userid User ID.
     * @param int $limitfrom Offset for enrolled courses.
     * @param int $limitnum Limit for enrolled courses.
     * @return array
     */
    public static function get_user_detail(int $userid, int $limitfrom = 0, int $limitnum = 0): array {
        $params = self::validate_parameters(self::get_user_detail_parameters(), [
            'userid'    => $userid,
            'limitfrom' => $limitfrom,
            'limitnum'  => $limitnum,
        ]);

        $user = user_repository::get_user_strict($params['userid']);
        $context = \context_user::instance($user->id);
        self::validate_context($context);

        return get_user_detail_usecase::execute(
            (int)$user->id,
            (int)$params['limitfrom'],
            (int)$params['limitnum']
        );
    }

    /**
     * Return structure for get_user_detail.
     *
     * @return external_single_structure
     */
    public static function get_user_detail_returns(): external_single_structure {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'User ID'),
            'username' => new external_value(PARAM_TEXT, 'Username'),
            'fullname' => new external_value(PARAM_TEXT, 'Fullname'),
            'email' => new external_value(PARAM_TEXT, 'Email'),
            'suspended' => new external_value(PARAM_INT, 'Suspended status'),
            'is_active' => new external_value(PARAM_INT, 'Active status'),
            'is_admin' => new external_value(PARAM_INT, 'Is site admin'),
            'lastaccess' => new external_value(PARAM_INT, 'Last access timestamp'),
            'enrolled_courses' => new external_value(PARAM_INT, 'Enrolled courses count'),
            'completed_courses' => new external_value(PARAM_INT, 'Completed courses count'),
            'cohorts_count' => new external_value(PARAM_INT, 'Cohorts count'),
            'progress' => new external_value(PARAM_INT, 'Average progress'),
            'courses' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Course ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'Course fullname'),
                    'shortname' => new external_value(PARAM_TEXT, 'Course shortname'),
                    'progress' => new external_value(PARAM_INT, 'Progress percentage'),
                    'enrolmethod' => new external_value(PARAM_TEXT, 'Enrolment method', VALUE_OPTIONAL),
                    'enrolstatus' => new external_value(PARAM_INT, 'Enrolment status', VALUE_OPTIONAL),
                    'enrolments' => new external_multiple_structure(
                        new external_single_structure([
                            'method' => new external_value(PARAM_ALPHANUMEXT, 'Enrol method'),
                            'status' => new external_value(PARAM_INT, 'Enrol status'),
                            'timestart' => new external_value(PARAM_INT, 'Enrol timestart'),
                            'timeend' => new external_value(PARAM_INT, 'Enrol timeend'),
                        ]),
                        'Detailed enrolments',
                        VALUE_OPTIONAL
                    ),
                ])
            ),
            'cohorts' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Cohort ID'),
                    'name' => new external_value(PARAM_TEXT, 'Cohort name'),
                    'idnumber' => new external_value(PARAM_TEXT, 'ID number'),
                ])
            ),
            'system_roles' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Role ID'),
                    'name' => new external_value(PARAM_TEXT, 'Role display name'),
                    'shortname' => new external_value(PARAM_TEXT, 'Role shortname'),
                ]),
                'System roles assigned to user',
                VALUE_OPTIONAL
            ),
            'competencies' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Competency ID'),
                    'shortname' => new external_value(PARAM_TEXT, 'Competency shortname'),
                    'idnumber' => new external_value(PARAM_RAW, 'Competency idnumber', VALUE_OPTIONAL),
                    'description' => new external_value(PARAM_RAW, 'Competency description', VALUE_OPTIONAL),
                    'frameworkid' => new external_value(PARAM_INT, 'Framework ID'),
                    'frameworkname' => new external_value(PARAM_TEXT, 'Framework name'),
                    'proficiency' => new external_value(PARAM_INT, 'Proficiency (1 proficient, 0 not)'),
                    'status' => new external_value(PARAM_INT, 'Status code'),
                    'statusname' => new external_value(PARAM_TEXT, 'Status display name'),
                    'grade' => new external_value(PARAM_INT, 'Grade value', VALUE_OPTIONAL),
                    'gradename' => new external_value(PARAM_TEXT, 'Grade display name', VALUE_OPTIONAL),
                    'courses' => new external_multiple_structure(
                        new external_single_structure([
                            'id' => new external_value(PARAM_INT, 'Course ID'),
                            'fullname' => new external_value(PARAM_TEXT, 'Course fullname'),
                            'shortname' => new external_value(PARAM_TEXT, 'Course shortname'),
                            'is_enrolled' => new external_value(PARAM_INT, '1 if enrolled, 0 otherwise'),
                        ]),
                        'Linked courses',
                        VALUE_OPTIONAL
                    ),
                    'evidences_count' => new external_value(PARAM_INT, 'Evidences count'),
                    'evidences' => new external_multiple_structure(
                        new external_single_structure([
                            'id' => new external_value(PARAM_INT, 'Evidence ID'),
                            'action' => new external_value(PARAM_INT, 'Action code'),
                            'actionname' => new external_value(PARAM_TEXT, 'Action display name'),
                            'actionuserfullname' => new external_value(PARAM_TEXT, 'Author or action user fullname'),
                            'descidentifier' => new external_value(PARAM_TEXT, 'Description identifier', VALUE_OPTIONAL),
                            'note' => new external_value(PARAM_RAW, 'Evidence note', VALUE_OPTIONAL),
                            'url' => new external_value(PARAM_URL, 'Evidence URL', VALUE_DEFAULT, ''),
                            'grade' => new external_value(PARAM_INT, 'Grade value', VALUE_OPTIONAL),
                            'timecreated' => new external_value(PARAM_INT, 'Timestamp created'),
                            'timecreated_str' => new external_value(PARAM_TEXT, 'Formatted creation date', VALUE_OPTIONAL),
                        ]),
                        'Evidences list',
                        VALUE_OPTIONAL
                    ),
                    'source'                    => new external_value(
                        PARAM_TEXT,
                        'Assignment source: adhoc|course|usercomp',
                        VALUE_OPTIONAL
                    ),
                    'enrolled_in_linked_course' => new external_value(
                        PARAM_INT,
                        '1 if enrolled in at least one linked course',
                        VALUE_DEFAULT,
                        0
                    ),
                ]),
                'User assigned competencies',
                VALUE_OPTIONAL
            ),
        ]);
    }

    /**
     * Parameter definition for user_cohort_action.
     *
     * @return external_function_parameters
     */
    public static function user_cohort_action_parameters(): external_function_parameters {
        return new external_function_parameters([
            'action' => new external_value(PARAM_ALPHA, 'add or remove'),
            'userid' => new external_value(PARAM_INT, 'User ID'),
            'cohortids' => new external_multiple_structure(
                new external_value(PARAM_INT, 'Cohort ID'),
                'Array of cohort IDs'
            ),
        ]);
    }

    /**
     * Assign or remove user from cohorts.
     *
     * @param string $action Action name.
     * @param int $userid User ID.
     * @param array $cohortids Array of cohort IDs.
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function user_cohort_action(string $action, int $userid, array $cohortids): array {
        global $CFG;
        require_once($CFG->dirroot . '/cohort/lib.php');

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/cohort:manage', $context);
        \tool_management_console\license_manager::require_active_license();

        $params = self::validate_parameters(self::user_cohort_action_parameters(), [
            'action' => $action,
            'userid' => $userid,
            'cohortids' => $cohortids,
        ]);

        return user_cohort_action_usecase::execute($params);
    }

    /**
     * Return structure for user_cohort_action.
     *
     * @return external_single_structure
     */
    public static function user_cohort_action_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success'),
            'message' => new external_value(PARAM_TEXT, 'Message'),
            'affectedcount' => new external_value(PARAM_INT, 'Affected count'),
        ]);
    }

    /**
     * Parameter definition for add_user.
     *
     * @return external_function_parameters
     */
    public static function add_user_parameters(): external_function_parameters {
        return new external_function_parameters([
            'username'       => new external_value(PARAM_RAW, 'Username'),
            'password'       => new external_value(PARAM_RAW, 'Password', VALUE_DEFAULT, ''),
            'firstname'      => new external_value(PARAM_TEXT, 'First name'),
            'lastname'       => new external_value(PARAM_TEXT, 'Last name'),
            'email'          => new external_value(PARAM_EMAIL, 'Email address'),
            'createpassword' => new external_value(
                PARAM_INT,
                '1 to generate password and send email',
                VALUE_DEFAULT,
                0
            ),
        ]);
    }

    /**
     * Create a new Moodle user.
     *
     * @param string $username
     * @param string $password
     * @param string $firstname
     * @param string $lastname
     * @param string $email
     * @param int $createpassword
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function add_user(
        $username,
        $password = '',
        $firstname = '',
        $lastname = '',
        $email = '',
        $createpassword = 0
    ): array {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/user/lib.php');
        require_once($CFG->libdir . '/moodlelib.php');
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/user:create', $context);
        \tool_management_console\license_manager::require_active_license();

        $params = self::validate_parameters(self::add_user_parameters(), [
            'username'       => $username,
            'password'       => $password,
            'firstname'      => $firstname,
            'lastname'       => $lastname,
            'email'          => $email,
            'createpassword' => $createpassword,
        ]);

        $user = new \stdClass();
        $user->username = trim(\core_text::strtolower($params['username']));
        $user->firstname = $params['firstname'];
        $user->lastname = $params['lastname'];
        $user->email = $params['email'];
        $user->confirmed = 1;
        $user->mnethostid = $CFG->mnet_localhost_id;
        $user->auth = 'manual';

        if (!empty($params['createpassword'])) {
            $user->password = generate_password(12);
        } else {
            $user->password = $params['password'];
        }

        try {
            $userid = user_create_user($user, true, false);
            \tool_management_console\cache_manager::invalidate_kpis('user_kpis');

            if (!empty($params['createpassword'])) {
                $createduser = user_repository::get_user($userid);
                if ($createduser) {
                    setnew_password_and_mail($createduser);
                }
            }

            return ['success' => true, 'userid' => (int)$userid, 'message' => 'User created successfully'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Return structure for add_user.
     *
     * @return external_single_structure
     */
    public static function add_user_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success'),
            'userid' => new external_value(PARAM_INT, 'User ID', VALUE_OPTIONAL),
            'message' => new external_value(PARAM_TEXT, 'Message'),
        ]);
    }

    /**
     * Parameter definition for upload_users_csv.
     *
     * @return external_function_parameters
     */
    public static function upload_users_csv_parameters(): external_function_parameters {
        return new external_function_parameters([
            'fileContent' => new external_value(PARAM_RAW, 'Base64 encoded CSV content'),
        ]);
    }

    /**
     * Bulk upload users from a base64 encoded CSV string.
     *
     * @param string $filecontent
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function upload_users_csv($filecontent): array {
        global $CFG;
        require_once($CFG->dirroot . '/user/lib.php');
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/user:create', $context);
        \tool_management_console\license_manager::require_active_license();

        $params = self::validate_parameters(self::upload_users_csv_parameters(), [
            'fileContent' => $filecontent,
        ]);

        $csv = base64_decode($params['fileContent'], true);
        if ($csv === false) {
            return ['success' => false, 'message' => 'Invalid base64 encoding'];
        }

        $lines = explode("\n", trim($csv));
        if (count($lines) < 2) {
            return ['success' => false, 'message' => 'Empty CSV or missing header'];
        }

        $headers = str_getcsv(array_shift($lines));
        $headers = array_map('trim', $headers);

        $requiredheaders = ['username', 'email', 'firstname', 'lastname', 'password'];
        foreach ($requiredheaders as $req) {
            if (!in_array($req, $headers)) {
                return ['success' => false, 'message' => 'Missing required column: ' . $req];
            }
        }

        $created = 0;
        $errors = [];

        foreach ($lines as $linenum => $line) {
            $line = trim($line);
            if (empty($line)) {
                continue;
            }

            $row = str_getcsv($line);
            if (count($row) !== count($headers)) {
                $errors[] = "Row " . ($linenum + 2) . ": Column count mismatch";
                continue;
            }

            $data = array_combine($headers, $row);

            $user = new \stdClass();
            $user->username = $data['username'];
            $user->password = $data['password'];
            $user->firstname = $data['firstname'];
            $user->lastname = $data['lastname'];
            $user->email = $data['email'];
            $user->confirmed = 1;
            $user->mnethostid = $CFG->mnet_localhost_id;
            $user->auth = 'manual';

            try {
                user_create_user($user, true, false);
                $created++;
            } catch (\Exception $e) {
                $errors[] = "Row " . ($linenum + 2) . ": " . $e->getMessage();
            }
        }

        if ($created > 0) {
            \tool_management_console\cache_manager::invalidate_kpis('user_kpis');
        }

        $msg = "Created $created users.";
        if (count($errors) > 0) {
            $slice = array_slice($errors, 0, 3);
            $msg .= " " . count($errors) . " errors. " . implode("; ", $slice) . (count($errors) > 3 ? "..." : "");
        }

        return ['success' => count($errors) === 0, 'message' => $msg];
    }

    /**
     * Return structure for upload_users_csv.
     *
     * @return external_single_structure
     */
    public static function upload_users_csv_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success'),
            'message' => new external_value(PARAM_TEXT, 'Message'),
        ]);
    }

    /**
     * Parameter definition for user_course_action.
     *
     * @return external_function_parameters
     */
    public static function user_course_action_parameters(): external_function_parameters {
        return new external_function_parameters([
            'action'    => new external_value(PARAM_ALPHANUMEXT, 'add, remove, suspend, activate, update_dates'),
            'userid'    => new external_value(PARAM_INT, 'User ID'),
            'courseids' => new external_multiple_structure(new external_value(PARAM_INT, 'Course ID')),
            'timestart' => new external_value(PARAM_INT, 'Enrolment start time', VALUE_DEFAULT, 0),
            'timeend'   => new external_value(PARAM_INT, 'Enrolment end time', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Manage user course enrolments and status.
     *
     * @param string $action
     * @param int $userid
     * @param array $courseids
     * @param int $timestart
     * @param int $timeend
     * @return array
     * @throws \moodle_exception
     * @throws \required_capability_exception
     */
    public static function user_course_action(
        $action,
        $userid,
        $courseids,
        $timestart = 0,
        $timeend = 0
    ): array {
        $context = context_system::instance();
        self::validate_context($context);

        $params = self::validate_parameters(self::user_course_action_parameters(), [
            'action' => $action,
            'userid' => $userid,
            'courseids' => $courseids,
            'timestart' => $timestart,
            'timeend' => $timeend,
        ]);

        foreach ($params['courseids'] as $cid) {
            $coursecontext = \context_course::instance($cid);
            require_capability('enrol/manual:enrol', $coursecontext);
        }
        \tool_management_console\license_manager::require_active_license();

        return course_enrolment_repository::batch_user_course_enrolment(
            $params['action'],
            $params['userid'],
            $params['courseids'],
            [
                'timestart' => $params['timestart'],
                'timeend' => $params['timeend'],
            ]
        );
    }

    /**
     * Return structure for user_course_action.
     *
     * @return external_single_structure
     */
    public static function user_course_action_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success'),
            'message' => new external_value(PARAM_TEXT, 'Message'),
        ]);
    }
}
