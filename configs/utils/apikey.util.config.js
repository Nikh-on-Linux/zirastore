import { randomBytes, createHash } from "crypto";

const PREFIX = "ox_agent";

/**
 * Generates an Oxygen API key in the format: ox_agent_<key_id>.<secret>
 *
 * - key_id: 12 hex characters (6 bytes of entropy), used for indexed DB lookup.
 * - secret: 32 bytes of cryptographically secure randomness, encoded as base64url.
 * - secret_hash: SHA-256 hash of the raw secret (hex encoded), stored in the DB.
 *
 * @returns {{ fullKey: string, keyId: string, secretHash: string }}
 *   - fullKey:    The complete API key to return to the user ONCE (never stored raw).
 *   - keyId:      The short identifier stored in the `key_id` column for fast lookup.
 *   - secretHash: The SHA-256 hex digest of the secret, stored in the `secret_hash` column.
 */
export function generateApiKey() {
    // 6 bytes → 12 hex characters
    const keyId = randomBytes(6).toString("hex");

    // 32 bytes → 43 base64url characters (high entropy)
    const secret = randomBytes(32).toString("base64url");

    // Hash the secret for storage — never store the raw secret
    const secretHash = createHash("sha256").update(secret).digest("hex");

    const fullKey = `${PREFIX}_${keyId}.${secret}`;

    return { fullKey, keyId, secretHash };
}

/**
 * Parses an Oxygen API key and extracts its components.
 *
 * @param {string} apiKey - The full API key string (e.g. "ox_agent_a1b2c3d4e5f6.base64urlsecret")
 * @returns {{ keyId: string, secret: string } | null} - Parsed components, or null if invalid format.
 */
export function parseApiKey(apiKey) {
    if (!apiKey || !apiKey.startsWith(`${PREFIX}_`)) return null;

    // Remove the "ox_agent_" prefix
    const body = apiKey.slice(PREFIX.length + 1);

    const dotIndex = body.indexOf(".");
    if (dotIndex === -1) return null;

    const keyId = body.slice(0, dotIndex);
    const secret = body.slice(dotIndex + 1);

    if (!keyId || !secret) return null;

    return { keyId, secret };
}

/**
 * Hashes a raw secret using SHA-256 for comparison against the stored secret_hash.
 *
 * @param {string} secret - The raw secret extracted from the API key.
 * @returns {string} The SHA-256 hex digest.
 */
export function hashSecret(secret) {
    return createHash("sha256").update(secret).digest("hex");
}
