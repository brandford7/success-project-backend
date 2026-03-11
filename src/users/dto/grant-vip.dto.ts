import { IsInt, Min, IsEnum, IsOptional } from 'class-validator';

export enum VipDuration {
  ONE_DAY = 1,
  ONE_MONTH = 30,
  THREE_MONTHS = 90,
  SIX_MONTHS = 180,
  ONE_YEAR = 365,
}

export class GrantVipDto {
  @IsEnum(VipDuration)
  duration!: VipDuration;

  @IsOptional()
  @IsInt()
  @Min(1)
  customDays?: number; // For admin to set custom duration
}
