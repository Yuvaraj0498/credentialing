// Zero-knowledge vault crypto, ported from the prototype WebCrypto helpers (L12690–12724).
// PBKDF2-SHA-256 (250,000 iterations, 16-byte salt) → non-extractable AES-256-GCM key; 12-byte IV;
// output = base64(salt[16] || iv[12] || ciphertext+tag). The passphrase never leaves the browser.

const ITERATIONS = 250000;
const SALT_LEN = 16;
const IV_LEN = 12;

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function toBase64(bytes: Uint8Array): string {
  // Chunked to avoid call-stack limits on large vaults (the prototype spread the whole array).
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptString(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(SALT_LEN)));
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(IV_LEN)));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  const combined = new Uint8Array(SALT_LEN + IV_LEN + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LEN);
  combined.set(new Uint8Array(ciphertext), SALT_LEN + IV_LEN);
  return toBase64(combined);
}

/** Throws when the passphrase is wrong (GCM authentication failure) or the blob is malformed. */
export async function decryptString(packagedBase64: string, passphrase: string): Promise<string> {
  const combined = fromBase64(packagedBase64);
  const salt = combined.slice(0, SALT_LEN);
  const iv = combined.slice(SALT_LEN, SALT_LEN + IV_LEN);
  const ciphertext = combined.slice(SALT_LEN + IV_LEN);
  const key = await deriveKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

// ---------- Vault content ----------

export interface VaultCredential {
  username: string;
  password: string;
  notes: string;
  updated: string; // ISO timestamp
}

/** {providerId: {payerId: credential}} — ids are the API's numeric ids, stored as JSON object keys. */
export type VaultData = Record<string, Record<string, VaultCredential>>;

/**
 * In-memory session cache for "Stay unlocked for this browser session".
 * Lives only in this JS module (cleared on reload / tab close) — never written to sessionStorage or localStorage.
 */
let sessionPassphrase: { orgKey: string; passphrase: string } | null = null;

export const vaultSession = {
  get(orgKey: string): string | null {
    return sessionPassphrase && sessionPassphrase.orgKey === orgKey ? sessionPassphrase.passphrase : null;
  },
  set(orgKey: string, passphrase: string) {
    sessionPassphrase = { orgKey, passphrase };
  },
  clear() {
    sessionPassphrase = null;
  },
};
