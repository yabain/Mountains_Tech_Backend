import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTeamStatusDto {
  @ApiProperty({
    enum: ['APPROVED', 'REJECTED'],
    description: 'Nouveau statut de l\'équipe',
  })
  @IsNotEmpty()
  @IsIn(['APPROVED', 'REJECTED'])
  status!: string;

  @ApiPropertyOptional({ example: 'Dossier incomplet.' })
  @IsOptional()
  @IsString()
  reviewComment?: string;
}
