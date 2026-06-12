import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../config/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentGatewayFactory } from './gateways/payment-gateway.factory';
import { MomoCameroonGateway } from './gateways/momo-cameroon.gateway';
import { OrangeMoneyGateway } from './gateways/orange-money.gateway';
import { FlutterwaveCardGateway } from './gateways/flutterwave-card.gateway';
import { UssdFallbackGateway } from './gateways/ussd-fallback.gateway';
import { WalletService } from './wallet/wallet.service';
import { EscrowService } from './wallet/escrow.service';
import { MilestoneEscrowService } from './milestone-escrow.service';
import { TransactionPinService } from './transaction-pin.service';
import { CodService } from './cod.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PaymentsController],
  providers: [
    // Gateways
    MomoCameroonGateway,
    OrangeMoneyGateway,
    FlutterwaveCardGateway,
    UssdFallbackGateway,
    PaymentGatewayFactory,
    // Wallet & Escrow
    WalletService,
    EscrowService,
    MilestoneEscrowService,
    // Security
    TransactionPinService,
    CodService,
    // Main service
    PaymentsService,
  ],
  exports: [PaymentsService, WalletService, EscrowService, MilestoneEscrowService, TransactionPinService, CodService, PaymentGatewayFactory],
})
export class PaymentsModule {}
