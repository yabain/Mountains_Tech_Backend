import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Post, Query, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation,
  ApiParam, ApiQuery, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

class UploadMediaDto {
  @ApiPropertyOptional({ example: 'Logo Mountains Tech' })
  @IsOptional() @IsString()
  alt?: string;
}

@ApiTags('Admin — Médias')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'EDITOR')
@Controller('admin/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des médias' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'mimeType', required: false, description: 'Filtrer par type MIME (ex: image)' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('mimeType') mimeType?: string,
  ) {
    const data = await this.mediaService.findAll(+page, +limit, mimeType);
    return { success: true, data, message: 'Médias récupérés' };
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        alt: { type: 'string' },
      },
    },
  })
  @ApiOperation({
    summary: 'Téléverser un média',
    description:
      'Upload d\'image/fichier. En production, le fichier est envoyé vers le provider de stockage configuré (S3, Cloudinary, etc.) et seules les métadonnées sont stockées en base.',
  })
  async upload(
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // In production: upload to storage provider, get back URL
    // For now we store the metadata with a placeholder URL
    const data = await this.mediaService.create({
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${file.originalname}`, // replace with CDN URL in production
      alt: dto.alt,
      uploadedBy: user.sub,
    });
    return { success: true, data, message: 'Média téléversé' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Supprimer un média' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.mediaService.remove(id);
  }
}
