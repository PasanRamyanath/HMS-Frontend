/**
 * Unit Tests for Excursion Partner Voucher & WhatsApp Dispatch Helper
 * (HMS-Frontend/test/dispatchVendorWhatsApp.test.ts)
 *
 * Covers Step 369 (Phase 15.19):
 * - Sri Lankan phone number normalization for WhatsApp deep linking.
 * - Structured WhatsApp voucher text formatting with Apple HIG standards.
 * - Wildlife safari / whale watching / airport transfer operator details.
 * - Early morning packed breakfast box requests and KDS notes.
 * - Net wholesale operator settlement vs guest-direct payment modes.
 * - Compact SMS summaries and dispatch execution results.
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import {
  type ExcursionBookingVoucherInput,
  type ExcursionVendorPartner,
  type ExcursionVendorVoucher,
  type PropertyConciergeContext,
  buildWhatsAppDeepLink,
  composeVendorSmsSummary,
  composeVendorWhatsAppMessage,
  copyVendorVoucherToClipboard,
  dispatchVendorWhatsApp,
  formatBreakfastSection,
  formatPaxSummary,
  formatSettlementLabel,
  formatVehicleSection,
  generateVendorVoucher,
  normalizePhoneForWhatsApp,
} from "../src/admin/activities/dispatchVendorWhatsApp.js";

describe("Step 369: Excursion Partner Voucher & WhatsApp Dispatch Helper", () => {
  const mockProperty: PropertyConciergeContext = {
    tenantId: "TENANT-YALA-LUXURY",
    hotelName: "Cinnamon Wild Yala",
    conciergeDeskPhone: "+94472239400",
    emergencyPhone: "+94771999888",
  };

  const mockVendor: ExcursionVendorPartner = {
    vendorId: "VEND-YALA-JEEP-01",
    companyName: "Yala Trackers 4x4 Safari Services",
    contactPerson: "Sampath Jayasinghe",
    whatsAppMobile: "077 345 6789",
    operatorLicenseNo: "DWC-SLTDA-2024-881",
    baseLocation: "Palatupana Gate, Yala",
  };

  const mockBooking: ExcursionBookingVoucherInput = {
    bookingReference: "EXC-2026-1025-0042",
    activityTitle: "Yala National Park Full-Day Leopard Safari (Block 1 & 2)",
    activityCategory: "YALA_SAFARI",
    excursionDate: "2026-10-25",
    pickupTime: "05:00 AM",
    estimatedReturnTime: "12:30 PM",
    pickupLocation: "Hotel Lobby Main Porte-Cochere",
    dropoffLocation: "Hotel Lobby Main Porte-Cochere",
    guestFullName: "Charlotte & Oliver Bennett",
    roomNumber: "Jungle Chalet 108",
    guestContactMobile: "+44 7911 123456",
    numberOfAdults: 2,
    numberOfChildren: 1,
    assignedDriverName: "Kapila Bandara",
    driverContactMobile: "071 888 9900",
    vehicleRegistrationNo: "SP SG-8899",
    vehicleType: "Toyota Hilux 4x4 Custom Safari Jeep",
    wholesaleCostLkr: 28500,
    settlementMode: "HOTEL_VOUCHER_SETTLEMENT",
    specialRequirements:
      "Wide wildlife lens mount needed; guest requested front row elevated seats.",
    breakfastBox: {
      requested: true,
      boxCount: 3,
      dietaryType: "CONTINENTAL",
      readyTime: "04:45 AM",
      specialInstructions: "Extra fresh king coconut water & Ceylon bananas",
    },
  };

  describe("1. Phone Normalization & WhatsApp Deep-Link Builder", () => {
    it("normalizes standard Sri Lankan 10-digit mobile numbers starting with 0", () => {
      assert.strictEqual(normalizePhoneForWhatsApp("0773456789"), "94773456789");
      assert.strictEqual(normalizePhoneForWhatsApp("071-888-9900"), "94718889900");
    });

    it("handles numbers with spaces, dashes, parentheses and +94 prefixes", () => {
      assert.strictEqual(normalizePhoneForWhatsApp("+94 77 345 6789"), "94773456789");
      assert.strictEqual(normalizePhoneForWhatsApp("+94(77)3456789"), "94773456789");
      assert.strictEqual(normalizePhoneForWhatsApp("94773456789"), "94773456789");
    });

    it("handles 9-digit mobile numbers omitting leading zero", () => {
      assert.strictEqual(normalizePhoneForWhatsApp("773456789"), "94773456789");
    });

    it("preserves international numbers with country codes", () => {
      assert.strictEqual(normalizePhoneForWhatsApp("+44 7911 123456"), "447911123456");
      assert.strictEqual(normalizePhoneForWhatsApp("+1 (555) 019-2834"), "15550192834");
    });

    it("builds wa.me deep link with URL-encoded text content", () => {
      const link = buildWhatsAppDeepLink("0773456789", "Ayubowan Sampath! Confirmation voucher.");
      assert.ok(link.startsWith("https://wa.me/94773456789?text="));
      assert.ok(link.includes("Ayubowan%20Sampath"));
    });
  });

  describe("2. Pure Sub-Section Formatters", () => {
    it("formats pax summary with and without children", () => {
      assert.strictEqual(formatPaxSummary(2, 1), "2 Adult(s), 1 Child(ren) (Total: 3)");
      assert.strictEqual(formatPaxSummary(4, 0), "4 Adult(s) (Total: 4)");
      assert.strictEqual(formatPaxSummary(1), "1 Adult(s) (Total: 1)");
    });

    it("formats human-readable settlement labels for operator billing", () => {
      assert.strictEqual(
        formatSettlementLabel("HOTEL_VOUCHER_SETTLEMENT"),
        "Direct Hotel Settlement (Bill to Hotel on Monthly Voucher)",
      );
      assert.strictEqual(
        formatSettlementLabel("GUEST_DIRECT_SETTLEMENT"),
        "Direct Guest Settlement (Collect Cash/Card Directly from Guest)",
      );
      assert.strictEqual(
        formatSettlementLabel("BILLED_TO_ROOM_FOLIO"),
        "Hotel Guaranteed (Charged to In-House Guest Room Folio)",
      );
    });

    it("formats early-morning packed breakfast box details", () => {
      const formatted = formatBreakfastSection(mockBooking.breakfastBox);
      assert.ok(formatted.includes("3 box(es)"));
      assert.ok(formatted.includes("CONTINENTAL"));
      assert.ok(formatted.includes("04:45 AM"));
      assert.ok(formatted.includes("Extra fresh king coconut water"));

      // Not requested
      assert.strictEqual(
        formatBreakfastSection({
          requested: false,
          boxCount: 0,
          dietaryType: "NONE",
          readyTime: "",
        }),
        "• Packed Breakfast: Not required",
      );
      assert.strictEqual(formatBreakfastSection(undefined), "• Packed Breakfast: Not required");
    });

    it("formats transport and vehicle section with driver details", () => {
      const formatted = formatVehicleSection(mockBooking);
      assert.ok(formatted.includes("Toyota Hilux 4x4 Custom Safari Jeep"));
      assert.ok(formatted.includes("[Reg: SP SG-8899]"));
      assert.ok(formatted.includes("Kapila Bandara (071 888 9900)"));

      // Without driver or registration
      const minimal = formatVehicleSection({
        ...mockBooking,
        vehicleRegistrationNo: undefined,
        assignedDriverName: undefined,
        vehicleType: undefined,
      });
      assert.strictEqual(minimal, "• Assigned Vehicle: Standard Safari/Excursion Vehicle");
    });
  });

  describe("3. Full Message Composers", () => {
    it("composes complete WhatsApp partner voucher message with Sri Lankan hospitality etiquette", () => {
      const voucherText = composeVendorWhatsAppMessage(
        mockProperty,
        mockVendor,
        mockBooking,
        "VCH-20261025-4421",
      );

      assert.ok(voucherText.startsWith("Ayubowan Sampath Jayasinghe,"));
      assert.ok(voucherText.includes("*EXCURSION PARTNER DISPATCH VOUCHER*"));
      assert.ok(voucherText.includes("*Voucher Reference:* VCH-20261025-4421"));
      assert.ok(voucherText.includes("*Booking Ref:* EXC-2026-1025-0042"));
      assert.ok(voucherText.includes("Cinnamon Wild Yala (Concierge: +94472239400)"));
      assert.ok(voucherText.includes("Yala National Park Full-Day Leopard Safari"));
      assert.ok(voucherText.includes("2026-10-25"));
      assert.ok(voucherText.includes("05:00 AM"));
      assert.ok(voucherText.includes("Hotel Lobby Main Porte-Cochere"));
      assert.ok(voucherText.includes("Est. Return Time: 12:30 PM"));
      assert.ok(voucherText.includes("Charlotte & Oliver Bennett"));
      assert.ok(voucherText.includes("Jungle Chalet 108"));
      assert.ok(voucherText.includes("Net Operator Cost: LKR 28,500.00"));
      assert.ok(voucherText.includes("Direct Hotel Settlement"));
      assert.ok(voucherText.includes("Packed Breakfast: 3 box(es)"));
      assert.ok(voucherText.includes("Wide wildlife lens mount needed"));
      assert.ok(voucherText.includes("Stūtiy! (Thank you)"));
    });

    it("composes message for non-resident walk-in guest without room number", () => {
      const walkInBooking: ExcursionBookingVoucherInput = {
        ...mockBooking,
        roomNumber: undefined,
        guestContactMobile: undefined,
      };
      const voucherText = composeVendorWhatsAppMessage(
        mockProperty,
        mockVendor,
        walkInBooking,
        "VCH-WALKIN-01",
      );

      assert.ok(voucherText.includes("Residence: Non-Resident Walk-in Guest"));
      assert.ok(!voucherText.includes("Jungle Chalet"));
    });

    it("composes compact single-segment SMS summary", () => {
      const sms = composeVendorSmsSummary(
        mockProperty,
        mockVendor,
        mockBooking,
        "VCH-20261025-4421",
      );

      assert.ok(sms.includes("Cinnamon Wild Yala EXC [VCH-20261025-4421]:"));
      assert.ok(sms.includes("Yala National Park"));
      assert.ok(sms.includes("05:00 AM"));
      assert.ok(sms.includes("3 Pax"));
      assert.ok(sms.includes("Rm Jungle Chalet 108"));
      assert.ok(sms.includes("Net LKR 28,500.00"));
      assert.ok(sms.includes("Pls confirm."));
    });
  });

  describe("4. Voucher Generation & Dispatch Execution", () => {
    it("generates complete ExcursionVendorVoucher bundle with custom voucher ID", () => {
      const voucher: ExcursionVendorVoucher = generateVendorVoucher(
        mockProperty,
        mockVendor,
        mockBooking,
        "VCH-TEST-9988",
      );

      assert.strictEqual(voucher.voucherId, "VCH-TEST-9988");
      assert.strictEqual(voucher.property.hotelName, "Cinnamon Wild Yala");
      assert.strictEqual(voucher.vendor.companyName, "Yala Trackers 4x4 Safari Services");
      assert.strictEqual(voucher.booking.bookingReference, "EXC-2026-1025-0042");
      assert.ok(voucher.plainTextMessage.includes("VCH-TEST-9988"));
      assert.ok(voucher.smsSummary.includes("VCH-TEST-9988"));
      assert.ok(voucher.whatsAppDeepLink.startsWith("https://wa.me/94773456789"));
      assert.ok(voucher.generatedAt);
    });

    it("generates voucher with auto-generated reference when not overridden", () => {
      const voucher = generateVendorVoucher(mockProperty, mockVendor, mockBooking);
      assert.ok(voucher.voucherId.startsWith("VCH-20261025-"));
    });

    it("executes WhatsApp dispatch without window.open in headless environment", async () => {
      const voucher = generateVendorVoucher(mockProperty, mockVendor, mockBooking);
      const result = await dispatchVendorWhatsApp(voucher, false);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.channel, "WHATSAPP");
      assert.strictEqual(result.voucherId, voucher.voucherId);
      assert.strictEqual(result.destinationMobile, "94773456789");
      assert.ok(result.dispatchedAt);
    });

    it("gracefully handles clipboard copy when clipboard API is unavailable", async () => {
      const voucher = generateVendorVoucher(mockProperty, mockVendor, mockBooking);
      const copied = await copyVendorVoucherToClipboard(voucher);
      // In Node.js test environment, navigator.clipboard is undefined, should return false safely
      assert.strictEqual(copied, false);
    });
  });
});
