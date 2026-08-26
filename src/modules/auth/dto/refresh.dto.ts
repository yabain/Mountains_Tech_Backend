import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token JWT' })
  @IsNotEmpty()
  @IsString()
  refreshToken!: string;
}
