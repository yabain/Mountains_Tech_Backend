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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { QueryActivitiesDto } from './dto/query-activities.dto';
import { ActivityResponseDto } from './dto/activity-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

// ─── Public ──────────────────────────────────────────────────────────────────

@ApiTags('Public - Activités')
@Controller('public/activities')
export class ActivitiesPublicController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  /**
   * GET /api/v1/public/activities
   */
  @Get()
  @ApiOperation({
    summary: 'Liste paginée des activités publiées',
    description: 'Retourne les activités avec statut PUBLISHED, triées par date de publication.',
  })
  @ApiResponse({ status: 200, description: 'Liste récupérée', type: ActivityResponseDto, isArray: true })
  async findAll(@Query() query: QueryActivitiesDto) {
    const data = await this.activitiesService.findPublished(query);
    return { success: true, data, message: 'Liste des activités récupérée' };
  }

  /**
   * GET /api/v1/public/activities/:slug
   */
  @Get(':slug')
  @ApiOperation({ summary: 'Détail d\'une activité publiée' })
  @ApiParam({ name: 'slug', example: 'atelier-developpement-web' })
  @ApiResponse({ status: 200, description: 'Activité trouvée', type: ActivityResponseDto })
  @ApiResponse({ status: 404, description: 'Activité introuvable' })
  async findOne(@Param('slug') slug: string) {
    const data = await this.activitiesService.findBySlug(slug);
    return { success: true, data, message: 'Activité récupérée' };
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────

@ApiTags('Admin - Activités')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'EDITOR')
@Controller('admin/activities')
export class ActivitiesAdminController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  /**
   * GET /api/v1/admin/activities
   */
  @Get()
  @ApiOperation({
    summary: 'Liste admin de toutes les activités',
    description: 'Retourne toutes les activités (DRAFT, PUBLISHED, ARCHIVED) avec filtres.',
  })
  @ApiResponse({ status: 200, description: 'Liste récupérée', type: ActivityResponseDto, isArray: true })
  async findAll(@Query() query: QueryActivitiesDto) {
    const data = await this.activitiesService.findAll(query);
    return { success: true, data, message: 'Liste des activités récupérée' };
  }

  /**
   * GET /api/v1/admin/activities/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Détail admin d\'une activité' })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB' })
  @ApiResponse({ status: 200, description: 'Activité trouvée', type: ActivityResponseDto })
  @ApiResponse({ status: 404, description: 'Activité introuvable' })
  async findOne(@Param('id') id: string) {
    const data = await this.activitiesService.findById(id);
    return { success: true, data, message: 'Activité récupérée' };
  }

  /**
   * POST /api/v1/admin/activities
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une activité',
    description:
      'Crée une activité. Statut par défaut : DRAFT. Le slug est généré automatiquement depuis le titre si non fourni.',
  })
  @ApiResponse({ status: 201, description: 'Activité créée', type: ActivityResponseDto })
  @ApiResponse({ status: 409, description: 'Slug déjà utilisé' })
  async create(@Body() dto: CreateActivityDto, @CurrentUser() user: JwtPayload) {
    const data = await this.activitiesService.create(dto, user.sub);
    return { success: true, data, message: 'Activité créée' };
  }

  /**
   * PATCH /api/v1/admin/activities/:id
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier une activité',
    description:
      'Mise à jour partielle. Transitions de statut autorisées : DRAFT → PUBLISHED / ARCHIVED ; PUBLISHED → ARCHIVED ; ARCHIVED → DRAFT.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB' })
  @ApiResponse({ status: 200, description: 'Activité mise à jour', type: ActivityResponseDto })
  @ApiResponse({ status: 400, description: 'Transition de statut invalide' })
  @ApiResponse({ status: 404, description: 'Activité introuvable' })
  async update(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    const data = await this.activitiesService.update(id, dto);
    return { success: true, data, message: 'Activité mise à jour' };
  }

  /**
   * DELETE /api/v1/admin/activities/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer une activité',
    description: 'Suppression définitive. Seules les activités DRAFT ou ARCHIVED peuvent être supprimées.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB' })
  @ApiResponse({ status: 204, description: 'Activité supprimée' })
  @ApiResponse({ status: 400, description: 'Impossible de supprimer une activité publiée' })
  @ApiResponse({ status: 404, description: 'Activité introuvable' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.activitiesService.remove(id);
  }
}
