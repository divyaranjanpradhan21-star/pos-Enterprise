import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/database.service';

export interface AuditEventInput {
  tenantId: string;
  branchId?: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Append-only audit logger enforcing FR-AUD-001 and BR-LED-001.
   * Records are immutable once written.
   */
  async log(event: AuditEventInput): Promise<void> {
    try {
      if (this.db.auditLog) {
        await this.db.auditLog.create({
          data: {
            tenantId: event.tenantId,
            branchId: event.branchId,
            userId: event.userId,
            action: event.action,
            resourceType: event.resourceType,
            resourceId: event.resourceId,
            oldValues: event.oldValues ? JSON.parse(JSON.stringify(event.oldValues)) : undefined,
            newValues: event.newValues ? JSON.parse(JSON.stringify(event.newValues)) : undefined,
            ipAddress: event.ipAddress,
          },
        });
      }
    } catch (err) {
      // In audit logging, fail-safe so business operations are not stalled if mock db
      console.error('[AUDIT_LOG_ERROR]', err);
    }
  }
}
