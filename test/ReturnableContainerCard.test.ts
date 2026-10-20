/**
 * Unit Test Suite for Step 397: ReturnableContainerCard & Empty Cylinder Tracker
 *
 * Validates:
 * 1. Pure Math & Variance Calculations:
 *    - formatContainerLkr
 *    - calculateExchangeDepositVariance (balanced, deficit, and surplus exchanges)
 *    - calculateContainerSummary (fleet holdings, active, empties, locked deposit capital, alert triggers)
 *    - applyContainerMovement (REFILL_EXCHANGE, CONNECT_IN_USE, EMPTY_DEPLETED, DEPOSIT_REFUND)
 * 2. Trilingual Localization Integrity:
 *    - Full dictionary coverage across English, Sinhala, and Tamil
 * 3. React 19 Component Static Rendering:
 *    - Renders ReturnableContainerCard with 5-card bento KPI row
 *    - Renders container inventory cards with tri-state status bars (Full, In-Use, Empty)
 *    - Renders Sinhala and Tamil localizations cleanly
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CONTAINER_TRANSLATIONS,
  type ContainerInventoryItem,
  DEFAULT_RETURNABLE_CONTAINERS,
  ReturnableContainerCard,
  applyContainerMovement,
  calculateContainerSummary,
  calculateExchangeDepositVariance,
  formatContainerLkr,
} from "../src/admin/inventory/ReturnableContainerCard.js";

describe("Step 397: ReturnableContainerCard & Empty Cylinder Tracker", () => {
  describe("1. Pure Financial & Exchange Math", () => {
    it("formats LKR currency cleanly with Rs. prefix", () => {
      assert.equal(formatContainerLkr(21500), "Rs. 21,500.00");
      assert.equal(formatContainerLkr(0), "Rs. 0.00");
      assert.equal(formatContainerLkr(8500.5), "Rs. 8,500.50");
    });

    it("evaluates balanced 1:1 empty exchange with zero deposit variance", () => {
      const result = calculateExchangeDepositVariance(10, 10, 8500);

      assert.equal(result.isBalanced, true);
      assert.equal(result.deficitCount, 0);
      assert.equal(result.surplusCount, 0);
      assert.equal(result.netDepositChargeLkr, 0);
    });

    it("evaluates deficit exchange when supplier delivers more full than empties given", () => {
      // 10 full received, only 6 empties given -> 4 deficit cylinders
      // At Rs. 8,500 per cylinder -> Rs. 34,000 extra deposit charge
      const result = calculateExchangeDepositVariance(10, 6, 8500);

      assert.equal(result.isBalanced, false);
      assert.equal(result.deficitCount, 4);
      assert.equal(result.surplusCount, 0);
      assert.equal(result.netDepositChargeLkr, 34000);
    });

    it("evaluates surplus exchange when hotel hands over extra empties", () => {
      // 5 full received, 9 empties given -> 4 surplus cylinders returned
      // At Rs. 21,500 industrial deposit -> -86,000 (supplier owes hotel credit)
      const result = calculateExchangeDepositVariance(5, 9, 21500);

      assert.equal(result.isBalanced, false);
      assert.equal(result.deficitCount, 0);
      assert.equal(result.surplusCount, 4);
      assert.equal(result.netDepositChargeLkr, -86000);
    });

    it("calculates summary totals across container inventory items", () => {
      const summary = calculateContainerSummary(DEFAULT_RETURNABLE_CONTAINERS);

      // Verify fleet totals match preset data
      assert.ok(summary.totalHoldingUnits > 100);
      assert.ok(summary.totalFullInStore > 50);
      assert.ok(summary.totalInUseActive > 30);
      assert.ok(summary.totalEmptiesAwaiting > 50);
      assert.ok(summary.totalDepositCapitalLkr > 1000000);
      assert.ok(summary.exchangeAlertCount >= 2);
    });

    it("applies container state transitions accurately", () => {
      const baseItem: ContainerInventoryItem = {
        id: "test-litro",
        tenantId: "tenant-1",
        name: "Litro 12.5kg",
        category: "LPG_CYLINDER",
        brand: "LITRO",
        supplierName: "Litro Gas",
        depositPerUnitLkr: 8500,
        fullInStore: 10,
        inUseActive: 5,
        emptyAwaitingExchange: 5,
        totalHoldings: 20,
        totalDepositValueLkr: 170000,
        reorderThresholdEmpties: 5,
        location: "Gas Yard",
        lastExchangeDate: "2026-10-01",
      };

      // 1. Refill exchange: receive 5 full, give 5 empties
      const afterRefill = applyContainerMovement(baseItem, {
        movementType: "REFILL_EXCHANGE",
        fullReceived: 5,
        emptiesReturned: 5,
        recordedBy: "Storekeeper",
      });
      assert.equal(afterRefill.fullInStore, 15);
      assert.equal(afterRefill.emptyAwaitingExchange, 0);
      assert.equal(afterRefill.totalHoldings, 20);

      // 2. Connect in use: connect 3 cylinders
      const afterConnect = applyContainerMovement(afterRefill, {
        movementType: "CONNECT_IN_USE",
        fullReceived: 3,
        emptiesReturned: 0,
        recordedBy: "Chef",
      });
      assert.equal(afterConnect.fullInStore, 12);
      assert.equal(afterConnect.inUseActive, 8);

      // 3. Empty depleted: move 2 cylinders from active to yard
      const afterDepleted = applyContainerMovement(afterConnect, {
        movementType: "EMPTY_DEPLETED",
        fullReceived: 0,
        emptiesReturned: 2,
        recordedBy: "Runner",
      });
      assert.equal(afterDepleted.inUseActive, 6);
      assert.equal(afterDepleted.emptyAwaitingExchange, 2);

      // 4. Deposit refund: return 2 empties for deposit cash
      const afterRefund = applyContainerMovement(afterDepleted, {
        movementType: "DEPOSIT_REFUND",
        fullReceived: 0,
        emptiesReturned: 2,
        recordedBy: "Manager",
      });
      assert.equal(afterRefund.emptyAwaitingExchange, 0);
      assert.equal(afterRefund.totalHoldings, 18);
      assert.equal(afterRefund.totalDepositValueLkr, 18 * 8500);
    });
  });

  describe("2. Trilingual Localization Coverage", () => {
    it("provides complete dictionaries across English, Sinhala, and Tamil", () => {
      const locales: ("en" | "si" | "ta")[] = ["en", "si", "ta"];

      for (const loc of locales) {
        const t = CONTAINER_TRANSLATIONS[loc];
        assert.ok(t.cardTitle.length > 0);
        assert.ok(t.cardSubtitle.length > 0);

        // KPI labels
        assert.ok(t.kpi.fullInStore.length > 0);
        assert.ok(t.kpi.inUseActive.length > 0);
        assert.ok(t.kpi.emptiesInYard.length > 0);
        assert.ok(t.kpi.depositCapital.length > 0);
        assert.ok(t.kpi.exchangeAlerts.length > 0);

        // Category labels
        assert.ok(t.categories.ALL.length > 0);
        assert.ok(t.categories.LPG_CYLINDER.length > 0);
        assert.ok(t.categories.BEVERAGE_CRATE.length > 0);
        assert.ok(t.categories.WATER_BOTTLE.length > 0);
        assert.ok(t.categories.CO2_CYLINDER.length > 0);

        // Action labels
        assert.ok(t.actions.recordExchange.length > 0);
        assert.ok(t.actions.cancel.length > 0);
        assert.ok(t.actions.submit.length > 0);
      }
    });
  });

  describe("3. React 19 Component Static Rendering", () => {
    it("renders ReturnableContainerCard with 5-card bento KPI metrics and container grid", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReturnableContainerCard, {
          initialItems: DEFAULT_RETURNABLE_CONTAINERS,
        }),
      );

      assert.match(html, /Empty Cylinder &amp; Returnable Crate Tracker/);
      assert.match(html, /Litro Industrial LPG Gas Cylinder 37\.5kg/);
      assert.match(html, /Lion Lager Beer Crates/);
      assert.match(html, /American Premium Mineral Water/);
      assert.match(html, /Draft Beer &amp; Soda CO2 Carbonation Cylinders/);
      assert.match(html, /Full in Store/);
      assert.match(html, /Locked Deposit Capital/);
    });

    it("renders correctly in Sinhala localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReturnableContainerCard, {
          initialItems: DEFAULT_RETURNABLE_CONTAINERS,
          locale: "si",
        }),
      );

      assert.match(html, /හිස් ගෑස් සිලින්ඩර සහ ආපසු භාරදෙන කූඩ ලුහුබැඳීම/);
      assert.match(html, /ගබඩාවේ ඇති පූර්ණ ඒකක/);
      assert.match(html, /සිරවී ඇති තැන්පතු ප්‍රාග්ධනය/);
    });

    it("renders correctly in Tamil localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReturnableContainerCard, {
          initialItems: DEFAULT_RETURNABLE_CONTAINERS,
          locale: "ta",
        }),
      );

      assert.match(html, /வெற்று எரிவாயு சிலிண்டர் &amp; பெட்டிகள் கண்காணிப்பு/);
      assert.match(html, /களஞ்சியத்தில் முழுமையானவை/);
      assert.match(html, /முடக்கப்பட்ட வைப்புத்தொகை/);
    });
  });
});
