import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { verifyIssuerJwt } from '../../auth-exchange/auth-exchange-jwt';

interface RegistrationBonusResult {
  awarded: boolean;
  balance: number;
}

@Injectable()
export class AirsRegistrationBonusService {
  private readonly logger = new Logger(AirsRegistrationBonusService.name);
  private supabase: ReturnType<typeof createClient> | null = null;

  private getSupabaseClient(): ReturnType<typeof createClient> {
    if (!this.supabase) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !key) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
      }

      this.supabase = createClient(url, key);
    }
    return this.supabase;
  }

  async awardRegistrationBonus(authHeader: string): Promise<RegistrationBonusResult> {
    try {
      // Extract token from "Bearer <token>"
      const token = authHeader.replace(/^bearer\s+/i, '').trim();

      // Verify JWT and extract user ID
      const signingKey =
        process.env.AUTHENTIK_JWT_SIGNING_KEY ??
        process.env.AUTHENTIK_JWT_SIGNING_SECRET ??
        process.env.AUTH_SESSION_SIGNING_KEY ??
        '';

      if (!signingKey.trim()) {
        throw new UnauthorizedException('JWT signing key not configured');
      }

      const verified = verifyIssuerJwt(token, signingKey);
      const userId =
        typeof verified.claims.app_user_id === 'string' ? verified.claims.app_user_id : '';

      if (!userId) {
        throw new UnauthorizedException('Invalid or missing user ID in token');
      }

      // Call the database function to award the bonus
      interface BonusResult {
        awarded: boolean;
        airs_balance: number;
      }

      const params = { p_user_id: userId, p_bonus_amount: 10 };
      // eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      const rpcResult = this.getSupabaseClient()
        .rpc('airs_award_registration_bonus', params as any) // eslint-disable-line
        .single();
      // eslint-enable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      const { data, error } = await rpcResult;

      if (error) {
        this.logger.error('Database error awarding registration bonus', {
          userId,
          error: error.message,
        });
        throw new Error(`Failed to award registration bonus: ${error.message}`);
      }

      if (!data) {
        this.logger.warn('No data returned from registration bonus function', { userId });
        return { awarded: false, balance: 0 };
      }

      const rpcData = data as BonusResult;

      this.logger.debug('Registration bonus awarded', {
        userId,
        awarded: rpcData.awarded,
      });

      return {
        awarded: rpcData.awarded ?? false,
        balance: rpcData.airs_balance ?? 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('not found') ||
        message.includes('failed [400]') ||
        message.includes('AIRS user id') ||
        message.includes('Invalid or missing user ID in token')
      ) {
        this.logger.warn('Registration bonus claim skipped', {
          error: message,
        });
        return { awarded: false, balance: 0 };
      }

      this.logger.error('Error in awardRegistrationBonus', {
        error: message,
      });
      throw error;
    }
  }
}
