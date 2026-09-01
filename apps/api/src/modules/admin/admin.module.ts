import { Module } from '@nestjs/common';
import { AdminAuthGuard } from '../../common/admin-auth/admin-auth.nest.guard';
import { AdminAllowancesController } from './admin-allowances.controller';

@Module({
  controllers: [AdminAllowancesController],
  providers: [AdminAuthGuard],
})
export class AdminModule {}
