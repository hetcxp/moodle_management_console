<?php
namespace local_adminer_api\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;
use context_system;
use local_adminer_api\repository\user_repository;

defined('MOODLE_INTERNAL') || die();


class users extends external_api {

    public static function get_users_kpis_parameters() {
        return new external_function_parameters([]);
    }

    public static function get_users_kpis() {
        global $CFG;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/user:viewalldetails', $context);

        $guestid = $CFG->siteguest ?? 0;
        $sqlparams = ['adminid' => 1, 'guestid' => $guestid];
        
        $recent_threshold = time() - (30 * 86400); // 30 days
        $sqlparams['recent'] = $recent_threshold;

        $stats = user_repository::get_users_kpi_stats($sqlparams);
        $progress = user_repository::get_users_kpi_avg_progress($sqlparams);

        return [
            'total_users'     => (int)($stats->total_users ?? 0),
            'active_users'    => (int)($stats->active_users ?? 0),
            'suspended_users' => (int)($stats->suspended_users ?? 0),
            'recent_active'   => (int)($stats->recent_active ?? 0),
            'avg_progress'    => (float)($progress ?? 0)
        ];
    }

    public static function get_users_kpis_returns() {
        return new external_single_structure([
            'total_users'     => new external_value(PARAM_INT, 'Total valid users'),
            'active_users'    => new external_value(PARAM_INT, 'Active users'),
            'suspended_users' => new external_value(PARAM_INT, 'Suspended users'),
            'recent_active'   => new external_value(PARAM_INT, 'Users active in last 30 days'),
            'avg_progress'    => new external_value(PARAM_FLOAT, 'Average progress across enrolled courses'),
        ]);
    }

    public static function get_users_parameters() {
        return new external_function_parameters([
            'page'    => new external_value(PARAM_INT, 'Page number index', VALUE_DEFAULT, 0),
            'perpage' => new external_value(PARAM_INT, 'Users per page', VALUE_DEFAULT, 20),
            'sort'    => new external_value(PARAM_ALPHA, 'Sort column', VALUE_DEFAULT, 'lastaccess'),
            'dir'     => new external_value(PARAM_ALPHA, 'Sort direction ASC or DESC', VALUE_DEFAULT, 'DESC'),
            'search'  => new external_value(PARAM_TEXT, 'Search query for name or email', VALUE_DEFAULT, ''),
            'filters' => new external_value(PARAM_RAW, 'JSON encoded filters string', VALUE_DEFAULT, '{}'),
        ]);
    }

