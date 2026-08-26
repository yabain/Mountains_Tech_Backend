import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NewsletterService } from './newsletter.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

// ─── Public ──────────────────────────────────────────────────────────────────
@ApiTags('Public — Newsletter')
@Controller('public/newsletter')
export class NewsletterPublicController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscriptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inscription à la newsletter' })
  @ApiResponse({ status: 200, schema: { example: { success: true, data: { status: 'SUBSCRIBED' }, message: 'Inscription confirmée' } } })
  @ApiResponse({ status: 409, description: 'Email déjà inscrit' })
  async subscribe(@Body() dto: SubscribeDto) {
    const data = await this.newsletterService.subscribe(dto);
    return { success: true, data, message: 'Inscription confirmée' };
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────
@ApiTags('Admin — Newsletter')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'COMMUNICATION')
@Controller('admin/newsletter')
export class NewsletterAdminController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Get('subscribers')
  @ApiOperation({ summary: 'Liste des abonnés' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['SUBSCRIBED', 'UNSUBSCRIBED'] })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    const data = await this.newsletterService.findAll(+page, +limit, status);
    return { success: true, data, message: 'Liste des abonnés récupérée' };
  }

  @Delete('subscribers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Désabonner / supprimer un abonné' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.newsletterService.remove(id);
  }
}
