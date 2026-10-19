import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type GuestRegistrationCardData,
  type IdentityDocType,
  RegCardHeader,
  type RegCardHeaderProps,
  RegCardSignatureModal,
  type RegCardSignatureModalProps,
  type RegCardSignaturePayload,
  RegCardSummaryGrid,
  type RegCardSummaryGridProps,
  type RegMealPlan,
  SignaturePad,
  type SignaturePadProps,
  TermsDeclaration,
  type TermsDeclarationProps,
  buildRegistrationSummary,
  exportCanvasAsWebp,
  validateRegistrationSignature,
} from "../src/admin/frontdesk/RegCardSignatureModal.js";

const noop = () => {
  // no-op for tests
};

const SAMPLE_REG_CARD: GuestRegistrationCardData = {
  reservationId: "res-gal-2026-9921",
  bookingReference: "GAL-RES-9921",
  guestName: "Nimal Perera",
  identityType: "NIC",
  identityNumber: "198812345678",
  nationality: "Sri Lankan",
  contactNumber: "+94 77 123 4567",
  email: "nimal.p@example.lk",
  residentialAddress: "42 Galle Road, Colombo 03, Sri Lanka",
  roomNumber: "104",
  roomTypeName: "Deluxe Ocean Villa",
  checkInDate: "2026-11-15",
  checkOutDate: "2026-11-18",
  numberOfNights: 3,
  numberOfGuests: 2,
  mealPlan: "HB",
  rateAmountLkr: 75000,
  rateAmountUsd: 250,
  hotelName: "Amangalla Fortress Resort",
  hotelAddress: "10 Church Street, Fort, Galle",
  hotelTaxId: "VAT-100293847",
  hotelSltdaRegNo: "SLTDA/SQA/HOT/0082",
  chauffeurAccompanied: true,
  specialRequests: "Quiet corner room requested with king bed.",
};

