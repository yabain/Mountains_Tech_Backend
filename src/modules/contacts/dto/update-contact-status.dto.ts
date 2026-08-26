import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateContactStatusDto {
  @ApiProperty({ enum: ['IN_PROGRESS', 'RESOLVED', 'SPAM'] })
  @IsNotEmpty()
  @IsIn(['IN_PROGRESS', 'RESOLVED', 'SPAM'])
  status!: string;
}
