import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import {
  LanguageCode,
  languages,
  getPopularLanguages,
  getAllLanguages,
} from '../../utils/languages';

interface LanguageSelectorProps {
  label: string;
  value: string | LanguageCode;
  onChange: (code: string) => void;
}

export function LanguageSelector({ label, value, onChange }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fallback to English if value is invalid
  const safeValue = (value && languages[value]) ? value : 'EN_US';
  const selectedLanguage = languages[safeValue] ?? languages['EN_US'];
  const popularLanguages = getPopularLanguages();
  const allLanguages = getAllLanguages();

  const filteredLanguages = searchQuery
    ? allLanguages.filter(
        (lang) =>
          lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <>
      <TouchableOpacity style={styles.selector} onPress={() => setIsOpen(true)}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueContainer}>
          <Text style={styles.flag}>{selectedLanguage.flag}</Text>
          <Text style={styles.value}>{selectedLanguage.name}</Text>
          <Text style={styles.chevron}>v</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select {label}</Text>
            <TouchableOpacity onPress={() => setIsOpen(false)}>
              <Text style={styles.closeButton}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search languages..."
              placeholderTextColor={colors.gray[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={filteredLanguages ?? popularLanguages}
            keyExtractor={(item) => item.code}
            ListHeaderComponent={
              !filteredLanguages ? (
                <Text style={styles.sectionHeader}>Popular Languages</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.languageItem,
                  item.code === value && styles.languageItemSelected,
                ]}
                onPress={() => handleSelect(item.code)}
              >
                <Text style={styles.languageFlag}>{item.flag}</Text>
                <View style={styles.languageInfo}>
                  <Text style={styles.languageName}>{item.name}</Text>
                  <Text style={styles.languageNative}>{item.nativeName}</Text>
                </View>
                {item.code === value && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
            ListFooterComponent={
              !filteredLanguages ? (
                <>
                  <Text style={styles.sectionHeader}>All Languages</Text>
                  {allLanguages.map((item) => (
                    <TouchableOpacity
                      key={item.code}
                      style={[
                        styles.languageItem,
                        item.code === value && styles.languageItemSelected,
                      ]}
                      onPress={() => handleSelect(item.code)}
                    >
                      <Text style={styles.languageFlag}>{item.flag}</Text>
                      <View style={styles.languageInfo}>
                        <Text style={styles.languageName}>{item.name}</Text>
                        <Text style={styles.languageNative}>{item.nativeName}</Text>
                      </View>
                      {item.code === value && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </>
              ) : null
            }
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  value: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[900],
  },
  chevron: {
    fontSize: typography.fontSize.base,
    color: colors.gray[400],
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
  },
  closeButton: {
    fontSize: typography.fontSize.base,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
  searchContainer: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  searchInput: {
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
  },
  sectionHeader: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[500],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[50],
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  languageItemSelected: {
    backgroundColor: colors.primary[50],
  },
  languageFlag: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[900],
  },
  languageNative: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  checkmark: {
    fontSize: typography.fontSize.lg,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.bold,
  },
});
