<?php
namespace local_adminer_api\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;
use context_system;

defined('MOODLE_INTERNAL') || die();

class cohorts extends external_api {

    public static function get_cohorts_parameters() {
        return new external_function_parameters([
            'page'    => new external_value(PARAM_INT, 'Page index', VALUE_DEFAULT, 0),
            'perpage' => new external_value(PARAM_INT, 'Cohorts per page', VALUE_DEFAULT, 50),
            'sort'    => new external_value(PARAM_ALPHA, 'Sort field', VALUE_DEFAULT, 'name'),
            'dir'     => new external_value(PARAM_ALPHA, 'Sort direction', VALUE_DEFAULT, 'ASC'),
            'search'  => new external_value(PARAM_RAW, 'Search query', VALUE_DEFAULT, ''),
            'filters' => new external_value(PARAM_RAW, 'JSON encoded filters string', VALUE_DEFAULT, '{}'),
        ]);
    }

    public static function get_cohorts($page = 0, $perpage = 50, $sort = 'name', $dir = 'ASC', $search = '', $filters = '{}') {
        global $DB;

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

        $where = "1=1";
        $sqlparams = [];

        if (!empty($params['search'])) {
            $like = '%' . $params['search'] . '%';
            $where .= " AND (" . $DB->sql_like('c.name', ':s1', false, false) .
                      " OR " . $DB->sql_like('c.idnumber', ':s2', false, false) . ")";
            $sqlparams['s1'] = $like;
            $sqlparams['s2'] = $like;
        }

        $decoded_filters = json_decode($params['filters'], true);
        if (is_array($decoded_filters) && !empty($decoded_filters)) {
            $filter_index = 1;
            $allowed_filters = ['name' => 'c.name', 'idnumber' => 'c.idnumber'];
            foreach ($decoded_filters as $key => $value) {
                if (array_key_exists($key, $allowed_filters) && $value !== '') {
                    $fieldname = $allowed_filters[$key];
                    if (is_string($value)) {
                        $where .= " AND " . $DB->sql_like($fieldname, ":filterval$filter_index", false, false);
                        $sqlparams["filterval$filter_index"] = '%' . $value . '%';
                    }
                    $filter_index++;
                }
            }
            if (isset($decoded_filters['empty_only']) && $decoded_filters['empty_only']) {
                if ($decoded_filters['empty_only'] === '1' || $decoded_filters['empty_only'] === true) {
                    $where .= " AND NOT EXISTS (SELECT 1 FROM {cohort_members} cm_f WHERE cm_f.cohortid = c.id)";
                } else if ($decoded_filters['empty_only'] === '0') {
                    $where .= " AND EXISTS (SELECT 1 FROM {cohort_members} cm_f WHERE cm_f.cohortid = c.id)";
                }
            }
        }

        $sortfield = 'c.name';
        $d = strtoupper($params['dir']) === 'DESC' ? 'DESC' : 'ASC';
        switch (strtolower($params['sort'])) {
            case 'idnumber': $sortfield = 'c.idnumber'; break;
            case 'memberscount': $sortfield = 'memberscount'; break;
            case 'coursescount': $sortfield = 'coursescount'; break;
            case 'name':
            default: $sortfield = 'c.name'; break;
        }

        $sql_select = "
            SELECT c.id, c.name, c.idnumber, c.description,
                   (SELECT COUNT(cm.id) FROM {cohort_members} cm WHERE cm.cohortid = c.id) AS memberscount,
                   (SELECT COUNT(DISTINCT e.courseid) FROM {enrol} e WHERE e.enrol = 'cohort' AND e.customint1 = c.id) AS coursescount
              FROM {cohort} c
             WHERE $where
          ORDER BY $sortfield $d
        ";

        $sql_count = "SELECT COUNT(c.id) FROM {cohort} c WHERE $where";
        $totalcount = (int)$DB->count_records_sql($sql_count, $sqlparams);

        $limitfrom = $params['page'] * $params['perpage'];
        $records = $DB->get_records_sql($sql_select, $sqlparams, $limitfrom, $params['perpage']);

        $cohorts = [];
        foreach ($records as $r) {
            $cohorts[] = [
                'id'           => (int)$r->id,
                'name'         => (string)$r->name,
                'idnumber'     => (string)($r->idnumber ?? ''),
                'description'  => (string)($r->description ?? ''),
                'memberscount' => (int)$r->memberscount,
                'coursescount' => (int)($r->coursescount ?? 0),
            ];
        }

        return [
            'totalcount' => $totalcount,
            'page'       => (int)$params['page'],
            'perpage'    => (int)$params['perpage'],
            'cohorts'    => $cohorts,
        ];
    }

