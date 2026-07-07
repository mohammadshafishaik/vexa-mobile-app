// Server-side validation utilities for VEXA
/**
 * Validate email format
 */
export function validateEmail(email) {
    const errors = [];
    if (!email || typeof email !== 'string') {
        errors.push('Email is required');
    }
    else {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email.trim())) {
            errors.push('Please enter a valid email address');
        }
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Validate phone number — must be exactly 10 digits
 */
export function validatePhone(phone) {
    const errors = [];
    if (!phone || typeof phone !== 'string') {
        errors.push('Phone number is required');
    }
    else {
        const digitsOnly = phone.replace(/\D/g, '');
        if (digitsOnly.length !== 10) {
            errors.push('Phone number must be exactly 10 digits');
        }
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Validate password strength
 * Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export function validatePassword(password) {
    const errors = [];
    if (!password || typeof password !== 'string') {
        errors.push('Password is required');
        return { valid: false, errors };
    }
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least 1 uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least 1 lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least 1 number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least 1 special character');
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Validate name — min 2 chars, only letters and spaces
 */
export function validateName(name) {
    const errors = [];
    if (!name || typeof name !== 'string') {
        errors.push('Name is required');
    }
    else {
        const trimmed = name.trim();
        if (trimmed.length < 2) {
            errors.push('Name must be at least 2 characters');
        }
        if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
            errors.push('Name can only contain letters and spaces');
        }
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Validate registration payload
 */
export function validateRegistration(data) {
    const errors = [];
    const emailResult = validateEmail(data.email || '');
    errors.push(...emailResult.errors);
    const nameResult = validateName(data.name || '');
    errors.push(...nameResult.errors);
    const passwordResult = validatePassword(data.password || '');
    errors.push(...passwordResult.errors);
    if (data.phone) {
        const phoneResult = validatePhone(data.phone);
        errors.push(...phoneResult.errors);
    }
    if (!data.role || !['CUSTOMER', 'PROVIDER'].includes(data.role)) {
        errors.push('Role must be either CUSTOMER or PROVIDER');
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Validate login payload
 */
export function validateLogin(data) {
    const errors = [];
    const emailResult = validateEmail(data.email || '');
    errors.push(...emailResult.errors);
    if (!data.password || data.password.trim().length === 0) {
        errors.push('Password is required');
    }
    return { valid: errors.length === 0, errors };
}
//# sourceMappingURL=validation.js.map