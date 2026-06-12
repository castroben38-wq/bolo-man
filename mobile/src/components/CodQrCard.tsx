import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme';

interface CodQrCardProps {
  visible: boolean;
  bookingId: string;
  amount: number;
  qrCodeUrl: string;
  onConfirm: () => void;
}

export default function CodQrCard({ visible, amount, onConfirm }: CodQrCardProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.icon}>💵</Text>
        <Text style={styles.title}>Paiement en espèces</Text>
        <Text style={styles.subtitle}>Montrez ce QR au prestataire après le service</Text>

        <View style={styles.qrBox}>
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrText}>QR CODE</Text>
            <Text style={styles.qrSub}>Scannez pour confirmer</Text>
          </View>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoText}>💰 <Text style={styles.bold}>{amount.toLocaleString('fr-FR')} XAF</Text> à payer en espèces</Text>
        </View>

        <View style={styles.steps}>
          <Text style={styles.step}>1. Le prestataire termine le service</Text>
          <Text style={styles.step}>2. Vous payez en espèces</Text>
          <Text style={styles.step}>3. Il scanne ce QR pour confirmer</Text>
          <Text style={styles.step}>4. La réservation est clôturée</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={onConfirm}>
          <Text style={styles.btnText}>J'ai compris</Text>
        </TouchableOpacity>
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
    padding: 24,
    width: '88%',
    alignItems: 'center',
  },
  icon: { fontSize: 36, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  qrBox: { marginBottom: 16 },
  qrPlaceholder: {
    width: 160, height: 160,
    backgroundColor: colors.background,
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.border,
  },
  qrText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  qrSub: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  info: { marginBottom: 12 },
  infoText: { fontSize: 13, color: colors.textSecondary },
  bold: { fontWeight: '700', color: colors.text },
  steps: { alignSelf: 'stretch', marginBottom: 16, gap: 6 },
  step: { fontSize: 12, color: colors.textSecondary },
  btn: { backgroundColor: colors.primary, padding: 14, borderRadius: 12, alignSelf: 'stretch', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
