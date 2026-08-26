import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin — Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Statistiques et indicateurs', description: 'Agrégations en temps réel : utilisateurs, membres, activités, événements, projets, hackathons, newsletter, contacts.' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées' })
  async getStats() {
    const data = await this.dashboardService.getStats();
    return { success: true, data, message: 'Statistiques récupérées' };
  }
}
