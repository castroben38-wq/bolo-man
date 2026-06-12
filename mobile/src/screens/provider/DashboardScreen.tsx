import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Bonjour, Jean 👋</Text>
          <Text style={styles.businessName}>Tchinda Électricité</Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>En ligne</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Réservations aujourd'hui</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValueAccent]}>125K</Text>
            <Text style={styles.statLabel}>XAF ce mois</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions rapides</Text>

        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.9}>
            <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
              <Text style={[styles.actionIconText, { color: '#1D4ED8' }]}\u003e📅</Text>
            </View>
            <Text style={styles.actionTitle}>Disponibilité</Text>
            <Text style={styles.actionSubtitle}>Gérer horaires</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.9}>
            <View style={[styles.actionIcon, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.actionIconText, { color: '#15803D' }]}\u003e🔧</Text>
            </View>
            <Text style={styles.actionTitle}>Services</Text>
            <Text style={styles.actionSubtitle}>Modifier tarifs</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.9}>
            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.actionIconText, { color: '#B45309' }]}\u003e💰</Text>
            </View>
            <Text style={styles.actionTitle}>Gains</Text>
            <Text style={styles.actionSubtitle}>Retirer fonds</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.9}>
            <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
              <Text style={[styles.actionIconText, { color: '#7C3AED' }]}\u003e⭐</Text>
            </View>
            <Text style={styles.actionTitle}>Avis</Text>
            <Text style={styles.actionSubtitle}>23 avis</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's Bookings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aujourd'hui</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {[
          { id: '1', client: 'Alice Mbarga', time: '10:00', service: 'Installation électrique', status: 'confirmed', price: 25000 },
          { id: '2', client: 'Bob Ndongo', time: '14:30', service: 'Dépannage urgent', status: 'pending', price: 5000 },
        ].map((booking) => (
          <View key={booking.id} style={styles.bookingCard}>
            <View style={styles.bookingTime}>
              <Text style={styles.bookingTimeText}>{booking.time}</Text>
            </View>
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingClient}>{booking.client}</Text>
              <Text style={styles.bookingService}>{booking.service}</Text>
            </View>
            <View style={styles.bookingRight}>
              <Text style={styles.bookingPrice}>{booking.price.toLocaleString('fr-FR')} XAF</Text>
              <View style={[styles.statusPill, booking.status === 'confirmed' ? styles.statusConfirmed : styles.statusPending]}>
                <Text style={[styles.statusPillText, booking.status === 'confirmed' ? styles.statusConfirmedText : styles.statusPendingText]}>
                  {booking.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                </Text>
              </View>
            </View>
          </View>
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
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: { marginBottom: 16 },
  greeting: { fontSize: 14, color: '#A8A29E', marginBottom: 4, fontWeight: '500' },
  businessName: { fontSize: 24, fontWeight: '700', color: '#FAFAF9' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(21,128,61,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80', marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#4ADE80' },
  statsContainer: { marginTop: -20, paddingHorizontal: 20 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statCardPrimary: { backgroundColor: '#15803D' },
  statValue: { fontSize: 28, fontWeight: '700', color: '#1C1917', marginBottom: 4 },
  statValueAccent: { color: '#15803D' },
  statLabel: { fontSize: 12, color: '#A8A29E', fontWeight: '500' },
  section: { marginTop: 28, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1C1917' },
  seeAll: { fontSize: 14, fontWeight: '600', color: '#15803D' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIconText: { fontSize: 20 },
  actionTitle: { fontSize: 15, fontWeight: '700', color: '#1C1917', marginBottom: 2 },
  actionSubtitle: { fontSize: 12, color: '#A8A29E' },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bookingTime: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F5F5F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  bookingTimeText: { fontSize: 13, fontWeight: '700', color: '#44403C' },
  bookingInfo: { flex: 1 },
  bookingClient: { fontSize: 15, fontWeight: '700', color: '#1C1917', marginBottom: 2 },
  bookingService: { fontSize: 12, color: '#A8A29E' },
  bookingRight: { alignItems: 'flex-end' },
  bookingPrice: { fontSize: 14, fontWeight: '700', color: '#15803D', marginBottom: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusConfirmed: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  statusConfirmedText: { color: '#15803D' },
  statusPendingText: { color: '#B45309' },
});
