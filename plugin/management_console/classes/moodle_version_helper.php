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
 * Version adapter and compatibility helper for Moodle 4.1 through 5.3+.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console;

use Closure;
use coding_exception;
use context;
use moodle_exception;
use ReflectionFunction;
use ReflectionFunctionAbstract;
use ReflectionMethod;
use stdClass;
use Throwable;

/**
 * Moodle version compatibility and adapter helper.
 *
 * Encapsulates breaking API changes and compatibility differences across
 * Moodle core releases (enrolments, completion, user management, and transactional boundaries).
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class moodle_version_helper {
    /** @var int Moodle 4.1 LTS branch release version constant */
    public const MOODLE_41_VERSION = 2022112800;

    /** @var int Moodle 4.2 branch release version constant */
    public const MOODLE_42_VERSION = 2023042400;

    /** @var int Moodle 4.3 branch release version constant */
    public const MOODLE_43_VERSION = 2023100900;

    /** @var int Moodle 4.4 branch release version constant */
    public const MOODLE_44_VERSION = 2024042200;

    /** @var int Moodle 4.5 LTS branch release version constant */
    public const MOODLE_45_VERSION = 2024100700;

    /** @var int Moodle 5.0 branch release version constant */
    public const MOODLE_50_VERSION = 2025041400;

    /** @var int Moodle 5.1 branch release version constant */
    public const MOODLE_51_VERSION = 2025101300;

    /** @var int Moodle 5.2 branch release version constant */
    public const MOODLE_52_VERSION = 2026042000;

    /** @var int Moodle 5.3 branch release version constant (branch 503) */
    public const MOODLE_53_VERSION = 2026100500;

    /**
     * Get the current Moodle integer version ($CFG->version).
     *
     * @return int
     */
    public static function get_moodle_version(): int {
        global $CFG;
        return isset($CFG->version) ? (int)$CFG->version : 0;
    }

    /**
     * Check if current Moodle version is at least the specified version integer.
     *
     * @param int $version Version integer to compare against.
     * @return bool
     */
    public static function is_version_at_least(int $version): bool {
        return self::get_moodle_version() >= $version;
    }

    /**
     * Check if running on Moodle 4.1 or newer.
     *
     * @return bool
     */
    public static function is_moodle_41_or_newer(): bool {
        return self::is_version_at_least(self::MOODLE_41_VERSION);
    }

    /**
     * Check if running on Moodle 4.5 or newer.
     *
     * @return bool
     */
    public static function is_moodle_45_or_newer(): bool {
        return self::is_version_at_least(self::MOODLE_45_VERSION);
    }

    /**
     * Check if running on Moodle 5.0 or newer.
     *
     * @return bool
     */
    public static function is_moodle_5_or_newer(): bool {
        return self::is_version_at_least(self::MOODLE_50_VERSION);
    }

    /**
     * Check if running on Moodle 5.3 or newer.
     *
     * @return bool
     */
    public static function is_moodle_53_or_newer(): bool {
        return self::is_version_at_least(self::MOODLE_53_VERSION);
    }

    /**
     * Update user record using modern core\user API on Moodle 4.5+ / 5.x,
     * falling back to user_update_user on legacy releases.
     *
     * @param stdClass $user User object with updated fields.
     * @param bool $triggerevent True to trigger user_updated event.
     * @param bool $haspassword True if password was modified.
     * @return void
     * @throws coding_exception If user object is invalid or no update API is available.
     */
    public static function update_user(stdClass $user, bool $triggerevent = false, bool $haspassword = false): void {
        if (!isset($user->id) || (int)$user->id <= 0) {
            throw new coding_exception('Invalid user object: missing or non-positive id property.');
        }

        if (method_exists(\core\user::class, 'update_user')) {
            $method = new ReflectionMethod(\core\user::class, 'update_user');
            if ($method->isPublic()) {
                \core\user::update_user($user, $triggerevent, $haspassword);
                return;
            }
        }

        if (function_exists('user_update_user')) {
            user_update_user($user, $triggerevent, $haspassword);
            return;
        }

        throw new coding_exception('No supported Moodle user update API available in current runtime.');
    }

    /**
     * Get completion_info instance for a course, ensuring library is loaded.
     *
     * @param stdClass $course Course record.
     * @return \completion_info
     * @throws coding_exception If course is invalid.
     */
    public static function get_completion_info(stdClass $course): \completion_info {
        if (!isset($course->id) || (int)$course->id <= 0) {
            throw new coding_exception('A valid course object with a positive id is required.');
        }
        global $CFG;
        require_once($CFG->libdir . '/completionlib.php');
        return new \completion_info($course);
    }

    /**
     * Check if a user has completed a course compatibly across versions.
     *
     * @param \completion_info $cinfo Completion info instance.
     * @param stdClass|int $user User object or user ID.
     * @return bool
     * @throws coding_exception If user identifier is invalid.
     */
    public static function is_course_complete(\completion_info $cinfo, $user): bool {
        if (is_object($user)) {
            if (!isset($user->id) || !is_numeric($user->id) || (int)$user->id <= 0) {
                throw new coding_exception('Invalid user object: missing or non-positive id property.');
            }
            $userid = (int)$user->id;
        } else {
            if (!is_numeric($user) || (int)$user <= 0) {
                throw new coding_exception('Invalid user id: must be a positive integer.');
            }
            $userid = (int)$user;
        }

        if (method_exists($cinfo, 'is_course_complete')) {
            return (bool)$cinfo->is_course_complete($userid);
        }
        return false;
    }

    /**
     * Synchronize cohort enrolments for a course or all courses safely.
     *
     * @param int $courseid Course ID or 0 for all courses.
     * @return void
     * @throws coding_exception If courseid is negative.
     */
    public static function sync_cohort_enrolments(int $courseid = 0): void {
        if ($courseid < 0) {
            throw new coding_exception('Course ID cannot be negative in sync_cohort_enrolments.');
        }
        global $CFG;
        if (!class_exists('\null_progress_trace')) {
            require_once($CFG->libdir . '/progresslib.php');
        }
        $locallib = $CFG->dirroot . '/enrol/cohort/locallib.php';
        if (file_exists($locallib)) {
            require_once($locallib);
        }
        if (function_exists('enrol_cohort_sync')) {
            $trace = new \null_progress_trace();
            enrol_cohort_sync($trace, $courseid);
        }
    }

    /**
     * Retrieve the manual enrolment instance for a given course.
     *
     * @param int $courseid Course ID.
     * @return stdClass|null
     */
    public static function get_manual_enrol_instance(int $courseid): ?stdClass {
        if ($courseid <= 0) {
            return null;
        }
        global $CFG;
        if (!function_exists('enrol_get_instances')) {
            require_once($CFG->libdir . '/enrollib.php');
        }
        $instances = enrol_get_instances($courseid, true);
        foreach ($instances as $instance) {
            if ($instance->enrol === 'manual') {
                return $instance;
            }
        }
        return null;
    }

    /**
     * Validate user parameter identity for capability operations.
     *
     * @param stdClass|int|null $user User object, user ID or null for current user.
     * @return void
     * @throws coding_exception If user parameter format or id is invalid.
     */
    private static function validate_user_identity($user): void {
        if ($user === null) {
            return;
        }
        if (is_object($user)) {
            if (!isset($user->id) || !is_numeric($user->id) || (int)$user->id <= 0) {
                throw new coding_exception('User object must contain a valid positive integer id property.');
            }
            return;
        }
        if (is_numeric($user) && (int)$user > 0) {
            return;
        }
        throw new coding_exception('User parameter must be null, a positive integer ID, or a user object with a valid id.');
    }

    /**
     * Check capability in a given context compatibly.
     *
     * @param string $capability Capability name.
     * @param context $context Target context.
     * @param stdClass|int|null $user User object, user ID or null for current user.
     * @return bool
     * @throws coding_exception If user parameter format is invalid.
     */
    public static function has_capability(string $capability, context $context, $user = null): bool {
        self::validate_user_identity($user);
        return has_capability($capability, $context, $user);
    }

    /**
     * Require capability in a given context compatibly.
     *
     * @param string $capability Capability name.
     * @param context $context Target context.
     * @param stdClass|int|null $user User object, user ID or null for current user.
     * @return void
     * @throws \required_capability_exception
     * @throws coding_exception If user parameter format is invalid.
     */
    public static function require_capability(string $capability, context $context, $user = null): void {
        self::validate_user_identity($user);
        require_capability($capability, $context, $user);
    }

    /**
     * Resolve ReflectionFunctionAbstract for any valid PHP callable.
     *
     * @param callable $callback Any callable (Closure, [object, method], [class, method], string, invokable).
     * @return ReflectionFunctionAbstract
     */
    private static function get_callable_reflection(callable $callback): ReflectionFunctionAbstract {
        if ($callback instanceof Closure) {
            return new ReflectionFunction($callback);
        }
        if (is_array($callback)) {
            return new ReflectionMethod($callback[0], $callback[1]);
        }
        if (is_string($callback)) {
            if (strpos($callback, '::') !== false) {
                $parts = explode('::', $callback, 2);
                return new ReflectionMethod($parts[0], $parts[1]);
            }
            return new ReflectionFunction($callback);
        }
        if (is_object($callback) && method_exists($callback, '__invoke')) {
            return new ReflectionMethod($callback, '__invoke');
        }
        return new ReflectionFunction($callback);
    }

    /**
     * Execute a callable safely within a Moodle delegated transaction.
     *
     * Guarantees strict commit upon success, safe rollback without orphan
     * transaction leaks upon Throwable, and chains the root cause Throwable.
     *
     * @param callable $callback Callable accepting optional \moodle_transaction parameter.
     * @return mixed Result of callback.
     * @throws Throwable Re-throws any caught exception or error.
     */
    public static function execute_transaction(callable $callback) {
        global $DB;
        $transaction = $DB->start_delegated_transaction();
        try {
            try {
                $ref = self::get_callable_reflection($callback);
                $result = ($ref->getNumberOfParameters() > 0) ? $callback($transaction) : $callback();
            } catch (\ReflectionException $rex) {
                $result = $callback($transaction);
            }
            $transaction->allow_commit();
            return $result;
        } catch (Throwable $e) {
            try {
                $transaction->rollback($e);
            } catch (Throwable $rollbackex) {
                if ($rollbackex !== $e) {
                    $debuginfo = 'Transaction rollback failed: ' . $rollbackex->getMessage() .
                        ' | Root cause: ' . $e->getMessage() . "\n" . $e->getTraceAsString();
                    throw new moodle_exception(
                        'error',
                        'moodle',
                        '',
                        null,
                        $debuginfo
                    );
                }
            }
            throw $e;
        }
    }
}
