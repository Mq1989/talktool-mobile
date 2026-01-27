import { apiEndpoints } from './api';
import type { PaginatedResponse } from '../types/api.types';
import type { CallHistoryItem, CallTranscript, CallsListResponse, Contact } from '../types/call.types';

export interface CallsFilter {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  language?: string;
}

/**
 * Transform backend call data to include UI-friendly properties
 */
const transformCallData = (call: CallHistoryItem): CallHistoryItem => {
  // Get contact info if populated
  const contactObj = typeof call.contact === 'object' ? call.contact as Contact : null;

  // Compute customer phone number based on call direction
  // - Outbound calls: customer is the callee (to number)
  // - Inbound calls: customer is the caller (from number)
  let phoneNumber = '';
  if (call.direction === 'inbound') {
    // For inbound calls, the customer initiated the call (from number)
    phoneNumber = call.from || call.thirdParty || call.number || '';
  } else {
    // For outbound calls (outbound-api, outbound-dial), the customer was called (to number)
    phoneNumber = call.to || call.number || call.thirdParty || '';
  }

  // Compute contact name from contact object
  const contactName = contactObj
    ? `${contactObj.firstName || ''}${contactObj.lastName ? ' ' + contactObj.lastName : ''}`.trim()
    : undefined;

  return {
    ...call,
    // Add UI-friendly aliases
    id: call._id,
    phoneNumber,
    contactName,
    fromLanguage: call.repLang,
    toLanguage: call.customerLang,
    startTime: call.startedAt ? new Date(call.startedAt) : undefined,
    duration: call.durationSeconds ?? 0,
    hasTranscript: !!(call.transcriptMessages && call.transcriptMessages.length > 0) || !!call.transcriptionText,
    hasRecording: !!call.recordingUrl,
  };
};

export const callsService = {
  /**
   * Get paginated call history
   * Uses page/limit pagination (1-indexed pages from backend)
   */
  async getCallHistory(filters?: CallsFilter): Promise<PaginatedResponse<CallHistoryItem>> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 25;

    console.log('[callsService] Fetching calls with params:', { page, limit });

    try {
      const response = await apiEndpoints.getCalls({ page, limit });
      const responseData = response.data;
      console.log('[callsService] Response received:', JSON.stringify(responseData).slice(0, 500));

    // Backend returns { calls, meta } format
    if (responseData && typeof responseData === 'object' && 'calls' in responseData && 'meta' in responseData) {
      const data = responseData as CallsListResponse;
      // Transform each call to include UI-friendly properties
      const transformedCalls = data.calls.map(transformCallData);
      return {
        data: transformedCalls,
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
      const transformedCalls = (responseData as CallHistoryItem[]).map(transformCallData);
      return {
        data: transformedCalls,
        total: transformedCalls.length,
        page,
        limit,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    }

    // Return empty result as fallback
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    };
    } catch (error) {
      console.error('[callsService] Error fetching calls:', error);
      throw error;
    }
  },

  /**
   * Get a single call's detail by callSid or _id
   */
  async getCallDetail(callId: string): Promise<CallHistoryItem> {
    const response = await apiEndpoints.getCallDetail(callId);
    const data = response.data;

    // Backend returns { call } wrapper
    let call: CallHistoryItem;
    if (data && typeof data === 'object' && 'call' in data) {
      call = data.call as CallHistoryItem;
    } else {
      call = data as CallHistoryItem;
    }

    // Transform to include UI-friendly properties
    return transformCallData(call);
  },

  /**
   * Get call transcript
   * The backend includes transcript in the call detail response
   */
  async getCallTranscript(callId: string): Promise<CallTranscript> {
    const call = await this.getCallDetail(callId);

    return {
      callId: call.callSid || call._id,
      transcriptions: [],
      transcriptMessages: call.transcriptMessages ?? [],
      summary: call.summary,
    };
  },

  /**
   * Get total calls count
   * API returns plain number per api-guide.md
   */
  async getCallsCount(): Promise<number> {
    try {
      const response = await apiEndpoints.getCallsCount();
      // API returns plain number (e.g., 42) not { count: number }
      const data = response.data;
      if (typeof data === 'number') {
        return data;
      }
      // Fallback for object response format
      if (data && typeof data === 'object' && 'count' in data) {
        return (data as { count: number }).count;
      }
      return 0;
    } catch {
      return 0;
    }
  },

  /**
   * End an active call
   */
  async endCall(callSid: string): Promise<void> {
    await apiEndpoints.endCall(callSid);
  },
};
