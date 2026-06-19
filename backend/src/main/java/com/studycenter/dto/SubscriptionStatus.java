package com.studycenter.dto;

/**
 * Computed subscription status — never stored, always derived from
 * Tenant.subscriptionUntil + TenantPayment count.
 */
public enum SubscriptionStatus {
    TRIAL,          // No payments yet, still within trial period
    ACTIVE,         // Paid, more than 7 days remain
    EXPIRING_SOON,  // 0–7 days remain
    GRACE_PERIOD,   // Expired but within 5-day grace
    EXPIRED         // Past grace period — login blocked
}
