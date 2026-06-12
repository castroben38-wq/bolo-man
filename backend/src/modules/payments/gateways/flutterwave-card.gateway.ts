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
 * Flutterwave v3 card payment gateway.
 * Env vars: FLW_BASE_URL, FLW_SECRET_KEY, FLW_PUBLIC_KEY, FLW_ENCRYPTION_KEY, FLW_WEBHOOK_SECRET
 */
@Injectable()
export class FlutterwaveCardGateway implements IPaymentGateway {
  private readonly logger = new Logger(FlutterwaveCardGateway.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'FLW_BASE_URL',
      'https://api.flutterwave.com/v3',
    );
    this.secretKey = this.configService.get<string>('FLW_SECRET_KEY', '');
    this.webhookSecret = this.configService.get<string>('FLW_WEBHOOK_SECRET', '');
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
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
   * Initiate a Flutterwave standard (redirect) or inline payment.
   * Returns a redirect URL to the Flutterwave hosted payment page.
   */
  async initiate(
    amount: number,
    currency: string,
    metadata: PaymentMetadata,
  ): Promise<InitiateResult> {
    const txRef = `bolo-${uuidv4()}`;

    const payload = {
      tx_ref: txRef,
      amount: amount,
      currency: currency || 'XAF',
      redirect_url: metadata.callbackUrl || `${this.configService.get('APP_URL', '')}/payments/callback`,
      payment_options: 'card',
      customer: {
        email: metadata.email || `${metadata.userId}@bolo-man.cm`,
        phonenumber: metadata.phone || '',
        name: `User ${metadata.userId}`,
      },
      customizations: {
        title: 'Bolo-Man',
        description: metadata.description || 'Service payment',
        logo: this.configService.get<string>('APP_LOGO_URL', ''),
      },
      meta: {
        userId: metadata.userId,
        bookingId: metadata.bookingId || '',
      },
    };

    this.logger.log(`Flutterwave initiate: tx_ref=${txRef}`);

    const { status, body } = await this.fetchJson<any>(
      `${this.baseUrl}/payments`,
      {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify(payload),
      },
    );

    if (status !== 200 || body?.status !== 'success') {
      this.logger.error(`Flutterwave initiate failed: HTTP ${status}`, body);
      throw new BadRequestException(
        `Flutterwave payment initiation failed: ${body?.message ?? 'Unknown error'}`,
      );
    }

    return {
      transactionRef: txRef,
      status: 'redirect',
      redirectUrl: body?.data?.link,
      message: 'Redirect customer to Flutterwave checkout',
    };
  }

  /**
   * Verify a completed transaction by tx_ref or flutterwave transaction ID.
   */
  async verify(transactionRef: string): Promise<VerifyResult> {
    // Try verifying by tx_ref first
    const { status, body } = await this.fetchJson<any>(
      `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${transactionRef}`,
      {
        method: 'GET',
        headers: this.authHeaders,
      },
    );

    if (status !== 200 || body?.status !== 'success') {
      return {
        transactionRef,
        status: 'failed',
        amount: 0,
        currency: 'XAF',
        gatewayResponse: body,
      };
    }

    const data = body?.data ?? {};
    const flwStatus: string = data?.status ?? '';

    let mappedStatus: VerifyResult['status'] = 'pending';
    if (flwStatus === 'successful') mappedStatus = 'completed';
    else if (flwStatus === 'failed' || flwStatus === 'cancelled') mappedStatus = 'failed';

    return {
      transactionRef,
      status: mappedStatus,
      amount: parseInt(String(data?.amount ?? '0'), 10),
      currency: data?.currency ?? 'XAF',
      paidAt: mappedStatus === 'completed' ? new Date(data?.created_at ?? Date.now()) : undefined,
      gatewayResponse: data,
    };
  }

  /** Alias for verify. */
  async getStatus(transactionRef: string): Promise<VerifyResult> {
    return this.verify(transactionRef);
  }

  /**
   * Validate Flutterwave webhook signature and process event.
   * Flutterwave sends verif-hash header; compare with FLW_WEBHOOK_SECRET.
   */
  async handleWebhook(payload: any, signature?: string): Promise<WebhookResult> {
    if (this.webhookSecret && signature && signature !== this.webhookSecret) {
      throw new BadRequestException('Flutterwave webhook: invalid signature');
    }

    const event = payload?.event ?? '';
    const data = payload?.data ?? {};
    const transactionRef: string = data?.tx_ref ?? data?.txRef ?? '';

    if (!transactionRef) {
      throw new BadRequestException('Flutterwave webhook: missing tx_ref');
    }

    // Verify with Flutterwave even on webhook to prevent fraud
    const result = await this.verify(transactionRef);

    let webhookStatus: WebhookResult['status'] = 'failed';
    if (event === 'charge.completed' && result.status === 'completed') {
      webhookStatus = 'completed';
    }

    return {
      transactionRef,
      status: webhookStatus,
      amount: result.amount,
      currency: result.currency,
    };
  }

  /**
   * Initiate a refund via Flutterwave v3 refunds API.
   */
  async refund(transactionRef: string, amount?: number): Promise<RefundResult> {
    const original = await this.verify(transactionRef);

    if (!original.gatewayResponse?.id) {
      this.logger.warn(`Flutterwave refund: no gateway transaction ID for ${transactionRef}`);
      return { transactionRef, status: 'failed', amount: amount ?? original.amount };
    }

    const gatewayTxId: number = original.gatewayResponse.id;
    const refundAmount = amount ?? original.amount;

    const { status, body } = await this.fetchJson<any>(
      `${this.baseUrl}/transactions/${gatewayTxId}/refund`,
      {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify({ amount: refundAmount }),
      },
    );

    if (status !== 200 || body?.status !== 'success') {
      this.logger.error(`Flutterwave refund failed: HTTP ${status}`, body);
      return { transactionRef, status: 'failed', amount: refundAmount };
    }

    return {
      transactionRef,
      status: 'pending',
      amount: refundAmount,
    };
  }
}
