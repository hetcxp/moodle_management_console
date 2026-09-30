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
 * Unit tests for license_manager and external license endpoints.
 *
 * @package    tool_management_console
 * @category   test
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tool_management_console;

/**
 * Test case for license_manager cryptographic verification and external API.
 *
 * @package    tool_management_console
 * @covers     \tool_management_console\license_manager
 * @covers     \tool_management_console\external\license
 */
class license_manager_test extends \advanced_testcase {
    protected function setUp(): void {
        parent::setUp();
        license_manager::set_test_public_key('test', 'tMVPyBxJgiMuZqjI-h1HQHxvzIn_TpGUINfGiWVsyxI');
    }

    protected function tearDown(): void {
        license_manager::reset_test_public_keys();
        parent::tearDown();
    }

    /**
     * Return deterministic secret key for Ed25519 signing in tests.
     * Matches the test public key injected during PHPUnit runs.
     *
     * @return string
     */
    private function get_test_secret_key(): string {
        $seed = hash('sha256', 'tool_management_console_test_seed', true);
        $kp = sodium_crypto_sign_seed_keypair($seed);
        return sodium_crypto_sign_secretkey($kp);
    }

    /**
     * Helper to forge and sign a valid or customized license token.
     *
     * @param array $overrides Custom payload fields.
     * @param string|null $customsec Optional signing key.
     * @return string Raw activation key (TMC-<payload>.<sig>).
     */
    private function create_test_license_key(array $overrides = [], ?string $customsec = null): string {
        $siteid = license_manager::get_site_identifier();
        $now = time();
        $payload = array_merge([
            'key_id'      => 'test',
            'license_id'  => 'LIC-TEST-001',
            'site_id'     => $siteid,
            'issued_at'   => $now,
            'expires_at'  => $now + 86400 * 30,
            'client_name' => 'Acme Corp',
            'tier'        => 'enterprise',
        ], $overrides);

        $payloadraw = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $seckey = $customsec ?? $this->get_test_secret_key();
        $sigraw = sodium_crypto_sign_detached($payloadraw, $seckey);

        $payloadb64 = sodium_bin2base64($payloadraw, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        $sigb64 = sodium_bin2base64($sigraw, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);

        return 'TMC-' . $payloadb64 . '.' . $sigb64;
    }

    /**
     * Test verifying a valid Ed25519 license key.
     */
    public function test_verify_license_valid(): void {
        $this->resetAfterTest(true);

        $key = $this->create_test_license_key();
        $res = license_manager::verify_license($key);

        $this->assertTrue($res['valid']);
        $this->assertEquals('active', $res['status']);
        $this->assertEquals('Acme Corp', $res['client_name']);
        $this->assertEquals('enterprise', $res['tier']);
        $this->assertEquals('LIC-TEST-001', $res['license_id']);
        $this->assertEquals('test', $res['key_id']);
        $this->assertGreaterThan(0, $res['days_left']);
    }

    /**
     * Test that official production public key v1 is present and is a valid 32-byte Ed25519 key.
     * Ensures production key integrity without requiring vendor secret keys in source.
     */
    public function test_production_v1_public_key_structure(): void {
        $keys = license_manager::PUBLIC_KEYS;
        $this->assertArrayHasKey('v1', $keys);
        $this->assertNotEmpty($keys['v1']);
        $pubkey = sodium_base642bin($keys['v1'], SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        $this->assertEquals(SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES, strlen($pubkey), 'v1 must be a valid 32-byte Ed25519 public key');
    }

    /**
     * Test verifying invalid format strings.
     */
    public function test_verify_license_invalid_format(): void {
        $this->resetAfterTest(true);

        // Missing TMC- prefix.
        $res1 = license_manager::verify_license('NOTMC-xyz.abc');
        $this->assertFalse($res1['valid']);
        $this->assertEquals('invalid_format', $res1['status']);

        // Missing signature delimiter.
        $res2 = license_manager::verify_license('TMC-nodothere');
        $this->assertFalse($res2['valid']);
        $this->assertEquals('invalid_format', $res2['status']);

        // Empty payload or signature.
        $res3 = license_manager::verify_license('TMC-.');
        $this->assertFalse($res3['valid']);
        $this->assertEquals('invalid_format', $res3['status']);

        // Unknown key_id.
        $res4 = license_manager::verify_license($this->create_test_license_key(['key_id' => 'v999']));
        $this->assertFalse($res4['valid']);
        $this->assertEquals('invalid_format', $res4['status']);

        // Missing required field in payload.
        $now = time();
        $incomplete = [
            'key_id'     => 'test',
            'license_id' => 'LIC-BAD',
            'site_id'    => license_manager::get_site_identifier(),
            'issued_at'  => $now,
            'expires_at' => $now + 3600,
            // Client_name and tier missing.
        ];
        $incompleteraw = json_encode($incomplete);
        $sig = sodium_crypto_sign_detached($incompleteraw, $this->get_test_secret_key());
        $badkey = 'TMC-' . sodium_bin2base64($incompleteraw, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING) . '.' .
            sodium_bin2base64($sig, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        $res5 = license_manager::verify_license($badkey);
        $this->assertFalse($res5['valid']);
        $this->assertEquals('invalid_format', $res5['status']);
    }

    /**
     * Test verifying invalid Ed25519 signature.
     */
    public function test_verify_license_invalid_signature(): void {
        $this->resetAfterTest(true);

        // Sign with an arbitrary alien secret key.
        $otherkp = sodium_crypto_sign_keypair();
        $othersec = sodium_crypto_sign_secretkey($otherkp);

        $badsigkey = $this->create_test_license_key([], $othersec);
        $res = license_manager::verify_license($badsigkey);

        $this->assertFalse($res['valid']);
        $this->assertEquals('invalid_signature', $res['status']);
    }

    /**
     * Test verifying site identifier mismatch.
     */
    public function test_verify_license_site_mismatch(): void {
        $this->resetAfterTest(true);

        $foreignkey = $this->create_test_license_key(['site_id' => 'completely_different_site_id']);
        $res = license_manager::verify_license($foreignkey);

        $this->assertFalse($res['valid']);
        $this->assertEquals('site_mismatch', $res['status']);
    }

    /**
     * Test verifying an expired license.
     */
    public function test_verify_license_expired(): void {
        $this->resetAfterTest(true);

        $past = time() - 86400 * 30;
        $expiredkey = $this->create_test_license_key([
            'issued_at'  => $past - 86400 * 365,
            'expires_at' => $past,
        ]);
        $res = license_manager::verify_license($expiredkey);

        $this->assertFalse($res['valid']);
        $this->assertEquals('expired', $res['status']);
        $this->assertEquals(0, $res['days_left']);
    }

    /**
     * Test detecting system clock rollback past stored watermark.
     */
    public function test_clock_tampering_detection(): void {
        $this->resetAfterTest(true);

        // Advance the stored watermark by 2 hours into the future.
        $futurewatermark = time() + 7200;
        set_config('license_time_watermark', $futurewatermark, 'tool_management_console');

        $sink = $this->redirectEvents();

        $key = $this->create_test_license_key();
        $res = license_manager::verify_license($key);

        $this->assertFalse($res['valid']);
        $this->assertEquals('tampered', $res['status']);

        // Verify that the clock tampered event was emitted.
        $events = $sink->get_events();
        $this->assertNotEmpty($events);
        $this->assertInstanceOf(\tool_management_console\event\license_clock_tampered::class, $events[0]);
        $sink->close();
    }

    /**
     * Test save_license and require_active_license enforcement.
     */
    public function test_save_and_require_active_license(): void {
        $this->resetAfterTest(true);

        // 1. Initially with empty license_key in test mode, is_action_allowed is true.
        $this->assertTrue(license_manager::is_action_allowed());

        // 2. Save valid license persists into DB.
        $validkey = $this->create_test_license_key();
        $res = license_manager::save_license($validkey);
        $this->assertTrue($res['valid']);
        $this->assertEquals($validkey, get_config('tool_management_console', 'license_key'));

        // Action allowed with active license.
        $this->assertTrue(license_manager::is_action_allowed());
        // Require_active_license does not throw.
        license_manager::require_active_license();

        // 3. Attempt to save invalid license does NOT overwrite the active license.
        $badres = license_manager::save_license('TMC-invalid.key');
        $this->assertFalse($badres['valid']);
        $this->assertEquals($validkey, get_config('tool_management_console', 'license_key'));

        // 4. When an invalid license is forcibly present in DB, require_active_license throws.
        set_config('license_key', 'TMC-invalid.key', 'tool_management_console');
        $this->assertFalse(license_manager::is_action_allowed());

        $this->expectException(\moodle_exception::class);
        license_manager::require_active_license();
    }

    /**
     * Test external webservice endpoints for license save and get_info.
     */
    public function test_external_license_endpoints(): void {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $key = $this->create_test_license_key();

        // Save license through external webservice.
        $saveres = \tool_management_console\external\license::save_license($key);
        $this->assertIsArray($saveres);
        $this->assertTrue($saveres['valid']);
        $this->assertEquals('active', $saveres['status']);
        $this->assertEquals('Acme Corp', $saveres['client_name']);
        $this->assertEquals('enterprise', $saveres['tier']);

        // Get license info through external webservice.
        $infores = \tool_management_console\external\license::get_license_info();
        $this->assertIsArray($infores);
        $this->assertTrue($infores['valid']);
        $this->assertEquals('active', $infores['status']);
        $this->assertEquals('LIC-TEST-001', $infores['license_id']);
        $this->assertEquals('test', $infores['key_id']);
        $this->assertGreaterThan(0, $infores['days_left']);
    }

    /**
     * Test license removal through license_manager and external endpoint.
     */
    public function test_remove_license(): void {
        $this->resetAfterTest(true);
        $this->setAdminUser();

        $key = $this->create_test_license_key();

        // 1. Save valid license and ensure active.
        $res = license_manager::save_license($key);
        $this->assertTrue($res['valid']);
        $this->assertEquals('active', license_manager::get_license_info()['status']);

        // 2. Remove via license_manager.
        $this->assertTrue(license_manager::remove_license());
        $this->assertEquals('missing', license_manager::get_license_info()['status']);
        $this->assertFalse(get_config('tool_management_console', 'license_key'));

        // 3. Save again and remove via external webservice endpoint.
        license_manager::save_license($key);
        $this->assertEquals('active', license_manager::get_license_info()['status']);

        $removeres = \tool_management_console\external\license::remove_license();
        $this->assertIsArray($removeres);
        $this->assertTrue($removeres['success']);
        $this->assertEquals('missing', license_manager::get_license_info()['status']);
    }

    /**
     * Test that 'test' key_id is strictly rejected when not injected (production default).
     */
    public function test_verify_license_rejects_test_key_without_injection(): void {
        $this->resetAfterTest(true);
        license_manager::reset_test_public_keys();

        $key = $this->create_test_license_key();
        $res = license_manager::verify_license($key);

        $this->assertFalse($res['valid']);
        $this->assertEquals('invalid_format', $res['status']);
    }

    /**
     * Test that get_public_keys returns only production keys by default.
     */
    public function test_get_public_keys_production_defaults(): void {
        license_manager::reset_test_public_keys();
        $keys = license_manager::get_public_keys();
        $this->assertArrayHasKey('v1', $keys);
        $this->assertArrayNotHasKey('test', $keys);
    }
}
