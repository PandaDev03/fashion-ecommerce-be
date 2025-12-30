import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class TrackProductViewDto {
  @IsNotEmpty()
  @IsString()
  userIdentifier: string;

  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsString()
  sessionId?: string;

  @IsString()
  source?: string;

  @IsNumber()
  viewDurationSeconds?: number;

  @IsNumber()
  scrollDepthPercent?: number;

  @IsBoolean()
  clickedImages?: boolean;

  @IsBoolean()
  clickedDescription?: boolean;
}
