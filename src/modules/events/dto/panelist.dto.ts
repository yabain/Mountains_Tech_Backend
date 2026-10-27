import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PanelistDto {
  @ApiProperty({ example: 'Aïcha Bello' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'CTO @ Yaba-In' })
  @IsString()
  @IsNotEmpty()
  role!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example/panelists/aicha.webp' })
  @IsString()
  @IsOptional()
  photoUrl?: string;
}

export class AddPanelistDto extends PanelistDto {}

export class UpdatePanelistsDto {
  @ApiProperty({ type: [PanelistDto] })
  @ValidateNested({ each: true })
  @Type(() => PanelistDto)
  panelists!: PanelistDto[];
}
