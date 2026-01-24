import { useQuery } from '@tanstack/react-query';
import { userService, BalanceData } from '../services/user.service';
import { QUERY_KEYS } from '../utils/constants';

export interface UseBalanceResult {
  balance: BalanceData | undefined;
  minutes: number;
  hours: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isRefetching: boolean;
  // Computed values for display
  formattedMinutes: string;
  formattedHours: string;
  balanceType: 'org' | 'user' | undefined;
  isOrgBalance: boolean;
}

export function useBalance(): UseBalanceResult {
  const {
    data: balance,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<BalanceData>({
    queryKey: [QUERY_KEYS.BALANCE],
    queryFn: userService.getBalance,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
  });

  // Round to avoid floating point precision issues
  const minutes = Math.round(balance?.minutes ?? 0);
  const hours = Math.round((balance?.hours ?? 0) * 10) / 10; // Round to 1 decimal
  const balanceType = balance?.balanceType;
  const isOrgBalance = balanceType === 'org';

  // Format minutes with commas for large numbers (no decimals)
  const formattedMinutes = minutes.toLocaleString('en-US', { maximumFractionDigits: 0 });

  // Format hours with one decimal place
  const formattedHours = hours.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return {
    balance,
    minutes,
    hours,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    isRefetching,
    formattedMinutes,
    formattedHours,
    balanceType,
    isOrgBalance,
  };
}
