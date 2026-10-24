import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_DRIVER_MEAL_OPTIONS,
  DEFAULT_DRIVER_VOUCHERS,
  DEFAULT_MEAL_REDEMPTIONS,
  DRIVER_MEAL_TRANSLATIONS,
  DriverMealRedeemModal,
  type DriverMealVoucher,
  type MealRedemptionRecord,
  calculateDriverRedemptionKpis,
  filterActiveDrivers,
  findVoucherByCode,
  formatVoucherCode,
  generateDriverDiningKotSlip,
  getAllowanceTypeLabel,
  getDriverMealPeriodLabel,
  validateDriverMealRedemption,
} from "../src/staff/pos/DriverMealRedeemModal.js";

describe("Step 293: DriverMealRedeemModal — Driver / Guide Meal Voucher Redemption Scanner in POS", () => {
  describe("1. Pure Domain Logic & Voucher Code Utilities", () => {
    it("formats and normalizes voucher codes removing whitespace and enforcing uppercase", () => {
      assert.strictEqual(formatVoucherCode("drv-892"), "DRV-892");
      assert.strictEqual(formatVoucherCode("  wkt-412  "), "WKT-412");
      assert.strictEqual(formatVoucherCode("ast 711"), "AST711");
    });

    it("locates driver voucher by exact or formatted code", () => {
      const v1 = findVoucherByCode(DEFAULT_DRIVER_VOUCHERS, "drv-892");
      assert.ok(v1);
      assert.strictEqual(v1?.driverName, "Sunil Perera");
      assert.strictEqual(v1?.associatedGuestRoomNumber, "104");

      const v2 = findVoucherByCode(DEFAULT_DRIVER_VOUCHERS, "WKT-412");
      assert.ok(v2);
      assert.strictEqual(v2?.driverName, "Kusal Mendis");

      const notFound = findVoucherByCode(DEFAULT_DRIVER_VOUCHERS, "NON-EXISTENT");
      assert.strictEqual(notFound, undefined);
    });

    it("filters active drivers by query across driver name, room, vehicle, and DMC", () => {
      const byName = filterActiveDrivers(DEFAULT_DRIVER_VOUCHERS, "Perera");
      assert.strictEqual(byName.length, 1);
      assert.strictEqual(byName[0]?.driverName, "Sunil Perera");

      const byRoom = filterActiveDrivers(DEFAULT_DRIVER_VOUCHERS, "Villa 3");
      assert.strictEqual(byRoom.length, 1);
      assert.strictEqual(byRoom[0]?.driverName, "Chaminda Silva");

      const byVehicle = filterActiveDrivers(DEFAULT_DRIVER_VOUCHERS, "CAD-8921");
      assert.strictEqual(byVehicle.length, 1);

      const byDmc = filterActiveDrivers(DEFAULT_DRIVER_VOUCHERS, "Aitken Spence");
      assert.strictEqual(byDmc.length, 1);
      assert.strictEqual(byDmc[0]?.driverName, "Rohan Fernando");

      const emptyQuery = filterActiveDrivers(DEFAULT_DRIVER_VOUCHERS, "");
      assert.strictEqual(emptyQuery.length, DEFAULT_DRIVER_VOUCHERS.length);
    });
  });

  describe("2. Meal Entitlement & Double-Redemption Validation Engine", () => {
    it("permits redemption when voucher is valid and entitled for service period", () => {
      const voucher = DEFAULT_DRIVER_VOUCHERS[0]; // Sunil Perera: Breakfast, Lunch, Dinner
      assert.ok(voucher);

      const result = validateDriverMealRedemption(
        voucher,
        "LUNCH",
        "2026-10-20",
        DEFAULT_MEAL_REDEMPTIONS, // Has BREAKFAST redeemed, not LUNCH
      );

      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.reasonCode, "OK");
    });

    it("prevents double-redemption on the same service date and meal period", () => {
      const voucher = DEFAULT_DRIVER_VOUCHERS[0]; // Sunil Perera
      assert.ok(voucher);

      // In DEFAULT_MEAL_REDEMPTIONS, Sunil already redeemed BREAKFAST on 2026-10-20
      const result = validateDriverMealRedemption(
        voucher,
        "BREAKFAST",
        "2026-10-20",
        DEFAULT_MEAL_REDEMPTIONS,
      );

      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.reasonCode, "ALREADY_REDEEMED_TODAY");
      assert.ok(result.existingRedemption);
      assert.strictEqual(result.existingRedemption?.kotNumber, "KOT-DRV-001");
    });

    it("rejects meal redemption when chauffeur package does not include meal period", () => {
      const voucher = DEFAULT_DRIVER_VOUCHERS[1]; // Kusal Mendis: Entitled to Breakfast & Dinner only
      assert.ok(voucher);

      const result = validateDriverMealRedemption(
        voucher,
        "LUNCH",
        "2026-10-20",
        DEFAULT_MEAL_REDEMPTIONS,
      );

      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.reasonCode, "NOT_ENTITLED_FOR_MEAL");
    });

    it("rejects redemption if service date is outside voucher validity window", () => {
      const voucher = DEFAULT_DRIVER_VOUCHERS[0]; // Valid: 2026-10-18 to 2026-10-24
      assert.ok(voucher);

      const pastDate = validateDriverMealRedemption(
        voucher,
        "LUNCH",
        "2026-10-15",
        DEFAULT_MEAL_REDEMPTIONS,
      );
      assert.strictEqual(pastDate.isValid, false);
      assert.strictEqual(pastDate.reasonCode, "OUTSIDE_VALIDITY_DATES");

      const futureDate = validateDriverMealRedemption(
        voucher,
        "LUNCH",
        "2026-10-29",
        DEFAULT_MEAL_REDEMPTIONS,
      );
      assert.strictEqual(futureDate.isValid, false);
      assert.strictEqual(futureDate.reasonCode, "OUTSIDE_VALIDITY_DATES");
    });

    it("rejects redemption when voucher status is cancelled or expired", () => {
      const baseVoucher = DEFAULT_DRIVER_VOUCHERS[0];
      assert.ok(baseVoucher);

      const cancelledVoucher: DriverMealVoucher = {
        ...baseVoucher,
        status: "CANCELLED",
      };

      const resultCancelled = validateDriverMealRedemption(
        cancelledVoucher,
        "LUNCH",
        "2026-10-20",
        DEFAULT_MEAL_REDEMPTIONS,
      );
      assert.strictEqual(resultCancelled.isValid, false);
      assert.strictEqual(resultCancelled.reasonCode, "VOUCHER_CANCELLED");

      const expiredVoucher: DriverMealVoucher = {
        ...baseVoucher,
        status: "EXPIRED",
      };

      const resultExpired = validateDriverMealRedemption(
        expiredVoucher,
        "LUNCH",
        "2026-10-20",
        DEFAULT_MEAL_REDEMPTIONS,
      );
      assert.strictEqual(resultExpired.isValid, false);
      assert.strictEqual(resultExpired.reasonCode, "VOUCHER_EXPIRED");
    });
  });

  describe("3. Operational KPIs & Thermal KOT Slip Generation", () => {
    it("computes accurate driver dining station KPIs", () => {
      const kpis = calculateDriverRedemptionKpis(
        DEFAULT_DRIVER_VOUCHERS,
        DEFAULT_MEAL_REDEMPTIONS,
        "2026-10-20",
        "BREAKFAST",
      );

      // All 4 default vouchers are active on 2026-10-20
      assert.strictEqual(kpis.totalEligibleDrivers, 4);
      // Sunil has 1 redemption today in DEFAULT_MEAL_REDEMPTIONS
      assert.strictEqual(kpis.redeemedTodayCount, 1);
      assert.strictEqual(kpis.currentPeriodRedeemedCount, 1);
      // Eligible for Breakfast: Sunil, Kusal, Rohan = 3. 1 redeemed = 2 pending.
      assert.strictEqual(kpis.pendingRedemptionCount, 2);
    });

    it("generates 80mm thermal KOT slip with complete chauffeur and stay audit trail", () => {
      const voucher = DEFAULT_DRIVER_VOUCHERS[0];
      assert.ok(voucher);

      const mealOption = DEFAULT_DRIVER_MEAL_OPTIONS[0];
      assert.ok(mealOption);

      const record: MealRedemptionRecord = {
        redemptionId: "RED-2026-999",
        voucherId: voucher.voucherId,
        voucherCode: voucher.voucherCode,
        driverName: voucher.driverName,
        serviceDate: "2026-10-20",
        mealPeriod: "LUNCH",
        location: "Staff & Driver Dining Quarters",
        redeemedAt: "2026-10-20T13:15:00Z",
        scannedByStaffId: "STAFF-02",
        scannedByStaffName: "Sunethra Perera",
        mealOptionSelected: mealOption,
        kotNumber: "KOT-DRV-404",
      };

      const slip = generateDriverDiningKotSlip(record, voucher, "HERITANCE KANDALAMA");

      assert.ok(slip.includes("HERITANCE KANDALAMA"));
      assert.ok(slip.includes("STAFF & CHAUFFEUR DINING KOT"));
      assert.ok(slip.includes("KOT NUMBER:       KOT-DRV-404"));
      assert.ok(slip.includes("CHAUFFEUR:        Sunil Perera"));
      assert.ok(slip.includes("VEHICLE REG NO:   WP-CAD-8921"));
      assert.ok(slip.includes("SLTDA GUIDE REG:  SLTDA/CG/0482"));
      assert.ok(slip.includes("GUEST ROOM:       Room 104"));
      assert.ok(slip.includes("TOUR OPERATOR:    Jetwing Travels"));
      assert.ok(slip.includes(">>> Chef Special Rice & Curry (Ambul Thiyal Fish & Dhal) <<<"));
    });
  });

  describe("4. Trilingual Localization Labels", () => {
    it("renders meal service periods across English, Sinhala, and Tamil", () => {
      assert.strictEqual(getDriverMealPeriodLabel("BREAKFAST", "en"), "Breakfast");
      assert.strictEqual(getDriverMealPeriodLabel("BREAKFAST", "si"), "උදෑසන ආහාරය");
      assert.strictEqual(getDriverMealPeriodLabel("BREAKFAST", "ta"), "காலை உணவு");

      assert.strictEqual(getDriverMealPeriodLabel("LUNCH", "en"), "Lunch");
      assert.strictEqual(getDriverMealPeriodLabel("LUNCH", "si"), "දිවා ආහාරය");
      assert.strictEqual(getDriverMealPeriodLabel("LUNCH", "ta"), "மதிய உணவு");

      assert.strictEqual(getDriverMealPeriodLabel("DINNER", "en"), "Dinner");
      assert.strictEqual(getDriverMealPeriodLabel("DINNER", "si"), "රාත්රී ආහාරය");
      assert.strictEqual(getDriverMealPeriodLabel("DINNER", "ta"), "இரவு உணவு");
    });

    it("renders allowance types across English, Sinhala, and Tamil", () => {
      assert.strictEqual(
        getAllowanceTypeLabel("COMPLIMENTARY_DMC", "en"),
        "Complimentary (DMC Agreement)",
      );
      assert.strictEqual(getAllowanceTypeLabel("COMPLIMENTARY_DMC", "si"), "නොමිලේ (DMC ගිවිසුම)");
      assert.strictEqual(getAllowanceTypeLabel("COMPLIMENTARY_DMC", "ta"), "இலவசம் (DMC ஒப்பந்தம்)");
    });
  });

  describe("5. React Component Rendering & Apple HIG Verification", () => {
    it("renders null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(DriverMealRedeemModal, {
          isOpen: false,
          onClose: () => undefined,
          onConfirmRedeem: () => undefined,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders modal dialog with Apple Liquid Glass and all 3 input mode tabs when open", () => {
      const html = renderToStaticMarkup(
        React.createElement(DriverMealRedeemModal, {
          isOpen: true,
          onClose: () => undefined,
          onConfirmRedeem: () => undefined,
          language: "en",
        }),
      );

      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("Meal Voucher Redemption"));
      assert.ok(html.includes(DRIVER_MEAL_TRANSLATIONS.en.tabScan));
      assert.ok(html.includes(DRIVER_MEAL_TRANSLATIONS.en.tabCode));
      assert.ok(html.includes(DRIVER_MEAL_TRANSLATIONS.en.tabDirectory));
      assert.ok(html.includes("Sunil Perera"));
      assert.ok(html.includes("WP-CAD-8921"));
    });

    it("renders trilingual modal in Sinhala and Tamil", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(DriverMealRedeemModal, {
          isOpen: true,
          onClose: () => undefined,
          onConfirmRedeem: () => undefined,
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes(DRIVER_MEAL_TRANSLATIONS.si.modalTitle));
      assert.ok(htmlSi.includes(DRIVER_MEAL_TRANSLATIONS.si.tabScan));

      const htmlTa = renderToStaticMarkup(
        React.createElement(DriverMealRedeemModal, {
          isOpen: true,
          onClose: () => undefined,
          onConfirmRedeem: () => undefined,
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("உணவு வவுச்சர்"));
      assert.ok(htmlTa.includes(DRIVER_MEAL_TRANSLATIONS.ta.tabScan));
    });
  });
});
