import React from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const categories = [
  { id: '1', name: 'Électricien', icon: '⚡', color: '#FEF3C7' },
  { id: '2', name: 'Plombier', icon: '💧', color: '#DBEAFE' },
  { id: '3', name: 'Nettoyage', icon: '✨', color: '#D1FAE5' },
  { id: '4', name: 'Mécanicien', icon: '🔧', color: '#F3E8FF' },
  { id: '5', name: 'Informatique', icon: '💻', color: '#FED7AA' },
  { id: '6', name: 'Peintre', icon: '🎨', color: '#FECACA' },
];

const providers = [
  { id: '1', name: 'Tchinda Électricité', rating: 4.7, distance: 2.5, price: 25000, category: 'Électricien', verified: true, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
  { id: '2', name: 'Njoya Plomberie', rating: 4.5, distance: 5.0, price: 8000, category: 'Plombier', verified: true, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop' },
  { id: '3', name: 'Fotso Nettoyage Pro', rating: 4.8, distance: 1.2, price: 15000, category: 'Nettoyage', verified: true, image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
];

const formatXAF = (amount: number) => `${amount.toLocaleString('fr-FR')} XAF`;

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with gradient */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Bienvenue 👋</Text>
          <Text style={styles.title}>Trouvez un</Text>
          <Text style={styles.titleAccent}>prestataire près de vous</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un service..."
            placeholderTextColor="#A8A29E"
          />
        </View>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Catégories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
          {categories.map((cat, index) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, { backgroundColor: cat.color }, index === 0 && styles.categoryCardFirst]}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={styles.categoryName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Nearby Providers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Près de vous</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {providers.map((provider) => (
          <TouchableOpacity key={provider.id} style={styles.providerCard} activeOpacity={0.9}>
            <View style={styles.providerImageContainer}>
              <View style={[styles.providerImagePlaceholder, { backgroundColor: '#E7E5E4' }]}>
                <Text style={styles.providerImageText}>{provider.name[0]}</Text>
              </View>
              {provider.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              )}
            </View>

            <View style={styles.providerInfo}>
              <View style={styles.providerHeader}>
                <Text style={styles.providerName}>{provider.name}</Text>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>⭐ {provider.rating}</Text>
                </View>
              </View>

              <Text style={styles.providerCategory}>{provider.category}</Text>

              <View style={styles.providerMeta}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>📍</Text>
                  <Text style={styles.metaText}>{provider.distance} km</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>⏱️</Text>
                  <Text style={styles.metaText}>Disponible</Text>
                </View>
              </View>

              <View style={styles.providerFooter}>
                <Text style={styles.price}>{formatXAF(provider.price)}</Text>
                <TouchableOpacity style={styles.bookButton}>
                  <Text style={styles.bookButtonText}>Réserver</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9' },
  header: {
    backgroundColor: '#1C1917',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {},
  greeting: { fontSize: 14, color: '#A8A29E', marginBottom: 8, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '700', color: '#FAFAF9', lineHeight: 34 },
  titleAccent: { fontSize: 28, fontWeight: '700', color: '#FACC15', lineHeight: 34 },
  searchContainer: { marginTop: -24, paddingHorizontal: 20 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#292524', fontWeight: '500' },
  section: { marginTop: 28, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1C1917' },
  seeAll: { fontSize: 14, fontWeight: '600', color: '#15803D' },
  categoriesContainer: { paddingRight: 20, gap: 12 },
  categoryCard: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryCardFirst: { marginLeft: 0 },
  categoryIcon: { fontSize: 28, marginBottom: 8 },
  categoryName: { fontSize: 12, fontWeight: '600', color: '#44403C' },
  providerCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  providerImageContainer: { position: 'relative', marginRight: 14 },
  providerImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerImageText: { fontSize: 24, fontWeight: '700', color: '#78716C' },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#15803D',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verifiedText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  providerInfo: { flex: 1 },
  providerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  providerName: { fontSize: 15, fontWeight: '700', color: '#1C1917' },
  ratingBadge: { backgroundColor: '#FEF9C3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#854D0E' },
  providerCategory: { fontSize: 13, color: '#A8A29E', marginBottom: 8 },
  providerMeta: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { fontSize: 12 },
  metaText: { fontSize: 12, color: '#78716C' },
  providerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 16, fontWeight: '700', color: '#15803D' },
  bookButton: { backgroundColor: '#1C1917', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  bookButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
