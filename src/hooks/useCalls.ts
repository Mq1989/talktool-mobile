import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { callsService, CallsFilter } from '../services/calls.service';
import { useCallStore } from '../store/callStore';
import { QUERY_KEYS } from '../utils/constants';

export function useCalls() {
  const queryClient = useQueryClient();
  const { resetCallState } = useCallStore();
  const { isSignedIn } = useAuth();

  const callHistoryQuery = useInfiniteQuery({
    queryKey: [QUERY_KEYS.CALLS],
    queryFn: async ({ pageParam = 1 }) => {
      console.log('[useCalls] Fetching page:', pageParam);
      try {
        const result = await callsService.getCallHistory({ page: pageParam, limit: 20 });
        console.log('[useCalls] Got', result.data.length, 'calls, total:', result.total);
        return result;
      } catch (error) {
        console.error('[useCalls] Error fetching calls:', error);
        throw error;
      }
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.data) return undefined;
      const { page, totalPages, hasNextPage } = lastPage;
      // Backend uses 1-indexed pages
      return hasNextPage ? page + 1 : undefined;
    },
    initialPageParam: 1,
    // Only fetch when signed in (auth token getter should be set)
    enabled: !!isSignedIn,
  });

  const endCallMutation = useMutation({
    mutationFn: (callSid: string) => callsService.endCall(callSid),
    onSuccess: () => {
      resetCallState();
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CALLS] });
    },
  });

  return {
    calls: callHistoryQuery.data?.pages.flatMap((page) => page.data) ?? [],
    isLoadingCalls: callHistoryQuery.isLoading,
    isFetchingMore: callHistoryQuery.isFetchingNextPage,
    hasMoreCalls: callHistoryQuery.hasNextPage,
    fetchMoreCalls: callHistoryQuery.fetchNextPage,
    refetchCalls: callHistoryQuery.refetch,
    endCall: endCallMutation.mutate,
    isEndingCall: endCallMutation.isPending,
  };
}

export function useCallDetail(callId: string) {
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: [QUERY_KEYS.CALL_DETAIL, callId],
    queryFn: () => callsService.getCallDetail(callId),
    enabled: !!callId && !!isSignedIn,
  });
}

export function useCallTranscript(callId: string) {
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: [QUERY_KEYS.CALL_DETAIL, callId, 'transcript'],
    queryFn: () => callsService.getCallTranscript(callId),
    enabled: !!callId && !!isSignedIn,
  });
}
