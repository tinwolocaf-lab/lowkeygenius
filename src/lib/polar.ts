import { supabase } from './supabase';

export async function initiateCheckout(
  productId: string,
  billingCycle: 'monthly' | 'yearly',
  isAudioAddon = false
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/polar-checkout`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId,
        billingCycle,
        isAudioAddon,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout');
  }

  const { url } = await response.json();
  window.location.href = url;
}

export async function openCustomerPortal(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/polar-portal`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to open customer portal');
  }

  const { url } = await response.json();
  window.open(url, '_blank');
}

export const PLAN_LIMITS = {
  FREE: { courses: 1, isMonthly: false },
  PLUS: { courses: 5, isMonthly: true },
  PRO: { courses: 30, isMonthly: true },
  PRO_MAX: { courses: Infinity, isMonthly: false },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export function getPlanLimit(planType: PlanType): number {
  return PLAN_LIMITS[planType].courses;
}

export function isPlanMonthlyLimit(planType: PlanType): boolean {
  return PLAN_LIMITS[planType].isMonthly;
}
