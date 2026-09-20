import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { DatabaseService } from '../../core/database.service';

@Global()
@Module({
  providers: [AuditService, DatabaseService],
  exports: [AuditService],
})
export class AuditModule {}
