import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_CBSL_RATES,
  type ExchangeRatesConfig,
  type ForeignCurrencyCode,
  type PaymentTenderType,
  type ReceiptDeliveryMethod,
  SettleFolioModal,
  type SettleFolioModalProps,
  type SettleFolioPayload,
  TENDER_CONFIGS,
  type TenderSplitLine,
  type TenderTypeConfig,
  calculateInitialTenderValues,
  computeSettlementMath,
  convertForeignToLkr,
  getTenderConfig,
  resolveExchangeRateForCurrency,
  roundLkr,
} from "../src/admin/folios/SettleFolioModal.js";

describe("Step 206: SettleFolioModal & Multi-Tender Payment Engine", () => {
  describe("1. Exact Rounding Helper (roundLkr)", () => {
    it("handles non-finite numbers safely returning 0", () => {
      assert.strictEqual(roundLkr(Number.NaN), 0);
      assert.strictEqual(roundLkr(Number.POSITIVE_INFINITY), 0);
      assert.strictEqual(roundLkr(Number.NEGATIVE_INFINITY), 0);
    });

    it("rounds half-up to exactly 2 decimal cents", () => {
      assert.strictEqual(roundLkr(100.004), 100);
      assert.strictEqual(roundLkr(100.005), 100.01);
      assert.strictEqual(roundLkr(30550), 30550);
    });
  });

  describe("2. Foreign Currency to LKR Conversion (convertForeignToLkr)", () => {
    it("converts USD cash at locked CBSL indicative rate", () => {
      // 100 USD @ 305.50 LKR
      const lkr = convertForeignToLkr(100, DEFAULT_CBSL_RATES.USD);
      assert.strictEqual(lkr, 30550);
    });

    it("converts EUR cash at locked CBSL indicative rate", () => {
      // 250 EUR @ 332.00 LKR
      const lkr = convertForeignToLkr(250, DEFAULT_CBSL_RATES.EUR);
      assert.strictEqual(lkr, 83000);
    });

    it("handles zero and negative amounts safely", () => {
      assert.strictEqual(convertForeignToLkr(0, 305.5), 0);
      assert.strictEqual(convertForeignToLkr(-100, 305.5), 0);
      assert.strictEqual(convertForeignToLkr(100, 0), 0);
    });

    it("resolves exchange rates for supported currencies and fallback", () => {
      assert.strictEqual(resolveExchangeRateForCurrency("USD"), DEFAULT_CBSL_RATES.USD);
      assert.strictEqual(resolveExchangeRateForCurrency("EUR"), DEFAULT_CBSL_RATES.EUR);
      assert.strictEqual(resolveExchangeRateForCurrency("GBP"), DEFAULT_CBSL_RATES.GBP);
      assert.strictEqual(resolveExchangeRateForCurrency(undefined), 1);
    });

    it("calculates initial tender values for domestic and foreign tenders", () => {
      const lkrTender = getTenderConfig("CASH_LKR");
      const lkrInit = calculateInitialTenderValues(lkrTender, 50000);
      assert.strictEqual(lkrInit.foreignAmount, 0);
      assert.strictEqual(lkrInit.tenderAmountLkr, 50000);

      const usdTender = getTenderConfig("FOREIGN_CASH_USD");
      const usdInit = calculateInitialTenderValues(usdTender, 30550);
      assert.strictEqual(usdInit.foreignAmount, 100);
      assert.strictEqual(usdInit.tenderAmountLkr, 30550);
    });
  });

  describe("3. Multi-Tender Settlement Math (computeSettlementMath)", () => {
    it("computes remaining balance when no payments have been applied", () => {
      const math = computeSettlementMath(100000, []);
      assert.strictEqual(math.totalPaidLkr, 0);
      assert.strictEqual(math.remainingDueLkr, 100000);
      assert.strictEqual(math.changeDueLkr, 0);
      assert.strictEqual(math.isSettled, false);
    });

    it("tracks multiple split payments (USD cash + LankaQR + Visa card)", () => {
      const tenders: TenderSplitLine[] = [
        {
          id: "T1",
          tenderType: "FOREIGN_CASH_USD",
          amountLkr: 30550,
          foreignCurrency: "USD",
          foreignAmount: 100,
          exchangeRate: 305.5,
        },
        {
          id: "T2",
          tenderType: "LANKA_QR",
          amountLkr: 40000,
          referenceOrAuthCode: "CBSL-QR-992144",
        },
      ];

      const math = computeSettlementMath(100000, tenders);
      assert.strictEqual(math.totalPaidLkr, 70550);
      assert.strictEqual(math.remainingDueLkr, 29450);
      assert.strictEqual(math.changeDueLkr, 0);
      assert.strictEqual(math.isSettled, false);
    });

    it("detects exact and over-tendered settlements with cash change calculation", () => {
      const tenders: TenderSplitLine[] = [
        {
          id: "T1",
          tenderType: "POS_TERMINAL_CARD",
          amountLkr: 80000,
        },
        {
          id: "T2",
          tenderType: "CASH_LKR",
          amountLkr: 25000, // Tendered 25,000 cash for 20,000 remaining
        },
      ];

      const math = computeSettlementMath(100000, tenders);
      assert.strictEqual(math.totalPaidLkr, 105000);
      assert.strictEqual(math.remainingDueLkr, 0);
      assert.strictEqual(math.changeDueLkr, 5000); // 5,000 LKR change due
      assert.strictEqual(math.isSettled, true);
    });
  });

  describe("4. Presets & Tender Configurations", () => {
    it("provides all 8 standard Sri Lankan hospitality tender configurations", () => {
      assert.strictEqual(TENDER_CONFIGS.length, 8);
      const lankaQr = getTenderConfig("LANKA_QR");
      assert.strictEqual(lankaQr.category, "DIGITAL");

      const usd = getTenderConfig("FOREIGN_CASH_USD");
      assert.strictEqual(usd.isForeignCurrency, true);
      assert.strictEqual(usd.currencyCode, "USD");

      const cityLedger = getTenderConfig("CITY_LEDGER_CREDIT");
      assert.strictEqual(cityLedger.category, "CREDIT");
    });

    it("provides default CBSL exchange rates", () => {
      assert.strictEqual(DEFAULT_CBSL_RATES.USD, 305.5);
      assert.strictEqual(DEFAULT_CBSL_RATES.EUR, 332.0);
      assert.strictEqual(DEFAULT_CBSL_RATES.GBP, 395.0);
    });
  });

  describe("5. Type Integrity Verification", () => {
    it("verifies exported types and shapes are constructible", () => {
      const tenderType: PaymentTenderType = "LANKA_QR";
      assert.strictEqual(tenderType, "LANKA_QR");

      const curr: ForeignCurrencyCode = "USD";
      assert.strictEqual(curr, "USD");

      const method: ReceiptDeliveryMethod = "PRINT_A4";
      assert.strictEqual(method, "PRINT_A4");

      const config: TenderTypeConfig = getTenderConfig("LANKA_QR");
      assert.strictEqual(config.type, "LANKA_QR");

      const payload: SettleFolioPayload = {
        partition: "GUEST_PERSONAL",
        totalBalanceLkr: 50000,
        totalPaidLkr: 50000,
        changeDueLkr: 0,
        tenders: [],
        settlementTimestamp: "2026-10-20T10:00:00.000Z",
        receiptMethod: "PRINT_A4",
      };
      assert.strictEqual(payload.totalPaidLkr, 50000);

      const props: SettleFolioModalProps = {
        isOpen: true,
        onClose: () => {
          /* no-op */
        },
        onSettle: () => {
          /* no-op */
        },
        partition: "GUEST_PERSONAL",
        balanceDueLkr: 50000,
      };
      assert.strictEqual(props.balanceDueLkr, 50000);

      const customRates: ExchangeRatesConfig = {
        USD: 310,
        EUR: 340,
        GBP: 400,
      };
      assert.strictEqual(customRates.USD, 310);
    });
  });

  describe("6. React Static DOM Rendering & Apple HIG Compliance", () => {
    it("renders settlement modal with tender grid, math summary card, and action footer", () => {
      const html = renderToStaticMarkup(
        React.createElement(SettleFolioModal, {
          isOpen: true,
          onClose: () => {
            /* no-op */
          },
          onSettle: () => {
            /* no-op */
          },
          partition: "GUEST_PERSONAL",
          balanceDueLkr: 100000,
          guestContext: {
            guestFullName: "Alexander von Bergmann",
            roomNumber: "Villa 104",
            bookingReference: "BK-GALLE-7718",
          },
        }),
      );

      // Guest context & folio title
      assert.ok(html.includes("Settle Guest Personal Folio"));
      assert.ok(html.includes("Alexander von Bergmann"));
      assert.ok(html.includes("Villa 104"));

      // Math overview card
      assert.ok(html.includes("Folio Total Due"));
      assert.ok(html.includes("Tendered Total"));
      assert.ok(html.includes("Remaining Due"));
      assert.ok(html.includes("Cash Change Due"));

      // Tender methods
      assert.ok(html.includes("LankaQR / Alipay+"));
      assert.ok(html.includes("POS Terminal Card"));
      assert.ok(html.includes("PayHere Online Card"));
      assert.ok(html.includes("Cash (Sri Lankan Rupees)"));
      assert.ok(html.includes("USD Cash (CBSL Locked)"));
      assert.ok(html.includes("City Ledger / DMC Invoice"));

      // Receipt options
      assert.ok(html.includes("Print A4 Tax Invoice"));
      assert.ok(html.includes("Email PDF Invoice"));

      // Complete settlement trigger
      assert.ok(html.includes("Complete Settlement"));

      // Apple HIG styling classes
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("tabular-nums"));
      assert.ok(html.includes("rounded-2xl"));
    });
  });
});
