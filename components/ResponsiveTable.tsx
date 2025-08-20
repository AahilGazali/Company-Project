import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius, getShadow, isSmallDevice, isTablet } from '../utils/responsive';

interface TableColumn {
  key: string;
  title: string;
  width?: number;
  required?: boolean;
}

interface TableRow {
  [key: string]: string;
}

interface ResponsiveTableProps {
  columns: TableColumn[];
  data: TableRow[];
  editIndex: number | null;
  errors: { [key: number]: boolean };
  onEdit: (index: number) => void;
  onSave: (index: number) => void;
  onChange: (index: number, field: string, value: string) => void;
  onAddRow: () => void;
  onDelete: (index: number) => void;
  isLoading?: boolean;
}

export default function ResponsiveTable({
  columns,
  data,
  editIndex,
  errors,
  onEdit,
  onSave,
  onChange,
  onAddRow,
  onDelete,
  isLoading = false
}: ResponsiveTableProps) {
  
  // For small devices, render as cards instead of table
  if (isSmallDevice()) {
    return (
      <View style={styles.cardContainer}>
        {data.map((row, idx) => (
          <View key={`card-${idx}`} style={styles.card}>
            {columns.map((column) => (
              <View key={`${idx}-${column.key}`} style={styles.cardRow}>
                <Text style={styles.cardLabel}>
                  {column.title}
                  {column.required && <Text style={{color:'red'}}>*</Text>}
                </Text>
                {editIndex === idx ? (
                  <TextInput
                    style={[
                      styles.cardInput,
                      errors[idx] && column.required && { borderColor: 'red' }
                    ]}
                    value={row[column.key]}
                    onChangeText={(val) => onChange(idx, column.key, val)}
                    placeholder={column.required ? "Required" : `Enter ${column.title}`}
                    keyboardType={column.key === 'noOfHouses' || column.key === 'completed' ? 'numeric' : 'default'}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                ) : (
                  <Text style={styles.cardValue}>{row[column.key] || '-'}</Text>
                )}
              </View>
            ))}
            <View style={styles.cardActions}>
              {editIndex === idx ? (
                <View style={styles.actionButtons}>
                  <Pressable style={styles.saveButton} onPress={() => onSave(idx)}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </Pressable>
                  <Pressable style={styles.deleteIconButton} onPress={() => onDelete(idx)}>
                    <Ionicons name="trash-outline" size={20} color="#FFF" />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.actionButtons}>
                  <Pressable style={styles.editButton} onPress={() => onEdit(idx)}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.deleteIconButton} onPress={() => onDelete(idx)}>
                    <Ionicons name="trash-outline" size={20} color="#FFF" />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        ))}
        <Pressable style={styles.addButton} onPress={onAddRow}>
          <LinearGradient
            colors={['#1FB515', '#118509', '#0F6C08']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.addButtonText}>+ Add Item</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  // For larger devices, render as traditional table
  return (
    <ScrollView horizontal style={styles.tableScroll} showsHorizontalScrollIndicator={true}>
      <View style={styles.tableContainer}>
        {/* Header */}
        <View style={styles.tableHeader}>
          {columns.map((column) => (
            <Text key={column.key} style={[styles.tableHeaderCell, { width: column.width || 120 }]}>
              {column.title}
              {column.required && <Text style={{color:'red'}}>*</Text>}
            </Text>
          ))}
          <Text style={[styles.tableHeaderCell, { width: 100 }]}>Actions</Text>
        </View>

        {/* Rows */}
        {data.map((row, idx) => (
          <View key={`row-${idx}`} style={styles.tableRow}>
            {columns.map((column) => (
              <View key={`${idx}-${column.key}`} style={[styles.tableCellContainer, { width: column.width || 120 }]}>
                {editIndex === idx ? (
                  <TextInput
                    style={[
                      styles.tableInput,
                      errors[idx] && column.required && { borderColor: 'red' }
                    ]}
                    value={row[column.key]}
                    onChangeText={(val) => onChange(idx, column.key, val)}
                    placeholder={column.required ? "Required" : column.title}
                    keyboardType={column.key === 'noOfHouses' || column.key === 'completed' ? 'numeric' : 'default'}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                ) : (
                  <Text style={styles.tableCell}>{row[column.key] || '-'}</Text>
                )}
              </View>
            ))}
            <View style={[styles.tableCellContainer, { width: 100 }]}>
              <View style={styles.actionButtons}>
                {editIndex === idx ? (
                  <Pressable style={styles.saveButton} onPress={() => onSave(idx)}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.editButton} onPress={() => onEdit(idx)}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                )}
                <Pressable style={styles.deleteIconButton} onPress={() => onDelete(idx)}>
                  <Ionicons name="trash-outline" size={18} color="#FFF" />
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        {/* Add Button */}
        <Pressable style={styles.addButton} onPress={onAddRow}>
          <LinearGradient
            colors={['#1FB515', '#118509', '#0F6C08']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.addButtonText}>+ Add Item</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Card layout for small devices
  cardContainer: {
    marginTop: spacing.large,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: borderRadius.large,
    padding: spacing.large,
    marginBottom: spacing.medium,
    ...getShadow(3),
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.medium,
    minHeight: 40,
  },
  cardLabel: {
    fontSize: fontSize.medium,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  cardValue: {
    fontSize: fontSize.medium,
    color: '#555',
    flex: 1,
    textAlign: 'right',
  },
  cardInput: {
    fontSize: fontSize.medium,
    color: '#555',
    flex: 1,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: borderRadius.small,
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.tiny,
    backgroundColor: '#FFF',
  },
  cardActions: {
    alignItems: 'center',
    marginTop: spacing.small,
  },

  // Table layout for larger devices
  tableScroll: {
    marginTop: spacing.large,
  },
  tableContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: borderRadius.large,
    padding: spacing.large,
    ...getShadow(4),
    minWidth: 600, // Ensure minimum width for proper table display
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    marginBottom: spacing.medium,
    paddingBottom: spacing.small,
  },
  tableHeaderCell: {
    fontSize: isTablet() ? fontSize.large : fontSize.medium,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: spacing.tiny,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: spacing.small,
    minHeight: 50,
  },
  tableCellContainer: {
    justifyContent: 'center',
    paddingHorizontal: spacing.tiny,
  },
  tableCell: {
    fontSize: fontSize.medium,
    color: '#555',
    textAlign: 'center',
  },
  tableInput: {
    fontSize: fontSize.medium,
    color: '#555',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: borderRadius.small,
    paddingVertical: spacing.tiny,
    paddingHorizontal: spacing.small,
    backgroundColor: '#FFF',
  },

  // Common button styles
  editButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    borderRadius: borderRadius.small,
    minWidth: 60,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFF',
    fontSize: fontSize.small,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    borderRadius: borderRadius.small,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: fontSize.small,
    fontWeight: 'bold',
  },
  deleteIconButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.small,
    borderRadius: borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  addButton: {
    marginTop: spacing.large,
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
  },
  addButtonGradient: {
    paddingVertical: spacing.medium,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: fontSize.medium,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: spacing.small,
  },
});
