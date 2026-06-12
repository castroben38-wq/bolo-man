# Multi-Country Expansion Guide

## Adding a New Country

### 1. Seed Data

Add in `prisma/seed.ts`:
- Locations (cities)
- Subscription plans with local currency
- Service categories (localized names)
- Default admin settings for country

### 2. Payment Gateways

Register new adapters in `PaymentGatewayFactory`:

```typescript
// Nigeria - NGN - Paystack
case 'NG':
  return new PaystackAdapter(this.configService);
```

### 3. Localization

Add JSON translation file:
- `src/i18n/ng.json` (English for Nigeria)
- `src/i18n/sw.json` (Swahili)

### 4. Currency Support

Add currency to `AdminSettings.supported_currencies`:
- Default: XAF
- Nigeria: NGN
- Gabon: XAF

### 5. Compliance

Per-country requirements:
- **Nigeria**: Paystack integration, BVN verification
- **Chad**: MTN MoMo Chad, local tax requirements
- **Gabon**: Airtel Money, local regulations

### Implementation Checklist

- [ ] Seed locations for new country
- [ ] Add payment gateway adapter(s)
- [ ] Add localization files
- [ ] Configure subscription pricing in local currency
- [ ] Update terms/privacy policy for country
- [ ] Test payment flows in sandbox
- [ ] Configure KYC requirements (if any)
