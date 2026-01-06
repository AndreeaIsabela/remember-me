import {
  IsNotEmpty,
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
} from 'class-validator';
import { Type } from 'class-transformer';

export class TimeIntervalDto {
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

export class CreateNotificationPreferencesDto {
  @IsNumber()
  @Min(1)
  @Max(24)
  notificationsPerDay: number;

  @IsString()
  @IsNotEmpty()
  timezone: string; // e.g., 'Europe/Bucharest'

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TimeIntervalDto)
  timeIntervals: TimeIntervalDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

