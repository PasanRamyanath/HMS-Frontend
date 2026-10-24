/**
 * Sri Lankan Hospitality Channel Rate & Commission Economics Engine
 *
 * Single Source of Truth for OTA commission reconciliations, net payable
 * calculations, and direct booking margin savings across Sri Lankan hotel properties.
 *
 * Sri Lankan Hospitality Market Standard Parameters:
 * - Booking.com standard commission: 18.0%
 * - Agoda standard commission: 15.0%
 * - Expedia Partner Central commission: 15.0%
 * - Airbnb Host-Only fee: 3.0%
 * - PayHere / WebXPay payment gateway processing fee: 2.5% - 2.6%
 */

/**
 * Standard Sri Lankan PayHere payment gateway transaction processing fee (2.5%).
 */
export const DEFAULT_PAYHERE_GATEWAY_FEE_PERCENT = 2.5;

/**
 * Standard Sri Lankan market average OTA commission rate (18.0%).
 */
export const DEFAULT_AVG_OTA_COMMISSION_PERCENT = 18.0;

/**
 * Computes net direct booking margin savings in LKR compared to an OTA booking,
 * factoring in the local card acquiring fee (PayHere 2.5% or WebXPay 2.6%).
 *
 * Formula: Gross Revenue * (OTA Commission % - Gateway Fee %) / 100
 *
 * @param grossRevenueLkr Gross stay revenue in LKR.
 * @param otaCommissionPercent OTA commission percentage (e.g. 18 for Booking.com).
 * @param paymentGatewayFeePercent Card gateway fee percentage (default 2.5%).
 * @returns Integer rounded net savings in LKR.
 */
export function computeDirectBookingNetSavings(
 grossRevenueLkr: number,
 otaCommissionPercent: number,
 paymentGatewayFeePercent = DEFAULT_PAYHERE_GATEWAY_FEE_PERCENT,
): number {
 if (grossRevenueLkr <= 0 || otaCommissionPercent <= 0) {
 return 0;
 }

 const netCommissionAdvantage = Math.max(0, otaCommissionPercent - paymentGatewayFeePercent);
 return Math.round(grossRevenueLkr * (netCommissionAdvantage / 100));
}

/**
 * Computes projected direct booking savings for a given direct revenue volume,
 * assuming the bookings would otherwise have been captured via OTAs.
 *
 * @param directRevenueLkr Direct website revenue volume in LKR.
 * @param avgOtaCommissionRate Fraction or decimal representing average OTA commission (e.g. 0.18).
 * @returns Integer rounded projected savings in LKR.
 */
export function computeProjectedDirectSavings(
 directRevenueLkr: number,
 avgOtaCommissionRate = DEFAULT_AVG_OTA_COMMISSION_PERCENT / 100,
): number {
 if (directRevenueLkr <= 0 || avgOtaCommissionRate <= 0) {
 return 0;
 }
 return Math.round(directRevenueLkr * avgOtaCommissionRate);
}

/**
 * Computes the effective commission percentage rounded to 1 decimal place.
 *
 * @param grossRevenue Total gross revenue (LKR or USD).
 * @param totalCommission Total commission paid or billed (LKR or USD).
 * @returns Effective commission rate percentage (e.g. 15.5), or 0 if gross is non-positive.
 */
export function computeEffectiveCommissionPercent(
 grossRevenue: number,
 totalCommission: number,
): number {
 if (grossRevenue <= 0 || totalCommission <= 0) {
 return 0;
 }
 return Math.round((totalCommission / grossRevenue) * 1000) / 10;
}

/**
 * Computes net revenue payable to the property after deducting OTA commissions.
 *
 * @param grossRevenue Total gross stay revenue.
 * @param totalCommission Total commission amount.
 * @returns Net payable amount, clamped to zero if commission exceeds gross.
 */
export function computeOtaNetPayable(grossRevenue: number, totalCommission: number): number {
 if (grossRevenue <= 0) {
 return 0;
 }
 return Math.max(0, Math.round(grossRevenue - totalCommission));
}
