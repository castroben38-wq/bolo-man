import { PrismaClient, Role, SubscriptionTier, PriceUnit } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Bolo-Man database...');

  // ============ LOCATIONS ============
  const locations = await Promise.all([
    prisma.location.create({ data: { countryCode: 'CM', countryName: 'Cameroon', city: 'Douala', region: 'Littoral', latitude: 4.0511, longitude: 9.7679 } }),
    prisma.location.create({ data: { countryCode: 'CM', countryName: 'Cameroon', city: 'Yaoundé', region: 'Centre', latitude: 3.8480, longitude: 11.5021 } }),
    prisma.location.create({ data: { countryCode: 'CM', countryName: 'Cameroon', city: 'Bamenda', region: 'North-West', latitude: 5.9631, longitude: 10.1591 } }),
    prisma.location.create({ data: { countryCode: 'CM', countryName: 'Cameroon', city: 'Bafoussam', region: 'West', latitude: 5.4737, longitude: 10.4176 } }),
    prisma.location.create({ data: { countryCode: 'CM', countryName: 'Cameroon', city: 'Garoua', region: 'North', latitude: 9.3014, longitude: 13.3986 } }),
    prisma.location.create({ data: { countryCode: 'CM', countryName: 'Cameroon', city: 'Maroua', region: 'Far North', latitude: 10.5953, longitude: 14.3157 } }),
    prisma.location.create({ data: { countryCode: 'CM', countryName: 'Cameroon', city: 'Buea', region: 'South-West', latitude: 4.1560, longitude: 9.2313 } }),
    prisma.location.create({ data: { countryCode: 'CM', countryName: 'Cameroon', city: 'Limbe', region: 'South-West', latitude: 4.0186, longitude: 9.2043 } }),
    prisma.location.create({ data: { countryCode: 'CM', countryName: 'Cameroon', city: 'Kribi', region: 'South', latitude: 2.9389, longitude: 9.9081 } }),
    prisma.location.create({ data: { countryCode: 'CM', countryName: 'Cameroon', city: 'Bertoua', region: 'East', latitude: 4.5772, longitude: 13.6847 } }),
  ]);
  console.log(`  ✓ ${locations.length} locations created`);

  // ============ CATEGORIES ============
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Electrician', nameEn: 'Electrician', nameFr: 'Électricien', icon: 'zap', sortOrder: 1 } }),
    prisma.category.create({ data: { name: 'Plumber', nameEn: 'Plumber', nameFr: 'Plombier', icon: 'droplet', sortOrder: 2 } }),
    prisma.category.create({ data: { name: 'Carpenter', nameEn: 'Carpenter', nameFr: 'Menuisier', icon: 'hammer', sortOrder: 3 } }),
    prisma.category.create({ data: { name: 'Cleaner', nameEn: 'Cleaner', nameFr: 'Nettoyeur', icon: 'sparkles', sortOrder: 4 } }),
    prisma.category.create({ data: { name: 'Painter', nameEn: 'Painter', nameFr: 'Peintre', icon: 'paintbrush', sortOrder: 5 } }),
    prisma.category.create({ data: { name: 'Mechanic', nameEn: 'Auto Mechanic', nameFr: 'Mécanicien', icon: 'wrench', sortOrder: 6 } }),
    prisma.category.create({ data: { name: 'IT Support', nameEn: 'IT Support', nameFr: 'Support Informatique', icon: 'monitor', sortOrder: 7 } }),
    prisma.category.create({ data: { name: 'Landscaper', nameEn: 'Landscaper', nameFr: 'Jardinier', icon: 'tree', sortOrder: 8 } }),
    prisma.category.create({ data: { name: 'Appliance Repair', nameEn: 'Appliance Repair', nameFr: 'Réparation Appareils', icon: 'settings', sortOrder: 9 } }),
    prisma.category.create({ data: { name: 'Pest Control', nameEn: 'Pest Control', nameFr: 'Désinsectisation', icon: 'bug', sortOrder: 10 } }),
    prisma.category.create({ data: { name: 'Catering', nameEn: 'Catering', nameFr: 'Traiteur', icon: 'utensils', sortOrder: 11 } }),
    prisma.category.create({ data: { name: 'Laundry', nameEn: 'Laundry', nameFr: 'Blanchisserie', icon: 'shirt', sortOrder: 12 } }),
    prisma.category.create({ data: { name: 'Handyman', nameEn: 'Handyman', nameFr: 'Bricoleur', icon: 'tool', sortOrder: 13 } }),
    prisma.category.create({ data: { name: 'Car Wash', nameEn: 'Mobile Car Wash', nameFr: 'Lavage Auto', icon: 'car', sortOrder: 14 } }),
    prisma.category.create({ data: { name: 'Tutor', nameEn: 'Tutor', nameFr: 'Tuteur', icon: 'book', sortOrder: 15 } }),
  ]);
  console.log(`  ✓ ${categories.length} categories created`);

  // ============ SUBSCRIPTIONS ============
  const subscriptions = await Promise.all([
    // Client subscriptions
    prisma.subscription.create({
      data: {
        name: 'Classic',
        tier: SubscriptionTier.CLASSIC,
        price: 2000,
        currency: 'XAF',
        durationDays: 30,
        targetRole: Role.CLIENT,
        features: {
          contact_access: false,
          max_bookmarks: 5,
          max_concurrent_bookings: 2,
          priority_support: false,
          analytics_access: false,
        },
      },
    }),
    prisma.subscription.create({
      data: {
        name: 'Gold',
        tier: SubscriptionTier.GOLD,
        price: 5000,
        currency: 'XAF',
        durationDays: 30,
        targetRole: Role.CLIENT,
        features: {
          contact_access: true,
          max_bookmarks: 20,
          max_concurrent_bookings: 5,
          priority_support: false,
          analytics_access: true,
        },
      },
    }),
    prisma.subscription.create({
      data: {
        name: 'Premium',
        tier: SubscriptionTier.PREMIUM,
        price: 10000,
        currency: 'XAF',
        durationDays: 30,
        targetRole: Role.CLIENT,
        features: {
          contact_access: true,
          max_bookmarks: -1,
          max_concurrent_bookings: -1,
          priority_support: true,
          analytics_access: true,
        },
      },
    }),
    // Provider subscriptions
    prisma.subscription.create({
      data: {
        name: 'Classic Provider',
        tier: SubscriptionTier.CLASSIC,
        price: 3000,
        currency: 'XAF',
        durationDays: 30,
        targetRole: Role.PROVIDER,
        features: {
          listing_boost: 0,
          platform_fee_percent: 15,
          max_services: 3,
          priority_support: false,
          analytics_access: false,
        },
      },
    }),
    prisma.subscription.create({
      data: {
        name: 'Gold Provider',
        tier: SubscriptionTier.GOLD,
        price: 8000,
        currency: 'XAF',
        durationDays: 30,
        targetRole: Role.PROVIDER,
        features: {
          listing_boost: 1,
          platform_fee_percent: 10,
          max_services: 10,
          priority_support: false,
          analytics_access: true,
        },
      },
    }),
    prisma.subscription.create({
      data: {
        name: 'Premium Provider',
        tier: SubscriptionTier.PREMIUM,
        price: 15000,
        currency: 'XAF',
        durationDays: 30,
        targetRole: Role.PROVIDER,
        features: {
          listing_boost: 3,
          platform_fee_percent: 5,
          max_services: -1,
          priority_support: true,
          analytics_access: true,
        },
      },
    }),
  ]);
  console.log(`  ✓ ${subscriptions.length} subscription plans created`);

  // ============ ADMIN USER ============
  const adminPassword = await argon2.hash('admin123!');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@boloman.cm',
      phone: '+237600000000',
      name: 'Bolo-Man Admin',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isVerified: true,
      language: 'fr',
    },
  });
  console.log(`  ✓ Admin user created: ${admin.email}`);

  // ============ SAMPLE PROVIDERS ============
  const providerPassword = await argon2.hash('provider123!');
  const providerUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'jean.electricien@boloman.cm',
        phone: '+237670000001',
        name: 'Jean Tchinda',
        passwordHash: providerPassword,
        role: Role.PROVIDER,
        isVerified: true,
        language: 'fr',
      },
    }),
    prisma.user.create({
      data: {
        email: 'paul.plombier@boloman.cm',
        phone: '+237670000002',
        name: 'Paul Njoya',
        passwordHash: providerPassword,
        role: Role.PROVIDER,
        isVerified: true,
        language: 'fr',
      },
    }),
    prisma.user.create({
      data: {
        email: 'marie.cleaner@boloman.cm',
        phone: '+237670000003',
        name: 'Marie Fotso',
        passwordHash: providerPassword,
        role: Role.PROVIDER,
        isVerified: true,
        language: 'fr',
      },
    }),
  ]);

  const providers = await Promise.all([
    prisma.provider.create({
      data: {
        userId: providerUsers[0].id,
        businessName: 'Tchinda Électricité',
        description: 'Expert en installations électriques résidentielles et commerciales à Douala',
        categories: [categories[0].id],
        isVerified: true,
        rating: 4.7,
        reviewsCount: 23,
        latitude: 4.0511,
        longitude: 9.7679,
        maxDistanceKm: 15,
        availability: {
          monday: { start: '08:00', end: '18:00' },
          tuesday: { start: '08:00', end: '18:00' },
          wednesday: { start: '08:00', end: '18:00' },
          thursday: { start: '08:00', end: '18:00' },
          friday: { start: '08:00', end: '18:00' },
          saturday: { start: '09:00', end: '14:00' },
          sunday: null,
        },
      },
    }),
    prisma.provider.create({
      data: {
        userId: providerUsers[1].id,
        businessName: 'Njoya Plomberie',
        description: 'Plombier professionnel, dépannage et installation sanitaire',
        categories: [categories[1].id],
        isVerified: true,
        rating: 4.5,
        reviewsCount: 15,
        latitude: 3.8480,
        longitude: 11.5021,
        maxDistanceKm: 20,
        availability: {
          monday: { start: '07:00', end: '17:00' },
          tuesday: { start: '07:00', end: '17:00' },
          wednesday: { start: '07:00', end: '17:00' },
          thursday: { start: '07:00', end: '17:00' },
          friday: { start: '07:00', end: '17:00' },
          saturday: { start: '08:00', end: '13:00' },
          sunday: null,
        },
      },
    }),
    prisma.provider.create({
      data: {
        userId: providerUsers[2].id,
        businessName: 'Fotso Nettoyage Pro',
        description: 'Service de nettoyage professionnel pour maisons et bureaux',
        categories: [categories[3].id],
        isVerified: true,
        rating: 4.8,
        reviewsCount: 31,
        latitude: 4.0511,
        longitude: 9.7679,
        maxDistanceKm: 10,
        availability: {
          monday: { start: '06:00', end: '18:00' },
          tuesday: { start: '06:00', end: '18:00' },
          wednesday: { start: '06:00', end: '18:00' },
          thursday: { start: '06:00', end: '18:00' },
          friday: { start: '06:00', end: '18:00' },
          saturday: { start: '07:00', end: '16:00' },
          sunday: { start: '08:00', end: '12:00' },
        },
      },
    }),
  ]);

  // Create contacts for providers
  await Promise.all([
    prisma.contact.create({
      data: { providerId: providers[0].id, phone: '+237670000001', whatsapp: '+237670000001', address: 'Akwa, Douala', accessRequirement: 'GOLD' },
    }),
    prisma.contact.create({
      data: { providerId: providers[1].id, phone: '+237670000002', whatsapp: '+237670000002', address: 'Bastos, Yaoundé', accessRequirement: 'GOLD' },
    }),
    prisma.contact.create({
      data: { providerId: providers[2].id, phone: '+237670000003', whatsapp: '+237670000003', address: 'Bonapriso, Douala', accessRequirement: 'GOLD' },
    }),
  ]);

  // Create services
  await Promise.all([
    prisma.service.create({
      data: { providerId: providers[0].id, categoryId: categories[0].id, name: 'Installation électrique complète', basePrice: 25000, priceUnit: PriceUnit.FLAT, rating: 4.7, reviewsCount: 12 },
    }),
    prisma.service.create({
      data: { providerId: providers[0].id, categoryId: categories[0].id, name: 'Dépannage électrique urgent', basePrice: 5000, priceUnit: PriceUnit.HOURLY, rating: 4.6, reviewsCount: 11 },
    }),
    prisma.service.create({
      data: { providerId: providers[1].id, categoryId: categories[1].id, name: 'Réparation fuite d\'eau', basePrice: 8000, priceUnit: PriceUnit.FLAT, rating: 4.5, reviewsCount: 8 },
    }),
    prisma.service.create({
      data: { providerId: providers[1].id, categoryId: categories[1].id, name: 'Installation sanitaire', basePrice: 35000, priceUnit: PriceUnit.FLAT, rating: 4.4, reviewsCount: 7 },
    }),
    prisma.service.create({
      data: { providerId: providers[2].id, categoryId: categories[3].id, name: 'Nettoyage maison (3 pièces)', basePrice: 15000, priceUnit: PriceUnit.FLAT, rating: 4.8, reviewsCount: 20 },
    }),
    prisma.service.create({
      data: { providerId: providers[2].id, categoryId: categories[3].id, name: 'Nettoyage bureau', basePrice: 3000, priceUnit: PriceUnit.HOURLY, rating: 4.9, reviewsCount: 11 },
    }),
  ]);
  console.log(`  ✓ ${providers.length} providers with services created`);

  // ============ SAMPLE CLIENTS ============
  const clientPassword = await argon2.hash('client123!');
  const clients = await Promise.all([
    prisma.user.create({
      data: { email: 'alice@example.cm', phone: '+237680000001', name: 'Alice Mbarga', passwordHash: clientPassword, role: Role.CLIENT, isVerified: true, language: 'fr' },
    }),
    prisma.user.create({
      data: { email: 'bob@example.cm', phone: '+237680000002', name: 'Bob Ndongo', passwordHash: clientPassword, role: Role.CLIENT, isVerified: true, language: 'en' },
    }),
    prisma.user.create({
      data: { email: 'claire@example.cm', phone: '+237680000003', name: 'Claire Atangana', passwordHash: clientPassword, role: Role.CLIENT, isVerified: true, language: 'fr' },
    }),
  ]);
  console.log(`  ✓ ${clients.length} client users created`);

  // ============ ADMIN SETTINGS ============
  await Promise.all([
    prisma.adminSetting.create({ data: { key: 'platform_commission_percent', value: 15, description: 'Default platform commission percentage' } }),
    prisma.adminSetting.create({ data: { key: 'micro_payment_contact_access_price', value: 500, description: 'Price in XAF for micro-payment contact access (48h)' } }),
    prisma.adminSetting.create({ data: { key: 'micro_payment_access_duration_hours', value: 48, description: 'Duration of micro-payment contact access in hours' } }),
    prisma.adminSetting.create({ data: { key: 'cancellation_fee_percent', value: 10, description: 'Cancellation fee as percentage of booking price' } }),
    prisma.adminSetting.create({ data: { key: 'supported_countries', value: ['CM'], description: 'List of supported country codes' } }),
    prisma.adminSetting.create({ data: { key: 'supported_languages', value: ['fr', 'en', 'ff'], description: 'Supported language codes' } }),
  ]);
  console.log('  ✓ Admin settings created');

  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
