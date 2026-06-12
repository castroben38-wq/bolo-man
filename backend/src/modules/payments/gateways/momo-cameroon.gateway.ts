import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  IPaymentGateway,
  PaymentMetadata,
  InitiateResult,
  VerifyResult,
  WebhookResult,
  RefundResult,
} from '../../../common/interfaces/payment-gateway.interface';

/**
 * MTN MoMo Collections API gateway for Cameroon (XAF).
 * Env vars: MOMO_BASE_URL, MOMO_SUBSCRIPTION_KEY, MOMO_API_USER, MOMO_API_KEY, MOMO_TARGET_ENVIRONMENT
 */
@Injectable()
export class MomoCameroonGateway implements IPaymentGateway {
  private readonly logger = new Logger(MomoCameroonGateway.name);
  private readonly baseUrl: string;
  private readonly subscriptionKey: string;
  private readonly apiUser: string;
  private readonly apiKey: string;
  private readonly targetEnvironment: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'MOMO_BASE_URL',
      'https://sandbox.momodeveloper.mtn.com',
    );
    this.subscriptionKey = this.configService.get<string>('MOMO_SUBSCRIPTION_KEY', '');
    this.apiUser = this.configService.get<string>('MOMO_API_USER', '');
    this.apiKey = this.configService.get<string>('MOMO_API_KEY', '');
    this.targetEnvironment = this.configService.get<string>('MOMO_TARGET_ENVIRONMENT', 'sandbox');
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private get authHeader(): string {
    const credentials = Buffer.from(`${this.apiUser}:${this.apiKey}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private defaultHeaders(referenceId?: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': this.subscriptionKey,
      'X-Target-Environment': this.targetEnvironment,
      Authorization: this.authHeader,
      ...(referenceId ? { 'X-Reference-Id': referenceId } : {}),
    };
  }

  private async fetchJson<T>(
    url: string,
    options: RequestInit,
  ): Promise<{ status: number; body: T }> {
    const response = await fetch(url, options);
    let body: T;
    try {
      body = await response.json();
    } catch {
      body = {} as T;
    }
    return { status: response.status, body };
  }

  // ─── IPaymentGateway ──────────────────────────────────────────────────────────

  /**
   * Initiate a request-to-pay (Collections API).
   * Amount must be integer XAF.
   */
  async initiate(
    amount: number,
    currency: string,
    metadata: PaymentMetadata,
  ): Promise<InitiateResult> {
    const referenceId = uuidv4();
    const payload = {
      amount: String(amount),
      currency: currency || 'XAF',
      externalId: metadata.bookingId || metadata.userId,
      payer: {
        partyIdType: 'MSISDN',
        partyId: metadata.phone?.replace(/\+/g, '') || '',
      },
      payerMessage: metadata.description || 'Bolo-Man payment',
      payeeNote: `Booking ${metadata.bookingId || 'N/A'}`,
    };

    this.logger.log(`MoMo initiate: referenceId=${referenceId}`);

    const { status } = await this.fetchJson<any>(
      `${this.baseUrl}/collection/v1_0/requesttopay`,
      {
        method: 'POST',
        headers: this.defaultHeaders(referenceId),
        body: JSON.stringify(payload),
      },
    );

    if (status !== 202) {
      this.logger.error(`MoMo initiate failed: HTTP ${status}`);
      throw new BadRequestException(`MoMo payment initiation failed (HTTP ${status})`);
    }

    return {
      transactionRef: referenceId,
      status: 'pending',
      message: 'Request to pay sent. Awaiting customer approval.',
    };
  }

  /**
   * Poll the Collections API for transaction status.
   */
  async verify(transactionRef: string): Promise<VerifyResult> {
    const { status, body } = await this.fetchJson<any>(
      `${this.baseUrl}/collection/v1_0/requesttopay/${transactionRef}`,
      {
        method: 'GET',
        headers: this.defaultHeaders(),
      },
    );

    if (status !== 200) {
      return {
        transactionRef,
        status: 'failed',
        amount: 0,
        currency: 'XAF',
        gatewayResponse: body,
      };
    }

    const momoStatus: string = body?.status ?? '';
    let mappedStatus: VerifyResult['status'] = 'pending';
    if (momoStatus === 'SUCCESSFUL') mappedStatus = 'completed';
    else if (momoStatus === 'FAILED' || momoStatus === 'REJECTED') mappedStatus = 'failed';

    return {
      transactionRef,
      status: mappedStatus,
      amount: parseInt(body?.amount ?? '0', 10),
      currency: body?.currency ?? 'XAF',
      paidAt: momoStatus === 'SUCCESSFUL' ? new Date() : undefined,
      gatewayResponse: body,
    };
  }

  /** Alias for verify – used by polling scenarios. */
  async getStatus(transactionRef: string): Promise<VerifyResult> {
    return this.verify(transactionRef);
  }

  /**
   * Handle MoMo push callback / webhook.
   * MoMo sends a referenceId in the body; we poll status to confirm.
   */
  async handleWebhook(payload: any, _signature?: string): Promise<WebhookResult> {
    const transactionRef: string = payload?.referenceId ?? payload?.externalId ?? '';

    if (!transactionRef) {
      throw new BadRequestException('MoMo webhook: missing referenceId');
    }

    const result = await this.verify(transactionRef);

    return {
      transactionRef,
      status: result.status === 'completed' ? 'completed' : 'failed',
      amount: result.amount,
      currency: result.currency,
    };
  }

  /**
   * Refund via MoMo Disbursements API (transfer back to customer).
   */
  async refund(transactionRef: string, amount?: number): Promise<RefundResult> {
    const referenceId = uuidv4();

    // Fetch original transaction to get amount/phone if not provided
    const original = await this.verify(transactionRef);
    const refundAmount = amount ?? original.amount;

    const payload = {
      amount: String(refundAmount),
      currency: original.currency || 'XAF',
      externalId: transactionRef,
      payee: {
        partyIdType: 'MSISDN',
        partyId: (original.gatewayResponse?.payer?.partyId ?? '').replace(/\+/g, ''),
      },
      payerMessage: 'Refund',
      payeeNote: `Refund for ${transactionRef}`,
    };

    const { status } = await this.fetchJson<any>(
      `${this.baseUrl}/disbursement/v1_0/transfer`,
      {
        method: 'POST',
        headers: {
          ...this.defaultHeaders(referenceId),
          'Ocp-Apim-Subscription-Key':
            this.configService.get<string>('MOMO_DISBURSEMENT_SUBSCRIPTION_KEY', '') ||
            this.subscriptionKey,
        },
        body: JSON.stringify(payload),
      },
    );

    return {
      transactionRef: referenceId,
      status: status === 202 ? 'pending' : 'failed',
      amount: refundAmount,
    };
  }
}
