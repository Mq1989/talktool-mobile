import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@clerk/clerk-expo';
import { apiEndpoints } from '../services/api';

/**
 * Shape of the relevant slice of the GET /plans response.
 * The endpoint returns more fields than this; we only type what we consume.
 */
interface PlanEntitlementResponse {
  planSummary?: {
    limits?: {
      hasIncomingCalls?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  currentSubscription?: {
    entitled?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface UsePlanEntitlementResult {
  /** Whether the current plan's limits include incoming-call support. */
  hasIncomingCalls: boolean;
  /** Whether the current subscription is active/entitled at all. */
  entitled: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Checks whether the signed-in user/org is entitled to configure and receive
 * incoming calls. Backed by GET /plans, keyed on the active Clerk organization.
 *
 * Mirrors the web app's useAddonStatus()/hasVoicemail-style gating, but for the
 * incoming-calls capability that gates the /numbers screens.
 */
export function usePlanEntitlement(): UsePlanEntitlementResult {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PlanEntitlementResponse>({
    queryKey: ['planEntitlement', organizationId],
    queryFn: async () => {
      const response = await apiEndpoints.getPlans(organizationId);
      return response.data ?? {};
    },
    staleTime: 60000, // Entitlement rarely changes within a session
  });

  const hasIncomingCalls = data?.planSummary?.limits?.hasIncomingCalls ?? false;
  const entitled = data?.currentSubscription?.entitled ?? false;

  return {
    hasIncomingCalls,
    entitled,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
