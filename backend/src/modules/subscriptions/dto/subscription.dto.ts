import {
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class SubscribeDto {
  @ApiProperty({ description: 'Subscription plan ID (UUID)' })
  @IsUUID()
  subscriptionId: string;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.MOMO })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ default: true, description: 'Enable auto-renewal' })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

export class UpdateSubscriptionDto {
  @ApiProperty({ description: 'New subscription plan ID to upgrade or downgrade to' })
  @IsUUID()
  subscriptionId: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
