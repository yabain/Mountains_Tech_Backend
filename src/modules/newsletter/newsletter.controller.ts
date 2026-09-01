import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags,
} from '@nestjs/swagger';
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

  /**
   * POST /api/v1/public/newsletter/subscriptions
   */
  @Post('subscriptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inscription à la newsletter' })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, data: { status: 'SUBSCRIBED' }, message: 'Inscription confirmée' } },
  })
  @ApiResponse({ status: 409, description: 'Email déjà inscrit' })
  async subscribe(@Body() dto: SubscribeDto) {
    const data = await this.newsletterService.subscribe(dto);
    return { success: true, data, message: 'Inscription confirmée' };
  }

  /**
   * GET /api/v1/public/newsletter/unsubscribe?token=xxx
   * Lien cliquable depuis un email de newsletter
   */
  @Get('unsubscribe')
  @ApiOperation({
    summary: 'Se désabonner via lien email',
    description:
      'Lien de désabonnement inclus dans chaque email de newsletter. Token à usage unique. ' +
      'Peut être appelé depuis un navigateur directement.',
  })
  @ApiQuery({ name: 'token', required: true, description: 'Token de désabonnement à usage unique' })
  @ApiResponse({ status: 200, description: 'Désabonnement confirmé' })
  @ApiResponse({ status: 404, description: 'Token invalide ou déjà utilisé' })
  async unsubscribeByToken(@Query('token') token: string) {
    const data = await this.newsletterService.unsubscribeByToken(token);
    return { success: true, data, message: 'Désabonnement confirmé' };
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

  /**
   * GET /api/v1/admin/newsletter/subscribers
   */
  @Get('subscribers')
  @ApiOperation({ summary: 'Liste des abonnés newsletter' })
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

  /**
   * DELETE /api/v1/admin/newsletter/subscribers/:id
   */
  @Delete('subscribers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Désabonner / supprimer un abonné' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.newsletterService.remove(id);
  }
}
