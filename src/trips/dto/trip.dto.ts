import {
  IsString,
  IsDateString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interests?: string[];
}

export class UpdateTripDto {
  @IsString()
  @IsOptional()
  destination?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interests?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

