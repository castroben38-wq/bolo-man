import { Test, TestingModule } from '@nestjs/testing';
import { PaymentGatewayFactory } from './payment-gateway.factory';
import { MomoCameroonGateway } from './momo-cameroon.gateway';
import { OrangeMoneyGateway } from './orange-money.gateway';
import { FlutterwaveCardGateway } from './flutterwave-card.gateway';
import { UssdFallbackGateway } from './ussd-fallback.gateway';
import { PaymentMethod } from '@prisma/client';

describe('PaymentGatewayFactory', () => {
  let factory: PaymentGatewayFactory;
  let momoGateway: MomoCameroonGateway;
  let orangeGateway: OrangeMoneyGateway;
  let flutterwaveGateway: FlutterwaveCardGateway;
  let ussdGateway: UssdFallbackGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentGatewayFactory,
        { provide: MomoCameroonGateway, useValue: { name: 'momo' } },
        { provide: OrangeMoneyGateway, useValue: { name: 'orange' } },
        { provide: FlutterwaveCardGateway, useValue: { name: 'flutterwave' } },
        { provide: UssdFallbackGateway, useValue: { name: 'ussd' } },
      ],
    }).compile();

    factory = module.get<PaymentGatewayFactory>(PaymentGatewayFactory);
    momoGateway = module.get<MomoCameroonGateway>(MomoCameroonGateway);
    orangeGateway = module.get<OrangeMoneyGateway>(OrangeMoneyGateway);
    flutterwaveGateway = module.get<FlutterwaveCardGateway>(FlutterwaveCardGateway);
    ussdGateway = module.get<UssdFallbackGateway>(UssdFallbackGateway);
  });

  describe('resolve', () => {
    it('should return MomoCameroonGateway for MOMO + CM', () => {
      const result = factory.resolve(PaymentMethod.MOMO, 'CM');
      expect(result).toBe(momoGateway);
    });

    it('should return OrangeMoneyGateway for ORANGE + CM', () => {
      const result = factory.resolve(PaymentMethod.ORANGE, 'CM');
      expect(result).toBe(orangeGateway);
    });

    it('should return FlutterwaveCardGateway for CARD', () => {
      const result = factory.resolve(PaymentMethod.CARD, 'CM');
      expect(result).toBe(flutterwaveGateway);
    });

    it('should return UssdFallbackGateway for USSD + CM', () => {
      const result = factory.resolve(PaymentMethod.USSD, 'CM');
      expect(result).toBe(ussdGateway);
    });

    it('should throw for MoMo outside Cameroon', () => {
      expect(() => factory.resolve(PaymentMethod.MOMO, 'NG')).toThrow(
        'MoMo payment is only supported in Cameroon',
      );
    });

    it('should throw for Orange Money outside Cameroon', () => {
      expect(() => factory.resolve(PaymentMethod.ORANGE, 'NG')).toThrow(
        'Orange Money is only supported in Cameroon',
      );
    });

    it('should throw for unsupported payment method', () => {
      expect(() => factory.resolve('INVALID' as PaymentMethod, 'CM')).toThrow(
        'No online payment gateway available',
      );
    });
  });
});
