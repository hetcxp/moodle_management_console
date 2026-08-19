<?php
namespace local_adminer_api\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;
use context_system;
use core_course_category;
use stdClass;

defined('MOODLE_INTERNAL') || die();

class categories extends external_api {

    public static function get_categories_parameters() {
        return new external_function_parameters([
            'page'    => new external_value(PARAM_INT, 'Page index', VALUE_DEFAULT, 0),
            'perpage' => new external_value(PARAM_INT, 'Categories per page', VALUE_DEFAULT, 50),
        ]);
    }

    public static function get_categories($page = 0, $perpage = 50) {
        global $DB;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/category:viewhiddencategories', $context);

        $params = self::validate_parameters(self::get_categories_parameters(), [
            'page'    => $page,
            'perpage' => $perpage,
        ]);

        $totalcount = (int)$DB->count_records('course_categories');

        $sql = "
            SELECT cc.id, cc.name, cc.idnumber, cc.description, cc.parent, cc.visible, cc.coursecount,
                   COALESCE(p.name, '') AS parentname
              FROM {course_categories} cc
         LEFT JOIN {course_categories} p ON cc.parent = p.id
          ORDER BY cc.sortorder ASC, cc.name ASC
        ";

        $limitfrom = $params['page'] * $params['perpage'];
        $records = $DB->get_records_sql($sql, [], $limitfrom, $params['perpage']);

        $categories = [];
        foreach ($records as $r) {
            $categories[] = [
                'id'          => (int)$r->id,
                'name'        => (string)$r->name,
                'idnumber'    => (string)($r->idnumber ?? ''),
                'description' => (string)($r->description ?? ''),
                'parent'      => (int)$r->parent,
                'parentname'  => (string)$r->parentname,
                'coursecount' => (int)$r->coursecount,
                'visible'     => (int)$r->visible,
            ];
        }

        return [
            'totalcount' => $totalcount,
            'page'       => (int)$params['page'],
            'perpage'    => (int)$params['perpage'],
            'categories' => $categories,
        ];
    }

    public static function get_categories_returns() {
        return new external_single_structure([
            'totalcount' => new external_value(PARAM_INT, 'Total categories count'),
            'page'       => new external_value(PARAM_INT, 'Current page index'),
            'perpage'    => new external_value(PARAM_INT, 'Items per page'),
            'categories' => new external_multiple_structure(
                new external_single_structure([
                    'id'          => new external_value(PARAM_INT, 'Category ID'),
                    'name'        => new external_value(PARAM_TEXT, 'Category name'),
                    'idnumber'    => new external_value(PARAM_RAW, 'ID number'),
                    'description' => new external_value(PARAM_RAW, 'Description'),
                    'parent'      => new external_value(PARAM_INT, 'Parent category ID'),
                    'parentname'  => new external_value(PARAM_TEXT, 'Parent category name'),
                    'coursecount' => new external_value(PARAM_INT, 'Number of courses in category'),
                    'visible'     => new external_value(PARAM_INT, '1: visible, 0: hidden'),
                ])
            ),
        ]);
    }

    public static function get_categories_flat_parameters() {
        return new external_function_parameters([]);
    }

    public static function get_categories_flat() {
        global $DB;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/category:viewhiddencategories', $context);

        $records = $DB->get_records('course_categories', null, 'sortorder ASC, name ASC', 'id, name, parent, depth, path');
        $list = [];
        foreach ($records as $r) {
            $list[] = [
                'id'     => (int)$r->id,
                'name'   => (string)$r->name,
                'parent' => (int)$r->parent,
                'depth'  => (int)$r->depth,
                'path'   => (string)$r->path,
            ];
        }

        return ['categories' => $list];
    }

    public static function get_categories_flat_returns() {
        return new external_single_structure([
            'categories' => new external_multiple_structure(
                new external_single_structure([
                    'id'     => new external_value(PARAM_INT, 'Category ID'),
                    'name'   => new external_value(PARAM_TEXT, 'Category name'),
                    'parent' => new external_value(PARAM_INT, 'Parent ID'),
                    'depth'  => new external_value(PARAM_INT, 'Category depth level'),
                    'path'   => new external_value(PARAM_TEXT, 'Category tree path'),
                ])
            ),
        ]);
    }

    public static function category_action_parameters() {
        return new external_function_parameters([
            'action'      => new external_value(PARAM_ALPHA, 'Action: create, edit, hide, show, delete'),
            'categoryids' => new external_multiple_structure(new external_value(PARAM_INT, 'Category ID'), 'Array of IDs for bulk actions', VALUE_DEFAULT, []),
            'categoryid'  => new external_value(PARAM_INT, 'Target Category ID for edit or single action', VALUE_DEFAULT, 0),
            'name'        => new external_value(PARAM_TEXT, 'Category name', VALUE_DEFAULT, ''),
            'parent'      => new external_value(PARAM_INT, 'Parent category ID', VALUE_DEFAULT, 0),
            'description' => new external_value(PARAM_RAW, 'Description HTML/text', VALUE_DEFAULT, ''),
        ]);
    }

