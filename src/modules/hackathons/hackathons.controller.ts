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
import { HackathonsService } from './hackathons.service';
import { CreateHackathonDto } from './dto/create-hackathon.dto';
import { UpdateHackathonDto } from './dto/update-hackathon.dto';
import { RegisterTeamDto } from './dto/register-team.dto';
import { UpdateTeamStatusDto } from './dto/update-team-status.dto';
import { QueryHackathonsDto } from './dto/query-hackathons.dto';
import { HackathonResponseDto, TeamRegistrationResponseDto } from './dto/hackathon-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

// ─── Public ──────────────────────────────────────────────────────────────────

@ApiTags('Public — Hackathons')
@Controller('public/hackathons')
export class HackathonsPublicController {
  constructor(private readonly hackathonsService: HackathonsService) {}

  /**
   * GET /api/v1/public/hackathons
   */
  @Get()
  @ApiOperation({ summary: 'Liste des hackathons publiés' })
  @ApiResponse({ status: 200, description: 'Liste récupérée', type: HackathonResponseDto, isArray: true })
  async findAll(@Query() query: QueryHackathonsDto) {
    const data = await this.hackathonsService.findPublished(query);
    return { success: true, data, message: 'Liste des hackathons récupérée' };
  }

  /**
   * GET /api/v1/public/hackathons/:slug
   */
  @Get(':slug')
  @ApiOperation({ summary: 'Détail d\'un hackathon publié' })
  @ApiParam({ name: 'slug', example: 'hackmountains-2026' })
  @ApiResponse({ status: 200, description: 'Hackathon trouvé', type: HackathonResponseDto })
  @ApiResponse({ status: 404, description: 'Hackathon introuvable' })
  async findOne(@Param('slug') slug: string) {
    const data = await this.hackathonsService.findBySlug(slug);
    return { success: true, data, message: 'Hackathon récupéré' };
  }

  /**
   * POST /api/v1/public/hackathons/:hackathonId/teams
   */
  @Post(':hackathonId/teams')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Inscription d\'une équipe',
    description:
      'Inscrit une équipe à un hackathon publié. Vérifie la deadline, la taille d\'équipe et les doublons.',
  })
  @ApiParam({ name: 'hackathonId', description: 'ObjectId MongoDB du hackathon' })
  @ApiResponse({
    status: 201,
    description: 'Équipe enregistrée',
    type: TeamRegistrationResponseDto,
    schema: {
      example: {
        success: true,
        data: { teamId: '67team...', status: 'PENDING' },
        message: 'Équipe enregistrée',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Deadline dépassée ou taille invalide' })
  @ApiResponse({ status: 404, description: 'Hackathon introuvable' })
  @ApiResponse({ status: 409, description: 'Nom d\'équipe déjà utilisé' })
  async registerTeam(
    @Param('hackathonId') hackathonId: string,
    @Body() dto: RegisterTeamDto,
  ) {
    const data = await this.hackathonsService.registerTeam(hackathonId, dto);
    return { success: true, data, message: 'Équipe enregistrée' };
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────

@ApiTags('Admin — Hackathons')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'EDITOR')
@Controller('admin/hackathons')
export class HackathonsAdminController {
  constructor(private readonly hackathonsService: HackathonsService) {}

  /**
   * GET /api/v1/admin/hackathons
   */
  @Get()
  @ApiOperation({ summary: 'Liste admin de tous les hackathons' })
  @ApiResponse({ status: 200, description: 'Liste récupérée', type: HackathonResponseDto, isArray: true })
  async findAll(@Query() query: QueryHackathonsDto) {
    const data = await this.hackathonsService.findAll(query);
    return { success: true, data, message: 'Liste des hackathons récupérée' };
  }

  /**
   * GET /api/v1/admin/hackathons/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Détail admin d\'un hackathon' })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB' })
  @ApiResponse({ status: 200, type: HackathonResponseDto })
  @ApiResponse({ status: 404, description: 'Hackathon introuvable' })
  async findOne(@Param('id') id: string) {
    const data = await this.hackathonsService.findById(id);
    return { success: true, data, message: 'Hackathon récupéré' };
  }

  /**
   * POST /api/v1/admin/hackathons
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un hackathon' })
  @ApiResponse({ status: 201, description: 'Hackathon créé', type: HackathonResponseDto })
  async create(@Body() dto: CreateHackathonDto, @CurrentUser() user: JwtPayload) {
    const data = await this.hackathonsService.create(dto, user.sub);
    return { success: true, data, message: 'Hackathon créé' };
  }

  /**
   * PATCH /api/v1/admin/hackathons/:id
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier un hackathon',
    description: 'Transitions : DRAFT → PUBLISHED / ARCHIVED ; PUBLISHED → ARCHIVED ; ARCHIVED → DRAFT.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB' })
  @ApiResponse({ status: 200, type: HackathonResponseDto })
  @ApiResponse({ status: 400, description: 'Transition invalide' })
  @ApiResponse({ status: 404, description: 'Hackathon introuvable' })
  async update(@Param('id') id: string, @Body() dto: UpdateHackathonDto) {
    const data = await this.hackathonsService.update(id, dto);
    return { success: true, data, message: 'Hackathon mis à jour' };
  }

  /**
   * DELETE /api/v1/admin/hackathons/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un hackathon', description: 'Bloqué si statut PUBLISHED.' })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB' })
  @ApiResponse({ status: 204, description: 'Hackathon supprimé' })
  @ApiResponse({ status: 400, description: 'Impossible de supprimer un hackathon publié' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.hackathonsService.remove(id);
  }

  /**
   * GET /api/v1/admin/hackathons/:id/teams
   */
  @Get(':id/teams')
  @ApiOperation({ summary: 'Liste des équipes inscrites à un hackathon' })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB du hackathon' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @ApiResponse({ status: 200, description: 'Liste des équipes récupérée' })
  async findTeams(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    const data = await this.hackathonsService.findTeams(id, +page, +limit, status);
    return { success: true, data, message: 'Liste des équipes récupérée' };
  }

  /**
   * PATCH /api/v1/admin/hackathons/teams/:teamId/status
   */
  @Patch('teams/:teamId/status')
  @ApiOperation({
    summary: 'Valider ou refuser une équipe',
    description: 'Transition autorisée : PENDING → APPROVED / REJECTED.',
  })
  @ApiParam({ name: 'teamId', description: 'ObjectId MongoDB de l\'équipe' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour' })
  @ApiResponse({ status: 400, description: 'Équipe déjà traitée' })
  @ApiResponse({ status: 404, description: 'Équipe introuvable' })
  async updateTeamStatus(
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.hackathonsService.updateTeamStatus(teamId, dto, user.sub);
    return { success: true, data, message: 'Statut de l\'équipe mis à jour' };
  }
}
