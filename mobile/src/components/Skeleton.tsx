import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={[styles.line, { width: '60%', height: 16 }]} />
      <View style={[styles.line, { width: '40%', height: 12, marginTop: 8 }]} />
      <View style={styles.row}>
        <View style={[styles.line, { width: '30%', height: 12 }]} />
        <View style={[styles.line, { width: '30%', height: 12 }]} />
      </View>
      <View style={[styles.line, { width: '50%', height: 16, marginTop: 8 }]} />
    </View>
  );
}

export function SkeletonChip() {
  return <View style={styles.chip} />;
}

export function SkeletonCircle({ size = 48 }: { size?: number }) {
  return <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  line: {
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  chip: {
    width: 80,
    height: 36,
    backgroundColor: colors.border,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  circle: {
    backgroundColor: colors.border,
  },
});
