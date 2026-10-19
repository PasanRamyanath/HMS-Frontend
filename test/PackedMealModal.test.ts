import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  HANDOVER_TIMES,
  PackedMealModal,
  type PackedMealModalProps,
  type PackedMealOrderPayload,
  STANDARD_PACK_TARIFF_LKR,
  getPackedMealText,
} from "../src/qr/PackedMealModal.js";

describe("PackedMealModal (Step 266)", () => {
  it("provides complete trilingual translations for en, si, ta", () => {
    const en = getPackedMealText("en");
    const si = getPackedMealText("si");
    const ta = getPackedMealText("ta");

    assert.ok(en.modalTitle.includes("Safari"));
    assert.ok(si.modalTitle.includes("සෆාරි"));
    assert.ok(ta.modalTitle.includes("சஃபாரி"));

    assert.strictEqual(Object.keys(en.departureReasons).length, 4);
    assert.strictEqual(Object.keys(si.departureReasons).length, 4);
    assert.strictEqual(Object.keys(ta.departureReasons).length, 4);

    assert.strictEqual(Object.keys(en.packStyles).length, 3);
    assert.strictEqual(Object.keys(si.packStyles).length, 3);
    assert.strictEqual(Object.keys(ta.packStyles).length, 3);

    assert.strictEqual(Object.keys(en.beverages).length, 4);
    assert.strictEqual(Object.keys(si.beverages).length, 4);
    assert.strictEqual(Object.keys(ta.beverages).length, 4);
  });

  it("defines standard pack tariff and handover time slots", () => {
    assert.strictEqual(STANDARD_PACK_TARIFF_LKR, 2200);
    assert.ok(HANDOVER_TIMES.includes("04:30 AM"));
    assert.ok(HANDOVER_TIMES.includes("05:00 AM"));
    assert.ok(HANDOVER_TIMES.includes("06:00 AM"));
  });

  it("renders null when isOpen is false", () => {
    const props: PackedMealModalProps = {
      isOpen: false,
      roomNumber: "Ocean Villa 202",
      onClose: () => undefined,
      onConfirmOrder: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(PackedMealModal, props));
    assert.strictEqual(html, "");
  });

  it("renders modal dialog sheet when open with meal plan coverage notice (BB)", () => {
    const props: PackedMealModalProps = {
      isOpen: true,
      roomNumber: "Ocean Villa 202",
      guestMealPlan: "BB",
      language: "en",
      onClose: () => undefined,
      onConfirmOrder: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(PackedMealModal, props));
    assert.ok(html.includes("Ocean Villa 202"));
    assert.ok(html.includes("Early Safari &amp; Airport Breakfast Box"));
    assert.ok(html.includes("100% Covered by your Bed &amp; Breakfast"));
    assert.ok(html.includes("Ceylon Roti &amp; Sambol Pack"));
    assert.ok(html.includes("Hot Pure Ceylon Tea (Thermos)"));
    assert.ok(html.includes("0.00 (Covered)"));
  });

  it("renders payable tariff for Room Only (RO) plan", () => {
    const props: PackedMealModalProps = {
      isOpen: true,
      roomNumber: "Room 105",
      guestMealPlan: "RO",
      language: "en",
      onClose: () => undefined,
      onConfirmOrder: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(PackedMealModal, props));
    assert.ok(html.includes("Room 105"));
    assert.ok(html.includes("Room-Only Rate: LKR 2,200"));
    // 2 packs default * 2,200 = 4,400
    assert.ok(html.includes("LKR 4,400"));
  });

  it("renders in Sinhala language correctly", () => {
    const props: PackedMealModalProps = {
      isOpen: true,
      roomNumber: "Deluxe Suite 301",
      guestMealPlan: "HB",
      language: "si",
      onClose: () => undefined,
      onConfirmOrder: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(PackedMealModal, props));
    assert.ok(html.includes("අලුයම සෆාරි සහ ගුවන් තොටුපළ උදෑසන ආහාරය"));
    assert.ok(html.includes("නොමිලේ හිමිවේ"));
  });

  it("renders in Tamil language correctly", () => {
    const props: PackedMealModalProps = {
      isOpen: true,
      roomNumber: "Beach Villa 02",
      guestMealPlan: "ALL_INCLUSIVE",
      language: "ta",
      onClose: () => undefined,
      onConfirmOrder: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(PackedMealModal, props));
    assert.ok(html.includes("அதிகாலை சஃபாரி &amp; விமான நிலைய காலை உணவு"));
    assert.ok(html.includes("இலவச"));
  });

  it("constructs valid PackedMealOrderPayload structure", () => {
    const payload: PackedMealOrderPayload = {
      id: "PKD-TEST123",
      roomNumber: "Room 104",
      departureReason: "WILDLIFE_SAFARI",
      handoverTime: "05:00 AM",
      packStyle: "SRI_LANKAN_ROTI",
      beverage: "HOT_CEYLON_TEA",
      quantity: 2,
      isMealPlanCovered: true,
      basePriceLkr: 4400,
      mealPlanDeductionLkr: 4400,
      netPayableLkr: 0,
      dietaryNotes: "Less spicy sambol please",
      requestedAt: new Date().toISOString(),
    };

    assert.strictEqual(payload.id, "PKD-TEST123");
    assert.strictEqual(payload.roomNumber, "Room 104");
    assert.strictEqual(payload.netPayableLkr, 0);
    assert.strictEqual(payload.isMealPlanCovered, true);
  });
});
