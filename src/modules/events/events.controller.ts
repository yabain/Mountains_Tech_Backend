import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RegisterEventDto } from './dto/register-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { EventResponseDto, EventRegistrationResponseDto } from './dto/event-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

// ─── Public ──────────────────────────────────────────────────────────────────

@ApiTags('Public — Événements')
@Controller('public/events')
export class EventsPublicController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET /api/v1/public/events
   */
  @Get()
  @ApiOperation({
    summary: 'Liste paginée des événements publiés',
    description: 'Supports filtres : category, upcoming (bool), search, pagination et tri.',
  })
  @ApiResponse({ status: 200, description: 'Liste récupérée', type: EventResponseDto, isArray: true })
  async findAll(@Query() query: QueryEventsDto) {
    const data = await this.eventsService.findPublished(query);
    return { success: true, data, message: 'Liste des événements récupérée' };
  }

  /**
   * GET /api/v1/public/events/:slug
   */
  @Get(':slug')
  @ApiOperation({ summary: 'Détail d\'un événement publié' })
  @ApiParam({ name: 'slug', example: 'webinaire-ia-generative' })
  @ApiResponse({ status: 200, description: 'Événement trouvé', type: EventResponseDto })
  @ApiResponse({ status: 404, description: 'Événement introuvable' })
  async findOne(@Param('slug') slug: string) {
    const data = await this.eventsService.findBySlug(slug);
    return { success: true, data, message: 'Événement récupéré' };
  }

  /**
   * POST /api/v1/public/events/:eventId/registrations
   */
  @Post(':eventId/registrations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Inscription à un événement',
    description:
      'Inscrit un participant à un événement. Vérifie la capacité et les inscriptions en double.',
  })
  @ApiParam({ name: 'eventId', description: 'ObjectId MongoDB de l\'événement' })
  @ApiResponse({
    status: 201,
    description: 'Inscription confirmée',
    type: EventRegistrationResponseDto,
    schema: {
      example: {
        success: true,
        data: { registrationId: '67reg...', status: 'CONFIRMED' },
        message: 'Inscription confirmée',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Capacité atteinte ou inscription non requise' })
  @ApiResponse({ status: 404, description: 'Événement introuvable' })
  @ApiResponse({ status: 409, description: 'Email déjà inscrit à cet événement' })
  async register(
    @Param('eventId') eventId: string,
    @Body() dto: RegisterEventDto,
  ) {
    const data = await this.eventsService.register(eventId, dto);
    return { success: true, data, message: 'Inscription confirmée' };
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────

@ApiTags('Admin — Événements')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'EDITOR')
@Controller('admin/events')
export class EventsAdminController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET /api/v1/admin/events
   */
  @Get()
  @ApiOperation({ summary: 'Liste admin de tous les événements' })
  @ApiResponse({ status: 200, description: 'Liste récupérée', type: EventResponseDto, isArray: true })
  async findAll(@Query() query: QueryEventsDto) {
    const data = await this.eventsService.findAll(query);
    return { success: true, data, message: 'Liste des événements récupérée' };
  }

  /**
   * GET /api/v1/admin/events/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Détail admin d\'un événement' })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB' })
  @ApiResponse({ status: 200, description: 'Événement trouvé', type: EventResponseDto })
  @ApiResponse({ status: 404, description: 'Événement introuvable' })
  async findOne(@Param('id') id: string) {
    const data = await this.eventsService.findById(id);
    return { success: true, data, message: 'Événement récupéré' };
  }

  /**
   * POST /api/v1/admin/events
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer un événement',
    description: 'Statut par défaut : DRAFT. Slug auto-généré depuis le titre si non fourni.',
  })
  @ApiResponse({ status: 201, description: 'Événement créé', type: EventResponseDto })
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: JwtPayload) {
    const data = await this.eventsService.create(dto, user.sub);
    return { success: true, data, message: 'Événement créé' };
  }

  /**
   * PATCH /api/v1/admin/events/:id
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier un événement',
    description:
      'Mise à jour partielle. Transitions : DRAFT → PUBLISHED / ARCHIVED ; PUBLISHED → ARCHIVED ; ARCHIVED → DRAFT.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB' })
  @ApiResponse({ status: 200, description: 'Événement mis à jour', type: EventResponseDto })
  @ApiResponse({ status: 400, description: 'Transition de statut invalide' })
  @ApiResponse({ status: 404, description: 'Événement introuvable' })
  async update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    const data = await this.eventsService.update(id, dto);
    return { success: true, data, message: 'Événement mis à jour' };
  }

  /**
   * DELETE /api/v1/admin/events/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer un événement',
    description: 'Suppression définitive. Bloquée si statut PUBLISHED.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB' })
  @ApiResponse({ status: 204, description: 'Événement supprimé' })
  @ApiResponse({ status: 400, description: 'Impossible de supprimer un événement publié' })
  @ApiResponse({ status: 404, description: 'Événement introuvable' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.eventsService.remove(id);
  }

  /**
   * GET /api/v1/admin/events/:id/registrations
   */
  @Get(':id/registrations')
  @ApiOperation({ summary: 'Liste des participants inscrits à un événement' })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB de l\'événement' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des inscriptions récupérée' })
  @ApiResponse({ status: 404, description: 'Événement introuvable' })
  async findRegistrations(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const data = await this.eventsService.findRegistrations(id, +page, +limit);
    return { success: true, data, message: 'Liste des inscriptions récupérée' };
  }
}
