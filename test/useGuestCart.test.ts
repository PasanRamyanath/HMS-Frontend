import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SAMPLE_DISHES } from "../src/qr/GuestDishCard.js";
import {
  type CartItem,
  type CartTaxSummary,
  DEFAULT_TAX_CONFIG,
  type GuestCartState,
  type TaxRatesConfig,
  applyMealPlanEntitlements,
  calculateForwardTax,
  computeCartSummary,
  guestCartStore,
  roundRupees,
} from "../src/qr/useGuestCart.js";

describe("Step 257: Client-Side Reactive Cart State & Meal-Plan Calculator (useGuestCart.ts)", () => {
  describe("1. Pure Financial & Statutory 4-Stage Tax Engines", () => {
    it("rounds currency values cleanly to 2 decimal places and handles non-finite inputs", () => {
      assert.strictEqual(roundRupees(100.456), 100.46);
      assert.strictEqual(roundRupees(100.454), 100.45);
      assert.strictEqual(roundRupees(Number.NaN), 0);
      assert.strictEqual(roundRupees(Number.POSITIVE_INFINITY), 0);
    });

    it("applies meal plan entitlements: zeros out base price for covered plans while keeping extras", () => {
      const freeOn = ["HB", "FB", "AI"];
      const basePrice = 2500;
      const qty = 2;
      const portionExtra = 650;
      const addOnsExtra = 350;

      // Half Board guest: Base price (2,500 * 2 = 5,000) is 100% free; extras (1,000 * 2 = 2,000) remain payable
      const hbResult = applyMealPlanEntitlements(
        basePrice,
        qty,
        freeOn,
        "HB",
        portionExtra,
        addOnsExtra,
      );
      assert.strictEqual(hbResult.isCovered, true);
      assert.strictEqual(hbResult.discountLkr, 5000);
      assert.strictEqual(hbResult.effectiveTotalLkr, 2000);

      // Room Only guest: Nothing free; full amount (3,500 * 2 = 7,000) is payable
      const roResult = applyMealPlanEntitlements(
        basePrice,
        qty,
        freeOn,
        "RO",
        portionExtra,
        addOnsExtra,
      );
      assert.strictEqual(roResult.isCovered, false);
      assert.strictEqual(roResult.discountLkr, 0);
      assert.strictEqual(roResult.effectiveTotalLkr, 7000);
    });

    it("calculates 4-stage compounding Sri Lankan statutory taxes (SC -> TDL -> SSCL -> VAT)", () => {
      const netBase = 10000;
      const tax = calculateForwardTax(netBase, DEFAULT_TAX_CONFIG, 310);

      // Stage 1: SC 10% on 10,000 = 1,000
      assert.strictEqual(tax.serviceChargeLkr, 1000);
      assert.strictEqual(tax.subtotalAfterScLkr, 11000);

      // Stage 2: TDL 1% on 11,000 = 110
      assert.strictEqual(tax.tdlLkr, 110);

      // Stage 3: SSCL 2.5% on 11,000 = 275
      assert.strictEqual(tax.ssclLkr, 275);

      // Stage 4: VAT Base = 11,000 + 110 + 275 = 11,385
      assert.strictEqual(tax.vatBaseLkr, 11385);

      // Stage 4: VAT 18% on 11,385 = 2,049.30
      assert.strictEqual(tax.vatLkr, 2049.3);

      // Grand Total = 11,385 + 2,049.30 = 13,434.30 (~1.343x compounding factor)
      assert.strictEqual(tax.grandTotalLkr, 13434.3);

      // Approx USD at 310 rate = 13,434.30 / 310 = 43.34
      assert.strictEqual(tax.approxGrandTotalUsd, 43.34);
    });

    it("computes full cart financial summary with computeCartSummary and adheres to state types", () => {
      const mockItem: CartItem = {
        id: "item-test-1",
        dishId: "dish-test-1",
        name: "Test Dish",
        unitBasePriceLkr: 2000,
        quantity: 2,
        selectedPortion: undefined,
        selectedSpiceLevel: undefined,
        selectedAddOns: [],
        dietaryPreferences: ["VEGAN"],
        specialInstructions: undefined,
        freeOnMealPlans: ["HB"],
        isMealPlanCovered: false,
        mealPlanDiscountLkr: 0,
        effectiveLineTotalLkr: 4000,
      };

      const customConfig: TaxRatesConfig = {
        ...DEFAULT_TAX_CONFIG,
      };

      const summary: CartTaxSummary = computeCartSummary([mockItem], customConfig, "RO", 310);
      assert.strictEqual(summary.grossSubtotalLkr, 4000);
      assert.strictEqual(summary.mealPlanSavingsLkr, 0);
      assert.strictEqual(summary.netBaseSupplyLkr, 4000);
      assert.ok(summary.grandTotalLkr > 4000);

      const mockState: GuestCartState = {
        items: [mockItem],
        guestMealPlan: "RO",
        taxConfig: customConfig,
        usdExchangeRate: 310,
        summary,
      };
      assert.strictEqual(mockState.items.length, 1);
      assert.strictEqual(mockState.summary.grossSubtotalLkr, 4000);
    });
  });

  describe("2. Reactive Store State Transitions (guestCartStore)", () => {
    it("manages cart lifecycle: add, increment, decrement, and clear", () => {
      guestCartStore.clearCart();
      const initialSnapshot = guestCartStore.getSnapshot();
      assert.strictEqual(initialSnapshot.items.length, 0);
      assert.strictEqual(initialSnapshot.summary.grandTotalLkr, 0);

      const dish1 = DEFAULT_SAMPLE_DISHES[0]; // Lagoon Crab: 4,800
      assert.ok(dish1);

      // 1. Add simple dish
      guestCartStore.addSimpleDish(dish1, 1);
      const afterAdd1 = guestCartStore.getSnapshot();
      assert.strictEqual(afterAdd1.items.length, 1);
      assert.strictEqual(afterAdd1.items[0]?.quantity, 1);
      assert.strictEqual(afterAdd1.items[0]?.unitBasePriceLkr, 4800);
      assert.ok(afterAdd1.summary.grandTotalLkr > 4800);

      // 2. Increment
      const lineId = afterAdd1.items[0]?.id;
      assert.ok(lineId);
      guestCartStore.incrementItem(lineId);
      const afterInc = guestCartStore.getSnapshot();
      assert.strictEqual(afterInc.items[0]?.quantity, 2);

      // 3. Decrement
      guestCartStore.decrementItem(lineId);
      const afterDec = guestCartStore.getSnapshot();
      assert.strictEqual(afterDec.items[0]?.quantity, 1);

      // 4. Decrement to 0 removes the item
      guestCartStore.decrementItem(lineId);
      const afterRemove = guestCartStore.getSnapshot();
      assert.strictEqual(afterRemove.items.length, 0);
    });

    it("dynamically recalculates meal plan discounts when switching guestMealPlan", () => {
      guestCartStore.clearCart();
      guestCartStore.setGuestMealPlan("RO");

      const hoppers = DEFAULT_SAMPLE_DISHES[1]; // Egg hoppers: 1,650, free on BB/HB/FB/AI
      assert.ok(hoppers);

      guestCartStore.addSimpleDish(hoppers, 2);
      const roState = guestCartStore.getSnapshot();
      assert.strictEqual(roState.items[0]?.isMealPlanCovered, false);
      assert.strictEqual(roState.summary.mealPlanSavingsLkr, 0);
      assert.ok(roState.summary.netBaseSupplyLkr === 3300);

      // Switch to Half Board (HB) -> automatically covers egg hoppers
      guestCartStore.setGuestMealPlan("HB");
      const hbState = guestCartStore.getSnapshot();
      assert.strictEqual(hbState.items[0]?.isMealPlanCovered, true);
      assert.strictEqual(hbState.summary.mealPlanSavingsLkr, 3300);
      assert.strictEqual(hbState.summary.netBaseSupplyLkr, 0);
      assert.strictEqual(hbState.summary.grandTotalLkr, 0);

      // Clean up
      guestCartStore.clearCart();
      guestCartStore.setGuestMealPlan("RO");
    });

    it("updates USD exchange rate and recalculates approxGrandTotalUsd", () => {
      guestCartStore.clearCart();
      const dish = DEFAULT_SAMPLE_DISHES[0];
      assert.ok(dish);

      guestCartStore.addSimpleDish(dish, 1);
      const defaultState = guestCartStore.getSnapshot();
      const grandTotalLkr = defaultState.summary.grandTotalLkr;

      // Rate 310
      guestCartStore.setUsdExchangeRate(310);
      const state310 = guestCartStore.getSnapshot();
      assert.strictEqual(state310.summary.approxGrandTotalUsd, roundRupees(grandTotalLkr / 310));

      // Rate 320
      guestCartStore.setUsdExchangeRate(320);
      const state320 = guestCartStore.getSnapshot();
      assert.strictEqual(state320.summary.approxGrandTotalUsd, roundRupees(grandTotalLkr / 320));

      // Clean up
      guestCartStore.clearCart();
    });

    it("supports subscription listeners and notifies on changes", () => {
      let callCount = 0;
      const unsubscribe = guestCartStore.subscribe(() => {
        callCount += 1;
      });

      const dish = DEFAULT_SAMPLE_DISHES[0];
      assert.ok(dish);
      guestCartStore.addSimpleDish(dish, 1);
      assert.ok(callCount >= 1);

      guestCartStore.clearCart();
      assert.ok(callCount >= 2);

      unsubscribe();
      const priorCount = callCount;
      guestCartStore.addSimpleDish(dish, 1);
      // After unsubscribe, callCount should not change
      assert.strictEqual(callCount, priorCount);

      // Clean up
      guestCartStore.clearCart();
    });
  });
});
