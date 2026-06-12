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
 * Orange Money Cameroon payment gateway.
 * Env vars: ORANGE_MONEY_BASE_URL, ORANGE_MONEY_CLIENT_ID, ORANGE_MONEY_CLIENT_SECRET,
 *           ORANGE_MONEY_MERCHANT_KEY, ORANGE_MONEY_NOTIFY_URL
 */
@Injectable()
export class OrangeMoneyGateway implements IPaymentGateway {
  private readonly logger = new Logger(OrangeMoneyGateway.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly merchantKey: string;
  private readonly notifyUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'ORANGE_MONEY_BASE_URL',
      'https://api.orange.com/orange-money-webpay/cm/v1',
    );
    this.clientId = this.configService.get<string>('ORANGE_MONEY_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>('ORANGE_MONEY_CLIENT_SECRET', '');
    this.merchantKey = this.configService.get<string>('ORANGE_MONEY_MERCHANT_KEY', '');
    this.notifyUrl = this.configService.get<string>('ORANGE_MONEY_NOTIFY_URL', '');
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://api.orange.com/oauth/v3/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new BadRequestException('Orange Money: failed to obtain access token');
    }

    const data = await response.json();
    return data.access_token as string;
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
   * Create a WebPay payment session with Orange Money.
   */
  async initiate(
    amount: number,
    currency: string,
    metadata: PaymentMetadata,
  ): Promise<InitiateResult> {
    const token = await this.getAccessToken();
    const orderId = metadata.bookingId || uuidv4();

    const payload = {
      merchant_key: this.merchantKey,
      currency: currency || 'XAF',
      order_id: orderId,
      amount: amount,
      return_url: metadata.callbackUrl || this.notifyUrl,
      cancel_url: metadata.callbackUrl || this.notifyUrl,
      notif_url: this.notifyUrl,
      lang: 'fr',
      reference: orderId,
    };

    this.logger.log(`Orange Money initiate: order=${orderId}`);

    const { status, body } = await this.fetchJson<any>(
      `${this.baseUrl}/webpayment`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (status !== 200 && status !== 201) {
      this.logger.error(`Orange Money initiate failed: HTTP ${status}`, body);
      throw new BadRequestException(`Orange Money payment initiation failed (HTTP ${status})`);
    }

    const payToken: string = body?.pay_token ?? orderId;
    const payUrl: string = body?.payment_url ?? '';

    return {
      transactionRef: payToken,
      status: payUrl ? 'redirect' : 'pending',
      redirectUrl: payUrl || undefined,
      message: payUrl
        ? 'Redirect customer to payment URL'
        : 'Orange Money payment pending customer confirmation',
    };
  }

  /**
   * Check payment status using the pay_token.
   */
  async verify(transactionRef: string): Promise<VerifyResult> {
    const token = await this.getAccessToken();

    const { status, body } = await this.fetchJson<any>(
      `${this.baseUrl}/webpayment/${transactionRef}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
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

    const omStatus: string = body?.status ?? '';
    let mappedStatus: VerifyResult['status'] = 'pending';
    if (omStatus === 'SUCCESS' || omStatus === 'SUCCESSFULL') mappedStatus = 'completed';
    else if (omStatus === 'FAILED' || omStatus === 'CANCELLED' || omStatus === 'EXPIRED')
      mappedStatus = 'failed';

    return {
      transactionRef,
      status: mappedStatus,
      amount: parseInt(String(body?.amount ?? '0'), 10),
      currency: body?.currency ?? 'XAF',
      paidAt: mappedStatus === 'completed' ? new Date() : undefined,
      gatewayResponse: body,
    };
  }

  /** Alias for verify. */
  async getStatus(transactionRef: string): Promise<VerifyResult> {
    return this.verify(transactionRef);
  }

  /**
   * Process Orange Money webhook callback.
   */
  async handleWebhook(payload: any, _signature?: string): Promise<WebhookResult> {
    const transactionRef: string =
      payload?.pay_token ?? payload?.txnid ?? payload?.order_id ?? '';

    if (!transactionRef) {
      throw new BadRequestException('Orange Money webhook: missing pay_token / txnid');
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
   * Refunds are not natively supported by Orange Money WebPay; returns pending for manual processing.
   */
  async refund(transactionRef: string, amount?: number): Promise<RefundResult> {
    this.logger.warn(
      `Orange Money refund requested for ${transactionRef} – manual processing required`,
    );
    const original = await this.verify(transactionRef);
    return {
      transactionRef,
      status: 'pending',
      amount: amount ?? original.amount,
    };
  }
}
