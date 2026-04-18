import { ZodError, z } from 'zod';
export const emailAddressSchema = z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .max(320, 'Email is too long.')
    .email('Enter a valid email address.')
    .transform((value) => value.toLowerCase());
export const signInPasswordSchema = z
    .string()
    .min(1, 'Password is required.')
    .max(128, 'Password is too long.');
export const signUpPasswordSchema = signInPasswordSchema.min(8, 'Password must be at least 8 characters.');
export function parseEmailAddress(email) {
    return emailAddressSchema.parse(email);
}
export function parseSignInPassword(password) {
    return signInPasswordSchema.parse(password);
}
export function parseSignUpPassword(password) {
    return signUpPasswordSchema.parse(password);
}
export function getValidationErrorMessage(error, fallbackMessage = 'Invalid input.') {
    var _a, _b;
    if (error instanceof ZodError) {
        return (_b = (_a = error.issues[0]) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : fallbackMessage;
    }
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallbackMessage;
}
