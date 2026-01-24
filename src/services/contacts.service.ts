import { apiEndpoints, ContactData } from './api';
import type { PaginatedResponse } from '../types/api.types';
import type { Contact, ContactsListResponse } from '../types/call.types';

export type ContactType = 'allowed' | 'blocked' | 'general' | 'all';
export type ContactScope = 'all' | 'user' | 'org';

export interface ContactsFilter {
  type?: ContactType;
  scope?: ContactScope;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateContactData {
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  language?: string;
  contactType?: 'allowed' | 'blocked' | 'general';
  notes?: string;
  shareWithOrg?: boolean;
}

export interface UpdateContactData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  language?: string;
  contactType?: 'allowed' | 'blocked' | 'general';
  notes?: string;
}

/**
 * Transform backend contact data to include UI-friendly properties
 */
const transformContactData = (contact: Contact): Contact => {
  // Compute full name
  const name = `${contact.firstName || ''}${contact.lastName ? ' ' + contact.lastName : ''}`.trim();

  return {
    ...contact,
    // Add UI-friendly aliases
    id: contact._id,
    name: name || contact.phoneNumber,
    preferredLanguage: contact.language,
    lastCalled: null, // Would need to be fetched from calls history
    totalCalls: 0, // Would need to be computed from calls history
  };
};

export const contactsService = {
  /**
   * Get paginated contacts list
   * Supports filtering by type, scope, and search
   */
  async getContacts(filters?: ContactsFilter): Promise<PaginatedResponse<Contact>> {
    const response = await apiEndpoints.getContacts({
      type: filters?.type,
      scope: filters?.scope,
      search: filters?.search,
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 20,
    });
    const responseData = response.data;

    // Backend returns { contacts, meta } format
    if (responseData && typeof responseData === 'object' && 'contacts' in responseData && 'meta' in responseData) {
      const data = responseData as ContactsListResponse;
      // Transform each contact to include UI-friendly properties
      const transformedContacts = data.contacts.map(transformContactData);
      return {
        data: transformedContacts,
        total: data.meta.total,
        page: data.meta.page,
        limit: data.meta.limit,
        totalPages: data.meta.totalPages,
        hasNextPage: data.meta.hasNextPage,
        hasPrevPage: data.meta.hasPrevPage,
      };
    }

    // Fallback for simple array responses
    if (Array.isArray(responseData)) {
      const transformedContacts = (responseData as Contact[]).map(transformContactData);
      return {
        data: transformedContacts,
        total: transformedContacts.length,
        page: filters?.page ?? 1,
        limit: filters?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    }

    // Return empty result as fallback
    return {
      data: [],
      total: 0,
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 20,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    };
  },

  /**
   * Create a new contact
   */
  async createContact(data: CreateContactData): Promise<Contact> {
    const contactData: ContactData = {
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      email: data.email,
      language: data.language,
      contactType: data.contactType,
      notes: data.notes,
      shareWithOrg: data.shareWithOrg,
    };

    const response = await apiEndpoints.createContact(contactData);
    const responseData = response.data;

    // Backend returns { contact, orgContact? }
    let contact: Contact;
    if ('contact' in responseData) {
      contact = responseData.contact as Contact;
    } else {
      contact = responseData as Contact;
    }

    return transformContactData(contact);
  },

  /**
   * Get a single contact by ID
   */
  async getContact(id: string): Promise<Contact> {
    const response = await apiEndpoints.getContact(id);
    const data = response.data;

    // Backend returns { contact }
    let contact: Contact;
    if ('contact' in data) {
      contact = data.contact as Contact;
    } else {
      contact = data as Contact;
    }

    return transformContactData(contact);
  },

  /**
   * Update an existing contact
   * API: PATCH /api/contacts/:id
   */
  async updateContact(contactId: string, updates: UpdateContactData): Promise<Contact> {
    const response = await apiEndpoints.updateContact(contactId, updates);
    const data = response.data;

    // Backend returns { contact }
    let contact: Contact;
    if ('contact' in data) {
      contact = data.contact as Contact;
    } else {
      contact = data as Contact;
    }

    return transformContactData(contact);
  },

  /**
   * Soft delete a contact
   */
  async deleteContact(id: string): Promise<void> {
    await apiEndpoints.deleteContact(id);
  },

  /**
   * Search contacts by name, phone, or email
   */
  async searchContacts(query: string): Promise<Contact[]> {
    const response = await this.getContacts({ search: query, limit: 50 });
    return response.data;
  },

  /**
   * Get allowed contacts (whitelist) for a specific number
   */
  async getAllowedContacts(): Promise<Contact[]> {
    const response = await this.getContacts({ type: 'allowed', limit: 100 });
    return response.data;
  },

  /**
   * Get blocked contacts (blacklist)
   */
  async getBlockedContacts(): Promise<Contact[]> {
    const response = await this.getContacts({ type: 'blocked', limit: 100 });
    return response.data;
  },
};
