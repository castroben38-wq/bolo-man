import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPaymentGateway, InitiateResult, VerifyResult, WebhookResult, RefundResult, PaymentMetadata } from '../../common/interfaces/payment-gateway.interface';

@Injectable()
export class UssdFallbackGateway implements IPaymentGateway {
  constructor(private configService: ConfigService) {}

  async initiate(amount: number, currency: string, metadata: PaymentMetadata): Promise<InitiateResult> {
    const { phone, userId } = metadata;

    if (!phone) {
      throw new BadRequestException('Phone number required for USSD payment');
    }

    // Generate USSD code based on provider
    // Example: *126*1*1*AMOUNT*MERCHANT_CODE# for MTN MoMo USSD
    const ussdCode = this.buildUssdCode(phone, amount);

    return {
      transactionRef: `ussd_${Date.now()}_${userId}`,
      status: 'pending',
      message: `Dial ${ussdCode} on your phone to complete payment`,
    };
  }

  async verify(transactionRef: string): Promise<VerifyResult> {
    // USSD payments are confirmed via webhook or polling
    return {
      transactionRef,
      status: 'pending',
      amount: 0,
      currency: 'XAF',
    };
  }

  async handleWebhook(payload: any): Promise<WebhookResult> {
    const { transactionRef, status, amount } = payload;
    return {
      transactionRef,
      status: status === 'success' ? 'completed' : 'failed',
      amount: amount || 0,
      currency: 'XAF',
    };
  }

  async refund(): Promise<RefundResult> {
    throw new BadRequestException('USSD payments do not support automatic refunds');
  }

  async getStatus(transactionRef: string): Promise<VerifyResult> {
    return this.verify(transactionRef);
  }

  private buildUssdCode(phone: string, amount: number): string {
    // MTN MoMo Cameroon USSD: *126*1*1*AMOUNT*MERCHANT_CODE#
    // Orange Money Cameroon USSD: *144*1*1*AMOUNT*MERCHANT_CODE#
    const merchantCode = this.configService.get('USSD_MERCHANT_CODE', '123456');

    if (phone.startsWith('+2376') || phone.startsWith('6')) {
      return `*126*1*1*${amount}*${merchantCode}#`;
    }
    if (phone.startsWith('+2377') || phone.startsWith('7')) {
      return `*144*1*1*${amount}*${merchantCode}#`;
    }

    return `*126*1*1*${amount}*${merchantCode}#`;
  }
}
