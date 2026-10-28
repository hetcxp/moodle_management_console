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
 * Feedback repository for tool_management_console.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console\repository;


/**
 * Feedback repository class (SSOT for tool_mng_feedback).
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class feedback_repository {
    /** @var string Table name */
    const TABLE = 'tool_mng_feedback';

    /**
     * Create a new feedback record.
     *
     * @param array $data Record fields.
     * @return int New record ID.
     */
    public static function create(array $data): int {
        global $DB;

        $record = (object)[
            'userid'           => (int)($data['userid'] ?? 0),
            'type'             => substr(clean_param($data['type'] ?? 'issue', PARAM_ALPHA), 0, 32),
            'description'      => clean_text($data['description'] ?? '', FORMAT_PLAIN),
            'admincomment'     => isset($data['admincomment']) ? clean_text($data['admincomment'], FORMAT_PLAIN) : null,
            'pageurl'          => substr(clean_param($data['pageurl'] ?? '', PARAM_RAW_TRIMMED), 0, 255),
            'useragent'        => substr(clean_param($data['useragent'] ?? '', PARAM_RAW_TRIMMED), 0, 255),
            'resolution'       => substr(clean_param($data['resolution'] ?? '', PARAM_ALPHANUMEXT), 0, 32),
            'screenshotfileid' => !empty($data['screenshotfileid']) ? (int)$data['screenshotfileid'] : null,
            'status'           => substr(clean_param($data['status'] ?? 'new', PARAM_ALPHAEXT), 0, 20),
            'assignedto'       => !empty($data['assignedto']) ? (int)$data['assignedto'] : null,
            'timecreated'      => time(),
            'timemodified'     => time(),
        ];

        return (int)$DB->insert_record(self::TABLE, $record);
    }

    /**
     * Get feedback record by ID.
     *
     * @param int $id Record ID.
     * @return \stdClass|null
     */
    public static function get_by_id(int $id): ?\stdClass {
        global $DB;
        $record = $DB->get_record(self::TABLE, ['id' => $id]);
        return $record ?: null;
    }

    /**
     * Get user feedback tickets.
     *
     * @param int $userid User ID.
     * @param int $page Page index (0-based).
     * @param int $perpage Items per page.
     * @return array Array of records.
     */
    public static function get_user_feedback(int $userid, int $page = 0, int $perpage = 50): array {
        global $DB;
        $limitfrom = $page * $perpage;
        return array_values($DB->get_records(
            self::TABLE,
            ['userid' => $userid],
            'timecreated DESC',
            '*',
            $limitfrom,
            $perpage
        ));
    }

    /**
     * Get all feedback records with optional filtering (for admin/support).
     *
     * @param string $status Optional status filter.
     * @param string $type Optional type filter.
     * @param int $page Page index (0-based).
     * @param int $perpage Items per page.
     * @return array Array of records with submitter user details.
     */
    public static function get_all_feedback(
        string $status = '',
        string $type = '',
        int $page = 0,
        int $perpage = 50
    ): array {
        global $DB;

        $conditions = [];
        $params = [];

        if ($status !== '') {
            $conditions[] = "f.status = :status";
            $params['status'] = $status;
        }

        if ($type !== '') {
            $conditions[] = "f.type = :type";
            $params['type'] = $type;
        }

        $where = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $sql = "
            SELECT f.*,
                   u.firstname, u.lastname, u.email, u.username
              FROM {" . self::TABLE . "} f
         LEFT JOIN {user} u ON f.userid = u.id
            {$where}
          ORDER BY f.timecreated DESC
        ";

        $limitfrom = $page * $perpage;
        return array_values($DB->get_records_sql($sql, $params, $limitfrom, $perpage));
    }

    /**
     * Count feedback records matching criteria.
     *
     * @param string $status Optional status filter.
     * @param string $type Optional type filter.
     * @return int Total matching records.
     */
    public static function count_all(string $status = '', string $type = ''): int {
        global $DB;

        $conditions = [];
        $params = [];

        if ($status !== '') {
            $conditions[] = "status = :status";
            $params['status'] = $status;
        }

        if ($type !== '') {
            $conditions[] = "type = :type";
            $params['type'] = $type;
        }

        $where = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $sql = "SELECT COUNT(1) FROM {" . self::TABLE . "} {$where}";

        return (int)$DB->count_records_sql($sql, $params);
    }

    /**
     * Update ticket status and optional admin comment / assignee.
     *
     * @param int $id Feedback ID.
     * @param string $status New status.
     * @param string|null $admincomment Optional admin response.
     * @param int|null $assignedto Optional assigned user ID.
     * @return bool True on success.
     */
    public static function update_status(
        int $id,
        string $status,
        ?string $admincomment = null,
        ?int $assignedto = null
    ): bool {
        global $DB;

        $record = (object)[
            'id'           => $id,
            'status'       => substr(clean_param($status, PARAM_ALPHAEXT), 0, 20),
            'timemodified' => time(),
        ];

        if ($admincomment !== null) {
            $record->admincomment = clean_text($admincomment, FORMAT_PLAIN);
        }

        if ($assignedto !== null) {
            $record->assignedto = (int)$assignedto;
        }

        return $DB->update_record(self::TABLE, $record);
    }

    /**
     * Attach screenshot file ID to feedback record.
     *
     * @param int $id Feedback ID.
     * @param int $fileid File ID.
     * @return bool True on success.
     */
    public static function attach_screenshot(int $id, int $fileid): bool {
        global $DB;
        return $DB->update_record(self::TABLE, (object)[
            'id'               => $id,
            'screenshotfileid' => $fileid,
            'timemodified'     => time(),
        ]);
    }
}
