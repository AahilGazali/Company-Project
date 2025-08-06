import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
    padding: 20,
    paddingBottom: 100, // Add extra bottom padding for tab bar
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
  },
});
