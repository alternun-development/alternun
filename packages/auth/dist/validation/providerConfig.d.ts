import { z } from 'zod';
import type {
  AuthExecutionProviderName,
  EmailProviderName,
  IdentityIssuerProviderName,
} from '../core/types';
export declare const authExecutionProviderSchema: z.ZodEnum<['better-auth', 'supabase']>;
export declare const authIssuerProviderSchema: z.ZodEnum<['authentik', 'supabase-legacy']>;
export declare const authEmailProviderSchema: z.ZodEnum<['supabase', 'postmark', 'ses']>;
export declare const authProviderSelectionSchema: z.ZodObject<
  {
    executionProvider: z.ZodDefault<z.ZodEnum<['better-auth', 'supabase']>>;
    issuerProvider: z.ZodDefault<z.ZodEnum<['authentik', 'supabase-legacy']>>;
    emailProvider: z.ZodDefault<z.ZodEnum<['supabase', 'postmark', 'ses']>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    executionProvider: 'better-auth' | 'supabase';
    issuerProvider: 'authentik' | 'supabase-legacy';
    emailProvider: 'supabase' | 'postmark' | 'ses';
  },
  {
    executionProvider?: 'better-auth' | 'supabase' | undefined;
    issuerProvider?: 'authentik' | 'supabase-legacy' | undefined;
    emailProvider?: 'supabase' | 'postmark' | 'ses' | undefined;
  }
>;
export declare function normalizeAuthExecutionProvider(
  value: string | undefined | null
): AuthExecutionProviderName;
export declare function normalizeAuthIssuerProvider(
  value: string | undefined | null
): IdentityIssuerProviderName;
export declare function normalizeAuthEmailProvider(
  value: string | undefined | null
): EmailProviderName;
export declare function parseAuthProviderSelection(input: {
  executionProvider?: string | null;
  issuerProvider?: string | null;
  emailProvider?: string | null;
}): z.infer<typeof authProviderSelectionSchema>;
export declare function parseBooleanLike(value: string | boolean | undefined | null): boolean;
