import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../../schemas/audit-log.schema';

export interface AuditEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLogDocument>,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.auditModel.create(entry);
    } catch (error) {
      // Audit failure must never crash the main request
      this.logger.error('Audit log failed', error instanceof Error ? error.stack : String(error));
    }
  }

  async findAll(page = 1, limit = 50, resource?: string, userId?: string) {
    const filter: Record<string, unknown> = {};
    if (resource) filter['resource'] = resource;
    if (userId) filter['userId'] = userId;

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.auditModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.auditModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => {
        const obj = d.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
        delete obj['__v'];
        return obj;
      }),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}
