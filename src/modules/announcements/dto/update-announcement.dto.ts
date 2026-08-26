import { IsDateString, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAnnouncementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  audience?: { groups: string[]; filters?: Record<string, unknown> };

  @ApiPropertyOptional({ enum: ['NOW', 'SCHEDULED'] })
  @IsOptional()
  @IsIn(['NOW', 'SCHEDULED'])
  sendMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
