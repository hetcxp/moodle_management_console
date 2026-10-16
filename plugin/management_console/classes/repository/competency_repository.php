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
 * Competency repository facade for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;

/**
 * Competency repository facade class maintaining unified public contracts.
 *
 * Descompuesto bajo SRP en repositorios especializados:
 * - competency_crud_repository
 * - competency_course_link_repository
 * - competency_activity_link_repository
 * - competency_review_repository
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class competency_repository {
    /**
     * Devuelve los detalles de una competencia individual y sus subcompetencias hijas.
     *
     * @param int $competencyid Competency ID.
     * @return array|null Competency details or null if not found.
     */
    public static function get_competency_detail(int $competencyid): ?array {
        return competency_crud_repository::get_competency_detail($competencyid);
    }

    /**
     * Devuelve los cursos vinculados directamente a una competencia, incluyendo actividades mapeadas.
     *
     * @param int $competencyid Competency ID.
     * @return array List of courses.
     */
    public static function get_competency_courses(int $competencyid): array {
        return competency_course_link_repository::get_competency_courses($competencyid);
    }

    /**
     * Devuelve los cursos y actividades vinculados a cada subcompetencia hija de una competencia principal.
     *
     * @param int $competencyid Competency ID.
     * @return array List of subcompetencies and their courses.
     */
    public static function get_subcompetencies_courses(int $competencyid): array {
        return competency_course_link_repository::get_subcompetencies_courses($competencyid);
    }

    /**
     * Obtiene las actividades disponibles en un curso para vincular a una competencia.
     *
     * @param int $courseid Course ID.
     * @param int $competencyid Competency ID.
     * @return array List of available course activities.
     */
    public static function get_course_available_activities(int $courseid, int $competencyid = 0): array {
        return competency_activity_link_repository::get_course_available_activities($courseid, $competencyid);
    }

    /**
     * Resuelve en lote los nombres de actividades por módulo e instancia para evitar N+1 queries.
     *
     * @param array $records Objetos que contienen propiedades modname e instance.
     * @return array Mapa asociativo [modname => [instance_id => name]]
     */
    public static function resolve_module_activity_names(array $records): array {
        return competency_activity_link_repository::resolve_module_activity_names($records);
    }

    /**
     * Cuenta revisiones pendientes a nivel de marco.
     *
     * @param int $frameworkid Framework ID.
     * @return int Pending reviews count.
     */
    public static function count_pending_reviews_by_framework(int $frameworkid): int {
        return competency_review_repository::count_pending_reviews_by_framework($frameworkid);
    }

    /**
     * Cuenta revisiones pendientes a nivel de competencia.
     *
     * @param int $competencyid Competency ID.
     * @return int Pending reviews count.
     */
    public static function count_pending_reviews_by_competency(int $competencyid): int {
        return competency_review_repository::count_pending_reviews_by_competency($competencyid);
    }

    /**
     * Cuenta revisiones pendientes a nivel de curso.
     *
     * @param int $courseid Course ID.
     * @return int Pending reviews count.
     */
    public static function count_pending_reviews_by_course(int $courseid): int {
        return competency_review_repository::count_pending_reviews_by_course($courseid);
    }

    /**
     * Obtiene el listado de revisiones pendientes con paginación y filtros.
     *
     * @param array $filters Filter parameters.
     * @param int $page Page offset.
     * @param int $perpage Records per page.
     * @return array Pending reviews list and counts.
     */
    public static function get_pending_reviews(array $filters = [], int $page = 0, int $perpage = 20): array {
        return competency_review_repository::get_pending_reviews($filters, $page, $perpage);
    }

    /**
     * Evalúa y completa la revisión de una competencia de usuario.
     *
     * @param int $usercompid User competency ID.
     * @param int $grade Grade value.
     * @param int $proficiency Proficiency flag.
     * @param string $note Reviewer note.
     * @param int $reviewerid Reviewer user ID.
     * @return array Result status array.
     */
    public static function evaluate_competency_review(
        int $usercompid,
        int $grade,
        int $proficiency,
        string $note = '',
        int $reviewerid = 0
    ): array {
        return competency_review_repository::evaluate_competency_review($usercompid, $grade, $proficiency, $note, $reviewerid);
    }

    /**
     * Resuelve los IDs de cursos asociados directa e indirectamente a una competencia.
     *
     * @param int $competencyid Competency ID.
     * @param int $courseid Course ID.
     * @return array [$allcourseids, $relevantcourseids, $childids]
     */
    public static function resolve_competency_course_ids(int $competencyid, int $courseid = 0): array {
        return competency_course_link_repository::resolve_competency_course_ids($competencyid, $courseid);
    }

    /**
     * Obtiene la escala de calificación asociada al marco de la competencia.
     *
     * @param int $competencyid Competency ID.
     * @return array [$scaleinfo, $scaleitems]
     */
    public static function fetch_competency_scale_info(int $competencyid): array {
        return competency_crud_repository::fetch_competency_scale_info($competencyid);
    }

    /**
     * Construye el universo tripartito de usuarios vinculados a una competencia.
     *
     * @param int $competencyid Competency ID.
     * @param array $relevantcourseids Relevant course IDs array.
     * @return array [$usercompbyuser, $adhocuserids, $alluserids]
     */
    public static function build_competency_user_universe(int $competencyid, array $relevantcourseids): array {
        return competency_crud_repository::build_competency_user_universe($competencyid, $relevantcourseids);
    }

    /**
     * Carga y computa el progreso en cursos para los usuarios de la página actual.
     *
     * @param array $pageuserids Array of page user IDs.
     * @param array $allcourseids Array of course IDs.
     * @param int $competencyid Competency ID.
     * @return array Course map for users.
     */
    public static function load_page_users_course_map(array $pageuserids, array $allcourseids, int $competencyid): array {
        return competency_crud_repository::load_page_users_course_map($pageuserids, $allcourseids, $competencyid);
    }

    /**
     * Carga y formatea las evidencias de competencias de la página actual.
     *
     * @param array $pageuserids Page user IDs array.
     * @param array $usercompbyuser Map of user competencies by user ID.
     * @param array $scaleitems Scale items array.
     * @return array Evidence map by user.
     */
    public static function load_page_users_evidences(
        array $pageuserids,
        array $usercompbyuser,
        array $scaleitems
    ): array {
        return competency_crud_repository::load_page_users_evidences($pageuserids, $usercompbyuser, $scaleitems);
    }

    /**
     * Carga el recuento de revisiones pendientes de competencias para los usuarios de la página actual.
     *
     * @param array $pageuserids Page user IDs array.
     * @param int $competencyid Competency ID.
     * @param array $childids Child competency IDs array.
     * @return array Pending reviews count map by user ID.
     */
    public static function load_page_users_pending_reviews(array $pageuserids, int $competencyid, array $childids): array {
        return competency_crud_repository::load_page_users_pending_reviews($pageuserids, $competencyid, $childids);
    }

    /**
     * Obtiene los usuarios vinculados a una competencia, junto con cursos, progreso y evidencias.
     *
     * @param int $competencyid Competency ID.
     * @param string $search Search query.
     * @param string $status Filter status.
     * @param int $courseid Course ID.
     * @param int $page Page offset.
     * @param int $perpage Records per page.
     * @param string $sort Sort field.
     * @param string $dir Sort direction.
     * @return array Competency users list and pagination info.
     */
    public static function get_competency_users(
        int $competencyid,
        string $search = '',
        string $status = 'all',
        int $courseid = 0,
        int $page = 0,
        int $perpage = 20,
        string $sort = 'lastname',
        string $dir = 'ASC'
    ): array {
        return competency_crud_repository::get_competency_users(
            $competencyid,
            $search,
            $status,
            $courseid,
            $page,
            $perpage,
            $sort,
            $dir
        );
    }

    /**
     * Ejecuta acciones de creación, edición, actualización de reglas y eliminación de competencias.
     *
     * @param string $action create, edit, update_rule, delete.
     * @param int $competencyid Competency ID.
     * @param int $frameworkid Framework ID.
     * @param int $parentid Parent competency ID.
     * @param string $shortname Competency short name.
     * @param string $idnumber ID number.
     * @param string $description Description text.
     * @param string $ruletype Rule type.
     * @param int $ruleoutcome Rule outcome value.
     * @param string $ruleconfig Rule config string.
     * @param int $userid Modifying user ID.
     * @return array Result array.
     */
    public static function competency_action(
        string $action,
        int $competencyid = 0,
        int $frameworkid = 0,
        int $parentid = 0,
        string $shortname = '',
        string $idnumber = '',
        string $description = '',
        string $ruletype = '',
        int $ruleoutcome = 1,
        string $ruleconfig = '',
        int $userid = 0
    ): array {
        return competency_crud_repository::competency_action(
            $action,
            $competencyid,
            $frameworkid,
            $parentid,
            $shortname,
            $idnumber,
            $description,
            $ruletype,
            $ruleoutcome,
            $ruleconfig,
            $userid
        );
    }

    /**
     * Acciones de vinculación entre competencias y cursos (add, remove, update_rule).
     *
     * @param string $action Action name (add, remove, update_rule).
     * @param int $competencyid Competency ID.
     * @param array $courseids Array of course IDs.
     * @param int $ruleoutcome Rule outcome value.
     * @param int $userid User ID performing action.
     * @return array Result array.
     */
    public static function competency_course_action(
        string $action,
        int $competencyid,
        array $courseids,
        int $ruleoutcome = 1,
        int $userid = 0
    ): array {
        return competency_course_link_repository::competency_course_action(
            $action,
            $competencyid,
            $courseids,
            $ruleoutcome,
            $userid
        );
    }

    /**
     * Acciones de vinculación entre competencias y módulos de actividad (add, remove, update_rule).
     *
     * @param string $action Action name (add, remove, update_rule).
     * @param int $competencyid Competency ID.
     * @param int $cmid Course module ID.
     * @param int $ruleoutcome Rule outcome value.
     * @param int $userid User ID performing action.
     * @return array Result array.
     */
    public static function module_competency_action(
        string $action,
        int $competencyid,
        int $cmid,
        int $ruleoutcome = 1,
        int $userid = 0
    ): array {
        return competency_activity_link_repository::module_competency_action(
            $action,
            $competencyid,
            $cmid,
            $ruleoutcome,
            $userid
        );
    }
}
