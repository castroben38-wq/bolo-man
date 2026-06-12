import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme';

interface UssdPromptProps {
  visible: boolean;
  ussdCode: string;
  amount: number;
  provider: string;
  onDismiss: () => void;
}

export default function UssdPrompt({ visible, ussdCode, amount, provider, onDismiss }: UssdPromptProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.icon}>📞</Text>
        <Text style={styles.title}>Paiement par USSD</Text>
        <Text style={styles.subtitle}>Pas de connexion internet ? Utilisez le code USSD</Text>

        <View style={styles.codeBox}>
          <Text style={styles.code}>{ussdCode}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoText}>💰 Montant: <Text style={styles.bold}>{amount.toLocaleString('fr-FR')} XAF</Text></Text>
          <Text style={styles.infoText}>👤 Pour: <Text style={styles.bold}>{provider}</Text></Text>
        </View>

        <Text style={styles.instructions}>
          1. Composez ce code sur votre téléphone{'\n'}
          2. Suivez les instructions{'\n'}
          3. Entrez votre code MoMo/Orange{'\n'}
          4. Le paiement sera confirmé automatiquement
        </Text>

        <TouchableOpacity style={styles.btn} onPress={onDismiss}>
          <Text style={styles.btnText}>J'ai composé le code</Text>
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
  codeBox: {
    backgroundColor: colors.background,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 16,
  },
  code: { fontSize: 22, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  info: { alignSelf: 'stretch', marginBottom: 16, gap: 4 },
  infoText: { fontSize: 13, color: colors.textSecondary },
  bold: { fontWeight: '700', color: colors.text },
  instructions: { fontSize: 12, color: colors.textSecondary, lineHeight: 20, alignSelf: 'stretch', marginBottom: 16 },
  btn: { backgroundColor: colors.primary, padding: 14, borderRadius: 12, alignSelf: 'stretch', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
