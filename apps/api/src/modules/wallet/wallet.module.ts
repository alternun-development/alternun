import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    // IP/global throttling (00-SPEC.md §2 rule 3 / task 08) — a coarser second layer on top of
    // the per-user PIN lockout already in WalletService.verifyPin. Scoped to this module only
    // (not registered as a global APP_GUARD) since no other module in this app has throttling yet
    // and the wallet module is the highest-value target to start with.
    //
    // NOTE: this app runs on AWS Lambda (see main.ts's run-migrations-lambda import) — the
    // default in-memory ThrottlerStorage is per-container, not shared across concurrent Lambda
    // invocations/cold starts. This still meaningfully raises the bar against naive single-IP
    // abuse within one warm container, but is not a true distributed rate limit. A Redis-backed
    // ThrottlerStorage (e.g. @nest-lab/throttler-storage-redis) would be needed for that — out of
    // scope here; flagged in 08-rate-limiting-security-hardening.md as a known limitation.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 30 }]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
