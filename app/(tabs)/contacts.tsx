import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, LoadingSpinner } from '../../src/components/ui';
import { LanguageSelector } from '../../src/components/call';
import { contactsService } from '../../src/services/contacts.service';
import { QUERY_KEYS } from '../../src/utils/constants';
import { formatPhoneNumber, formatRelativeTime } from '../../src/utils/helpers';
import { getLanguageFlag, LanguageCode } from '../../src/utils/languages';
import type { Contact } from '../../src/types/call.types';

// TalkTool brand colors - refined palette (matching dashboard)
const colors = {
  // Primary blues
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  // Neutrals
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  // Accents
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
  },
  violet: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    500: '#8B5CF6',
    600: '#7C3AED',
  },
  pink: {
    50: '#FDF2F8',
    500: '#EC4899',
  },
  white: '#FFFFFF',
};

const contactSchema = z.object({
  firstName: z.string().min(1, 'Name is required'),
  lastName: z.string().optional(),
  phoneNumber: z.string().min(10, 'Valid phone number required'),
  language: z.string(),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

// Contact Avatar
function ContactAvatar({ name, size = 52 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Generate a consistent color based on name
  const avatarColors = [colors.blue[500], colors.violet[500], colors.emerald[500], colors.pink[500], colors.amber[500]];
  const colorIndex = name.charCodeAt(0) % avatarColors.length;
  const bgColor = avatarColors[colorIndex];

  return (
    <View style={[styles.avatar, { width: size, height: size, backgroundColor: bgColor }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

// Contact Card
function ContactCard({
  contact,
  onPress,
  onCall,
  onDelete,
}: {
  contact: Contact;
  onPress: () => void;
  onCall: () => void;
  onDelete: () => void;
}) {
  const displayName = contact.name ?? (`${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || contact.phoneNumber);
  const lang = contact.preferredLanguage ?? contact.language ?? 'EN_US';

  return (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={onPress}
      onLongPress={onDelete}
      activeOpacity={0.7}
    >
      <ContactAvatar name={displayName} />

      <View style={styles.contactInfo}>
        <Text style={styles.contactName} numberOfLines={1}>{displayName}</Text>
        <Text style={styles.contactPhone}>{formatPhoneNumber(contact.phoneNumber)}</Text>
        <View style={styles.contactMeta}>
          <View style={styles.languageBadge}>
            <Text style={styles.languageFlag}>{getLanguageFlag(lang)}</Text>
            <Text style={styles.languageText}>Preferred</Text>
          </View>
          {contact.lastCalled && (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.lastCalled}>
                {formatRelativeTime(contact.lastCalled)}
              </Text>
            </>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.callIconButton} onPress={onCall}>
        <Ionicons name="call" size={18} color={colors.white} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// Empty State
function EmptyState({ hasSearch, onAdd }: { hasSearch: boolean; onAdd: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrapper}>
        <Ionicons name="people-outline" size={40} color={colors.slate[300]} />
      </View>
      <Text style={styles.emptyTitle}>
        {hasSearch ? 'No contacts found' : 'No contacts yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {hasSearch
          ? 'Try a different search term'
          : 'Add contacts to quickly call them with their preferred language.'}
      </Text>
      {!hasSearch && (
        <TouchableOpacity style={styles.emptyButton} onPress={onAdd}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.emptyButtonText}>Add Contact</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ContactsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: contactsData, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.CONTACTS],
    queryFn: () => contactsService.getContacts(),
  });

  const createMutation = useMutation({
    mutationFn: contactsService.createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CONTACTS] });
      setShowAddModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: contactsService.deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CONTACTS] });
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      language: 'ES',
      notes: '',
    },
  });

  const contacts = contactsData?.data ?? [];
  const filteredContacts = contacts.filter((contact) => {
    const displayName = contact.name ?? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim();
    return (
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phoneNumber.includes(searchQuery)
    );
  });

  const handleAddContact = (data: ContactFormData) => {
    createMutation.mutate({
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      language: data.language,
      notes: data.notes,
    });
  };

  const handleDeleteContact = (contact: Contact) => {
    const displayName = contact.name ?? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim();
    const contactId = contact.id ?? contact._id;
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(contactId),
        },
      ]
    );
  };

  const handleCallContact = (contact: Contact) => {
    const lang = contact.preferredLanguage ?? contact.language ?? 'EN_US';
    router.push(`/call/new?phone=${contact.phoneNumber}&lang=${lang}`);
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading contacts..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Contacts</Text>
            <Text style={styles.subtitle}>{contacts.length} contacts</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              reset();
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.slate[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={colors.slate[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.slate[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Contact List */}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id ?? item._id}
        renderItem={({ item }) => (
          <ContactCard
            contact={item}
            onPress={() => handleCallContact(item)}
            onCall={() => handleCallContact(item)}
            onDelete={() => handleDeleteContact(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            hasSearch={searchQuery.length > 0}
            onAdd={() => {
              reset();
              setShowAddModal(true);
            }}
          />
        }
        ListFooterComponent={<View style={{ height: 120 }} />}
      />

      {/* Add Contact Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAddModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.slate[600]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Contact</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Modal Content */}
            <View style={styles.modalContent}>
              <View style={styles.avatarPreview}>
                <View style={styles.avatarPreviewCircle}>
                  <Ionicons name="person" size={32} color={colors.slate[400]} />
                </View>
              </View>

              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>First Name</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter first name"
                        placeholderTextColor={colors.slate[400]}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    </View>
                    {errors.firstName && (
                      <Text style={styles.errorText}>{errors.firstName.message}</Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Last Name (Optional)</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter last name"
                        placeholderTextColor={colors.slate[400]}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    </View>
                  </View>
                )}
              />

              <Controller
                control={control}
                name="phoneNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="+1 (555) 123-4567"
                        placeholderTextColor={colors.slate[400]}
                        keyboardType="phone-pad"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    </View>
                    {errors.phoneNumber && (
                      <Text style={styles.errorText}>{errors.phoneNumber.message}</Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="language"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Preferred Language</Text>
                    <LanguageSelector
                      label=""
                      value={value}
                      onChange={onChange}
                    />
                  </View>
                )}
              />

              <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Notes (Optional)</Text>
                    <View style={[styles.inputContainer, styles.notesInput]}>
                      <TextInput
                        style={[styles.textInput, styles.notesTextInput]}
                        placeholder="Add any notes..."
                        placeholderTextColor={colors.slate[400]}
                        multiline
                        numberOfLines={3}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    </View>
                  </View>
                )}
              />

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  createMutation.isPending && styles.saveButtonDisabled,
                ]}
                onPress={handleSubmit(handleAddContact)}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color={colors.white} />
                    <Text style={styles.saveButtonText}>Save Contact</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },

  // Header
  header: {
    backgroundColor: colors.white,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.slate[900],
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.slate[400],
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.blue[800],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: colors.slate[100],
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.slate[800],
  },

  // List
  listContent: {
    padding: 20,
  },

  // Contact Card
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: colors.white,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[800],
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: colors.slate[400],
    marginBottom: 6,
  },
  contactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  languageFlag: {
    fontSize: 12,
  },
  languageText: {
    fontSize: 11,
    color: colors.slate[500],
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.slate[300],
    marginHorizontal: 8,
  },
  lastCalled: {
    fontSize: 12,
    color: colors.slate[400],
  },
  callIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.emerald[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.emerald[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  // Empty State
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.slate[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[800],
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.slate[400],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blue[500],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 6,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[800],
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  avatarPreview: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarPreviewCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[700],
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: colors.slate[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    paddingHorizontal: 16,
    height: 52,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15,
    color: colors.slate[800],
  },
  notesInput: {
    height: 100,
    paddingVertical: 14,
  },
  notesTextInput: {
    height: '100%',
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: colors.rose[500],
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue[500],
    height: 52,
    borderRadius: 14,
    marginTop: 24,
    gap: 8,
    shadowColor: colors.blue[800],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
