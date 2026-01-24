import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import {
  LanguageCode,
  languages,
  getPopularLanguages,
  getAllLanguages,
} from '../../utils/languages';

interface LanguagePairSelectorProps {
  languageA: LanguageCode;
  languageB: LanguageCode;
  onLanguageAChange: (code: LanguageCode) => void;
  onLanguageBChange: (code: LanguageCode) => void;
  onSwap: () => void;
  disabled?: boolean;
}

interface SingleLanguageSelectorProps {
  label: string;
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
  excludeCode?: LanguageCode;
  disabled?: boolean;
}

function SingleLanguageSelector({
  label,
  value,
  onChange,
  excludeCode,
  disabled,
}: SingleLanguageSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const safeValue = (value && languages[value]) ? value : 'EN_US';
  const selectedLanguage = languages[safeValue] ?? languages['EN_US'];
  const popularLanguages = getPopularLanguages().filter(
    (lang) => lang.code !== excludeCode
  );
  const allLanguages = getAllLanguages().filter(
    (lang) => lang.code !== excludeCode
  );

  const filteredLanguages = searchQuery
    ? allLanguages.filter(
        (lang) =>
          lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const handleSelect = (code: string) => {
    onChange(code as LanguageCode);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.languageCard, disabled && styles.languageCardDisabled]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
      >
        <Text style={styles.personLabel}>{label}</Text>
        <Text style={styles.flag}>{selectedLanguage.flag}</Text>
        <Text style={styles.languageName} numberOfLines={1}>
          {selectedLanguage.name}
        </Text>
        {!disabled && (
          <Ionicons name="chevron-down" size={16} color={colors.gray[400]} />
        )}
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
            <Ionicons name="search" size={20} color={colors.gray[400]} style={styles.searchIcon} />
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
                  <Text style={styles.languageItemName}>{item.name}</Text>
                  <Text style={styles.languageNative}>{item.nativeName}</Text>
                </View>
                {item.code === value && (
                  <Ionicons name="checkmark" size={20} color={colors.primary[500]} />
                )}
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
                        <Text style={styles.languageItemName}>{item.name}</Text>
                        <Text style={styles.languageNative}>{item.nativeName}</Text>
                      </View>
                      {item.code === value && (
                        <Ionicons name="checkmark" size={20} color={colors.primary[500]} />
                      )}
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

export function LanguagePairSelector({
  languageA,
  languageB,
  onLanguageAChange,
  onLanguageBChange,
  onSwap,
  disabled = false,
}: LanguagePairSelectorProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handleSwap = () => {
    // Animate the swap button rotation
    Animated.sequence([
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();

    onSwap();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      <SingleLanguageSelector
        label="Person A"
        value={languageA}
        onChange={onLanguageAChange}
        excludeCode={languageB}
        disabled={disabled}
      />

      <TouchableOpacity
        style={[styles.swapButton, disabled && styles.swapButtonDisabled]}
        onPress={handleSwap}
        disabled={disabled}
      >
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons
            name="swap-horizontal"
            size={24}
            color={disabled ? colors.gray[300] : colors.primary[500]}
          />
        </Animated.View>
      </TouchableOpacity>

      <SingleLanguageSelector
        label="Person B"
        value={languageB}
        onChange={onLanguageBChange}
        excludeCode={languageA}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  languageCard: {
    flex: 1,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  languageCardDisabled: {
    opacity: 0.6,
  },
  personLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  flag: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  languageName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
    textAlign: 'center',
  },
  swapButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  swapButtonDisabled: {
    backgroundColor: colors.gray[100],
    borderColor: colors.gray[200],
  },
  // Modal styles
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
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
  languageItemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[900],
  },
  languageNative: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
});
