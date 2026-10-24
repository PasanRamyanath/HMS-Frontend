/**
 * Shared Laundry & Dry Cleaning Types, Tariffs, and Domain Calculators.
 * Pure TypeScript, zero UI dependencies.
 * Purpose-built for Sri Lankan hotels, resorts, and boutique guest services.
 */

import type { SupportedLanguage } from "./i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type LaundryServiceType = "WASH_AND_IRON" | "DRY_CLEAN" | "PRESS_ONLY";

export type GarmentCategory =
 | "MENS"
 | "LADIES"
 | "CHILDRENS"
 | "TRADITIONAL_CEYLON"
 | "HOUSEHOLD_LINEN";

export interface TrilingualGarmentTitle {
 readonly en: string;
 readonly si: string;
 readonly ta: string;
}

export interface LaundryGarmentItem {
 readonly id: string;
 readonly code: string;
 readonly title: TrilingualGarmentTitle;
 readonly category: GarmentCategory;
 readonly pricesLkr: Readonly<Record<LaundryServiceType, number>>;
 readonly turnaroundHours: number;
 readonly expressEligible: boolean;
 readonly isActive: boolean;
 readonly specialCareNotice?: string | undefined;
}

export interface LaundryBagLineSelection {
 readonly serviceType: LaundryServiceType;
 readonly quantity: number;
}

export interface LaundryBillLine {
 readonly itemId: string;
 readonly title: string;
 readonly serviceType: LaundryServiceType;
 readonly quantity: number;
 readonly unitPriceLkr: number;
 readonly lineTotalLkr: number;
}

export interface LaundryBillSummary {
 readonly standardSubtotalLkr: number;
 readonly isExpress: boolean;
 readonly expressSurchargeLkr: number;
 readonly netTotalLkr: number;
 readonly estimatedServiceChargeLkr: number;
 readonly estimatedVatLkr: number;
 readonly grandTotalLkr: number;
 readonly totalGarmentsCount: number;
 readonly lines: readonly LaundryBillLine[];
}

export type LaundryEditorTab = "PRICE_LIST" | "QR_BAG_SIMULATOR";

// ============================================================================
// Default Catalog Presets (Authentic Sri Lankan Hotel Laundry Tariff)
// ============================================================================

export const DEFAULT_LAUNDRY_CATALOG: readonly LaundryGarmentItem[] = [
 {
 id: "lnd-shirt-01",
 code: "LND-SHIRT-M",
 title: {
 en: "Men's Shirt / Ceylon Batik Shirt",
 si: "පිරිමි ෂර්ට් / බතික් කමිසය",
 ta: "ஆண்கள் சட்டை / பாடிக் சட்டை",
 },
 category: "MENS",
 pricesLkr: {
 WASH_AND_IRON: 650.0,
 DRY_CLEAN: 1200.0,
 PRESS_ONLY: 350.0,
 },
 turnaroundHours: 24,
 expressEligible: true,
 isActive: true,
 },
 {
 id: "lnd-trouser-02",
 code: "LND-TRSR-M",
 title: {
 en: "Trousers / Linen Chinos",
 si: "කලිසම / ලිනන් කලිසම",
 ta: "காற்சட்டை / லினன் பேண்ட்",
 },
 category: "MENS",
 pricesLkr: {
 WASH_AND_IRON: 750.0,
 DRY_CLEAN: 1400.0,
 PRESS_ONLY: 400.0,
 },
 turnaroundHours: 24,
 expressEligible: true,
 isActive: true,
 },
 {
 id: "lnd-saree-03",
 code: "LND-SREE-L",
 title: {
 en: "Kandyan Osariya / Pure Silk Saree & Blouse",
 si: "ඔසරිය / සේද සාරිය සහ හැට්ටය",
 ta: "பட்டுப் புடவை மற்றும் ரவிக்கை",
 },
 category: "TRADITIONAL_CEYLON",
 pricesLkr: {
 WASH_AND_IRON: 1400.0,
 DRY_CLEAN: 2800.0,
 PRESS_ONLY: 900.0,
 },
 turnaroundHours: 48,
 expressEligible: false,
 isActive: true,
 specialCareNotice:
 "Hand wash & delicate steam press only for pure gold zari / silk embroidery.",
 },
 {
 id: "lnd-sarong-04",
 code: "LND-SRNG-T",
 title: {
 en: "Ceylon Handloom Sarong / National Suit",
 si: "අත්යන්ත්ර සරම / ජාතික ඇඳුම",
 ta: "கைத்தறி சாரம் / தேசிய உடை",
 },
 category: "TRADITIONAL_CEYLON",
 pricesLkr: {
 WASH_AND_IRON: 600.0,
 DRY_CLEAN: 1100.0,
 PRESS_ONLY: 300.0,
 },
 turnaroundHours: 24,
 expressEligible: true,
 isActive: true,
 },
 {
 id: "lnd-blazer-05",
 code: "LND-BLZR-U",
 title: {
 en: "Suit Jacket / Dinner Blazer",
 si: "බ්ලේසර් / කෝට් කබාය",
 ta: "சூட் ஜாக்கெட் / பிளேசர்",
 },
 category: "MENS",
 pricesLkr: {
 WASH_AND_IRON: 1800.0,
 DRY_CLEAN: 2400.0,
 PRESS_ONLY: 950.0,
 },
 turnaroundHours: 36,
 expressEligible: true,
 isActive: true,
 },
 {
 id: "lnd-dress-06",
 code: "LND-DRSS-L",
 title: {
 en: "Ladies Evening Dress / Summer Gown",
 si: "කාන්තා සන්ධ්යා ගවුම",
 ta: "பெண்கள் மாலை ஆடை",
 },
 category: "LADIES",
 pricesLkr: {
 WASH_AND_IRON: 1200.0,
 DRY_CLEAN: 2200.0,
 PRESS_ONLY: 650.0,
 },
 turnaroundHours: 24,
 expressEligible: true,
 isActive: true,
 },
];

