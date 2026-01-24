export interface User {
  id: string;
  email: string;
  name: string;
  companyName?: string;
  profilePhoto?: string;
  defaultLanguage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  phone?: string;
  timezone?: string;
  phoneNumbers?: string[];
  minutesBalance?: number;
  plan?: string;
  notificationPreferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  missedCallAlerts: boolean;
  usageLimitAlerts: boolean;
  marketingEmails: boolean;
}

export interface AccountStatus {
  plan: 'starter' | 'professional' | 'enterprise';
  renewalDate: Date;
  isActive: boolean;
  trialEndsAt?: Date;
}

export interface UsageData {
  minutesUsed: number;
  minutesRemaining: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
}
