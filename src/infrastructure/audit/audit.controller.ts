import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin — Audit Logs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des logs d\'audit', description: 'Accessible uniquement au SUPER_ADMIN.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'resource', required: false, description: 'Filtrer par ressource (users, members, ...)' })
  @ApiQuery({ name: 'userId', required: false })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('resource') resource?: string,
    @Query('userId') userId?: string,
  ) {
    const data = await this.auditService.findAll(+page, +limit, resource, userId);
    return { success: true, data, message: 'Logs récupérés' };
  }
}
