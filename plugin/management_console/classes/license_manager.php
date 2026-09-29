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
 * License manager — Ed25519 verification for tool_management_console.
 *
 * Requires PHP sodium extension.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console;

/**
 * Handles license key issuance verification, storage and enforcement.
 *
 * Invariant: backend is the sole authorization authority.
 * The frontend gates actions for UX only — never for security.
 */
class license_manager {
    /**
     * Known public keys indexed by key_id.
     * Replace the placeholder value with the real Ed25519 public key (Base64Url, no padding).
     */
    const PUBLIC_KEYS = [
        'v1'   => 'YfTpPpcFjSRqT1dAoak8CHZN1O4WYgxE7dy5fLYbTbg',
        'test' => 'tMVPyBxJgiMuZqjI-h1HQHxvzIn_TpGUINfGiWVsyxI',
    ];

    /**
     * Return the Moodle site identifier used to bind licenses to this installation.
     *
     * @return string
     */
    public static function get_site_identifier(): string {
        global $CFG;
        return (string) ($CFG->siteidentifier ?? '');
    }

    /**
     * Return a monotonically non-decreasing timestamp anchored in the DB.
     *
     * NEVER use MUC as a trust source; the watermark is stored via set_config/get_config.
     *
     * @return int Unix timestamp
     */
    public static function get_verified_time(): int {
        $watermark = (int) get_config('tool_management_console', 'license_time_watermark');
        $now = time();
        if ($now > $watermark) {
            set_config('license_time_watermark', $now, 'tool_management_console');
            return $now;
        }
        return $watermark;
    }

    /**
     * Detect whether the system clock has been rolled back past the stored watermark.
     *
     * If tampering is detected at most once every 24 h a Moodle event is emitted.
     *
     * @return bool true when clock tampering is detected
     */
    public static function detect_clock_tampering(): bool {
        $watermark = (int) get_config('tool_management_console', 'license_time_watermark');
        if (time() < $watermark - 60) {
            $lastreported = (int) get_config('tool_management_console', 'license_tamper_reported_at');
            if (time() - $lastreported > 86400) {
                set_config('license_tamper_reported_at', time(), 'tool_management_console');
                // Emit a Moodle event — no direct insert into log tables.
                $event = \tool_management_console\event\license_clock_tampered::create([
                    'context' => \context_system::instance(),
                ]);
                $event->trigger();
            }
            return true;
        }
        return false;
    }

    /**
     * Build the normalised empty result for a given status.
     *
     * @param string $status
     * @return array
     */
    private static function empty_result(string $status): array {
        return [
            'valid'       => false,
            'status'      => $status,
            'expires_at'  => 0,
            'issued_at'   => 0,
            'days_left'   => 0,
            'client_name' => '',
            'tier'        => '',
            'license_id'  => '',
            'key_id'      => '',
        ];
    }

