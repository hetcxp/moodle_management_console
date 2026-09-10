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
 * Competency review and evidence repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

defined('MOODLE_INTERNAL') || die();

/**
 * Repository specialized in competency reviews, evaluations, and evidence.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class competency_review_repository {

    /**
     * Cuenta revisiones pendientes a nivel de marco.
     *
     * @param int $frameworkid
     * @return int
     */
    public static function count_pending_reviews_by_framework($frameworkid): int {
        global $DB;
        $sql = "
            SELECT COUNT(uc.id)
              FROM {competency_usercomp} uc
              JOIN {competency} c ON c.id = uc.competencyid
             WHERE c.competencyframeworkid = :frameworkid
               AND uc.status IN (1, 2)
        ";
        try {
            return (int)$DB->count_records_sql($sql, ['frameworkid' => $frameworkid]);
        } catch (\Exception $e) {
            debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
            return 0;
        }
    }

    /**
     * Cuenta revisiones pendientes a nivel de competencia.
     *
     * @param int $competencyid
     * @return int
     */
    public static function count_pending_reviews_by_competency($competencyid): int {
        global $DB;
        $sql = "
            SELECT COUNT(uc.id)
              FROM {competency_usercomp} uc
             WHERE uc.competencyid = :competencyid
               AND uc.status IN (1, 2)
        ";
        try {
            return (int)$DB->count_records_sql($sql, ['competencyid' => $competencyid]);
        } catch (\Exception $e) {
            debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
            return 0;
        }
    }

    /**
     * Cuenta revisiones pendientes a nivel de curso.
     *
     * @param int $courseid
     * @return int
     */
    public static function count_pending_reviews_by_course($courseid): int {
        global $DB;
        $sql = "
            SELECT COUNT(ucc.id)
              FROM {competency_usercompcourse} ucc
             WHERE ucc.courseid = :courseid
               AND ucc.status IN (1, 2)
        ";
        try {
            return (int)$DB->count_records_sql($sql, ['courseid' => $courseid]);
        } catch (\Exception $e) {
            debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
            return 0;
        }
    }

    /**
     * Obtiene el listado de revisiones pendientes con paginación y filtros.
     *
     * @param array $filters
     * @param int $page
     * @param int $perpage
     * @return array
     */
    public static function get_pending_reviews($filters = [], $page = 0, $perpage = 20): array {
        global $DB;

        $where = "uc.status IN (1, 2)";
        $params = [];

        if (!empty($filters['frameworkid'])) {
            $where .= " AND c.competencyframeworkid = :frameworkid";
            $params['frameworkid'] = (int)$filters['frameworkid'];
        }

        if (!empty($filters['competencyid'])) {
            $where .= " AND uc.competencyid = :competencyid";
            $params['competencyid'] = (int)$filters['competencyid'];
        }

        if (!empty($filters['userid'])) {
            $where .= " AND uc.userid = :userid";
            $params['userid'] = (int)$filters['userid'];
        }

        if (!empty($filters['search'])) {
            $like = '%' . $filters['search'] . '%';
            $where .= " AND (" . $DB->sql_like('u.firstname', ':s1', false, false) .
                      " OR " . $DB->sql_like('u.lastname', ':s2', false, false) .
                      " OR " . $DB->sql_like('u.email', ':s3', false, false) .
                      " OR " . $DB->sql_like('c.shortname', ':s4', false, false) . ")";
            $params['s1'] = $like;
            $params['s2'] = $like;
            $params['s3'] = $like;
            $params['s4'] = $like;
        }

        $sql_select = "
            SELECT uc.id AS usercompid, uc.userid, uc.competencyid, uc.status, uc.reviewerid,
                   uc.proficiency, uc.grade, uc.timemodified,
                   u.firstname, u.lastname, u.email, u.picture, u.imagealt,
                   c.shortname AS competencyname, c.idnumber AS competencyidnumber, c.competencyframeworkid,
                   f.shortname AS frameworkname, f.scaleid, COALESCE(s.name, 'Escala estándar') AS scalename,
                   COALESCE(s.scale, '') AS scaleitems
              FROM {competency_usercomp} uc
              JOIN {user} u ON u.id = uc.userid
              JOIN {competency} c ON c.id = uc.competencyid
              JOIN {competency_framework} f ON f.id = c.competencyframeworkid
         LEFT JOIN {scale} s ON s.id = f.scaleid
             WHERE $where
          ORDER BY uc.timemodified DESC
        ";

        $sql_count = "
            SELECT COUNT(uc.id)
              FROM {competency_usercomp} uc
              JOIN {user} u ON u.id = uc.userid
              JOIN {competency} c ON c.id = uc.competencyid
              JOIN {competency_framework} f ON f.id = c.competencyframeworkid
             WHERE $where
        ";

        $totalcount = (int)$DB->count_records_sql($sql_count, $params);
        $limitfrom = $page * $perpage;
        $records = $DB->get_records_sql($sql_select, $params, $limitfrom, $perpage);

        $reviews = [];
        foreach ($records as $r) {
            $items = array_map('trim', explode(',', $r->scaleitems));
            $scale_options = [];
            foreach ($items as $idx => $item) {
                if ($item !== '') {
                    $scale_options[] = [
                        'value' => $idx + 1,
                        'name'  => $item,
                    ];
                }
            }

            // Obtener última evidencia si existe
            $latest_evidence = '';
            try {
                $ev = $DB->get_records('competency_evidence', ['usercompetencyid' => $r->usercompid], 'timecreated DESC', 'note', 0, 1);
                if (!empty($ev)) {
                    $first_ev = reset($ev);
                    $latest_evidence = (string)($first_ev->note ?? '');
                }
            } catch (\Exception $e) {
                debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
                $latest_evidence = '';
            }

            $reviews[] = [
                'usercompid'           => (int)$r->usercompid,
                'userid'               => (int)$r->userid,
                'userfullname'         => fullname($r),
                'useremail'            => (string)$r->email,
                'competencyid'         => (int)$r->competencyid,
                'competencyname'       => (string)$r->competencyname,
                'competencyidnumber'   => (string)($r->competencyidnumber ?? ''),
                'competencyframeworkid'=> (int)$r->competencyframeworkid,
                'frameworkname'        => (string)$r->frameworkname,
                'status'               => (int)$r->status,
                'proficiency'          => (int)$r->proficiency,
                'currentgrade'         => (int)($r->grade ?? 0),
                'scaleid'              => (int)$r->scaleid,
                'scalename'            => (string)$r->scalename,
                'scaleoptions'         => $scale_options,
                'latestevidence'       => $latest_evidence,
                'timemodified'         => (int)$r->timemodified,
            ];
        }

        return [
            'totalcount' => $totalcount,
            'page'       => (int)$page,
            'perpage'    => (int)$perpage,
            'reviews'    => $reviews,
        ];
    }

    /**
     * Evalúa y completa la revisión de una competencia de usuario.
     *
     * @param int $usercompid
     * @param int $grade
     * @param int $proficiency
     * @param string $note
     * @param int $reviewerid
     * @return bool
     */
    public static function evaluate_competency_review($usercompid, $grade, $proficiency, $note = '', $reviewerid = 0): bool {
        global $DB, $USER;

        $rid = $reviewerid > 0 ? $reviewerid : $USER->id;
        $usercomp = $DB->get_record('competency_usercomp', ['id' => $usercompid], '*', MUST_EXIST);

        $usercomp->status = 0; // STATUS_IDLE (Completada la revisión)
        $usercomp->reviewerid = $rid;
        $usercomp->grade = (int)$grade;
        $usercomp->proficiency = (int)$proficiency;
        $usercomp->timemodified = time();
        $usercomp->usermodified = $rid;

        $DB->update_record('competency_usercomp', $usercomp);

        // Registrar evidencia manual si la tabla existe
        try {
            $evidence = new \stdClass();
            $evidence->usercompetencyid = $usercompid;
            $evidence->contextid = \context_system::instance()->id;
            $evidence->action = 0;
            $evidence->actionuserid = $rid;
            $evidence->descidentifier = 'evidence_manual';
            $evidence->desccomponent = 'core_competency';
            $evidence->desca = null;
            $evidence->url = null;
            $evidence->grade = (int)$grade;
            $evidence->note = (string)$note;
            $evidence->timecreated = time();
            $evidence->timemodified = time();
            $evidence->usermodified = $rid;
            $DB->insert_record('competency_evidence', $evidence);
        } catch (\Exception $e) {
            debugging("AdminerApi: " . $e->getMessage(), DEBUG_DEVELOPER);
        }

        return true;
    }
}
