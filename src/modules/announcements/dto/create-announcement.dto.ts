import { IsArray, IsDateString, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AudienceDto {
  @ApiProperty({ example: ['MEMBERS', 'NEWSLETTER'], type: [String] })
  @IsArray() @IsString({ each: true })
  groups!: string[];

  @ApiPropertyOptional({ example: { status: 'ACTIVE' } })
  @IsOptional() @IsObject()
  filters?: Record<string, unknown>;
}

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Nouveau rendez-vous Mountains Tech' })
  @IsNotEmpty() @IsString()
  subject!: string;

  @ApiProperty({ example: '<h1>Bonjour</h1><p>...</p>' })
  @IsNotEmpty() @IsString()
  contentHtml!: string;

  @ApiProperty({ type: AudienceDto })
  audience!: AudienceDto;

  @ApiProperty({ enum: ['NOW', 'SCHEDULED'], default: 'NOW' })
  @IsIn(['NOW', 'SCHEDULED'])
  sendMode!: string;

  @ApiPropertyOptional({ example: '2026-09-01T08:00:00Z' })
  @IsOptional() @IsDateString()
  scheduledAt?: string;
}
