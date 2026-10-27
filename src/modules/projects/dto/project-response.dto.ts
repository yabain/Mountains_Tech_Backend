import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  id!: string;

  @ApiProperty({ example: 'Projet numérique pour les communautés' })
  title!: string;

  @ApiProperty({ example: 'projet-numerique-communautes' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Résumé court du projet' })
  excerpt?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example/project.webp' })
  coverUrl?: string;

  @ApiPropertyOptional({ example: '2026-08-01T00:00:00.000Z' })
  startDate?: Date;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  endDate?: Date;

  @ApiProperty({ example: ['64f1a2b3...'], type: [String] })
  partners!: string[];

  @ApiProperty({ example: ['Innovation', 'Numérique'], type: [String] })
  tags!: string[];

  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], example: 'PUBLISHED' })
  status!: string;

  @ApiPropertyOptional({ example: '2026-08-01T10:00:00.000Z' })
  publishedAt?: Date;

  @ApiProperty({ example: '2026-08-01T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-07T10:00:00.000Z' })
  updatedAt!: Date;
}