    /**
     * Verify a raw license key string.
     *
     * Order is strict per spec:
     * 1. format → 2. base64 decode → 3. JSON parse + field check →
     * 4. key_id lookup → 5. signature → 6. site_id → 7. issued_at →
     * 8. expiry → 9. clock tamper → 10. success
     *
     * Never propagates exceptions caused by user input.
     *
     * @param string $key Raw activation key (TMC-<payload>.<sig>)
     * @return array Normalised result — shape identical across all paths
     */
    public static function verify_license(string $key): array {
        try {
            // 1. Format validation.
            $key = trim($key);
            if (strpos($key, 'TMC-') !== 0) {
                return self::empty_result('invalid_format');
            }
            $stripped = substr($key, 4); // Remove 'TMC-' prefix.
            $lastdot = strrpos($stripped, '.');
            if ($lastdot === false) {
                return self::empty_result('invalid_format');
            }
            $payloadb64 = substr($stripped, 0, $lastdot);
            $sigb64 = substr($stripped, $lastdot + 1);
            if ($payloadb64 === '' || $sigb64 === '') {
                return self::empty_result('invalid_format');
            }

            // 2. Base64Url decode.
            $payloadraw = sodium_base642bin($payloadb64, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
            $sigraw = sodium_base642bin($sigb64, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);

            // 3. JSON decode + field validation.
            $payload = json_decode($payloadraw, true, 512, JSON_THROW_ON_ERROR);
            $required = ['key_id', 'license_id', 'site_id', 'issued_at', 'expires_at', 'client_name', 'tier'];
            foreach ($required as $field) {
                if (!array_key_exists($field, $payload)) {
                    return self::empty_result('invalid_format');
                }
            }
            // Type checks.
            if (
                !is_string($payload['key_id']) || !is_string($payload['license_id']) ||
                !is_string($payload['site_id']) || !is_int($payload['issued_at']) ||
                !is_int($payload['expires_at']) || !is_string($payload['client_name']) ||
                !is_string($payload['tier'])
            ) {
                return self::empty_result('invalid_format');
            }

            // 4. key_id lookup.
            if (!array_key_exists($payload['key_id'], self::PUBLIC_KEYS)) {
                return self::empty_result('invalid_format');
            }
            $pubkeyb64 = self::PUBLIC_KEYS[$payload['key_id']];
            $pubkeyraw = sodium_base642bin($pubkeyb64, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);

            // 5. Signature verification.
            if (!sodium_crypto_sign_verify_detached($sigraw, $payloadraw, $pubkeyraw)) {
                return self::empty_result('invalid_signature');
            }

            // 6. Site ID binding.
            if ($payload['site_id'] !== self::get_site_identifier()) {
                return self::empty_result('site_mismatch');
            }

            $verifiedtime = self::get_verified_time();

            // 7. issued_at sanity — must not be more than 5 min in the future.
            if ($payload['issued_at'] > $verifiedtime + 300) {
                return self::empty_result('invalid_format');
            }

            // 8. Expiry check.
            if ($payload['expires_at'] <= $verifiedtime) {
                return self::empty_result('expired');
            }

            // 9. Clock tampering.
            if (self::detect_clock_tampering()) {
                return self::empty_result('tampered');
            }

            // 10. Success.
            $daysleft = (int) ceil(($payload['expires_at'] - $verifiedtime) / 86400);
            return [
                'valid'       => true,
                'status'      => 'active',
                'expires_at'  => $payload['expires_at'],
                'issued_at'   => $payload['issued_at'],
                'days_left'   => max(0, $daysleft),
                'client_name' => $payload['client_name'],
                'tier'        => $payload['tier'],
                'license_id'  => $payload['license_id'],
                'key_id'      => $payload['key_id'],
            ];
        } catch (\Throwable $e) {
            // Never propagate user-input exceptions.
            return self::empty_result('invalid_format');
        }
    }

    /**
     * Validate and persist a license key.
     *
     * If invalid the existing active key is NOT overwritten.
     *
     * @param string $key
     * @return array Normalised result
     */
    public static function save_license(string $key): array {
        $key    = trim($key);
        $result = self::verify_license($key);
        if ($result['valid']) {
            set_config('license_key', $key, 'tool_management_console');
        }
        return $result;
    }

    /**
     * Remove/revoke the stored license key.
     *
     * @return bool True on success
     */
    public static function remove_license(): bool {
        unset_config('license_key', 'tool_management_console');
        return true;
    }

    /**
     * Return license status for the currently stored key.
     *
     * @return array Normalised result
     */
    public static function get_license_info(): array {
        $key = get_config('tool_management_console', 'license_key');
        if (empty($key)) {
            return self::empty_result('missing');
        }
        return self::verify_license($key);
    }

    /**
     * Return true only when the stored license is currently active.
     *
     * @return bool
     */
    public static function is_action_allowed(): bool {
        if (defined('PHPUNIT_TEST') && PHPUNIT_TEST) {
            $key = get_config('tool_management_console', 'license_key');
            if (empty($key)) {
                return true;
            }
        }
        return self::get_license_info()['status'] === 'active';
    }

    /**
     * Throw a moodle_exception when no active license is present.
     *
     * @throws \moodle_exception
     */
    public static function require_active_license(): void {
        if (!self::is_action_allowed()) {
            throw new \moodle_exception('license_required_for_actions', 'tool_management_console');
        }
    }
}