    public static function get_users($page = 0, $perpage = 20, $sort = 'lastaccess', $dir = 'DESC', $search = '', $filters = '{}') {
        global $DB, $CFG;

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

        $allowed_sorts = [
            'id'         => 'u.id',
            'firstname'  => 'u.firstname',
            'lastname'   => 'u.lastname',
            'email'      => 'u.email',
            'suspended'  => 'u.suspended',
            'lastaccess' => 'u.lastaccess',
            'cohorts'    => 'coh.cohorts_count',
            'courses'    => 'enr.enrolled_courses',
            'progress'   => 'progress_sort'
        ];

        if (!array_key_exists($params['sort'], $allowed_sorts)) {
            $params['sort'] = 'lastaccess';
        }
        $sortfield = $allowed_sorts[$params['sort']];
        $direction = strtoupper($params['dir']) === 'ASC' ? 'ASC' : 'DESC';

        $guestid = $CFG->siteguest ?? 0;
        $where = "u.deleted = 0 AND u.id <> :adminid AND u.id <> :guestid";
        $sqlparams = ['adminid' => 1, 'guestid' => $guestid];
        if (!empty($params['search'])) {
            $searchlike = '%' . $params['search'] . '%';
            $where .= " AND (" . $DB->sql_like('u.firstname', ':search1', false, false) .
                      " OR " . $DB->sql_like('u.lastname', ':search2', false, false) .
                      " OR " . $DB->sql_like('u.email', ':search3', false, false) .
                      " OR " . $DB->sql_like('u.username', ':search4', false, false) . ")";
            $sqlparams['search1'] = $searchlike;
            $sqlparams['search2'] = $searchlike;
            $sqlparams['search3'] = $searchlike;
            $sqlparams['search4'] = $searchlike;
        }

        $decoded_filters = json_decode($params['filters'], true);
        if (is_array($decoded_filters) && !empty($decoded_filters)) {
            $filter_index = 1;
            foreach ($decoded_filters as $key => $value) {
                if (array_key_exists($key, $allowed_sorts) && $value !== '') {
                    $fieldname = $allowed_sorts[$key];
                    if ($key === 'suspended') {
                        $where .= " AND $fieldname = :filterval$filter_index";
                        $sqlparams["filterval$filter_index"] = (int)$value;
                    } else if (is_string($value)) {
                        $where .= " AND " . $DB->sql_like($fieldname, ":filterval$filter_index", false, false);
                        $sqlparams["filterval$filter_index"] = '%' . $value . '%';
                    }
                    $filter_index++;
                } else if ($key === 'cohortid' && $value !== '' && $value !== '0') {
                    $where .= " AND EXISTS (SELECT 1 FROM {cohort_members} cm_f WHERE cm_f.userid = u.id AND cm_f.cohortid = :filterval$filter_index)";
                    $sqlparams["filterval$filter_index"] = (int)$value;
                    $filter_index++;
                }
            }
        }

        $sql_select = "
            SELECT u.id, u.username, u.firstname, u.lastname, u.email, u.suspended, u.lastaccess,
                   u.firstnamephonetic, u.lastnamephonetic, u.middlename, u.alternatename,
                   COALESCE(coh.cohorts_count, 0) AS cohorts_count,
                   COALESCE(enr.enrolled_courses, 0) AS enrolled_courses,
                   COALESCE(cmp.completed_courses, 0) AS completed_courses
              FROM {user} u
         LEFT JOIN (
            SELECT cm.userid, COUNT(cm.id) as cohorts_count
              FROM {cohort_members} cm
             GROUP BY cm.userid
         ) coh ON coh.userid = u.id
         LEFT JOIN (
            SELECT ue.userid, COUNT(DISTINCT ue.id) as enrolled_courses
              FROM {user_enrolments} ue 
              JOIN {enrol} e ON e.id = ue.enrolid 
             WHERE ue.status = 0
             GROUP BY ue.userid
         ) enr ON enr.userid = u.id
         LEFT JOIN (
            SELECT cc.userid, COUNT(DISTINCT cc.id) as completed_courses
              FROM {course_completions} cc 
             WHERE cc.timecompleted IS NOT NULL
             GROUP BY cc.userid
         ) cmp ON cmp.userid = u.id
             WHERE $where
        ";

        $sql_count = "SELECT COUNT(u.id) FROM {user} u WHERE $where";
        $totalcount = user_repository::count_users($sql_count, $sqlparams);

        if ($params['sort'] === 'progress') {
            $orderby = "ORDER BY CASE WHEN enr.enrolled_courses > 0 THEN (cmp.completed_courses * 1.0 / enr.enrolled_courses) ELSE 0 END $direction, u.id ASC";
        } else {
            $orderby = "ORDER BY $sortfield $direction";
        }

        $sql = $sql_select . " " . $orderby;
        $limitfrom = $params['page'] * $params['perpage'];
        $records = user_repository::get_paginated_users($sql, $sqlparams, $limitfrom, $params['perpage']);

        $siteadmins = explode(',', $CFG->siteadmins ?? '');

        $users = [];
        foreach ($records as $u) {
            $fullname = fullname($u);
            $enrolled = (int)$u->enrolled_courses;
            $completed = (int)$u->completed_courses;
            $progress = ($enrolled > 0) ? round(($completed / $enrolled) * 100) : 0;
            $is_admin = in_array($u->id, $siteadmins);

            $users[] = [
                'id'                => (int)$u->id,
                'username'          => (string)$u->username,
                'firstname'         => (string)$u->firstname,
                'lastname'          => (string)$u->lastname,
                'fullname'          => (string)$fullname,
                'email'             => (string)$u->email,
                'suspended'         => (int)$u->suspended,
                'is_active'         => empty($u->suspended) ? 1 : 0,
                'is_admin'          => $is_admin ? 1 : 0,
                'lastaccess'        => (int)$u->lastaccess,
                'cohorts_count'     => (int)$u->cohorts_count,
                'enrolled_courses'  => $enrolled,
                'completed_courses' => $completed,
                'progress'          => (int)$progress,
            ];
        }

        return [
            'totalcount' => $totalcount,
            'page'       => (int)$params['page'],
            'perpage'    => (int)$params['perpage'],
            'users'      => $users,
        ];
    }

