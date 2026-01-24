import { apiEndpoints } from './api';

export interface BalanceData {
  minutes: number;
  hours: number;
  stripeCustomerId: string | null;
  creditBlockMinutes: number;
  unitAmount: number | null;
  currency: string;
  balanceType: 'org' | 'user';
  orgId: string | null;
  minutesTransferred?: number;
}

// Helper to extract data from response (handles both {data: ...} and direct responses)
const extractData = <T>(response: { data: T | { data: T } }): T => {
  const data = response.data;
  if (data && typeof data === 'object' && 'data' in data) {
    return data.data as T;
  }
  return data as T;
};

export const userService = {
  async getBalance(): Promise<BalanceData> {
    const response = await apiEndpoints.getBalance();
    return extractData(response);
  },
};
