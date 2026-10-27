import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';

@ApiTags('Admin - Partenaires')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('admin/partners')
export class PartnersAdminController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @ApiOperation({ summary: 'Liste de tous les partenaires' })
  async findAll() {
    const data = await this.partnersService.findAll();
    return { success: true, data, message: 'Liste des partenaires récupérée' };
  }

  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Détail d\'un partenaire' })
  async findOne(@Param('id') id: string) {
    const data = await this.partnersService.findById(id);
    return { success: true, data, message: 'Partenaire récupéré' };
  }

  @Audit({ action: 'CREATE', resource: 'partners', category: 'CONTENT' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un partenaire' })
  async create(@Body() dto: CreatePartnerDto) {
    const data = await this.partnersService.create(dto);
    return { success: true, data, message: 'Partenaire créé' };
  }

  @Audit({ action: 'UPDATE', resource: 'partners', category: 'CONTENT' })
  @Patch(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Modifier un partenaire' })
  async update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    const data = await this.partnersService.update(id, dto);
    return { success: true, data, message: 'Partenaire mis à jour' };
  }

  @Audit({ action: 'DELETE', resource: 'partners', category: 'CONTENT' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Supprimer un partenaire' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.partnersService.remove(id);
  }
}
