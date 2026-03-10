import { IsDateString, IsOptional } from 'class-validator';

export class UpdateVipDto {
  @IsOptional()
  @IsDateString()
  vipExpiresAt?: string;
}
