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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit.decorator';

class UpdateMediaAltDto {
  @ApiPropertyOptional({ example: 'Logo Mountains Tech' })
  @IsOptional()
  @IsString()
  alt?: string;
}

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('Admin - Médias')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'EDITOR')
@Controller('admin/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * GET /api/v1/admin/media
   */
  @Get()
  @ApiOperation({ summary: 'Liste des médias uploadés' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'mimeType', required: false, description: 'Filtrer par type MIME (ex: image, video)' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('mimeType') mimeType?: string,
  ) {
    const data = await this.mediaService.findAll(+page, +limit, mimeType);
    return { success: true, data, message: 'Médias récupérés' };
  }

  /**
   * POST /api/v1/admin/media/upload
   */
  @Audit({ action: 'UPLOAD', resource: 'media', category: 'MEDIA' })
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Fichier (max 10 Mo)' },
        alt: { type: 'string', description: 'Texte alternatif (accessibilité)' },
      },
    },
  })
  @ApiOperation({
    summary: 'Uploader un média',
    description:
      'Types acceptés : JPEG, PNG, WebP, GIF, SVG, PDF, MP4, WebM. ' +
      'Stocké dans uploads/ et accessible via /uploads/<uuid>.<ext>.',
  })
  async upload(
    @UploadedFile() file: MulterFile,
    @Body() dto: UpdateMediaAltDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.mediaService.create({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      alt: dto.alt,
      uploadedBy: user.sub,
    });
    return { success: true, data, message: 'Média uploadé avec succès' };
  }

  /**
   * PATCH /api/v1/admin/media/:id
   * Update alt text metadata
   */
  @Audit({ action: 'UPDATE', resource: 'media', category: 'MEDIA' })
  @Patch(':id')
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB du média' })
  @ApiOperation({ summary: 'Modifier le texte alternatif d\'un média' })
  @ApiResponse({ status: 200, description: 'Média mis à jour' })
  @ApiResponse({ status: 404, description: 'Média introuvable' })
  async update(@Param('id') id: string, @Body() dto: UpdateMediaAltDto) {
    const data = await this.mediaService.update(id, { alt: dto.alt });
    return { success: true, data, message: 'Média mis à jour' };
  }

  /**
   * DELETE /api/v1/admin/media/:id
   */
  @Audit({ action: 'DELETE', resource: 'media', category: 'MEDIA' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB du média' })
  @ApiOperation({
    summary: 'Supprimer un média',
    description: 'Supprime le fichier physique du disque ET l\'enregistrement en base.',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.mediaService.remove(id);
  }
}
