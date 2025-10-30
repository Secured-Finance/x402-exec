/**
 * Payment processing hook
 * Handles x402 payment flow using wallet client
 */

import { useState } from 'react';
import { useWalletClient } from 'wagmi';
import { wrapFetchWithPayment } from 'x402-fetch';

export type PaymentStatus = 'idle' | 'preparing' | 'paying' | 'success' | 'error';

export function usePayment() {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const { data: walletClient } = useWalletClient();

  const pay = async (endpoint: string, body?: any) => {
    if (!walletClient) {
      setError('Please connect your wallet first');
      setStatus('error');
      throw new Error('Wallet not connected');
    }

    setStatus('preparing');
    setError('');
    setResult(null);

    try {
      // Wrap fetch with x402 payment handling
      const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient as any);
      
      setStatus('paying');
      
      // Make the request with automatic payment handling
      const response = await fetchWithPayment(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      setStatus('success');
      
      return data;
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
      setStatus('error');
      throw err;
    }
  };

  const reset = () => {
    setStatus('idle');
    setError('');
    setResult(null);
  };

  return {
    status,
    error,
    result,
    pay,
    reset,
  };
}