    public static function get_users_returns() {
        return new external_single_structure([
            'totalcount' => new external_value(PARAM_INT, 'Total users matching query'),
            'page'       => new external_value(PARAM_INT, 'Current page index'),
            'perpage'    => new external_value(PARAM_INT, 'Users per page'),
            'users'      => new external_multiple_structure(
                new external_single_structure([
                    'id'                => new external_value(PARAM_INT, 'User ID'),
                    'username'          => new external_value(PARAM_TEXT, 'Username'),
                    'firstname'         => new external_value(PARAM_TEXT, 'First name'),
                    'lastname'          => new external_value(PARAM_TEXT, 'Last name'),
                    'fullname'          => new external_value(PARAM_TEXT, 'Display full name'),
                    'email'             => new external_value(PARAM_EMAIL, 'Email address'),
                    'suspended'         => new external_value(PARAM_INT, '1 if suspended, 0 if active'),
                    'is_active'         => new external_value(PARAM_INT, '1 if active, 0 if suspended'),
                    'is_admin'          => new external_value(PARAM_INT, '1 if site admin, 0 otherwise'),
                    'lastaccess'        => new external_value(PARAM_INT, 'Last login timestamp'),
                    'cohorts_count'     => new external_value(PARAM_INT, 'Number of cohort memberships'),
                    'enrolled_courses'  => new external_value(PARAM_INT, 'Number of enrolled courses'),
                    'completed_courses' => new external_value(PARAM_INT, 'Number of completed courses'),
                    'progress'          => new external_value(PARAM_INT, 'Average completion percentage'),
                ])
            ),
        ]);
    }

    public static function user_action_parameters() {
        return new external_function_parameters([
            'action'  => new external_value(PARAM_ALPHA, 'Action: suspend, activate, delete, message'),
            'userids' => new external_multiple_structure(new external_value(PARAM_INT, 'User ID'), 'List of user IDs to act upon'),
            'message_text' => new external_value(PARAM_RAW, 'Message text', VALUE_DEFAULT, ''),
        ]);
    }

    public static function user_action($action, $userids = [], $message_text = '') {
        global $DB, $CFG;

        require_once($CFG->dirroot . '/user/lib.php');

        $context = context_system::instance();
        self::validate_context($context);

        $params = self::validate_parameters(self::user_action_parameters(), [
            'action'  => $action,
            'userids' => $userids,
            'message_text' => $message_text,
        ]);

        $act = $params['action'];
        $ids = $params['userids'];
        $msg = $params['message_text'];
        $affected = 0;

        switch ($act) {
            case 'suspend':
                require_capability('moodle/user:update', $context);
                foreach ($ids as $uid) {
                    if ($uid > 1 && !is_siteadmin($uid)) {
                        $user = user_repository::get_user($uid);
                        if ($user && !$user->suspended) {
                            $user->suspended = 1;
                            user_update_user($user, false, false);
                            $affected++;
                        }
                    }
                }
                break;

            case 'activate':
                require_capability('moodle/user:update', $context);
                foreach ($ids as $uid) {
                    if ($uid > 1) {
                        $user = user_repository::get_user($uid);
                        if ($user && $user->suspended) {
                            $user->suspended = 0;
                            user_update_user($user, false, false);
                            $affected++;
                        }
                    }
                }
                break;

            case 'delete':
                require_capability('moodle/user:delete', $context);
                foreach ($ids as $uid) {
                    if ($uid > 1 && !is_siteadmin($uid)) {
                        $user = user_repository::get_user($uid);
                        if ($user) {
                            delete_user($user);
                            $affected++;
                        }
                    }
                }
                break;

            case 'message':
                global $USER;
                foreach ($ids as $uid) {
                    $recipient = user_repository::get_user($uid);
                    if ($recipient && !empty($msg)) {
                        $message = new \core\message\message();
                        $message->component         = 'moodle';
                        $message->name              = 'instantmessage';
                        $message->userfrom          = $USER;
                        $message->userto            = $recipient;
                        $clean_msg = clean_text($msg, FORMAT_HTML);
                        $message->subject           = 'Mensaje';
                        $message->fullmessage       = $clean_msg;
                        $message->fullmessageformat = FORMAT_HTML;
                        $message->fullmessagehtml   = $clean_msg;
                        $message->smallmessage      = strip_tags($clean_msg);
                        message_send($message);
                        $affected++;
                    }
                }
                break;

            default:
                return ['success' => false, 'message' => 'Invalid action: ' . $act, 'affectedcount' => 0];
        }

        return [
            'success'       => true,
            'message'       => "User action {$act} executed on {$affected} users.",
            'affectedcount' => $affected,
        ];
    }

