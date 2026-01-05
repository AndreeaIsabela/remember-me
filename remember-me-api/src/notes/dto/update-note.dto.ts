import { IsString, IsOptional } from 'class-validator';

export class UpdateNoteDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  source?: string;
}

