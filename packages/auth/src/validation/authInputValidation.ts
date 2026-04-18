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

export const signUpPasswordSchema = signInPasswordSchema.min(
  8,
  'Password must be at least 8 characters.'
);

export function parseEmailAddress(email: string): string {
  return emailAddressSchema.parse(email);
}

export function parseSignInPassword(password: string): string {
  return signInPasswordSchema.parse(password);
}

export function parseSignUpPassword(password: string): string {
  return signUpPasswordSchema.parse(password);
}

export function getValidationErrorMessage(
  error: unknown,
  fallbackMessage: string = 'Invalid input.'
): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallbackMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}
