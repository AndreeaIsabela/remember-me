import {
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Matches,
  ArrayMinSize,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class TimeIntervalDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format (24-hour)',
  })
  startTime: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format (24-hour)',
  })
  endTime: string;
}

export class UpdateNotificationPreferencesDto {
  @IsNumber()
  @Min(1)
  @Max(24)
  @IsOptional()
  notificationsPerDay?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  timezone?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TimeIntervalDto)
  @IsOptional()
  timeIntervals?: TimeIntervalDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
