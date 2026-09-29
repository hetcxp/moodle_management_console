<?php
/**
 * CLI tool for generating Ed25519 license keys for tool_management_console.
 *
 * Store the private key OUTSIDE the repository. Never expose it in CI logs.
 *
 * Usage:
 *   # Generate a new key pair:
 *   php cli/generate_license.php --generate-keypair
 *
 *   # Issue a license by days:
 *   php cli/generate_license.php --private-key=<b64> --key-id=v1 \
 *       --site=<site_identifier> --days=365 --client="Acme Corp"
 *
 *   # Issue a license by exact expiry date:
 *   php cli/generate_license.php --private-key=<b64> --key-id=v1 \
 *       --site=<site_identifier> --expires=2027-12-31 --client="Acme Corp"
 *
 * This script does NOT bootstrap Moodle — it requires only the sodium extension.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// ---- Sodium check ----------------------------------------------------------
if (!extension_loaded('sodium')) {
    fwrite(STDERR, "Error: PHP sodium extension is not loaded.\n");
    exit(1);
}

// ---- Parse flags -----------------------------------------------------------
$opts = getopt('', [
    'generate-keypair',
    'private-key:',
    'key-id:',
    'site:',
    'days:',
    'expires:',
    'client:',
    'tier:',
]);

// ---- Mode: generate key pair -----------------------------------------------
if (isset($opts['generate-keypair'])) {
    $keyPair  = sodium_crypto_sign_keypair();
    $privKey  = sodium_crypto_sign_secretkey($keyPair);
    $pubKey   = sodium_crypto_sign_publickey($keyPair);
    $privB64  = sodium_bin2base64($privKey, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    $pubB64   = sodium_bin2base64($pubKey,  SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);

    echo "Private key (keep secret, store outside repo): {$privB64}\n";
    echo "Public key  (embed in license_manager.php):    {$pubB64}\n";
    exit(0);
}

// ---- Mode: issue a license -------------------------------------------------

// Validate: --private-key is mandatory.
if (empty($opts['private-key'])) {
    fwrite(STDERR, "Error: --private-key is required when issuing a license.\n");
    exit(1);
}

// Validate: private key must be 64 bytes raw (encoded as 86 Base64Url chars without padding).
$privKeyB64 = $opts['private-key'];
$privKeyRaw = sodium_base642bin($privKeyB64, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
if (strlen($privKeyRaw) !== SODIUM_CRYPTO_SIGN_SECRETKEYBYTES) {
    fwrite(STDERR, "Error: Invalid private key — expected " . SODIUM_CRYPTO_SIGN_SECRETKEYBYTES . " bytes.\n");
    exit(1);
}

// Validate: --days and --expires are mutually exclusive.
if (isset($opts['days']) && isset($opts['expires'])) {
    fwrite(STDERR, "Error: --days and --expires are mutually exclusive.\n");
    exit(1);
}

// Calculate expiry timestamp.
$now = time();
if (isset($opts['days'])) {
    $days = (int) $opts['days'];
    if ($days <= 0) {
        fwrite(STDERR, "Error: --days must be a positive integer.\n");
        exit(1);
    }
    $expiresAt = $now + ($days * 86400);
} elseif (isset($opts['expires'])) {
    $expiresAt = strtotime($opts['expires'] . ' 23:59:59 UTC');
    if ($expiresAt === false || $expiresAt <= $now) {
        fwrite(STDERR, "Error: --expires must be a future date in YYYY-MM-DD format.\n");
        exit(1);
    }
} else {
    fwrite(STDERR, "Error: Either --days or --expires must be provided.\n");
    exit(1);
}

// Validate required emit fields.
$site   = trim($opts['site']   ?? '');
$client = trim($opts['client'] ?? '');
if ($site === '') {
    fwrite(STDERR, "Error: --site is required.\n");
    exit(1);
}
if ($client === '') {
    fwrite(STDERR, "Error: --client is required.\n");
    exit(1);
}

$keyId = trim($opts['key-id'] ?? 'v1');
$tier  = trim($opts['tier']   ?? 'full_actions');

// Build UUID v4.
$uuid = sprintf(
    '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
    mt_rand(0, 0xffff),
    mt_rand(0, 0x0fff) | 0x4000,
    mt_rand(0, 0x3fff) | 0x8000,
    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
);

// Assemble payload (ksort ensures deterministic field order).
$payload = [
    'client_name' => $client,
    'expires_at'  => $expiresAt,
    'issued_at'   => $now,
    'key_id'      => $keyId,
    'license_id'  => $uuid,
    'schema'      => 1,
    'site_id'     => $site,
    'tier'        => $tier,
];
ksort($payload);
$payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

// Sign.
$sig = sodium_crypto_sign_detached($payloadJson, $privKeyRaw);

// Encode both parts.
$payloadB64 = sodium_bin2base64($payloadJson, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
$sigB64     = sodium_bin2base64($sig,          SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);

$token = "TMC-{$payloadB64}.{$sigB64}";

echo $token . "\n";
exit(0);
