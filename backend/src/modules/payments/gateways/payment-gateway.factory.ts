import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { IPaymentGateway } from '../../../common/interfaces/payment-gateway.interface';
import { MomoCameroonGateway } from './momo-cameroon.gateway';
import { OrangeMoneyGateway } from './orange-money.gateway';
import { FlutterwaveCardGateway } from './flutterwave-card.gateway';
import { UssdFallbackGateway } from './ussd-fallback.gateway';

/**
 * Factory that resolves the correct IPaymentGateway implementation
 * based on PaymentMethod and countryCode.
 *
 * Resolution matrix:
 *   MOMO   + CM  → MomoCameroonGateway
 *   ORANGE + CM  → OrangeMoneyGateway
 *   CARD         → FlutterwaveCardGateway
 *   USSD   + CM  → UssdFallbackGateway
 */
@Injectable()
export class PaymentGatewayFactory {
  constructor(
    private readonly momoGateway: MomoCameroonGateway,
    private readonly orangeGateway: OrangeMoneyGateway,
    private readonly flutterwaveGateway: FlutterwaveCardGateway,
    private readonly ussdGateway: UssdFallbackGateway,
  ) {}

  /**
   * Returns the appropriate gateway for the given payment method and country.
   *
   * @param method - PaymentMethod enum value
   * @param countryCode - ISO 3166-1 alpha-2 country code (e.g. 'CM')
   * @throws BadRequestException when no gateway is available for the combination
   */
  resolve(method: PaymentMethod, countryCode: string): IPaymentGateway {
    const country = countryCode.toUpperCase();

    switch (method) {
      case PaymentMethod.MOMO:
        if (country === 'CM') return this.momoGateway;
        throw new BadRequestException(
          `MoMo payment is only supported in Cameroon (CM). Got: ${country}`,
        );

      case PaymentMethod.ORANGE:
        if (country === 'CM') return this.orangeGateway;
        throw new BadRequestException(
          `Orange Money is only supported in Cameroon (CM). Got: ${country}`,
        );

      case PaymentMethod.CARD:
        // Flutterwave supports multiple countries; no country restriction applied here
        return this.flutterwaveGateway;

      case PaymentMethod.USSD:
        if (country === 'CM') return this.ussdGateway;
        throw new BadRequestException(
          `USSD fallback is only supported in Cameroon (CM). Got: ${country}`,
        );

      default:
        throw new BadRequestException(
          `No online payment gateway available for method: ${method}. ` +
            'Use WALLET or COD for offline payments.',
        );
    }
  }
}
