import { apiEndpoints } from './api';

/**
 * StoreKit consumable product ids for buying call minutes. The SERVER maps each
 * id -> minutes authoritatively (numberlang lib/appleIap.js PRODUCT_MINUTES_MAP);
 * the client never asserts a minute amount. Keep these in sync with App Store
 * Connect. Pricing: com.talktool.minutes.60 = Apple $19.99 tier for 60 minutes
 * (the iOS $20/hr rate; the web charges $15/hr via Stripe).
 */
export const MINUTE_PRODUCT_IDS = ['com.talktool.minutes.60'] as const;
export type MinuteProductId = (typeof MINUTE_PRODUCT_IDS)[number];

/** Minutes each product grants — for DISPLAY only; the server is authoritative. */
export const MINUTE_PRODUCT_MINUTES: Record<string, number> = {
  'com.talktool.minutes.60': 60,
};

export interface IapVerifyResult {
  credited: boolean;
  minutesAdded: number;
  balance: { minutes: number; hours: number; purchasedMinutes: number };
}

export const iapService = {
  /**
   * Send a StoreKit 2 signed transaction (JWS) to the backend for verification
   * + crediting. Idempotent server-side (keyed on the Apple transactionId), so
   * it is safe to call again for a redelivered/unfinished transaction.
   */
  verifyApple: async (
    jwsRepresentation: string,
    productId: string,
  ): Promise<IapVerifyResult> => {
    const res = await apiEndpoints.iapVerifyApple({ jwsRepresentation, productId });
    return res.data as IapVerifyResult;
  },
};
