import { useCallback, useEffect, useRef, useState } from 'react';
import { useIAP } from 'expo-iap';
import type { Purchase } from 'expo-iap';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../utils/constants';
import { MINUTE_PRODUCT_IDS, iapService } from '../services/iapService';
import type { IapVerifyResult } from '../services/iapService';

export type PurchaseStatus = 'idle' | 'purchasing' | 'verifying' | 'success' | 'error';

type FinishTransactionFn = (args: {
  purchase: Purchase;
  isConsumable?: boolean;
}) => Promise<void>;

/**
 * Drives the Apple IAP consumable-minutes purchase flow via expo-iap's useIAP.
 *
 * Critical ordering for a CONSUMABLE: verify with the backend (which credits the
 * balance) BEFORE calling finishTransaction. StoreKit keeps an unfinished
 * transaction and redelivers it (to onPurchaseSuccess) on every app launch until
 * finishTransaction() is called — so if verification fails we deliberately leave
 * it unfinished and retry later. Backend verification is idempotent, so a
 * redelivered transaction that was already credited returns credited:false and
 * we simply finish it.
 */
export function useMinutePurchase() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<PurchaseStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<IapVerifyResult | null>(null);

  // finishTransaction is returned by useIAP below; expose it to the
  // onPurchaseSuccess callback (declared in the same call) via a ref.
  const finishTransactionRef = useRef<FinishTransactionFn | null>(null);
  // Guard against overlapping verifications of the same transaction.
  const inFlightRef = useRef<Set<string>>(new Set());

  const verifyAndFinish = useCallback(
    async (purchase: Purchase) => {
      const finishTransaction = finishTransactionRef.current;
      const txId = purchase.transactionId ?? purchase.id;
      const jws = purchase.purchaseToken;
      const productId = purchase.productId;

      if (!jws || !productId) {
        setStatus('error');
        setError('Purchase is missing verification data');
        return;
      }
      if (txId && inFlightRef.current.has(txId)) return;
      if (txId) inFlightRef.current.add(txId);

      try {
        setStatus('verifying');
        const result = await iapService.verifyApple(jws, productId);
        // Only finish AFTER the server credited (or confirmed already-credited).
        if (finishTransaction) {
          await finishTransaction({ purchase, isConsumable: true });
        }
        setLastResult(result);
        setStatus('success');
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BALANCE] });
      } catch (e: any) {
        // Do NOT finish — leave the transaction unfinished so StoreKit
        // redelivers it and we retry crediting on the next launch.
        setStatus('error');
        setError(e?.response?.data?.error || e?.message || 'Could not credit minutes');
      } finally {
        if (txId) inFlightRef.current.delete(txId);
      }
    },
    [queryClient],
  );

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases,
  } = useIAP({
    // Fires for fresh purchases AND redelivered unfinished ones on connect.
    onPurchaseSuccess: (purchase) => {
      void verifyAndFinish(purchase);
    },
    onPurchaseError: (e) => {
      // user-cancelled is a normal outcome, not an error to surface loudly.
      setStatus('error');
      setError(e?.message || 'Purchase failed');
    },
    onError: (e) => {
      setError(e?.message || 'Store error');
    },
  });

  useEffect(() => {
    finishTransactionRef.current = finishTransaction;
  }, [finishTransaction]);

  // Load products + reconcile any unfinished transactions once connected.
  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: [...MINUTE_PRODUCT_IDS], type: 'in-app' }).catch(() => {});
    // Crash/interrupt recovery: unfinished transactions also arrive via
    // onPurchaseSuccess, but poll once to be safe.
    getAvailablePurchases().catch(() => {});
  }, [connected, fetchProducts, getAvailablePurchases]);

  const buy = useCallback(
    async (productId: string) => {
      setError(null);
      setStatus('purchasing');
      try {
        await requestPurchase({ request: { ios: { sku: productId } }, type: 'in-app' });
        // Success is delivered asynchronously via onPurchaseSuccess.
      } catch (e: any) {
        setStatus('error');
        setError(e?.message || 'Could not start purchase');
      }
    },
    [requestPurchase],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return {
    connected,
    products,
    status,
    error,
    lastResult,
    buy,
    reset,
    isBusy: status === 'purchasing' || status === 'verifying',
  };
}