describe("Touch/Mouse HTML5 Canvas Reg Card Signature Modal (RegCardSignatureModal.tsx)", () => {
  describe("Signature & Terms Validation (validateRegistrationSignature)", () => {
    it("passes validation when both signature is present and terms are accepted", () => {
      const result = validateRegistrationSignature({
        hasSignature: true,
        acceptedTerms: true,
      });
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.error, undefined);
    });

    it("fails validation when signature is missing", () => {
      const result = validateRegistrationSignature({
        hasSignature: false,
        acceptedTerms: true,
      });
      assert.strictEqual(result.isValid, false);
      assert.match(result.error ?? "", /signature is required/i);
    });

    it("fails validation when terms are not acknowledged", () => {
      const result = validateRegistrationSignature({
        hasSignature: true,
        acceptedTerms: false,
      });
      assert.strictEqual(result.isValid, false);
      assert.match(result.error ?? "", /hotel terms and statutory declaration/i);
    });
  });

  describe("Registration Summary Formatter (buildRegistrationSummary)", () => {
    it("formats summary with dual currency and plural nights", () => {
      const summary = buildRegistrationSummary(SAMPLE_REG_CARD);
      assert.match(summary.staySummary, /Deluxe Ocean Villa \(Room 104\)/);
      assert.match(summary.staySummary, /3 Nights/);
      assert.match(summary.guestSummary, /Nimal Perera • NIC: 198812345678/);
      assert.match(summary.rateSummary, /LKR 75,000/);
      assert.match(summary.rateSummary, /USD \$250/);
    });

    it("formats singular night when stay is 1 night without USD", () => {
      const singleNight: GuestRegistrationCardData = {
        ...SAMPLE_REG_CARD,
        numberOfNights: 1,
        rateAmountUsd: undefined,
      };
      const summary = buildRegistrationSummary(singleNight);
      assert.match(summary.staySummary, /1 Night /);
      assert.doesNotMatch(summary.rateSummary, /USD/);
    });
  });

  describe("Canvas WebP Export Helper (exportCanvasAsWebp)", () => {
    it("returns mock/fallback dataUrl when canvas is null or toDataURL unavailable", () => {
      const result = exportCanvasAsWebp(null);
      assert.match(result, /^data:image\/webp/);
    });

    it("invokes toDataURL when available on canvas", () => {
      const mockCanvas = {
        toDataURL: (type: string) => `data:${type};base64,sampleWebpData`,
      } as unknown as HTMLCanvasElement;
      const result = exportCanvasAsWebp(mockCanvas);
      assert.strictEqual(result, "data:image/webp;base64,sampleWebpData");
    });
  });

  describe("Type Definitions & Verification", () => {
    it("validates all exported types are constructible", () => {
      const docType: IdentityDocType = "PASSPORT";
      const mealPlan: RegMealPlan = "AI";
      const payload: RegCardSignaturePayload = {
        signatureWebpDataUrl: "data:image/webp;base64,XYZ",
        acceptedTerms: true,
        timestampIso: "2026-10-19T00:00:00Z",
      };
      const modalProps: RegCardSignatureModalProps = {
        isOpen: true,
        onClose: noop,
        cardData: SAMPLE_REG_CARD,
        onConfirmSignature: noop,
      };
      const headerProps: RegCardHeaderProps = {
        hotelName: "Sample",
        bookingReference: "REF",
        onClose: noop,
        onPrint: noop,
      };
      const summaryProps: RegCardSummaryGridProps = {
        cardData: SAMPLE_REG_CARD,
      };
      const padProps: SignaturePadProps = {
        canvasRef: { current: null },
        hasStrokes: false,
        onStrokeDrawn: noop,
        onClear: noop,
      };
      const termsProps: TermsDeclarationProps = {
        accepted: true,
        onChange: noop,
      };

      assert.strictEqual(docType, "PASSPORT");
      assert.strictEqual(mealPlan, "AI");
      assert.strictEqual(payload.acceptedTerms, true);
      assert.strictEqual(modalProps.isOpen, true);
      assert.strictEqual(headerProps.hotelName, "Sample");
      assert.strictEqual(summaryProps.cardData.roomNumber, "104");
      assert.strictEqual(padProps.hasStrokes, false);
      assert.strictEqual(termsProps.accepted, true);
    });
  });

  describe("Component Static Markup & DOM Structure", () => {
    it("returns null when isOpen is false", () => {
      const markup = renderToStaticMarkup(
        React.createElement(RegCardSignatureModal, {
          isOpen: false,
          onClose: noop,
          cardData: SAMPLE_REG_CARD,
          onConfirmSignature: noop,
        }),
      );
      assert.strictEqual(markup, "");
    });

    it("renders modal dialog, guest profile, room info, canvas pad, and statutory declaration", () => {
      const markup = renderToStaticMarkup(
        React.createElement(RegCardSignatureModal, {
          isOpen: true,
          onClose: noop,
          cardData: SAMPLE_REG_CARD,
          onConfirmSignature: noop,
        }),
      );
      assert.match(markup, /Guest Registration Card \(Reg Card\)/);
      assert.match(markup, /Amangalla Fortress Resort/);
      assert.match(markup, /SLTDA Reg: SLTDA\/SQA\/HOT\/0082/);
      assert.match(markup, /GAL-RES-9921/);
      assert.match(markup, /Nimal Perera/);
      assert.match(markup, /198812345678/);
      assert.match(markup, /Room 104/);
      assert.match(markup, /Deluxe Ocean Villa/);
      assert.match(markup, /Chauffeur \/ Guide Quarters Requested/);
      assert.match(markup, /Quiet corner room requested with king bed/);
      assert.match(markup, /Guest Digital Signature/);
      assert.match(markup, /canvas/);
      assert.match(markup, /Sri Lanka Tourism Act No\. 14/);
      assert.match(markup, /Confirm &amp; Save Registration Card/);
      assert.match(markup, /Print Card/);
    });

    it("renders subcomponents individually with expected markup", () => {
      const headerMarkup = renderToStaticMarkup(
        React.createElement(RegCardHeader, {
          hotelName: "Cinnamon Grand",
          bookingReference: "CIN-2026-1",
          onClose: noop,
          onPrint: noop,
        }),
      );
      assert.match(headerMarkup, /Cinnamon Grand/);
      assert.match(headerMarkup, /CIN-2026-1/);

      const summaryMarkup = renderToStaticMarkup(
        React.createElement(RegCardSummaryGrid, {
          cardData: SAMPLE_REG_CARD,
        }),
      );
      assert.match(summaryMarkup, /Guest Identity &amp; Profile/);
      assert.match(summaryMarkup, /Stay &amp; Accommodation/);

      const padMarkup = renderToStaticMarkup(
        React.createElement(SignaturePad, {
          canvasRef: { current: null },
          hasStrokes: true,
          onStrokeDrawn: noop,
          onClear: noop,
        }),
      );
      assert.match(padMarkup, /Sign above the line/);
      assert.match(padMarkup, /Clear Signature/);

      const termsMarkup = renderToStaticMarkup(
        React.createElement(TermsDeclaration, {
          accepted: true,
          onChange: noop,
        }),
      );
      assert.match(termsMarkup, /Statutory Declaration/);
      assert.match(termsMarkup, /checked=""/);
    });
  });
});
