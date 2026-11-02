/**
 * Cashfree Web Checkout SDK initialization utility.
 * Supports both official script load (window.Cashfree) and @cashfreepayments/cashfree-js package.
 */
import { load } from '@cashfreepayments/cashfree-js';

let cashfreeInstance = null;

export function getCashfreeMode() {
  const env = (import.meta.env.VITE_CASHFREE_ENVIRONMENT || 'SANDBOX').trim().toLowerCase();
  return env === 'production' ? 'production' : 'sandbox';
}

/**
 * Loads and returns an initialized Cashfree SDK instance in the configured mode.
 */
export async function getCashfree() {
  if (cashfreeInstance) {
    return cashfreeInstance;
  }

  const mode = getCashfreeMode();

  // 1. Check if window.Cashfree is already available from script tag
  if (typeof window !== 'undefined' && typeof window.Cashfree === 'function') {
    cashfreeInstance = window.Cashfree({ mode });
    return cashfreeInstance;
  }

  // 2. Fall back to loading via @cashfreepayments/cashfree-js
  try {
    cashfreeInstance = await load({ mode });
    return cashfreeInstance;
  } catch (err) {
    console.error('Failed to initialize Cashfree SDK via package, retrying window check:', err);
    if (typeof window !== 'undefined' && typeof window.Cashfree === 'function') {
      cashfreeInstance = window.Cashfree({ mode });
      return cashfreeInstance;
    }
    throw new Error('Cashfree SDK is currently unavailable. Please verify internet connection.');
  }
}
