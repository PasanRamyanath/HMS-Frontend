import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_ACTIVE_GUESTS,
  type GuestStayTarget,
  PAID_OUT_CATEGORIES,
  type PaidOutCategory,
  PaidOutVoucherModal,
  type PaidOutVoucherModalProps,
  type PaidOutVoucherPayload,
  generateVoucherNumber,
  getCategoryInfo,
  roundLkr,
  validatePaidOutPayload,
} from "../src/admin/folios/PaidOutVoucherModal.js";

describe("Step 214: PaidOutVoucherModal & Front Desk Cash Advance Disbursements", () => {
  describe("1. Pure Calculation & Validation Helpers", () => {
    it("rounds numbers half-up to exactly 2 decimal cents", () => {
      assert.strictEqual(roundLkr(Number.NaN), 0);
      assert.strictEqual(roundLkr(Number.POSITIVE_INFINITY), 0);
      assert.strictEqual(roundLkr(2500.254), 2500.25);
      assert.strictEqual(roundLkr(2500.255), 2500.26);
    });

    it("generates voucher number prefixed with PO-2026-", () => {
      const vNum = generateVoucherNumber();
      assert.ok(vNum.startsWith("PO-2026-"));
      assert.strictEqual(vNum.length, 12);
    });

    it("returns correct category metadata with icon and description", () => {
      const tuktuk = getCategoryInfo("TUK_TUK_TRANSPORT");
      assert.strictEqual(tuktuk.icon, "TukTuk");
      assert.strictEqual(tuktuk.label, "Tuk-Tuk / Taxi Fare");

      const pharmacy = getCategoryInfo("PHARMACY_MEDICAL");
      assert.strictEqual(pharmacy.icon, "Med");

      const courier = getCategoryInfo("POSTAGE_COURIER");
      assert.strictEqual(courier.icon, "Post");

      const fallback = getCategoryInfo("UNKNOWN_CAT" as PaidOutCategory);
      assert.strictEqual(fallback.icon, "Folio");
    });

    it("validates paid-out payloads strictly against required fields", () => {
      // Valid
      const validPayload: Partial<PaidOutVoucherPayload> = {
        folioId: "FOLIO-2026-9812",
        amountLkr: 2500,
        payeeVendor: "Nelum Pokuna Tuk-Tuk Driver",
        reasonNotes: "Ride to Temple",
      };
      assert.strictEqual(validatePaidOutPayload(validPayload).isValid, true);

      // Missing Folio
      assert.strictEqual(validatePaidOutPayload({ ...validPayload, folioId: "" }).isValid, false);

      // Amount <= 0
      assert.strictEqual(validatePaidOutPayload({ ...validPayload, amountLkr: 0 }).isValid, false);

      // Missing Payee
      assert.strictEqual(
        validatePaidOutPayload({ ...validPayload, payeeVendor: "  " }).isValid,
        false,
      );

      // Missing Reason
      assert.strictEqual(
        validatePaidOutPayload({ ...validPayload, reasonNotes: "" }).isValid,
        false,
      );
    });
  });

  describe("2. Presets & Defaults Integrity", () => {
    it("ensures default active guests list has valid in-house guests and rooms", () => {
      assert.strictEqual(DEFAULT_ACTIVE_GUESTS.length, 3);
      assert.ok(DEFAULT_ACTIVE_GUESTS.some((g) => g.guestFullName.includes("Arthur")));
      assert.ok(DEFAULT_ACTIVE_GUESTS.some((g) => g.roomNumber.includes("Ocean Villa")));
      assert.ok(DEFAULT_ACTIVE_GUESTS.every((g) => g.folioId.startsWith("FOLIO-")));
    });

    it("ensures all 5 paid-out categories are declared", () => {
      assert.strictEqual(PAID_OUT_CATEGORIES.length, 5);
      const keys = PAID_OUT_CATEGORIES.map((c) => c.category);
      assert.ok(keys.includes("TUK_TUK_TRANSPORT"));
      assert.ok(keys.includes("PHARMACY_MEDICAL"));
      assert.ok(keys.includes("POSTAGE_COURIER"));
      assert.ok(keys.includes("EXCURSION_TICKETS"));
      assert.ok(keys.includes("OTHER_DISBURSEMENT"));
    });
  });

  describe("3. Static Markup Rendering (PaidOutVoucherModal)", () => {
    it("renders modal when isOpen is true with voucher fields and category pills", () => {
      const html = renderToStaticMarkup(
        React.createElement(PaidOutVoucherModal, {
          isOpen: true,
          onClose: () => undefined,
          onPostPaidOut: () => undefined,
          activeGuests: DEFAULT_ACTIVE_GUESTS,
        }),
      );

      assert.ok(html.includes("Front Desk Paid-Out / Cash Advance Voucher"));
      assert.ok(html.includes("Target In-House Guest Folio"));
      assert.ok(html.includes("Ocean Villa 302 — Arthur Pendelton-Hayes"));
      assert.ok(html.includes("Tuk-Tuk / Taxi Fare"));
      assert.ok(html.includes("Pharmacy &amp; Medical Purchase"));
      assert.ok(html.includes("Postage &amp; Courier Charges"));
      assert.ok(html.includes("Cash Advance Amount (LKR)"));
      assert.ok(html.includes("Payee Vendor / Recipient"));
    });

    it("renders cashier and drawer context details", () => {
      const html = renderToStaticMarkup(
        React.createElement(PaidOutVoucherModal, {
          isOpen: true,
          onClose: () => undefined,
          onPostPaidOut: () => undefined,
          cashierUserId: "USR-CSH-009",
          cashierName: "Sunil Shantha",
          drawerId: "DRAWER-RECEPT-02",
        }),
      );

      assert.ok(html.includes("Sunil Shantha"));
      assert.ok(html.includes("USR-CSH-009"));
      assert.ok(html.includes("DRAWER-RECEPT-02"));
    });

    it("does not render modal contents when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(PaidOutVoucherModal, {
          isOpen: false,
          onClose: () => undefined,
          onPostPaidOut: () => undefined,
        }),
      );

      assert.strictEqual(html, "");
    });

    it("validates all exported types and prop interfaces compile cleanly", () => {
      const cat: PaidOutCategory = "EXCURSION_TICKETS";
      const guest: GuestStayTarget | undefined = DEFAULT_ACTIVE_GUESTS[0];
      assert.ok(guest);
      const payload: PaidOutVoucherPayload = {
        voucherNumber: "PO-2026-1234",
        timestamp: "2026-10-19T10:00:00Z",
        folioId: guest.folioId,
        guestId: guest.guestId,
        guestFullName: guest.guestFullName,
        roomNumber: guest.roomNumber,
        category: cat,
        amountLkr: 5000,
        payeeVendor: "Temple Ticket Counter",
        cashierUserId: "USR-01",
        cashierName: "Cashier",
        drawerId: "DRW-01",
        reasonNotes: "Tickets advance",
        guestAcknowledged: true,
      };
      const props: PaidOutVoucherModalProps = {
        isOpen: true,
        onClose: () => undefined,
        onPostPaidOut: () => undefined,
      };

      assert.strictEqual(cat, "EXCURSION_TICKETS");
      assert.ok(payload.voucherNumber);
      assert.ok(props.isOpen);
    });
  });
});
