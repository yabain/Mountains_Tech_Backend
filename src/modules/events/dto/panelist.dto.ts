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

/**
 * Payload for the multipart POST route. The photo is sent as a `file` field,
 * saved to /uploads, and its URL is stored in photoUrl. photoUrl is NOT read
 * from the body — it always comes from the uploaded file.
 */
export class AddPanelistDto {
  @ApiProperty({ example: 'Aïcha Bello' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'CTO @ Yaba-In' })
  @IsString()
  @IsNotEmpty()
  role!: string;
}

export class UpdatePanelistsDto {
  @ApiProperty({ type: [PanelistDto] })
  @ValidateNested({ each: true })
  @Type(() => PanelistDto)
  panelists!: PanelistDto[];
}
