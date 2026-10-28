import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleContactReadDto {
  @ApiProperty({ example: true, description: 'true = Lu, false = Non lu' })
  @IsBoolean()
  isRead!: boolean;
}