    public static function category_action($action, $categoryids = [], $categoryid = 0, $name = '', $parent = 0, $description = '') {
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/category:manage', $context);

        $params = self::validate_parameters(self::category_action_parameters(), [
            'action'      => $action,
            'categoryids' => $categoryids,
            'categoryid'  => $categoryid,
            'name'        => $name,
            'parent'      => $parent,
            'description' => $description,
        ]);

        $affected = 0;
        $act = $params['action'];
        $ids = $params['categoryids'];
        if ($params['categoryid'] > 0 && !in_array($params['categoryid'], $ids)) {
            $ids[] = $params['categoryid'];
        }

        switch ($act) {
            case 'create':
                if (empty($params['name'])) {
                    return ['success' => false, 'message' => 'Category name is required', 'affectedcount' => 0];
                }
                $data = new stdClass();
                $data->name = $params['name'];
                $data->parent = $params['parent'];
                $data->description = $params['description'];
                $data->descriptionformat = FORMAT_HTML;
                $cat = core_course_category::create($data);
                return [
                    'success'       => true,
                    'message'       => 'Category created with ID ' . $cat->id,
                    'affectedcount' => 1,
                ];

            case 'edit':
                if (empty($params['categoryid']) || empty($params['name'])) {
                    return ['success' => false, 'message' => 'categoryid and name are required', 'affectedcount' => 0];
                }
                $cat = core_course_category::get($params['categoryid']);
                $data = new stdClass();
                $data->id = $params['categoryid'];
                $data->name = $params['name'];
                $data->parent = $params['parent'];
                $data->description = $params['description'];
                $data->descriptionformat = FORMAT_HTML;
                $cat->update($data);
                return [
                    'success'       => true,
                    'message'       => 'Category updated successfully',
                    'affectedcount' => 1,
                ];

            case 'hide':
                foreach ($ids as $cid) {
                    $cat = core_course_category::get($cid, IGNORE_MISSING);
                    if ($cat) {
                        $cat->hide();
                        $affected++;
                    }
                }
                break;

            case 'show':
                foreach ($ids as $cid) {
                    $cat = core_course_category::get($cid, IGNORE_MISSING);
                    if ($cat) {
                        $cat->show();
                        $affected++;
                    }
                }
                break;

            case 'delete':
                $undeleted = [];
                foreach ($ids as $cid) {
                    $cat = core_course_category::get($cid, IGNORE_MISSING);
                    if ($cat) {
                        if ($cat->coursecount == 0) {
                            $cat->delete_full(false);
                            $affected++;
                        } else {
                            $undeleted[] = $cat->name;
                        }
                    }
                }
                if (!empty($undeleted)) {
                    return [
                        'success'       => true,
                        'message'       => "Acción completada. Las siguientes categorías no se eliminaron porque contienen cursos: " . implode(', ', $undeleted),
                        'affectedcount' => $affected,
                    ];
                }
                break;

            default:
                return ['success' => false, 'message' => 'Unknown action: ' . $act, 'affectedcount' => 0];
        }

        return [
            'success'       => true,
            'message'       => "Category action {$act} executed successfully.",
            'affectedcount' => $affected,
        ];
    }

    public static function category_action_returns() {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message'       => new external_value(PARAM_TEXT, 'Status description message'),
            'affectedcount' => new external_value(PARAM_INT, 'Number of categories affected'),
        ]);
    }

    public static function get_category_detail_parameters() {
        return new external_function_parameters([
            'categoryid' => new external_value(PARAM_INT, 'Category ID'),
        ]);
    }

    public static function get_category_detail($categoryid) {
        global $DB;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('moodle/category:viewhiddencategories', $context);

        $params = self::validate_parameters(self::get_category_detail_parameters(), [
            'categoryid' => $categoryid,
        ]);

        $cat = core_course_category::get($params['categoryid'], MUST_EXIST);

        $subcategories = [];
        $children = $cat->get_children();
        foreach ($children as $child) {
            $subcategories[] = [
                'id' => (int)$child->id,
                'name' => (string)$child->name,
                'coursecount' => (int)$child->coursecount,
            ];
        }

        $courses = [];
        $catcourses = $cat->get_courses();
        foreach ($catcourses as $c) {
            $courses[] = [
                'id' => (int)$c->id,
                'fullname' => (string)$c->fullname,
                'shortname' => (string)$c->shortname,
            ];
        }

        return [
            'id' => (int)$cat->id,
            'name' => (string)$cat->name,
            'description' => (string)$cat->description,
            'subcategories' => $subcategories,
            'courses' => $courses,
        ];
    }

    public static function get_category_detail_returns() {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Category ID'),
            'name' => new external_value(PARAM_TEXT, 'Category name'),
            'description' => new external_value(PARAM_TEXT, 'Category description'),
            'subcategories' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Category ID'),
                    'name' => new external_value(PARAM_TEXT, 'Category name'),
                    'coursecount' => new external_value(PARAM_INT, 'Course count'),
                ])
            ),
            'courses' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Course ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'Course fullname'),
                    'shortname' => new external_value(PARAM_TEXT, 'Course shortname'),
                ])
            ),
        ]);
    }
}
