import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, fontSize, isTablet } from '../utils/responsive';

export default function ReportsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Maintenance Reports</Text>
      <Text style={styles.text}>List of all submitted reports will be shown here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F3',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.large,
    paddingBottom: isTablet() ? spacing.huge + spacing.large : spacing.huge * 2.5,
  },
  title: {
    fontSize: fontSize.xxxLarge,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: spacing.medium,
    textAlign: 'center',
  },
  text: {
    fontSize: fontSize.large,
    textAlign: 'center',
    color: '#555',
    lineHeight: fontSize.large + 8,
  },
});
