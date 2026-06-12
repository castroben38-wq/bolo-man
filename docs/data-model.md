# Bolo-Man Data Model

## Entity Relationship Overview

```mermaid
erDiagram
    USER ||--o| PROVIDER : "has (if role=PROVIDER)"
    USER ||--o{ USER_SUBSCRIPTION : subscribes
    USER ||--o{ BOOKING : "books as client"
    USER ||--o{ BOOKING : "receives as provider"
    USER ||--o{ PAYMENT : makes
    USER ||--o{ MESSAGE : sends
    USER ||--o| WALLET : has
    USER ||--o{ CONTACT_ACCESS : accesses
    USER ||--o{ NOTIFICATION : receives

    PROVIDER ||--o{ SERVICE : offers
    PROVIDER ||--o{ CONTACT : has

    CATEGORY ||--o{ SERVICE : contains

    SERVICE ||--o{ BOOKING : booked
    BOOKING ||--o| CONVERSATION : has
    BOOKING ||--o{ PAYMENT : pays
    BOOKING ||--o{ CONTACT_ACCESS : unlocks
    BOOKING ||--o{ REVIEW : reviewed

    SUBSCRIPTION ||--o{ USER_SUBSCRIPTION : assigned

    CONVERSATION ||--o{ MESSAGE : contains

    WALLET ||--o{ WALLET_TRANSACTION : has
```

## Key Design Decisions

1. **Currency as integers (XAF)**: No decimal, amounts stored in smallest unit
2. **PostGIS for geospatial**: Provider/service search by distance
3. **JSONB for features/flexibility**: Subscription features, availability schedules
4. **Country code scoping**: All multi-tenant queries filtered by `country_code`
5. **Soft deletes**: `isActive` flag rather than hard deletion

## Subscription Feature Flags

Each subscription tier has a JSON `features` blob:

| Feature | Classic | Gold | Premium |
|---------|---------|------|---------|
| contact_access | false | true | true |
| max_bookmarks | 5 | 20 | unlimited |
| max_concurrent_bookings | 2 | 5 | unlimited |
| priority_support | false | false | true |
| analytics_access | false | true | true |
| listing_boost (provider) | 0 | 1 | 3 |
| platform_fee_percent | 15% | 10% | 5% |

## Pricing in XAF (Cameroon)

| Tier | Client | Provider |
|------|--------|----------|
| Classic | 2,000/mo | 3,000/mo |
| Gold | 5,000/mo | 8,000/mo |
| Premium | 10,000/mo | 15,000/mo |

Micro-payment contact unlock: 500 XAF for 48 hours.