    public static function get_cohorts_returns() {
        return new external_single_structure([
            'totalcount' => new external_value(PARAM_INT, 'Total cohorts count'),
            'page'       => new external_value(PARAM_INT, 'Current page index'),
            'perpage'    => new external_value(PARAM_INT, 'Items per page'),
            'cohorts'    => new external_multiple_structure(
                new external_single_structure([
                    'id'           => new external_value(PARAM_INT, 'Cohort ID'),
                    'name'         => new external_value(PARAM_TEXT, 'Cohort name'),
                    'idnumber'     => new external_value(PARAM_RAW, 'ID number'),
                    'description'  => new external_value(PARAM_RAW, 'Description'),
                    'memberscount' => new external_value(PARAM_INT, 'Number of users in cohort'),
                    'coursescount' => new external_value(PARAM_INT, 'Number of linked courses'),
                ])
            ),
        ]);
    }

    public static function cohort_action_parameters() {
        return new external_function_parameters([
            'action'      => new external_value(PARAM_ALPHA, 'Action: create, edit, delete'),
            'cohortid'    => new external_value(PARAM_INT, 'Cohort ID for edit/delete', VALUE_DEFAULT, 0),
            'name'        => new external_value(PARAM_TEXT, 'Cohort name', VALUE_DEFAULT, ''),
            'idnumber'    => new external_value(PARAM_RAW, 'ID number', VALUE_DEFAULT, ''),
            'description' => new external_value(PARAM_RAW, 'Description', VALUE_DEFAULT, ''),
        ]);
    }

    public static function cohort_action($action, $cohortid = 0, $name = '', $idnumber = '', $description = '') {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/cohort/lib.php');
        
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/cohort:manage', $context);

        $params = self::validate_parameters(self::cohort_action_parameters(), [
            'action'      => $action,
            'cohortid'    => $cohortid,
            'name'        => $name,
            'idnumber'    => $idnumber,
            'description' => $description,
        ]);

        $act = $params['action'];
        $affected = 0;

        switch ($act) {
            case 'create':
                if (empty($params['name'])) {
                    return ['success' => false, 'message' => 'Cohort name is required', 'affectedcount' => 0];
                }
                $data = new \stdClass();
                $data->name = $params['name'];
                $data->idnumber = $params['idnumber'];
                $data->description = $params['description'];
                $data->descriptionformat = FORMAT_HTML;
                $data->contextid = $context->id;
                
                $id = cohort_add_cohort($data);
                return [
                    'success'       => true,
                    'message'       => 'Cohort created successfully with ID ' . $id,
                    'affectedcount' => 1,
                ];

            case 'edit':
                if (empty($params['cohortid']) || empty($params['name'])) {
                    return ['success' => false, 'message' => 'cohortid and name are required', 'affectedcount' => 0];
                }
                $data = new \stdClass();
                $data->id = $params['cohortid'];
                $data->name = $params['name'];
                $data->idnumber = $params['idnumber'];
                $data->description = $params['description'];
                $data->descriptionformat = FORMAT_HTML;
                $data->contextid = $context->id;
                
                cohort_update_cohort($data);
                return [
                    'success'       => true,
                    'message'       => 'Cohort updated successfully',
                    'affectedcount' => 1,
                ];

            case 'delete':
                if (empty($params['cohortid'])) {
                    return ['success' => false, 'message' => 'cohortid is required', 'affectedcount' => 0];
                }
                $cohort = $DB->get_record('cohort', ['id' => $params['cohortid']]);
                if ($cohort) {
                    cohort_delete_cohort($cohort);
                    $affected = 1;
                }
                break;
                
            default:
                return ['success' => false, 'message' => 'Unknown action: ' . $act, 'affectedcount' => 0];
        }

        return [
            'success'       => true,
            'message'       => "Action {$act} executed successfully.",
            'affectedcount' => $affected,
        ];
    }

