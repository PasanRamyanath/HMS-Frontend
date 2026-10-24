import { useSyncExternalStore } from "react";
import type { GuestCustomizedDish, ModifierOption } from "./DishModifierSheet.js";
import type { GuestDish, GuestMealPlanCode } from "./GuestDishCard.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export interface CartItem {
 readonly id: string;
 readonly dishId: string;
 readonly name: string;
 readonly imageUrl?: string | undefined;
 readonly unitBasePriceLkr: number;
 readonly quantity: number;
 readonly selectedPortion?: ModifierOption | undefined;
 readonly selectedSpiceLevel?: ModifierOption | undefined;
 readonly selectedAddOns: ReadonlyArray<ModifierOption>;
 readonly dietaryPreferences: ReadonlyArray<string>;
 readonly specialInstructions?: string | undefined;
 readonly freeOnMealPlans?: ReadonlyArray<GuestMealPlanCode | string> | undefined;
 readonly isMealPlanCovered: boolean;
 readonly mealPlanDiscountLkr: number;
 readonly effectiveLineTotalLkr: number;
}

export interface TaxRatesConfig {
 readonly enableServiceCharge: boolean;
 readonly serviceChargeRate: number; // 0.10 (10%)
 readonly enableTdl: boolean;
 readonly tdlRate: number; // 0.01 (1%)
 readonly enableSscl: boolean;
 readonly ssclRate: number; // 0.025 (2.5%)
 readonly enableVat: boolean;
 readonly vatRate: number; // 0.18 (18%)
}

export interface CartTaxSummary {
 readonly grossSubtotalLkr: number;
 readonly mealPlanSavingsLkr: number;
 readonly netBaseSupplyLkr: number;
 readonly serviceChargeLkr: number;
 readonly subtotalAfterScLkr: number;
 readonly tdlLkr: number;
 readonly ssclLkr: number;
 readonly vatBaseLkr: number;
 readonly vatLkr: number;
 readonly grandTotalLkr: number;
 readonly approxGrandTotalUsd: number;
}

