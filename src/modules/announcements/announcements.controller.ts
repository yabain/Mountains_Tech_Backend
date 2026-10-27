import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit.decorator';

class ScheduleDto {
  @ApiProperty({ example: '2026-09-01T08:00:00Z' })
  @IsNotEmpty() @IsDateString()
  scheduledAt!: string;
}

@ApiTags('Admin - Annonces')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'COMMUNICATION')
@Controller('admin/announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des campagnes d\'annonces' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    const data = await this.announcementsService.findAll(+page, +limit);
    return { success: true, data, message: 'Campagnes récupérées' };
  }

  @Get(':id/recipients')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Liste des destinataires d\'une campagne' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findRecipients(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const data = await this.announcementsService.findRecipients(id, +page, +limit);
    return { success: true, data, message: 'Destinataires récupérés' };
  }

  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Détail d\'une campagne' })
  async findOne(@Param('id') id: string) {
    const data = await this.announcementsService.findById(id);
    return { success: true, data, message: 'Campagne récupérée' };
  }

  @Audit({ action: 'CREATE', resource: 'announcements', category: 'COMMUNICATION' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une campagne', description: 'Crée une campagne DRAFT ou SCHEDULED. recipientCount calculé automatiquement.' })
  async create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: JwtPayload) {
    const data = await this.announcementsService.create(dto, user.sub);
    return { success: true, data, message: 'Campagne créée' };
  }

  @Audit({ action: 'UPDATE', resource: 'announcements', category: 'COMMUNICATION' })
  @Patch(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Modifier une campagne (DRAFT / SCHEDULED seulement)' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateAnnouncementDto>) {
    const data = await this.announcementsService.update(id, dto);
    return { success: true, data, message: 'Campagne mise à jour' };
  }

  @Audit({ action: 'SEND', resource: 'announcements', category: 'COMMUNICATION' })
  @Post(':id/send')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Envoyer immédiatement une campagne' })
  async send(@Param('id') id: string) {
    const data = await this.announcementsService.send(id);
    return { success: true, data, message: 'Campagne mise en file d\'envoi' };
  }

  @Audit({ action: 'SCHEDULE', resource: 'announcements', category: 'COMMUNICATION' })
  @Post(':id/schedule')
  @ApiParam({ name: 'id' })
  @ApiBody({ type: ScheduleDto })
  @ApiOperation({ summary: 'Programmer l\'envoi d\'une campagne' })
  async schedule(@Param('id') id: string, @Body() dto: ScheduleDto) {
    const data = await this.announcementsService.schedule(id, dto.scheduledAt);
    return { success: true, data, message: 'Campagne programmée' };
  }

  @Audit({ action: 'CANCEL', resource: 'announcements', category: 'COMMUNICATION' })
  @Post(':id/cancel')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Annuler une campagne programmée' })
  async cancel(@Param('id') id: string) {
    const data = await this.announcementsService.cancel(id);
    return { success: true, data, message: 'Campagne annulée' };
  }
}