    public static function cohort_action_returns() {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message'       => new external_value(PARAM_TEXT, 'Status description message'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of records affected'),
        ]);
    }

    public static function get_cohort_detail_parameters() {
        return new external_function_parameters([
            'cohortid' => new external_value(PARAM_INT, 'Cohort ID'),
        ]);
    }

    public static function get_cohort_detail($cohortid) {
        global $DB;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/cohort:view', $context);

        $params = self::validate_parameters(self::get_cohort_detail_parameters(), [
            'cohortid' => $cohortid,
        ]);

        $cohort = $DB->get_record('cohort', ['id' => $params['cohortid']], '*', MUST_EXIST);

        // Miembros de la cohorte
        $sql_members = "
            SELECT u.id, u.firstname, u.lastname, u.email, u.lastaccess, u.suspended
              FROM {user} u
              JOIN {cohort_members} cm ON cm.userid = u.id
             WHERE cm.cohortid = :cohortid AND u.deleted = 0
        ";
        $members_records = $DB->get_records_sql($sql_members, ['cohortid' => $cohort->id]);
        
        $members = [];
        foreach ($members_records as $u) {
            $members[] = [
                'id' => (int)$u->id,
                'fullname' => fullname($u),
                'email' => (string)$u->email,
                'lastaccess' => (int)$u->lastaccess,
                'suspended' => (int)$u->suspended
            ];
        }

        // Cursos sincronizados
        $sql_courses = "
            SELECT c.id, c.fullname, c.shortname, e.id as enrolid,
                   (SELECT COUNT(ue.id) FROM {user_enrolments} ue WHERE ue.enrolid = e.id) as enrolledcount
              FROM {course} c
              JOIN {enrol} e ON e.courseid = c.id
             WHERE e.customint1 = :cohortid AND e.enrol = 'cohort'
        ";
        $courses_records = $DB->get_records_sql($sql_courses, ['cohortid' => $cohort->id]);

        $courses = [];
        foreach ($courses_records as $c) {
            $courses[] = [
                'id' => (int)$c->id,
                'fullname' => (string)$c->fullname,
                'shortname' => (string)$c->shortname,
                'enrolid' => (int)$c->enrolid,
                'enrolledcount' => (int)($c->enrolledcount ?? 0)
            ];
        }

        return [
            'id' => (int)$cohort->id,
            'name' => (string)$cohort->name,
            'idnumber' => (string)$cohort->idnumber,
            'description' => (string)$cohort->description,
            'members' => $members,
            'courses' => $courses
        ];
    }

    public static function get_cohort_detail_returns() {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Cohort ID'),
            'name' => new external_value(PARAM_TEXT, 'Cohort name'),
            'idnumber' => new external_value(PARAM_RAW, 'ID number'),
            'description' => new external_value(PARAM_RAW, 'Description'),
            'members' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'User ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'User fullname'),
                    'email' => new external_value(PARAM_TEXT, 'User email'),
                    'lastaccess' => new external_value(PARAM_INT, 'User lastaccess time'),
                    'suspended' => new external_value(PARAM_INT, 'Is user suspended'),
                ])
            ),
            'courses' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Course ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'Course fullname'),
                    'shortname' => new external_value(PARAM_TEXT, 'Course shortname'),
                    'enrolid' => new external_value(PARAM_INT, 'Enrol instance ID'),
                    'enrolledcount' => new external_value(PARAM_INT, 'Enrolled users count'),
                ])
            ),
        ]);
    }

    public static function get_cohorts_kpis_parameters() {
        return new external_function_parameters([]);
    }

    public static function get_cohorts_kpis() {
        global $DB;
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/cohort:view', $context);

        $sql_cohorts = "SELECT COUNT(id) FROM {cohort}";
        $total_cohorts = (int)$DB->count_records_sql($sql_cohorts);

        $sql_members = "SELECT COUNT(id) FROM {cohort_members}";
        $total_members = (int)$DB->count_records_sql($sql_members);

        $avg_members = $total_cohorts > 0 ? round($total_members / $total_cohorts, 1) : 0;

        $sql_empty = "
            SELECT COUNT(c.id) 
              FROM {cohort} c 
             WHERE NOT EXISTS (SELECT 1 FROM {cohort_members} cm WHERE cm.cohortid = c.id)
        ";
        $empty_cohorts = (int)$DB->count_records_sql($sql_empty);

        $sql_synced = "
            SELECT COUNT(DISTINCT customint1) 
              FROM {enrol} 
             WHERE enrol = 'cohort'
        ";
        $synced_courses = (int)$DB->count_records_sql($sql_synced);

        return [
            'total_cohorts' => $total_cohorts,
            'total_members' => $total_members,
            'avg_members' => $avg_members,
            'empty_cohorts' => $empty_cohorts,
            'synced_courses' => $synced_courses,
        ];
    }

    public static function get_cohorts_kpis_returns() {
        return new external_single_structure([
            'total_cohorts'  => new external_value(PARAM_INT, 'Total cohorts'),
            'total_members'  => new external_value(PARAM_INT, 'Total members across all cohorts'),
            'avg_members'    => new external_value(PARAM_FLOAT, 'Average members per cohort'),
            'empty_cohorts'  => new external_value(PARAM_INT, 'Cohorts without members'),
            'synced_courses' => new external_value(PARAM_INT, 'Cohorts linked to courses'),
        ]);
    }
}