export interface GuestCartState {
 readonly items: ReadonlyArray<CartItem>;
 readonly guestMealPlan: GuestMealPlanCode | string;
 readonly taxConfig: TaxRatesConfig;
 readonly usdExchangeRate: number;
 readonly summary: CartTaxSummary;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_TAX_CONFIG: TaxRatesConfig = {
 enableServiceCharge: true,
 serviceChargeRate: 0.1, // 10% Hotel Service Charge (Ceylon Workers Standard)
 enableTdl: true,
 tdlRate: 0.01, // 1% Tourism Development Levy (SLTDA)
 enableSscl: true,
 ssclRate: 0.025, // 2.5% Social Security Contribution Levy
 enableVat: true,
 vatRate: 0.18, // 18% Value Added Tax (Statutory Standard)
};

const DEFAULT_CART_SNAPSHOT: GuestCartState = {
 items: [],
 guestMealPlan: "RO",
 taxConfig: DEFAULT_TAX_CONFIG,
 usdExchangeRate: 310,
 summary: {
 grossSubtotalLkr: 0,
 mealPlanSavingsLkr: 0,
 netBaseSupplyLkr: 0,
 serviceChargeLkr: 0,
 subtotalAfterScLkr: 0,
 tdlLkr: 0,
 ssclLkr: 0,
 vatBaseLkr: 0,
 vatLkr: 0,
 grandTotalLkr: 0,
 approxGrandTotalUsd: 0,
 },
};

const STORAGE_KEY = "hms_guest_cart_v1";

// ============================================================================
// Pure Statutory Tax & Meal-Plan Calculation Engines
// ============================================================================

export function roundRupees(amount: number): number {
 if (!Number.isFinite(amount)) return 0;
 return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Applies Sri Lankan meal plan entitlements (BB, HB, FB, AI) to a single cart item.
 * If the item is marked free on the guest's plan, the base price is zeroed out,
 * while portions upgrades or paid add-ons remain payable.
 */
export function applyMealPlanEntitlements(
 unitBasePriceLkr: number,
 quantity: number,
 freeOnMealPlans: ReadonlyArray<string> | undefined,
 guestMealPlan: string,
 portionAdjustment = 0,
 addOnsTotal = 0,
): { isCovered: boolean; discountLkr: number; effectiveTotalLkr: number } {
 const normalizedPlan = guestMealPlan.toUpperCase();
 const isCovered = Boolean(
 normalizedPlan !== "RO" && freeOnMealPlans?.some((p) => p.toUpperCase() === normalizedPlan),
 );

 const baseLineTotal = unitBasePriceLkr * quantity;
 const extrasPerUnit = portionAdjustment + addOnsTotal;
 const extrasLineTotal = extrasPerUnit * quantity;

 if (isCovered) {
 const discountLkr = baseLineTotal;
 const effectiveTotalLkr = extrasLineTotal;
 return { isCovered: true, discountLkr, effectiveTotalLkr };
 }

 return {
 isCovered: false,
 discountLkr: 0,
 effectiveTotalLkr: baseLineTotal + extrasLineTotal,
 };
}

/**
 * Pure 4-stage compounding Sri Lankan statutory tax calculation:
 * 1. Service Charge (10% on Net Base Supply)
 * 2. Tourism Development Levy (1% on Base + SC)
 * 3. Social Security Contribution Levy (2.5% on Base + SC)
 * 4. Value Added Tax (18% on Base + SC + TDL + SSCL)
 */
export function calculateForwardTax(
 netBaseSupplyLkr: number,
 config: TaxRatesConfig,
 usdExchangeRate = 310,
): CartTaxSummary {
 const base = Math.max(0, roundRupees(netBaseSupplyLkr));

 const sc = config.enableServiceCharge ? roundRupees(base * config.serviceChargeRate) : 0;
 const subtotalAfterSc = roundRupees(base + sc);

 const tdl = config.enableTdl ? roundRupees(subtotalAfterSc * config.tdlRate) : 0;
 const sscl = config.enableSscl ? roundRupees(subtotalAfterSc * config.ssclRate) : 0;

 const vatBase = roundRupees(subtotalAfterSc + tdl + sscl);
 const vat = config.enableVat ? roundRupees(vatBase * config.vatRate) : 0;

 const grandTotal = roundRupees(vatBase + vat);
 const approxUsd = roundRupees(grandTotal / (usdExchangeRate > 0 ? usdExchangeRate : 310));

 return {
 grossSubtotalLkr: base,
 mealPlanSavingsLkr: 0,
 netBaseSupplyLkr: base,
 serviceChargeLkr: sc,
 subtotalAfterScLkr: subtotalAfterSc,
 tdlLkr: tdl,
 ssclLkr: sscl,
 vatBaseLkr: vatBase,
 vatLkr: vat,
 grandTotalLkr: grandTotal,
 approxGrandTotalUsd: approxUsd,
 };
}

/**
 * Computes full financial summary for a list of cart items.
 */
export function computeCartSummary(
 items: ReadonlyArray<CartItem>,
 config: TaxRatesConfig,
 _guestMealPlan?: string | undefined,
 usdExchangeRate = 310,
): CartTaxSummary {
 let grossSubtotalLkr = 0;
 let mealPlanSavingsLkr = 0;
 let netBaseSupplyLkr = 0;

 for (const item of items) {
 const rawLine = (item.unitBasePriceLkr + getExtrasPerUnit(item)) * item.quantity;
 grossSubtotalLkr += rawLine;
 mealPlanSavingsLkr += item.mealPlanDiscountLkr;
 netBaseSupplyLkr += item.effectiveLineTotalLkr;
 }

 const taxBreakdown = calculateForwardTax(netBaseSupplyLkr, config, usdExchangeRate);

 return {
 grossSubtotalLkr: roundRupees(grossSubtotalLkr),
 mealPlanSavingsLkr: roundRupees(mealPlanSavingsLkr),
 netBaseSupplyLkr: taxBreakdown.netBaseSupplyLkr,
 serviceChargeLkr: taxBreakdown.serviceChargeLkr,
 subtotalAfterScLkr: taxBreakdown.subtotalAfterScLkr,
 tdlLkr: taxBreakdown.tdlLkr,
 ssclLkr: taxBreakdown.ssclLkr,
 vatBaseLkr: taxBreakdown.vatBaseLkr,
 vatLkr: taxBreakdown.vatLkr,
 grandTotalLkr: taxBreakdown.grandTotalLkr,
 approxGrandTotalUsd: taxBreakdown.approxGrandTotalUsd,
 };
}

function getExtrasPerUnit(item: CartItem): number {
 const portion = item.selectedPortion?.priceAdjustmentLkr ?? 0;
 const addons = item.selectedAddOns.reduce((acc, opt) => acc + opt.priceAdjustmentLkr, 0);
 return portion + addons;
}

// ============================================================================
// External Reactive Store Implementation (useSyncExternalStore)
// ============================================================================

class GuestCartStore {
 private state: GuestCartState;
 private listeners = new Set<() => void>();

 constructor() {
 this.state = this.loadFromStorage();
 }

 private loadFromStorage(): GuestCartState {
 if (typeof window === "undefined" || !window.sessionStorage) {
 return DEFAULT_CART_SNAPSHOT;
 }
 try {
 const raw = window.sessionStorage.getItem(STORAGE_KEY);
 if (!raw) return DEFAULT_CART_SNAPSHOT;
 const parsed = JSON.parse(raw) as Partial<GuestCartState>;
 if (!Array.isArray(parsed.items)) return DEFAULT_CART_SNAPSHOT;

 const items = parsed.items as ReadonlyArray<CartItem>;
 const guestMealPlan = parsed.guestMealPlan ?? "RO";
 const taxConfig = parsed.taxConfig ?? DEFAULT_TAX_CONFIG;
 const usdExchangeRate = parsed.usdExchangeRate ?? 310;
 const summary = computeCartSummary(items, taxConfig, guestMealPlan, usdExchangeRate);

 return { items, guestMealPlan, taxConfig, usdExchangeRate, summary };
 } catch {
 return DEFAULT_CART_SNAPSHOT;
 }
 }

 private saveToStorage(state: GuestCartState): void {
 if (typeof window === "undefined" || !window.sessionStorage) return;
 try {
 window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
 } catch {
 // Storage quota exceeded or disabled in privacy mode
 }
 }

 private emitChange(): void {
 this.saveToStorage(this.state);
 for (const listener of this.listeners) {
 listener();
 }
 }

 public subscribe = (listener: () => void): (() => void) => {
 this.listeners.add(listener);
 return () => {
 this.listeners.delete(listener);
 };
 };

 public getSnapshot = (): GuestCartState => {
 return this.state;
 };

 public getServerSnapshot = (): GuestCartState => {
 return DEFAULT_CART_SNAPSHOT;
 };

 public addSimpleDish(dish: GuestDish, quantity = 1): void {
 this.addCustomizedItem(
 {
 dishId: dish.id,
 dishName: dish.name.en,
 basePriceLkr: dish.priceLkr,
 selectedPortion: undefined,
 selectedSpiceLevel: undefined,
 selectedAddOns: [],
 dietaryPreferences: [],
 specialInstructions: undefined,
 quantity: Math.max(1, quantity),
 unitPriceLkr: dish.priceLkr,
 totalPriceLkr: dish.priceLkr * Math.max(1, quantity),
 },
 dish.imageUrl,
 dish.freeOnMealPlans,
 );
 }

 public addCustomizedItem(
 customized: GuestCustomizedDish,
 imageUrl?: string | undefined,
 freeOnMealPlans?: ReadonlyArray<GuestMealPlanCode | string> | undefined,
 ): void {
 const portionAdjustment = customized.selectedPortion?.priceAdjustmentLkr ?? 0;
 const addOnsTotal = customized.selectedAddOns.reduce(
 (acc, opt) => acc + opt.priceAdjustmentLkr,
 0,
 );

 const entitlement = applyMealPlanEntitlements(
 customized.basePriceLkr,
 customized.quantity,
 freeOnMealPlans,
 this.state.guestMealPlan,
 portionAdjustment,
 addOnsTotal,
 );

 // Unique line ID including modifiers
 const addonKeys = customized.selectedAddOns
 .map((a) => a.id)
 .sort()
 .join(",");
 const lineKey = `${customized.dishId}_${customized.selectedPortion?.id ?? "none"}_${customized.selectedSpiceLevel?.id ?? "none"}_${addonKeys}`;

 const existingIndex = this.state.items.findIndex((item) => item.id === lineKey);
 let newItems: CartItem[];

 if (existingIndex >= 0) {
 const existing = this.state.items[existingIndex];
 if (!existing) return;
 const updatedQty = existing.quantity + customized.quantity;
 const updatedEntitlement = applyMealPlanEntitlements(
 existing.unitBasePriceLkr,
 updatedQty,
 existing.freeOnMealPlans,
 this.state.guestMealPlan,
 portionAdjustment,
 addOnsTotal,
 );

 const updatedItem: CartItem = {
 ...existing,
 quantity: updatedQty,
 isMealPlanCovered: updatedEntitlement.isCovered,
 mealPlanDiscountLkr: updatedEntitlement.discountLkr,
 effectiveLineTotalLkr: updatedEntitlement.effectiveTotalLkr,
 };

 newItems = [...this.state.items];
 newItems[existingIndex] = updatedItem;
 } else {
 const newItem: CartItem = {
 id: lineKey,
 dishId: customized.dishId,
 name: customized.dishName,
 imageUrl,
 unitBasePriceLkr: customized.basePriceLkr,
 quantity: customized.quantity,
 selectedPortion: customized.selectedPortion,
 selectedSpiceLevel: customized.selectedSpiceLevel,
 selectedAddOns: customized.selectedAddOns,
 dietaryPreferences: customized.dietaryPreferences,
 specialInstructions: customized.specialInstructions,
 freeOnMealPlans,
 isMealPlanCovered: entitlement.isCovered,
 mealPlanDiscountLkr: entitlement.discountLkr,
 effectiveLineTotalLkr: entitlement.effectiveTotalLkr,
 };
 newItems = [...this.state.items, newItem];
 }

 const summary = computeCartSummary(
 newItems,
 this.state.taxConfig,
 this.state.guestMealPlan,
 this.state.usdExchangeRate,
 );

 this.state = { ...this.state, items: newItems, summary };
 this.emitChange();
 }

 public incrementItem(itemId: string): void {
 const item = this.state.items.find((i) => i.id === itemId);
 if (!item) return;

 const newQty = item.quantity + 1;
 this.updateItemQuantity(itemId, newQty);
 }

 public decrementItem(itemId: string): void {
 const item = this.state.items.find((i) => i.id === itemId);
 if (!item) return;

 if (item.quantity <= 1) {
 this.removeItem(itemId);
 return;
 }

 this.updateItemQuantity(itemId, item.quantity - 1);
 }

 public updateItemQuantity(itemId: string, newQty: number): void {
 const newItems = this.state.items.map((item) => {
 if (item.id !== itemId) return item;
 const extras = getExtrasPerUnit(item);
 const entitlement = applyMealPlanEntitlements(
 item.unitBasePriceLkr,
 newQty,
 item.freeOnMealPlans,
 this.state.guestMealPlan,
 item.selectedPortion?.priceAdjustmentLkr ?? 0,
 extras - (item.selectedPortion?.priceAdjustmentLkr ?? 0),
 );
 return {
 ...item,
 quantity: newQty,
 isMealPlanCovered: entitlement.isCovered,
 mealPlanDiscountLkr: entitlement.discountLkr,
 effectiveLineTotalLkr: entitlement.effectiveTotalLkr,
 };
 });

 const summary = computeCartSummary(
 newItems,
 this.state.taxConfig,
 this.state.guestMealPlan,
 this.state.usdExchangeRate,
 );

 this.state = { ...this.state, items: newItems, summary };
 this.emitChange();
 }

 public removeItem(itemId: string): void {
 const newItems = this.state.items.filter((i) => i.id !== itemId);
 const summary = computeCartSummary(
 newItems,
 this.state.taxConfig,
 this.state.guestMealPlan,
 this.state.usdExchangeRate,
 );

 this.state = { ...this.state, items: newItems, summary };
 this.emitChange();
 }

 public clearCart(): void {
 this.state = {
 ...this.state,
 items: [],
 summary: computeCartSummary(
 [],
 this.state.taxConfig,
 this.state.guestMealPlan,
 this.state.usdExchangeRate,
 ),
 };
 this.emitChange();
 }

 public setGuestMealPlan(plan: string): void {
 const recomputedItems = this.state.items.map((item) => {
 const extras = getExtrasPerUnit(item);
 const entitlement = applyMealPlanEntitlements(
 item.unitBasePriceLkr,
 item.quantity,
 item.freeOnMealPlans,
 plan,
 item.selectedPortion?.priceAdjustmentLkr ?? 0,
 extras - (item.selectedPortion?.priceAdjustmentLkr ?? 0),
 );
 return {
 ...item,
 isMealPlanCovered: entitlement.isCovered,
 mealPlanDiscountLkr: entitlement.discountLkr,
 effectiveLineTotalLkr: entitlement.effectiveTotalLkr,
 };
 });

 const summary = computeCartSummary(
 recomputedItems,
 this.state.taxConfig,
 plan,
 this.state.usdExchangeRate,
 );

 this.state = {
 ...this.state,
 guestMealPlan: plan,
 items: recomputedItems,
 summary,
 };
 this.emitChange();
 }

 public setTaxConfig(config: TaxRatesConfig): void {
 const summary = computeCartSummary(
 this.state.items,
 config,
 this.state.guestMealPlan,
 this.state.usdExchangeRate,
 );
 this.state = { ...this.state, taxConfig: config, summary };
 this.emitChange();
 }

 public setUsdExchangeRate(rate: number): void {
 const validRate = rate > 0 ? rate : 310;
 const summary = computeCartSummary(
 this.state.items,
 this.state.taxConfig,
 this.state.guestMealPlan,
 validRate,
 );
 this.state = { ...this.state, usdExchangeRate: validRate, summary };
 this.emitChange();
 }
}

// Global Singleton Store Instance
export const guestCartStore = new GuestCartStore();

// ============================================================================
// React Hook: useGuestCart
// ============================================================================

export function useGuestCart() {
 const state = useSyncExternalStore(
 guestCartStore.subscribe,
 guestCartStore.getSnapshot,
 guestCartStore.getServerSnapshot,
 );

 const totalItemCount = state.items.reduce((acc, item) => acc + item.quantity, 0);

 return {
 items: state.items,
 totalItemCount,
 cartItemCount: totalItemCount,
 summary: state.summary,
 guestMealPlan: state.guestMealPlan,
 taxConfig: state.taxConfig,
 usdExchangeRate: state.usdExchangeRate,
 addDish: (dish: GuestDish, quantity?: number) => guestCartStore.addSimpleDish(dish, quantity),
 addCustomizedItem: (
 customized: GuestCustomizedDish,
 imageUrl?: string,
 freeOnMealPlans?: ReadonlyArray<GuestMealPlanCode | string>,
 ) => guestCartStore.addCustomizedItem(customized, imageUrl, freeOnMealPlans),
 incrementItem: (itemId: string) => guestCartStore.incrementItem(itemId),
 decrementItem: (itemId: string) => guestCartStore.decrementItem(itemId),
 removeItem: (itemId: string) => guestCartStore.removeItem(itemId),
 clearCart: () => guestCartStore.clearCart(),
 setGuestMealPlan: (plan: string) => guestCartStore.setGuestMealPlan(plan),
 setTaxConfig: (config: TaxRatesConfig) => guestCartStore.setTaxConfig(config),
 setUsdExchangeRate: (rate: number) => guestCartStore.setUsdExchangeRate(rate),
 };
}
