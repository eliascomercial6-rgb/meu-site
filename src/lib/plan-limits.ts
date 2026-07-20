/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Single source of truth for plan/trial limits. Import this everywhere the
// app needs to know "how much storage can THIS photographer use right now",
// instead of the old hardcoded `STORAGE_LIMIT_GB = 10` that was the same
// for every account regardless of plan or trial status.
//
// Requires two columns on `photographers` (see migration SQL provided):
//   trial_ends_at  timestamptz
//   plan           text  default 'trial'
//
// Existing rows created before this migration won't have `trial_ends_at`
// set — in that case we fall back to `created_at + 14 dias` so nobody's
// trial silently starts over or breaks.

export const TRIAL_DAYS = 14;
export const TRIAL_STORAGE_LIMIT_GB = 1;
export const PAID_STORAGE_LIMIT_GB = 10;

export interface PhotographerPlanFields {
  plan?: string | null;
  trial_ends_at?: string | null;
  created_at?: string | null;
}

export interface PlanLimits {
  plan: string;
  isTrial: boolean;
  isExpired: boolean;
  trialEndsAt: Date | null;
  daysLeft: number;
  storageLimitGB: number;
}

export function getPlanLimits(photographer: PhotographerPlanFields | null | undefined): PlanLimits {
  const plan = photographer?.plan || 'trial';
  const isTrial = plan === 'trial';

  let trialEndsAt: Date | null = null;
  if (photographer?.trial_ends_at) {
    trialEndsAt = new Date(photographer.trial_ends_at);
  } else if (photographer?.created_at) {
    // Backfill for accounts created before the trial_ends_at column existed.
    trialEndsAt = new Date(new Date(photographer.created_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  }

  const now = new Date();
  const msLeft = trialEndsAt ? trialEndsAt.getTime() - now.getTime() : Infinity;
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  const isExpired = isTrial && trialEndsAt !== null && msLeft <= 0;

  return {
    plan,
    isTrial,
    isExpired,
    trialEndsAt,
    daysLeft,
    storageLimitGB: isTrial ? TRIAL_STORAGE_LIMIT_GB : PAID_STORAGE_LIMIT_GB,
  };
}
