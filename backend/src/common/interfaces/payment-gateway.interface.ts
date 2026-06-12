export interface PaymentMetadata {
  userId: string;
  bookingId?: string;
  description?: string;
  callbackUrl?: string;
  phone?: string;
  email?: string;
}

export interface InitiateResult {
  transactionRef: string;
  status: 'pending' | 'redirect';
  redirectUrl?: string;
  message?: string;
}

export interface VerifyResult {
  transactionRef: string;
  status: 'completed' | 'pending' | 'failed';
  amount: number;
  currency: string;
  paidAt?: Date;
  gatewayResponse?: any;
}

export interface WebhookResult {
  transactionRef: string;
  status: 'completed' | 'failed';
  amount: number;
  currency: string;
}

export interface RefundResult {
  transactionRef: string;
  status: 'completed' | 'pending' | 'failed';
  amount: number;
}

export interface IPaymentGateway {
  initiate(amount: number, currency: string, metadata: PaymentMetadata): Promise<InitiateResult>;
  verify(transactionRef: string): Promise<VerifyResult>;
  handleWebhook(payload: any, signature?: string): Promise<WebhookResult>;
  refund(transactionRef: string, amount?: number): Promise<RefundResult>;
  getStatus(transactionRef: string): Promise<VerifyResult>;
}