// ============================================================================
// Pure Domain Math & Calculation Resolvers (Complexity <= 12)
// ============================================================================

export function formatPriceLkr(amount: number): string {
 return new Intl.NumberFormat("en-LK", {
 style: "currency",
 currency: "LKR",
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(amount);
}

export function resolveTrilingualTitle(
 title: TrilingualGarmentTitle,
 language: SupportedLanguage = "en",
): string {
 return title[language] || title.en;
}

export function getCategoryLabel(category: GarmentCategory): string {
 switch (category) {
 case "MENS":
 return "Men's Apparel";
 case "LADIES":
 return "Ladies' Wear";
 case "CHILDRENS":
 return "Children's Clothing";
 case "TRADITIONAL_CEYLON":
 return "Traditional Ceylon Attire";
 case "HOUSEHOLD_LINEN":
 return "Bed & Bath Linen";
 }
}

export function getServiceTypeLabel(serviceType: LaundryServiceType): string {
 switch (serviceType) {
 case "WASH_AND_IRON":
 return "Wash & Iron";
 case "DRY_CLEAN":
 return "Dry Cleaning";
 case "PRESS_ONLY":
 return "Pressing Only";
 }
}

export function calculateLaundryBagBill(
 items: readonly LaundryGarmentItem[],
 selections: Readonly<Record<string, LaundryBagLineSelection>>,
 isExpress4Hour: boolean,
): LaundryBillSummary {
 const lines: LaundryBillLine[] = [];
 let standardSubtotal = 0;
 let totalCount = 0;

 for (const item of items) {
 const sel = selections[item.id];
 if (!sel || sel.quantity <= 0) continue;

 const unitPrice = item.pricesLkr[sel.serviceType] ?? 0;
 const lineTotal = Math.round((unitPrice * sel.quantity + Number.EPSILON) * 100) / 100;

 standardSubtotal += lineTotal;
 totalCount += sel.quantity;

 lines.push({
 itemId: item.id,
 title: item.title.en,
 serviceType: sel.serviceType,
 quantity: sel.quantity,
 unitPriceLkr: unitPrice,
 lineTotalLkr: lineTotal,
 });
 }

 // 50% Surcharge for Express 4-Hour Service
 const expressSurchargeLkr = isExpress4Hour
 ? Math.round((standardSubtotal * 0.5 + Number.EPSILON) * 100) / 100
 : 0;

 const netTotalLkr =
 Math.round((standardSubtotal + expressSurchargeLkr + Number.EPSILON) * 100) / 100;

 // 10% Service Charge & 18% VAT (Sri Lankan statutory)
 const estimatedServiceChargeLkr = Math.round((netTotalLkr * 0.1 + Number.EPSILON) * 100) / 100;
 const estimatedVatLkr =
 Math.round(((netTotalLkr + estimatedServiceChargeLkr) * 0.18 + Number.EPSILON) * 100) / 100;
 const grandTotalLkr =
 Math.round((netTotalLkr + estimatedServiceChargeLkr + estimatedVatLkr + Number.EPSILON) * 100) /
 100;

 return {
 standardSubtotalLkr: Math.round((standardSubtotal + Number.EPSILON) * 100) / 100,
 isExpress: isExpress4Hour,
 expressSurchargeLkr,
 netTotalLkr,
 estimatedServiceChargeLkr,
 estimatedVatLkr,
 grandTotalLkr,
 totalGarmentsCount: totalCount,
 lines,
 };
}
