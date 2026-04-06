// Frontend validation utilities for VEXA
// Mirrors backend validation but designed for real-time inline validation

export interface PasswordStrength {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  score: number; // 0-5
  errors: string[];
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) {
    return 'Email is required';
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  return null;
}

/**
 * Validate phone number — must be exactly 10 digits
 */
export function validatePhone(phone: string): string | null {
  if (!phone || !phone.trim()) {
    return 'Phone number is required';
  }
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length !== 10) {
    return 'Phone number must be exactly 10 digits';
  }
  return null;
}

/**
 * Validate phone number (optional — only validates if provided)
 */
export function validatePhoneOptional(phone: string): string | null {
  if (!phone || !phone.trim()) {
    return null; // Optional field
  }
  return validatePhone(phone);
}

/**
 * Validate password strength with detailed feedback
 */
export function validatePassword(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const errors: string[] = [];

  if (!checks.minLength) errors.push('At least 8 characters');
  if (!checks.hasUppercase) errors.push('One uppercase letter');
  if (!checks.hasLowercase) errors.push('One lowercase letter');
  if (!checks.hasNumber) errors.push('One number');
  if (!checks.hasSpecial) errors.push('One special character (!@#$%...)');

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';

  return {
    isValid: score === 5,
    strength,
    score,
    errors,
    checks,
  };
}

/**
 * Validate plain password (returns string error or null)
 */
export function validatePasswordSimple(password: string): string | null {
  if (!password || !password.trim()) {
    return 'Password is required';
  }
  const result = validatePassword(password);
  if (!result.isValid) {
    return `Password needs: ${result.errors.join(', ')}`;
  }
  return null;
}

/**
 * Validate name — min 2 chars
 */
export function validateName(name: string): string | null {
  if (!name || !name.trim()) {
    return 'Name is required';
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }
  return null;
}

/**
 * Check if passwords match
 */
export function passwordsMatch(password: string, confirm: string): string | null {
  if (!confirm) {
    return 'Please confirm your password';
  }
  if (password !== confirm) {
    return 'Passwords do not match';
  }
  return null;
}

/**
 * Format phone number for display: XXXXX XXXXX
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/**
 * Get only digits from phone input
 */
export function getPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').slice(0, 10);
}
