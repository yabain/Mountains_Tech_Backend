import { IsIn, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePartnerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: ['INSTITUTIONAL', 'TECHNICAL', 'FINANCIAL', 'MEDIA'] })
  @IsOptional() @IsIn(['INSTITUTIONAL', 'TECHNICAL', 'FINANCIAL', 'MEDIA']) type?: string;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) order?: number;
}
