/**
 * Payment status component
 * Displays current payment status and messages
 */

import type { PaymentStatus } from '../hooks/usePayment';

interface PaymentStatusProps {
  status: PaymentStatus;
  error: string;
  successMessage?: string;
}

export function PaymentStatus({ status, error, successMessage }: PaymentStatusProps) {
  if (status === 'idle') return null;

  return (
    <div className={`payment-status status-${status}`}>
      {status === 'preparing' && (
        <div className="status-content">
          <div className="spinner"></div>
          <p>Preparing payment...</p>
        </div>
      )}

      {status === 'paying' && (
        <div className="status-content">
          <div className="spinner"></div>
          <p>Processing payment...</p>
          <p className="hint">Please sign the transaction in your wallet</p>
        </div>
      )}

      {status === 'success' && (
        <div className="status-content success">
          <div className="icon">✓</div>
          <p>{successMessage || 'Payment successful!'}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="status-content error">
          <div className="icon">✗</div>
          <p>Payment failed</p>
          {error && <p className="error-message">{error}</p>}
        </div>
      )}
    </div>
  );
}

