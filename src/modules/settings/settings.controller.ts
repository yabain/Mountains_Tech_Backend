import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';

@ApiTags('Public - Paramètres')
@Controller('public/settings')
export class SettingsPublicController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Paramètres publics du site', description: 'Retourne les paramètres marqués isPublic : réseaux sociaux, coordonnées, mission, vision.' })
  async findPublic() {
    const data = await this.settingsService.findPublic();
    return { success: true, data, message: 'Paramètres récupérés' };
  }
}

@ApiTags('Admin - Paramètres')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('admin/settings')
export class SettingsAdminController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Tous les paramètres du site' })
  async findAll() {
    const data = await this.settingsService.findAll();
    return { success: true, data, message: 'Paramètres récupérés' };
  }

  @Audit({ action: 'UPDATE', resource: 'settings', category: 'SETTINGS' })
  @Patch()
  @ApiOperation({ summary: 'Mettre à jour les paramètres', description: 'Upsert en masse - chaque clé/valeur est créée ou mise à jour.' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true, example: { siteName: 'Mountains Tech', socialFacebook: 'https://fb.com/mountainstech' } } })
  async update(@Body() body: Record<string, unknown>) {
    const data = await this.settingsService.upsertMany(body);
    return { success: true, data, message: 'Paramètres mis à jour' };
  }
}
