export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * Validate email format
 */
export declare function validateEmail(email: string): ValidationResult;
/**
 * Validate phone number — must be exactly 10 digits
 */
export declare function validatePhone(phone: string): ValidationResult;
/**
 * Validate password strength
 * Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export declare function validatePassword(password: string): ValidationResult;
/**
 * Validate name — min 2 chars, only letters and spaces
 */
export declare function validateName(name: string): ValidationResult;
/**
 * Validate registration payload
 */
export declare function validateRegistration(data: {
    email?: string;
    name?: string;
    password?: string;
    phone?: string;
    role?: string;
}): ValidationResult;
/**
 * Validate login payload
 */
export declare function validateLogin(data: {
    email?: string;
    password?: string;
}): ValidationResult;
//# sourceMappingURL=validation.d.ts.map