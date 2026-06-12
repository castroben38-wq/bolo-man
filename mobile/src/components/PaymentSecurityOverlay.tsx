import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme';

interface PaymentSecurityOverlayProps {
  visible: boolean;
  step: 'pin' | 'otp' | 'biometric' | 'processing' | 'success';
  amount?: number;
  providerName?: string;
  providerPhoto?: string;
  onComplete?: () => void;
}

export default function PaymentSecurityOverlay({
  visible,
  step,
  amount,
  providerName,
}: PaymentSecurityOverlayProps) {
  if (!visible) return null;

  const formatXAF = (val: number) => `${val.toLocaleString('fr-FR')} XAF`;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {step === 'pin' && (
          <>
            <View style={styles.providerBadge}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{providerName?.[0] || '?'}</Text></View>
              <View>
                <Text style={styles.providerLabel}>Paiement à</Text>
                <Text style={styles.providerName}>{providerName}</Text>
              </View>
            </View>
            <Text style={styles.amount}>{amount ? formatXAF(amount) : ''}</Text>
            <Text style={styles.hint}>Entrez votre code PIN de transaction</Text>
          </>
        )}

        {step === 'otp' && (
          <>
            <Text style={styles.icon}>📱</Text>
            <Text style={styles.title}>Vérification SMS</Text>
            <Text style={styles.hint}>Un code à 6 chiffres a été envoyé à votre téléphone</Text>
            <View style={styles.otpRow}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={styles.otpBox} />
              ))}
            </View>
          </>
        )}

        {step === 'biometric' && (
          <>
            <Text style={styles.icon}>👆</Text>
            <Text style={styles.title}>Empreinte digitale</Text>
            <Text style={styles.hint}>Touchez le capteur pour confirmer</Text>
          </>
        )}

        {step === 'processing' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.title}>Traitement en cours...</Text>
            <Text style={styles.hint}>Ne fermez pas l'application</Text>
          </>
        )}

        {step === 'success' && (
          <>
            <View style={styles.successCircle}><Text style={styles.successIcon}>✓</Text></View>
            <Text style={styles.title}>Paiement réussi !</Text>
            <Text style={styles.hint}>Votre réservation est confirmée</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    width: '85%',
    alignItems: 'center',
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: 'white', fontSize: 20, fontWeight: '700' },
  providerLabel: { fontSize: 12, color: colors.textSecondary },
  providerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  amount: { fontSize: 28, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  icon: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  hint: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  otpRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  otpBox: { width: 36, height: 44, borderRadius: 8, borderWidth: 2, borderColor: colors.border },
  successCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.success,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: { color: 'white', fontSize: 32, fontWeight: '700' },
});
