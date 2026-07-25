import crypto from "crypto";

const SALT = "detective-noir-secret-salt-string-2026";

/**
 * Hashes a password securely using SHA-512 PBKDF2.
 * This runs on the server side in API routes.
 */
export function hashPassword(password: string): string {
  return crypto
    .pbkdf2Sync(password, SALT, 10000, 64, "sha512")
    .toString("hex");
}

/**
 * Validates whether an Account ID fits the rules:
 * - 4-10 alphanumeric characters.
 */
export function validateAccountId(accountId: string): boolean {
  const accountIdRegex = /^[a-zA-Z0-9]{4,10}$/;
  return accountIdRegex.test(accountId);
}

/**
 * Validates whether a Password fits the rules:
 * - 4-10 characters.
 * - Alphanumeric or symbols: ! - = + ? * $
 */
export function validatePassword(password: string): boolean {
  const passwordRegex = /^[a-zA-Z0-9!\-=+?*$]{4,10}$/;
  return passwordRegex.test(password);
}

/**
 * Validates whether a Nickname fits the rules:
 * - 1-10 characters.
 */
export function validateNickname(nickname: string): boolean {
  return nickname.length >= 1 && nickname.length <= 10;
}
