import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMemberStatusDto {
  @ApiProperty({
    enum: ['APPROVED', 'REJECTED', 'SUSPENDED'],
    description: 'Nouveau statut de la candidature / du membre',
  })
  @IsNotEmpty()
  @IsIn(['APPROVED', 'REJECTED', 'SUSPENDED'])
  status!: string;

  @ApiPropertyOptional({
    example: 'Dossier incomplet - merci de fournir les documents manquants.',
    description: 'Commentaire de révision (obligatoire en cas de rejet)',
  })
  @IsOptional()
  @IsString()
  reviewComment?: string;
}