    public static function user_action_returns() {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation completed'),
            'message'       => new external_value(PARAM_TEXT, 'Status description'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of users modified'),
        ]);
    }

    public static function get_user_detail_parameters() {
        return new external_function_parameters([
            'userid' => new external_value(PARAM_INT, 'User ID'),
        ]);
    }

    public static function get_user_detail($userid) {
        global $CFG;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/user:viewalldetails', $context);

        $params = self::validate_parameters(self::get_user_detail_parameters(), [
            'userid' => $userid,
        ]);

        $user = user_repository::get_user_strict($params['userid']);

        $enrolled_courses = user_repository::get_user_enrolled_courses($user->id);
        $all_enrolments = user_repository::get_user_all_enrolments($user->id);
        
        $course_enrolments_map = [];
        foreach ($all_enrolments as $ue) {
            $course_enrolments_map[$ue->courseid][] = [
                'method' => (string)$ue->method,
                'status' => (int)$ue->status,
                'timestart' => (int)$ue->timestart > 0 ? (int)$ue->timestart : (int)$ue->timecreated,
                'timeend' => (int)$ue->timeend
            ];
        }

        require_once($CFG->libdir . '/completionlib.php');

        $courses = [];
        foreach ($enrolled_courses as $c) {
            $course_obj = \local_adminer_api\repository\course_repository::get_course($c->id);
            $pct = \core_completion\progress::get_course_progress_percentage($course_obj, $user->id);
            $progress_val = $pct !== null ? (int)$pct : 0;

            $courses[] = [
                'id' => (int)$c->id,
                'fullname' => $c->fullname,
                'shortname' => $c->shortname,
                'progress' => $progress_val,
                'enrolmethod' => $c->enrolmethod,
                'enrolstatus' => (int)$c->enrolstatus,
                'enrolments' => $course_enrolments_map[$c->id] ?? [],
            ];
        }

        // Cohortes a las que pertenece
        $linked_cohorts = user_repository::get_user_cohorts($user->id);

        $cohorts = [];
        foreach ($linked_cohorts as $coh) {
            $cohorts[] = [
                'id' => (int)$coh->id,
                'name' => (string)$coh->name,
                'idnumber' => (string)$coh->idnumber
            ];
        }

        // Calculate progress summary
        $enrolled_count = count($courses);
        $completed_count = count(array_filter($courses, function($c) { return $c['progress'] == 100; }));
        $progress = ($enrolled_count > 0) ? round(($completed_count / $enrolled_count) * 100) : 0;

        global $CFG;
        $siteadmins = explode(',', $CFG->siteadmins ?? '');
        $is_admin = in_array($user->id, $siteadmins) ? 1 : 0;

        return [
            'id' => (int)$user->id,
            'username' => (string)$user->username,
            'fullname' => fullname($user),
            'email' => (string)$user->email,
            'suspended' => (int)$user->suspended,
            'is_active' => empty($user->suspended) ? 1 : 0,
            'is_admin' => $is_admin,
            'lastaccess' => (int)$user->lastaccess,
            'enrolled_courses' => $enrolled_count,
            'completed_courses' => $completed_count,
            'cohorts_count' => count($cohorts),
            'progress' => (int)$progress,
            'courses' => $courses,
            'cohorts' => $cohorts
        ];
    }

    public static function get_user_detail_returns() {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'User ID'),
            'username' => new external_value(PARAM_TEXT, 'Username'),
            'fullname' => new external_value(PARAM_TEXT, 'Fullname'),
            'email' => new external_value(PARAM_EMAIL, 'Email'),
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
                        'Detailed enrolments', VALUE_OPTIONAL
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
        ]);
    }

    public static function user_cohort_action_parameters() {
        return new external_function_parameters([
            'action' => new external_value(PARAM_ALPHA, 'add or remove'),
            'userid' => new external_value(PARAM_INT, 'User ID'),
            'cohortids' => new external_multiple_structure(new external_value(PARAM_INT, 'Cohort ID'), 'Array of cohort IDs'),
        ]);
    }

    public static function user_cohort_action($action, $userid, $cohortids) {
        global $CFG;
        require_once($CFG->dirroot . '/cohort/lib.php');

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/cohort:manage', $context);

        $params = self::validate_parameters(self::user_cohort_action_parameters(), [
            'action' => $action,
            'userid' => $userid,
            'cohortids' => $cohortids,
        ]);

        $user = user_repository::get_user_strict($params['userid']);
        $affected = 0;

        foreach ($params['cohortids'] as $cohortid) {
            if ($params['action'] === 'add') {
                if (!cohort_is_member($cohortid, $user->id)) {
                    cohort_add_member($cohortid, $user->id);
                    $affected++;
                }
            } else if ($params['action'] === 'remove') {
                if (cohort_is_member($cohortid, $user->id)) {
                    cohort_remove_member($cohortid, $user->id);
                    $affected++;
                }
            }
        }

        return [
            'success' => true,
            'message' => 'Cohorts updated for user.',
            'affectedcount' => $affected
        ];
    }

    public static function user_cohort_action_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success'),
            'message' => new external_value(PARAM_TEXT, 'Message'),
            'affectedcount' => new external_value(PARAM_INT, 'Affected count'),
        ]);
    }


    public static function add_user_parameters() {
        return new external_function_parameters([
            'username'  => new external_value(PARAM_USERNAME, 'Username'),
            'password'  => new external_value(PARAM_RAW, 'Password'),
            'firstname' => new external_value(PARAM_TEXT, 'First name'),
            'lastname'  => new external_value(PARAM_TEXT, 'Last name'),
            'email'     => new external_value(PARAM_EMAIL, 'Email address'),
        ]);
    }

    public static function add_user($username, $password, $firstname, $lastname, $email) {
        global $CFG;
        require_once($CFG->dirroot . '/user/lib.php');
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/user:create', $context);
        
        $params = self::validate_parameters(self::add_user_parameters(), [
            'username' => $username, 'password' => $password, 'firstname' => $firstname,
            'lastname' => $lastname, 'email' => $email
        ]);
        
        $user = new \stdClass();
        $user->username = $params['username'];
        $user->password = $params['password'];
        $user->firstname = $params['firstname'];
        $user->lastname = $params['lastname'];
        $user->email = $params['email'];
        $user->confirmed = 1;
        $user->mnethostid = $CFG->mnet_localhost_id;
        $user->auth = 'manual';
        
        try {
            $userid = user_create_user($user, true, false);
            return ['success' => true, 'userid' => $userid, 'message' => 'User created successfully'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public static function add_user_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success'),
            'userid' => new external_value(PARAM_INT, 'User ID', VALUE_OPTIONAL),
            'message' => new external_value(PARAM_TEXT, 'Message'),
        ]);
    }

    public static function upload_users_csv_parameters() {
        return new external_function_parameters([
            'fileContent' => new external_value(PARAM_RAW, 'Base64 encoded CSV content'),
        ]);
    }

    public static function upload_users_csv($fileContent) {
        global $CFG;
        require_once($CFG->dirroot . '/user/lib.php');
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/user:create', $context);
        
        $params = self::validate_parameters(self::upload_users_csv_parameters(), ['fileContent' => $fileContent]);
        
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
        
        $required_headers = ['username', 'email', 'firstname', 'lastname', 'password'];
        foreach ($required_headers as $req) {
            if (!in_array($req, $headers)) {
                return ['success' => false, 'message' => 'Missing required column: ' . $req];
            }
        }
        
        $created = 0;
        $errors = [];
        
        foreach ($lines as $lineNum => $line) {
            $line = trim($line);
            if (empty($line)) continue;
            
            $row = str_getcsv($line);
            if (count($row) !== count($headers)) {
                $errors[] = "Row " . ($lineNum + 2) . ": Column count mismatch";
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
                $errors[] = "Row " . ($lineNum + 2) . ": " . $e->getMessage();
            }
        }
        
        $msg = "Created $created users.";
        if (count($errors) > 0) {
            $msg .= " " . count($errors) . " errors. " . implode("; ", array_slice($errors, 0, 3)) . (count($errors) > 3 ? "..." : "");
        }
        
        return ['success' => count($errors) === 0, 'message' => $msg];
    }

    public static function upload_users_csv_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success'),
            'message' => new external_value(PARAM_TEXT, 'Message'),
        ]);
    }

    public static function user_course_action_parameters() {
        return new external_function_parameters([
            'action'    => new external_value(PARAM_ALPHANUMEXT, 'add, remove, suspend, activate, update_dates'),
            'userid'    => new external_value(PARAM_INT, 'User ID'),
            'courseids' => new external_multiple_structure(new external_value(PARAM_INT, 'Course ID')),
            'timestart' => new external_value(PARAM_INT, 'Enrolment start time', VALUE_DEFAULT, 0),
            'timeend'   => new external_value(PARAM_INT, 'Enrolment end time', VALUE_DEFAULT, 0),
        ]);
    }

    public static function user_course_action($action, $userid, $courseids, $timestart = 0, $timeend = 0) {
        global $DB;
        $context = context_system::instance();
        self::validate_context($context);
        
        $params = self::validate_parameters(self::user_course_action_parameters(), [
            'action' => $action, 'userid' => $userid, 'courseids' => $courseids,
            'timestart' => $timestart, 'timeend' => $timeend
        ]);
        
        $enrol = enrol_get_plugin('manual');
        if (!$enrol) {
            return ['success' => false, 'message' => 'Manual enrolment plugin is disabled'];
        }
        
        $affected = 0;
        foreach ($params['courseids'] as $cid) {
            $coursecontext = \context_course::instance($cid);
            require_capability('enrol/manual:enrol', $coursecontext);
            
            $instances = enrol_get_instances($cid, true);
            $manualinstance = null;
            foreach ($instances as $instance) {
                if ($instance->enrol === 'manual') {
                    $manualinstance = $instance;
                    break;
                }
            }
            if ($manualinstance) {
                if ($params['action'] === 'add') {
                    $roleid = user_repository::get_role_id_by_shortname('student');
                    $enrol->enrol_user($manualinstance, $params['userid'], $roleid);
                    $affected++;
                } else if ($params['action'] === 'remove') {
                    $enrol->unenrol_user($manualinstance, $params['userid']);
                    $affected++;
                } else if ($params['action'] === 'suspend') {
                    $enrol->update_user_enrol($manualinstance, $params['userid'], ENROL_USER_SUSPENDED);
                    $affected++;
                } else if ($params['action'] === 'activate') {
                    $enrol->update_user_enrol($manualinstance, $params['userid'], ENROL_USER_ACTIVE);
                    $affected++;
                } else if ($params['action'] === 'update_dates') {
                    $enrol->update_user_enrol($manualinstance, $params['userid'], NULL, $params['timestart'], $params['timeend']);
                    $affected++;
                }
            }
        }
        return ['success' => true, 'message' => "Successfully processed $affected enrolments"];
    }

    public static function user_course_action_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success'),
            'message' => new external_value(PARAM_TEXT, 'Message'),
        ]);
    }

}
