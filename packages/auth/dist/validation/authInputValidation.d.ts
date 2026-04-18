import { z } from 'zod';
export declare const emailAddressSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const signInPasswordSchema: z.ZodString;
export declare const signUpPasswordSchema: z.ZodString;
export declare function parseEmailAddress(email: string): string;
export declare function parseSignInPassword(password: string): string;
export declare function parseSignUpPassword(password: string): string;
export declare function getValidationErrorMessage(error: unknown, fallbackMessage?: string): string;
