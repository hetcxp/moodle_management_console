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
 * External service for competency reviews in tool_management_console.
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
use tool_management_console\repository\competency_review_repository;
use tool_management_console\repository\competency_repository;

/**
 * Competency reviews external service class.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class competency_reviews extends external_api {

    /**
     * Helper para verificar permisos de visualización.
     */
    protected static function check_view_capability($context) {
        if (is_siteadmin()) {
            return;
        }
        if (has_capability('moodle/competency:competencymanage', $context) ||
            has_capability('moodle/competency:competencyview', $context)) {
            return;
        }
        throw new \moodle_exception('nopermissions', 'error', '', 'view competencies');
    }

    /**
     * Helper para verificar permisos de gestión.
     */
    protected static function check_manage_capability($context) {
        if (is_siteadmin()) {
            return;
        }
        require_capability('moodle/competency:competencymanage', $context);
    }

    // ==========================================
    // 12. GET COMPETENCY REVIEWS (PENDING / IN REVIEW)
    // ==========================================
    public static function get_competency_reviews_parameters() {
        return new external_function_parameters([
            'page'        => new external_value(PARAM_INT, 'Page number', VALUE_DEFAULT, 0),
            'perpage'     => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 20),
            'frameworkid' => new external_value(PARAM_INT, 'Filter by framework ID', VALUE_DEFAULT, 0),
            'competencyid'=> new external_value(PARAM_INT, 'Filter by competency ID', VALUE_DEFAULT, 0),
            'userid'      => new external_value(PARAM_INT, 'Filter by student user ID', VALUE_DEFAULT, 0),
            'search'      => new external_value(PARAM_TEXT, 'Search query', VALUE_DEFAULT, ''),
        ]);
    }

    public static function get_competency_reviews($page = 0, $perpage = 20, $frameworkid = 0, $competencyid = 0, $userid = 0, $search = '') {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        $params = self::validate_parameters(self::get_competency_reviews_parameters(), [
            'page'         => $page,
            'perpage'      => $perpage,
            'frameworkid'  => $frameworkid,
            'competencyid' => $competencyid,
            'userid'       => $userid,
            'search'       => $search,
        ]);

        $filters = [
            'frameworkid'  => $params['frameworkid'],
            'competencyid' => $params['competencyid'],
            'userid'       => $params['userid'],
            'search'       => trim($params['search']),
        ];

        return competency_review_repository::get_pending_reviews($filters, $params['page'], $params['perpage']);
    }

    public static function get_competency_reviews_returns() {
        return new external_single_structure([
            'totalcount' => new external_value(PARAM_INT, 'Total pending reviews count'),
            'page'       => new external_value(PARAM_INT, 'Current page index'),
            'perpage'    => new external_value(PARAM_INT, 'Items per page'),
            'reviews'    => new external_multiple_structure(
                new external_single_structure([
                    'usercompid'            => new external_value(PARAM_INT, 'User competency ID'),
                    'userid'                => new external_value(PARAM_INT, 'User ID'),
                    'userfullname'          => new external_value(PARAM_TEXT, 'User full name'),
                    'useremail'             => new external_value(PARAM_TEXT, 'User email'),
                    'competencyid'          => new external_value(PARAM_INT, 'Competency ID'),
                    'competencyname'        => new external_value(PARAM_TEXT, 'Competency short name'),
                    'competencyidnumber'    => new external_value(PARAM_RAW, 'Competency ID number'),
                    'competencyframeworkid' => new external_value(PARAM_INT, 'Framework ID'),
                    'frameworkname'         => new external_value(PARAM_TEXT, 'Framework short name'),
                    'status'                => new external_value(PARAM_INT, 'Review status (1=Waiting, 2=In Review)'),
                    'proficiency'           => new external_value(PARAM_INT, 'Proficiency (1 or 0)'),
                    'currentgrade'          => new external_value(PARAM_INT, 'Current grade in scale'),
                    'scaleid'               => new external_value(PARAM_INT, 'Scale ID'),
                    'scalename'             => new external_value(PARAM_TEXT, 'Scale name'),
                    'scaleoptions'          => new external_multiple_structure(
                        new external_single_structure([
                            'value' => new external_value(PARAM_INT, 'Scale item rating value'),
                            'name'  => new external_value(PARAM_TEXT, 'Scale item display label'),
                        ]),
                        'Scale grade options',
                        VALUE_DEFAULT,
                        []
                    ),
                    'latestevidence'        => new external_value(PARAM_RAW, 'Latest evidence note'),
                    'timemodified'          => new external_value(PARAM_INT, 'Timestamp requested/modified'),
                ])
            ),
        ]);
    }

    // ==========================================
    // 13. COMPETENCY REVIEW ACTION (EVALUATE / COMPLETE)
    // ==========================================
    public static function competency_review_action_parameters() {
        return new external_function_parameters([
            'action'      => new external_value(PARAM_ALPHANUMEXT, 'Action: evaluate, complete'),
            'usercompid'  => new external_value(PARAM_INT, 'User competency record ID'),
            'grade'       => new external_value(PARAM_INT, 'Grade value in scale', VALUE_DEFAULT, 1),
            'proficiency' => new external_value(PARAM_INT, 'Proficiency result (1=proficient, 0=not)', VALUE_DEFAULT, 1),
            'note'        => new external_value(PARAM_RAW, 'Review feedback / evidence note', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Perform competency review assessment action.
     */
    public static function competency_review_action($action, $usercompid, $grade = 1, $proficiency = 1, $note = '') {
        global $USER;
        $context = context_system::instance();
        self::validate_context($context);
        self::check_manage_capability($context);

        $params = self::validate_parameters(self::competency_review_action_parameters(), [
            'action'      => $action,
            'usercompid'  => $usercompid,
            'grade'       => $grade,
            'proficiency' => $proficiency,
            'note'        => $note,
        ]);

        $success = competency_review_repository::evaluate_competency_review(
            $params['usercompid'],
            $params['grade'],
            $params['proficiency'],
            $params['note'],
            $USER->id
        );

        return [
            'success' => $success,
            'message' => $success ? 'Revisión de competencia completada exitosamente.' : 'Error al guardar revisión.',
        ];
    }

    public static function competency_review_action_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'True if operation succeeded'),
            'message' => new external_value(PARAM_TEXT, 'Status description message'),
        ]);
    }

    // ==========================================
    // 14. GET COMPETENCY USERS (ENROLLED & COMPETENCY PROGRESS + EVIDENCES)
    // ==========================================
    public static function get_competency_users_parameters() {
        return new external_function_parameters([
            'competencyid' => new external_value(PARAM_INT, 'Competency ID'),
            'search'       => new external_value(PARAM_RAW, 'Search by user name or email', VALUE_DEFAULT, ''),
            'status'       => new external_value(PARAM_ALPHANUMEXT, 'Filter status: all, proficient, not_proficient, in_review, pending_reviews', VALUE_DEFAULT, 'all'),
            'courseid'     => new external_value(PARAM_INT, 'Filter by specific course ID', VALUE_DEFAULT, 0),
            'page'         => new external_value(PARAM_INT, 'Page number', VALUE_DEFAULT, 0),
            'perpage'      => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 20),
            'sort'         => new external_value(PARAM_ALPHANUMEXT, 'Sort field', VALUE_DEFAULT, 'lastname'),
            'dir'          => new external_value(PARAM_ALPHA, 'Sort direction: ASC, DESC', VALUE_DEFAULT, 'ASC'),
        ]);
    }

    public static function get_competency_users($competencyid, $search = '', $status = 'all', $courseid = 0, $page = 0, $perpage = 20, $sort = 'lastname', $dir = 'ASC') {
        $context = context_system::instance();
        self::validate_context($context);
        self::check_view_capability($context);

        $params = self::validate_parameters(self::get_competency_users_parameters(), [
            'competencyid' => $competencyid,
            'search'       => $search,
            'status'       => $status,
            'courseid'     => $courseid,
            'page'         => $page,
            'perpage'      => $perpage,
            'sort'         => $sort,
            'dir'          => $dir,
        ]);
        $params['perpage'] = min(max(1, $params['perpage']), 200);

        return competency_repository::get_competency_users(
            $params['competencyid'],
            $params['search'],
            $params['status'],
            $params['courseid'],
            $params['page'],
            $params['perpage'],
            $params['sort'],
            $params['dir']
        );
    }

    public static function get_competency_users_returns() {
        return new external_single_structure([
            'totalcount' => new external_value(PARAM_INT, 'Total count of users matching criteria'),
            'page'       => new external_value(PARAM_INT, 'Current page'),
            'perpage'    => new external_value(PARAM_INT, 'Items per page'),
            'users'      => new external_multiple_structure(
                new external_single_structure([
                    'userid'                => new external_value(PARAM_INT, 'User ID'),
                    'fullname'              => new external_value(PARAM_TEXT, 'User full name'),
                    'email'                 => new external_value(PARAM_TEXT, 'User email'),
                    'usercompid'            => new external_value(PARAM_INT, 'User competency record ID'),
                    'status'                => new external_value(PARAM_INT, 'Competency review status'),
                    'pendingreviewscount'   => new external_value(PARAM_INT, 'Pending reviews count for user', VALUE_DEFAULT, 0),
                    'proficiency'           => new external_value(PARAM_INT, 'Is proficient (1=yes, 0=no)'),
                    'grade'                 => new external_value(PARAM_INT, 'Competency grade/scale value'),
                    'gradename'             => new external_value(PARAM_TEXT, 'Grade name in scale'),
                    'coursescount'          => new external_value(PARAM_INT, 'Count of enrolled courses linked'),
                    'completedcoursescount' => new external_value(PARAM_INT, 'Count of completed courses'),
                    'progress'              => new external_value(PARAM_INT, 'Overall average course completion percentage'),
                    'courses'               => new external_multiple_structure(
                        new external_single_structure([
                            'courseid'    => new external_value(PARAM_INT, 'Course ID'),
                            'fullname'    => new external_value(PARAM_TEXT, 'Course full name'),
                            'shortname'   => new external_value(PARAM_TEXT, 'Course short name'),
                            'completed'   => new external_value(PARAM_INT, 'Is course completed'),
                            'progress'    => new external_value(PARAM_INT, 'Course completion percentage'),
                            'proficiency' => new external_value(PARAM_INT, 'Course-level competency proficiency'),
                            'grade'       => new external_value(PARAM_INT, 'Course-level competency grade'),
                        ])
                    ),
                    'evidencescount'        => new external_value(PARAM_INT, 'Number of registered evidences'),
                    'evidences'             => new external_multiple_structure(
                        new external_single_structure([
                            'id'                 => new external_value(PARAM_INT, 'Evidence ID'),
                            'action'             => new external_value(PARAM_INT, 'Evidence action type'),
                            'actionname'         => new external_value(PARAM_TEXT, 'Evidence action name'),
                            'actionuserfullname' => new external_value(PARAM_TEXT, 'Action user full name'),
                            'descidentifier'     => new external_value(PARAM_TEXT, 'Description identifier'),
                            'note'               => new external_value(PARAM_RAW, 'Evidence note / feedback'),
                            'grade'              => new external_value(PARAM_INT, 'Evidence grade'),
                            'gradename'          => new external_value(PARAM_TEXT, 'Evidence grade name'),
                            'url'                => new external_value(PARAM_RAW, 'Evidence URL'),
                            'timecreated'        => new external_value(PARAM_INT, 'Evidence timestamp'),
                        ])
                    ),
                    'source'                => new external_value(PARAM_ALPHA, 'User assignment source (adhoc, course, usercomp)', VALUE_DEFAULT, 'course'),
                    'is_adhoc'              => new external_value(PARAM_INT, 'Whether assigned via adhoc plan', VALUE_DEFAULT, 0),
                ])
            ),
            'scale'      => new external_single_structure([
                'id'    => new external_value(PARAM_INT, 'Scale ID'),
                'name'  => new external_value(PARAM_TEXT, 'Scale name'),
                'items' => new external_multiple_structure(new external_value(PARAM_TEXT, 'Scale item name')),
            ]),
        ]);
    }
}
