import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS)
}

/**
 * Compare a plain text password against a hashed password
 * Supports both plain-text (legacy/demo) and bcrypt-hashed passwords
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  // If stored password looks like a bcrypt hash ($2a$, $2b$, $2y$)
  if (hashedPassword.startsWith('$2')) {
    return bcrypt.compare(plainPassword, hashedPassword)
  }
  // Legacy: plain-text comparison (for demo/migration compatibility)
  return plainPassword === hashedPassword
}
