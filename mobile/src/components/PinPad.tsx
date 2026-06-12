import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { colors } from '../../theme';

interface PinPadProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  maxLength?: number;
}

export default function PinPad({ visible, title, subtitle, onSubmit, onCancel, maxLength = 4 }: PinPadProps) {
  const [pin, setPin] = useState('');

  const handlePress = (digit: string) => {
    if (pin.length < maxLength) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = () => {
    if (pin.length === maxLength) {
      onSubmit(pin);
      setPin('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          <View style={styles.dots}>
            {Array.from({ length: maxLength }).map((_, i) => (
              <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
            ))}
          </View>

          <View style={styles.keypad}>
            {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']].map((row, ri) => (
              <View key={ri} style={styles.row}>
                {row.map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.key, key === '' && styles.keyEmpty]}
                    onPress={() => key === '⌫' ? handleBackspace() : key && handlePress(key)}
                    disabled={key === ''}
                  >
                    <Text style={styles.keyText}>{key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.submit, pin.length !== maxLength && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={pin.length !== maxLength}
          >
            <Text style={styles.submitText}>Confirmer</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginVertical: 24 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.border },
  dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  keypad: { gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  key: { width: 72, height: 56, borderRadius: 12, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  keyEmpty: { backgroundColor: 'transparent' },
  keyText: { fontSize: 22, fontWeight: '600', color: colors.text },
  submit: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitDisabled: { backgroundColor: colors.border },
  submitText: { color: 'white', fontWeight: '700', fontSize: 15 },
  cancel: { alignItems: 'center', marginTop: 12, padding: 8 },
  cancelText: { color: colors.textSecondary, fontSize: 14 },
});
