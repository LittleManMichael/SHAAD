import bcrypt from 'bcryptjs';
import { pool } from '@/config/database';

// Account lockout configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export interface LoginAttemptResult {
  success: boolean;
  user?: any;
  locked?: boolean;
  remainingAttempts?: number;
  lockedUntil?: Date;
}

/**
 * Check if account is locked
 */
export const isAccountLocked = (lockedUntil: Date | null): boolean => {
  if (!lockedUntil) return false;
  return new Date() < new Date(lockedUntil);
};

/**
 * Record failed login attempt
 */
export const recordFailedLogin = async (username: string): Promise<void> => {
  await pool.query(
    `UPDATE users 
     SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE 
           WHEN failed_login_attempts + 1 >= $1 
           THEN CURRENT_TIMESTAMP + INTERVAL '30 minutes'
           ELSE locked_until
         END
     WHERE username = $2`,
    [MAX_LOGIN_ATTEMPTS, username]
  );
};

/**
 * Reset failed login attempts
 */
export const resetFailedLogins = async (userId: string): Promise<void> => {
  await pool.query(
    `UPDATE users 
     SET failed_login_attempts = 0, 
         locked_until = NULL 
     WHERE id = $1`,
    [userId]
  );
};

/**
 * Verify login with account lockout protection
 */
export const verifyLogin = async (username: string, password: string): Promise<LoginAttemptResult> => {
  try {
    // Get user with lockout info
    const result = await pool.query(
      `SELECT id, username, email, password_hash, full_name, role, is_active,
              failed_login_attempts, locked_until
       FROM users 
       WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      // Record failed attempt even if user doesn't exist (prevents username enumeration)
      await recordFailedLogin(username);
      return { success: false };
    }

    const user = result.rows[0];

    // Check if account is locked
    if (isAccountLocked(user.locked_until)) {
      return {
        success: false,
        locked: true,
        lockedUntil: user.locked_until
      };
    }

    // Check if account is active
    if (!user.is_active) {
      return { success: false };
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      await recordFailedLogin(username);
      const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - (user.failed_login_attempts + 1));
      
      return {
        success: false,
        remainingAttempts
      };
    }

    // Reset failed attempts on successful login
    await resetFailedLogins(user.id);

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active
      }
    };
  } catch (error) {
    console.error('Login verification error:', error);
    return { success: false };
  }
};

/**
 * Password strength checker
 */
export const checkPasswordStrength = (password: string): {
  valid: boolean;
  errors: string[];
  score: number;
} => {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Number check
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Special character check
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  } else {
    score += 1;
  }

  // Common password check
  const commonPasswords = ['password', '12345678', 'qwerty', 'letmein', 'admin'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password is too common');
    score = Math.max(0, score - 2);
  }

  return {
    valid: errors.length === 0,
    errors,
    score: Math.min(5, score) // Max score of 5
  };
};