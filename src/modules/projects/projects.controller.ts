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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

// ─── Public ──────────────────────────────────────────────────────────────────

@ApiTags('Public - Projets')
@Controller('public/projects')
export class ProjectsPublicController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * GET /api/v1/public/projects
   */
  @Get()
  @ApiOperation({
    summary: 'Liste paginée des projets publiés',
    description: 'Retourne les projets PUBLISHED avec leurs partenaires populés.',
  })
  @ApiResponse({ status: 200, description: 'Liste récupérée', type: ProjectResponseDto, isArray: true })
  async findAll(@Query() query: QueryProjectsDto) {
    const data = await this.projectsService.findPublished(query);
    return { success: true, data, message: 'Liste des projets récupérée' };
  }

  /**
   * GET /api/v1/public/projects/:slug
   */
  @Get(':slug')
  @ApiOperation({ summary: 'Détail d\'un projet publié' })
  @ApiParam({ name: 'slug', example: 'projet-numerique-communautes' })
  @ApiResponse({ status: 200, description: 'Projet trouvé', type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Projet introuvable' })
  async findOne(@Param('slug') slug: string) {
    const data = await this.projectsService.findBySlug(slug);
    return { success: true, data, message: 'Projet récupéré' };
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────

@ApiTags('Admin - Projets')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'EDITOR')
@Controller('admin/projects')
export class ProjectsAdminController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * GET /api/v1/admin/projects
   */
  @Get()
  @ApiOperation({ summary: 'Liste admin de tous les projets' })
  @ApiResponse({ status: 200, description: 'Liste récupérée', type: ProjectResponseDto, isArray: true })
  async findAll(@Query() query: QueryProjectsDto) {
    const data = await this.projectsService.findAll(query);
    return { success: true, data, message: 'Liste des projets récupérée' };
  }

  /**
   * GET /api/v1/admin/projects/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Détail admin d\'un projet' })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB' })
  @ApiResponse({ status: 200, description: 'Projet trouvé', type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Projet introuvable' })
  async findOne(@Param('id') id: string) {
    const data = await this.projectsService.findById(id);
    return { success: true, data, message: 'Projet récupéré' };
  }

  /**
   * POST /api/v1/admin/projects
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer un projet',
    description:
      'Statut par défaut : DRAFT. Slug auto-généré. Partners : tableau d\'ObjectIds de membres.',
  })
  @ApiResponse({ status: 201, description: 'Projet créé', type: ProjectResponseDto })
  async create(@Body() dto: CreateProjectDto, @CurrentUser() user: JwtPayload) {
    const data = await this.projectsService.create(dto, user.sub);
    return { success: true, data, message: 'Projet créé' };
  }

  /**
   * PATCH /api/v1/admin/projects/:id
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier un projet',
    description:
      'Mise à jour partielle. Transitions : DRAFT → PUBLISHED / ARCHIVED ; PUBLISHED → ARCHIVED ; ARCHIVED → DRAFT.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB' })
  @ApiResponse({ status: 200, description: 'Projet mis à jour', type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: 'Transition de statut invalide' })
  @ApiResponse({ status: 404, description: 'Projet introuvable' })
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    const data = await this.projectsService.update(id, dto);
    return { success: true, data, message: 'Projet mis à jour' };
  }

  /**
   * DELETE /api/v1/admin/projects/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer un projet',
    description: 'Suppression définitive. Bloquée si statut PUBLISHED.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB' })
  @ApiResponse({ status: 204, description: 'Projet supprimé' })
  @ApiResponse({ status: 400, description: 'Impossible de supprimer un projet publié' })
  @ApiResponse({ status: 404, description: 'Projet introuvable' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.projectsService.remove(id);
  }
}
