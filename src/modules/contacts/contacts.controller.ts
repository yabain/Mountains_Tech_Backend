import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Public — Contact')
@Controller('public/contact')
export class ContactPublicController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Envoyer un message de contact' })
  @ApiResponse({ status: 201, schema: { example: { success: true, data: { messageId: '67msg...' }, message: 'Votre message a été transmis' } } })
  async create(@Body() dto: CreateContactDto) {
    const data = await this.contactsService.create(dto);
    return { success: true, data, message: 'Votre message a été transmis' };
  }
}

@ApiTags('Admin — Contacts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('admin/contacts')
export class ContactAdminController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des messages de contact' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'] })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: string) {
    const data = await this.contactsService.findAll(+page, +limit, status);
    return { success: true, data, message: 'Messages récupérés' };
  }

  @Patch(':id/status')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Changer le statut d\'un message', description: 'Transitions : NEW → IN_PROGRESS / SPAM ; IN_PROGRESS → RESOLVED / SPAM.' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateContactStatusDto, @CurrentUser() user: JwtPayload) {
    const data = await this.contactsService.updateStatus(id, dto, user.sub);
    return { success: true, data, message: 'Statut mis à jour' };
  }
}
