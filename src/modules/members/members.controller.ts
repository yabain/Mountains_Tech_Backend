import {
  Body,
  Controller,
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
import { MembersService } from './members.service';
import { CreateMemberApplicationDto } from './dto/create-member-application.dto';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';
import { QueryMembersDto } from './dto/query-members.dto';
import { MemberResponseDto, MemberApplicationResponseDto } from './dto/member-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

// ─── Public ──────────────────────────────────────────────────────────────────

@ApiTags('Public - Membres')
@Controller('public/members')
export class MembersPublicController {
  constructor(private readonly membersService: MembersService) {}

  /**
   * GET /api/v1/public/members
   */
  @Get()
  @ApiOperation({
    summary: 'Liste des entreprises membres publiées',
    description: 'Retourne la liste paginée des membres avec statut APPROVED.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste récupérée',
    type: MemberResponseDto,
    isArray: true,
  })
  async findAll(@Query() query: QueryMembersDto) {
    const data = await this.membersService.findPublished(query);
    return { success: true, data, message: 'Liste des membres récupérée' };
  }

  /**
   * GET /api/v1/public/members/:slug
   */
  @Get(':slug')
  @ApiOperation({ summary: 'Détail d\'une entreprise membre' })
  @ApiParam({ name: 'slug', example: 'yaba-in-sarl' })
  @ApiResponse({ status: 200, description: 'Membre trouvé', type: MemberResponseDto })
  @ApiResponse({ status: 404, description: 'Membre introuvable' })
  async findOne(@Param('slug') slug: string) {
    const data = await this.membersService.findBySlug(slug);
    return { success: true, data, message: 'Membre récupéré' };
  }

  /**
   * POST /api/v1/public/members/applications
   */
  @Post('applications')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Soumettre une demande d\'adhésion',
    description:
      'Permet à une entreprise de soumettre une candidature pour devenir membre de Mountains Tech. Statut initial : PENDING.',
  })
  @ApiResponse({
    status: 201,
    description: 'Candidature soumise',
    type: MemberApplicationResponseDto,
    schema: {
      example: {
        success: true,
        data: { applicationId: '67abc...', status: 'PENDING' },
        message: 'Demande soumise pour validation',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Consentement manquant ou données invalides' })
  @ApiResponse({ status: 409, description: 'Candidature déjà existante pour cet email' })
  async submitApplication(@Body() dto: CreateMemberApplicationDto) {
    const data = await this.membersService.submitApplication(dto);
    return { success: true, data, message: 'Demande soumise pour validation' };
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────

@ApiTags('Admin - Membres')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('admin/members')
export class MembersAdminController {
  constructor(private readonly membersService: MembersService) {}

  /**
   * GET /api/v1/admin/members
   */
  @Get()
  @ApiOperation({
    summary: 'Liste admin des membres',
    description: 'Retourne tous les membres avec filtres sur statut, secteur et recherche.',
  })
  @ApiResponse({ status: 200, description: 'Liste récupérée', type: MemberResponseDto, isArray: true })
  async findAll(@Query() query: QueryMembersDto) {
    const data = await this.membersService.findAllAdmin(query);
    return { success: true, data, message: 'Liste des membres récupérée' };
  }

  /**
   * GET /api/v1/admin/members/applications
   */
  @Get('applications')
  @ApiOperation({
    summary: 'Liste des candidatures',
    description: 'Retourne toutes les candidatures avec filtres.',
  })
  @ApiResponse({ status: 200, description: 'Liste récupérée' })
  async findApplications(@Query() query: QueryMembersDto) {
    const data = await this.membersService.findAllApplicationsAdmin(query);
    return { success: true, data, message: 'Liste des candidatures récupérée' };
  }

  /**
   * GET /api/v1/admin/members/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Détail admin d\'un membre' })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB du membre' })
  @ApiResponse({ status: 200, description: 'Membre trouvé', type: MemberResponseDto })
  @ApiResponse({ status: 404, description: 'Membre introuvable' })
  async findOne(@Param('id') id: string) {
    const data = await this.membersService.findById(id);
    return { success: true, data, message: 'Membre récupéré' };
  }

  /**
   * PATCH /api/v1/admin/members/:id/status
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Valider / refuser / suspendre un membre',
    description:
      'Transitions autorisées : PENDING → APPROVED / REJECTED ; APPROVED → SUSPENDED ; SUSPENDED → APPROVED.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB du membre' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour', type: MemberResponseDto })
  @ApiResponse({ status: 400, description: 'Transition de statut invalide' })
  @ApiResponse({ status: 404, description: 'Membre introuvable' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMemberStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.membersService.updateStatus(id, dto, user.sub);
    return { success: true, data, message: 'Statut mis à jour' };
  }

  /**
   * PATCH /api/v1/admin/members/applications/:id/status
   */
  @Patch('applications/:id/status')
  @ApiOperation({
    summary: 'Traiter une candidature',
    description:
      'Approuve ou rejette une candidature. En cas d\'approbation, un enregistrement membre est automatiquement créé.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB de la candidature' })
  @ApiResponse({ status: 200, description: 'Candidature traitée' })
  @ApiResponse({ status: 400, description: 'Transition invalide' })
  @ApiResponse({ status: 404, description: 'Candidature introuvable' })
  async updateApplicationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMemberStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.membersService.updateApplicationStatus(id, dto, user.sub);
    return { success: true, data, message: 'Candidature traitée' };
  }
}
