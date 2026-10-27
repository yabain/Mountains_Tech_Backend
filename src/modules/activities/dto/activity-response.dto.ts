import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  id!: string;

  @ApiProperty({ example: 'Atelier développement web' })
  title!: string;

  @ApiProperty({ example: 'atelier-developpement-web' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Un résumé court de l\'activité' })
  excerpt?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example/cover.webp' })
  coverUrl?: string;

  @ApiPropertyOptional({ example: 'FORMATION' })
  category?: string;

  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], example: 'PUBLISHED' })
  status!: string;

  @ApiPropertyOptional({ example: '2026-08-01T10:00:00.000Z' })
  publishedAt?: Date;

  @ApiProperty({ example: '2026-08-01T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-07T10:00:00.000Z' })
  updatedAt!: Date;
}
