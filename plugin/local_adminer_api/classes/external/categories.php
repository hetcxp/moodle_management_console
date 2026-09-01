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
use local_adminer_api\repository\category_repository;

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

        $totalcount = category_repository::count_all();
        $records = category_repository::get_paginated($params['page'], $params['perpage']);

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
                    'idnumber'    => new external_value(PARAM_TEXT, 'ID number'),
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

        $records = category_repository::get_flat_categories();
        $list = [];
        foreach ($records as $r) {
            $parentname = '';
            if ($r->parent > 0 && isset($records[$r->parent])) {
                $parentname = $records[$r->parent]->name;
            }
            $list[] = [
                'id'          => (int)$r->id,
                'name'        => (string)$r->name,
                'parent'      => (int)$r->parent,
                'parentname'  => (string)$parentname,
                'depth'       => (int)$r->depth,
                'path'        => (string)$r->path,
                'visible'     => (int)$r->visible,
                'coursecount' => (int)$r->coursecount,
            ];
        }

        return ['categories' => $list];
    }

    public static function get_categories_flat_returns() {
        return new external_single_structure([
            'categories' => new external_multiple_structure(
                new external_single_structure([
                    'id'          => new external_value(PARAM_INT, 'Category ID'),
                    'name'        => new external_value(PARAM_TEXT, 'Category name'),
                    'parent'      => new external_value(PARAM_INT, 'Parent ID'),
                    'parentname'  => new external_value(PARAM_TEXT, 'Parent category name', VALUE_OPTIONAL),
                    'depth'       => new external_value(PARAM_INT, 'Category depth level'),
                    'path'        => new external_value(PARAM_TEXT, 'Category tree path'),
                    'visible'     => new external_value(PARAM_INT, 'Visibility status'),
                    'coursecount' => new external_value(PARAM_INT, 'Number of courses'),
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
                $parentcontext = ($params['parent'] > 0) ? \context_coursecat::instance($params['parent']) : \context_system::instance();
                require_capability('moodle/category:manage', $parentcontext);
                
                if (empty($params['name'])) {
                    return ['success' => false, 'message' => 'Category name is required', 'affectedcount' => 0];
                }
                $data = new stdClass();
                $data->name = $params['name'];
                $data->parent = $params['parent'];
                $data->description = clean_text($params['description'], FORMAT_HTML);
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
                require_capability('moodle/category:manage', \context_coursecat::instance($params['categoryid']));
                if ($params['parent'] != 0) {
                    $cat = core_course_category::get($params['categoryid']);
                    if ($cat->parent != $params['parent']) {
                        require_capability('moodle/category:manage', \context_coursecat::instance($params['parent']));
                    }
                }
                
                $cat = core_course_category::get($params['categoryid']);
                $data = new stdClass();
                $data->id = $params['categoryid'];
                $data->name = $params['name'];
                $data->parent = $params['parent'];
                $data->description = clean_text($params['description'], FORMAT_HTML);
                $data->descriptionformat = FORMAT_HTML;
                $cat->update($data);
                return [
                    'success'       => true,
                    'message'       => 'Category updated successfully',
                    'affectedcount' => 1,
                ];

            case 'hide':
                foreach ($ids as $cid) {
                    require_capability('moodle/category:manage', \context_coursecat::instance($cid));
                    $cat = core_course_category::get($cid, IGNORE_MISSING);
                    if ($cat) {
                        $updatedata = new stdClass();
                        $updatedata->id = $cid;
                        $updatedata->visible = 0;
                        $cat->update($updatedata);
                        $affected++;
                    }
                }
                break;

            case 'show':
                foreach ($ids as $cid) {
                    require_capability('moodle/category:manage', \context_coursecat::instance($cid));
                    $cat = core_course_category::get($cid, IGNORE_MISSING);
                    if ($cat) {
                        $updatedata = new stdClass();
                        $updatedata->id = $cid;
                        $updatedata->visible = 1;
                        $cat->update($updatedata);
                        $affected++;
                    }
                }
                break;

            case 'delete':
                $undeleted = [];
                foreach ($ids as $cid) {
                    require_capability('moodle/category:manage', \context_coursecat::instance($cid));
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
                'visible' => (int)$child->visible,
            ];
        }

        $courses = [];
        $records = category_repository::get_courses_by_category($cat->id);

        foreach ($records as $c) {
            $completedcount = 0;
            if ($c->enrolledcount > 0) {
                $course_obj = $DB->get_record('course', ['id' => $c->id]);
                $users = category_repository::get_course_users($c->id);
                
                foreach ($users as $uid) {
                    $progress = \core_completion\progress::get_course_progress_percentage($course_obj, $uid);
                    if ($progress !== null && (int)round($progress) === 100) {
                        $completedcount++;
                    }
                }
            }

            $courses[] = [
                'id' => (int)$c->id,
                'fullname' => (string)$c->fullname,
                'shortname' => (string)$c->shortname,
                'visible' => (int)$c->visible,
                'enrolledcount' => (int)$c->enrolledcount,
                'completedcount' => $completedcount,
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
            'description' => new external_value(PARAM_RAW, 'Category description'),
            'subcategories' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Category ID'),
                    'name' => new external_value(PARAM_TEXT, 'Category name'),
                    'coursecount' => new external_value(PARAM_INT, 'Course count'),
                    'visible' => new external_value(PARAM_INT, 'Visibility status'),
                ])
            ),
            'courses' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Course ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'Course fullname'),
                    'shortname' => new external_value(PARAM_TEXT, 'Course shortname'),
                    'visible' => new external_value(PARAM_INT, 'Visibility status'),
                    'enrolledcount' => new external_value(PARAM_INT, 'Enrolled users count'),
                    'completedcount' => new external_value(PARAM_INT, 'Completed users count'),
                ])
            ),
        ]);
    }
}
