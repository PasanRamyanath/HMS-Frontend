import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEMO_DISHES,
  DEMO_FOLIOS,
  DEMO_HOTEL_NAME,
  DEMO_ORDERS,
  DEMO_PROPERTY_DOSSIER,
  DEMO_RESERVATIONS,
  DEMO_ROOMS,
  DEMO_STORAGE_KEY,
  DEMO_TENANT_ID,
  type DemoDish,
  type DemoFolio,
  type DemoFolioLine,
  type DemoHotelProperty,
  type DemoMealPlan,
  type DemoOrder,
  type DemoOrderItem,
  type DemoOrderStatus,
  type DemoReservation,
  type DemoReservationStatus,
  type DemoRoom,
  type DemoRoomStatus,
  type DemoSandboxState,
  createDefaultDemoSandboxState,
  exportDemoSandboxJson,
  getDemoFolio,
  getDemoOrder,
  getDemoReservation,
  getDemoRoom,
  importDemoSandboxJson,
  isDemoSandboxActive,
  loadDemoSandboxState,
  resetDemoSandboxState,
} from "../src/lib/demoSandboxSeeder.js";

describe("Step 467: Interactive Demo Sandbox Mode (demoSandboxSeeder.ts)", () => {
  describe("1. Demo Hotel Property & Statutory Tax Dossier", () => {
    it("verifies Ceylon Sapphire Resort & Spa property identity", () => {
      assert.strictEqual(DEMO_TENANT_ID, "demo-ceylon-sapphire");
      assert.strictEqual(DEMO_HOTEL_NAME, "Ceylon Sapphire Resort & Spa - Pelmadulla / Bentota");
      assert.strictEqual(DEMO_PROPERTY_DOSSIER.starRating, 5);
      assert.strictEqual(DEMO_PROPERTY_DOSSIER.currency, "LKR");
      assert.strictEqual(DEMO_STORAGE_KEY, "slhms_demo_sandbox_v1");
    });

    it("enforces Sri Lankan 4-stage compounding statutory taxes in property dossier", () => {
      const taxes = DEMO_PROPERTY_DOSSIER.statutoryTaxes;
      assert.strictEqual(taxes.serviceChargeRate, 0.1); // 10% SC
      assert.strictEqual(taxes.tdlRate, 0.01); // 1% TDL
      assert.strictEqual(taxes.ssclRate, 0.025641); // 2.5641% SSCL
      assert.strictEqual(taxes.vatRate, 0.18); // 18% VAT
    });

    it("verifies LankaQR merchant credentials for instant CEFT settlement", () => {
      assert.strictEqual(DEMO_PROPERTY_DOSSIER.lankaQrMerchantId, "CEYLON_SAPPHIRE_001");
      assert.strictEqual(DEMO_PROPERTY_DOSSIER.lankaQrAccount, "001928472910");
    });
  });

  describe("2. Room Inventory & SLTDA Chauffeur Dorms", () => {
    it("contains exactly 10 demo rooms covering diverse room tiers", () => {
      assert.strictEqual(DEMO_ROOMS.length, 10);
    });

    it("includes Presidential Pool Villa Room 104 with occupied status", () => {
      const room104 = DEMO_ROOMS.find((r) => r.roomNumber === "104");
      assert.ok(room104 !== undefined);
      assert.strictEqual(room104?.roomType, "Presidential Pool Villa");
      assert.strictEqual(room104?.status, "OCCUPIED");
      assert.strictEqual(room104?.currentGuestName, "Kasun Perera");
    });

    it("includes SLTDA compliant Safari Chauffeur Quarters (Dorm A1 & A2)", () => {
      const dorms = DEMO_ROOMS.filter((r) => r.isDriverDorm === true);
      assert.strictEqual(dorms.length, 2);
      assert.strictEqual(dorms[0]?.roomNumber, "DORM-A1");
      assert.strictEqual(dorms[0]?.baseRateLkr, 4500);
      assert.strictEqual(dorms[0]?.status, "OCCUPIED");
      assert.strictEqual(dorms[1]?.roomNumber, "DORM-A2");
      assert.strictEqual(dorms[1]?.status, "VACANT_CLEAN");
    });

    it("verifies variety of room operational statuses across inventory", () => {
      const statuses = new Set(DEMO_ROOMS.map((r) => r.status));
      assert.ok(statuses.has("OCCUPIED"));
      assert.ok(statuses.has("VACANT_CLEAN"));
      assert.ok(statuses.has("VACANT_INSPECTED"));
      assert.ok(statuses.has("STAYOVER_DIRTY"));
      assert.ok(statuses.has("OUT_OF_ORDER"));
    });
  });

  describe("3. Trilingual Food & Beverage Menu Catalog", () => {
    it("contains 8 curated dishes across KOT food, BOT bar, and desserts", () => {
      assert.strictEqual(DEMO_DISHES.length, 8);
    });

    it("verifies trilingual names in English, Sinhala, and Tamil for signature dishes", () => {
      for (const dish of DEMO_DISHES) {
        assert.ok(dish.name.en.length > 0);
        assert.ok(dish.name.si.length > 0);
        assert.ok(dish.name.ta.length > 0);
      }

      const kottu = DEMO_DISHES.find((d) => d.id === "dish-kottu");
      assert.strictEqual(kottu?.name.en, "Lagoon Seafood Kottu");
      assert.strictEqual(kottu?.name.si, "කලපු මුහුදු ආහාර කොත්තු");
      assert.strictEqual(kottu?.name.ta, "கடல் உணவு கொத்து");
      assert.strictEqual(kottu?.spiceLevel, 2);
    });

    it("verifies fresh King Coconut / Thambili beverage metadata", () => {
      const thambili = DEMO_DISHES.find((d) => d.id === "dish-thambili");
      assert.ok(thambili !== undefined);
      assert.strictEqual(thambili?.basePriceLkr, 450);
      assert.ok(thambili?.dietaryTags.includes("VEGAN"));
      assert.ok(thambili?.dietaryTags.includes("HALAL"));
    });
  });

  describe("4. Active Reservations & Folio Billing", () => {
    it("contains 4 active guest reservations with domestic and international profiles", () => {
      assert.strictEqual(DEMO_RESERVATIONS.length, 4);

      const kasun = DEMO_RESERVATIONS.find((r) => r.guestName === "Kasun Perera");
      assert.ok(kasun !== undefined);
      assert.strictEqual(kasun?.isResident, true);
      assert.strictEqual(kasun?.idOrPassportNumber, "952341234V");
      assert.strictEqual(kasun?.mealPlan, "HB");

      const sophie = DEMO_RESERVATIONS.find((r) => r.guestName === "Sophie Laurent");
      assert.ok(sophie !== undefined);
      assert.strictEqual(sophie?.isResident, false);
      assert.strictEqual(sophie?.nationality, "FRA");
    });

    it("verifies active orders queue for KDS and Waiter POS", () => {
      assert.strictEqual(DEMO_ORDERS.length, 3);

      const order1021 = DEMO_ORDERS.find((o) => o.orderNumber === "#1021");
      assert.ok(order1021 !== undefined);
      assert.strictEqual(order1021?.destinationType, "ROOM");
      assert.strictEqual(order1021?.destinationNumber, "104");
      assert.strictEqual(order1021?.status, "PREPARING");
      assert.strictEqual(order1021?.items.length, 2);

      const order1024 = DEMO_ORDERS.find((o) => o.orderNumber === "#1024");
      assert.ok(order1024 !== undefined);
      assert.strictEqual(order1024?.destinationType, "TABLE");
      assert.strictEqual(order1024?.status, "READY");
    });

    it("verifies Folio #FL-402 with room nights, dining, and LankaQR advance deposit", () => {
      const folio = DEMO_FOLIOS.find((f) => f.folioNumber === "FL-402");
      assert.ok(folio !== undefined);
      assert.strictEqual(folio?.roomNumber, "104");
      assert.strictEqual(folio?.totalPaidLkr, 50000);
      assert.strictEqual(folio?.isSettled, false);
      assert.ok(folio?.grossTotalLkr > folio?.subtotalLkr);
    });
  });

  describe("5. Sandbox State Machine & Lookups", () => {
    it("creates default sandbox state and verifies version", () => {
      const state = createDefaultDemoSandboxState();
      assert.strictEqual(state.version, "1.0.0");
      assert.strictEqual(state.property.id, DEMO_TENANT_ID);
      assert.strictEqual(state.rooms.length, 10);
    });

    it("saves and loads demo sandbox state in memory", () => {
      const fresh = resetDemoSandboxState();
      assert.strictEqual(fresh.property.id, DEMO_TENANT_ID);

      const loaded = loadDemoSandboxState();
      assert.strictEqual(loaded.property.name, DEMO_HOTEL_NAME);
    });

    it("verifies isDemoSandboxActive helper behavior", () => {
      assert.strictEqual(isDemoSandboxActive(DEMO_TENANT_ID), true);
      assert.strictEqual(isDemoSandboxActive("other-hotel-999"), false);
      assert.strictEqual(isDemoSandboxActive(undefined), true);
    });

    it("performs quick entity lookups by ID or code", () => {
      const room = getDemoRoom("104");
      assert.strictEqual(room?.roomNumber, "104");

      const res = getDemoReservation("res-8921");
      assert.strictEqual(res?.guestName, "Kasun Perera");

      const order = getDemoOrder("#1021");
      assert.strictEqual(order?.destinationNumber, "104");

      const folio = getDemoFolio("FL-402");
      assert.strictEqual(folio?.guestName, "Kasun Perera");
    });

    it("exports and imports valid JSON sandbox state", () => {
      const json = exportDemoSandboxJson();
      assert.ok(json.includes(DEMO_TENANT_ID));
      assert.ok(json.includes("Presidential Pool Villa"));

      const imported = importDemoSandboxJson(json);
      assert.strictEqual(imported.property.id, DEMO_TENANT_ID);
    });

    it("rejects invalid JSON sandbox import on tenant ID mismatch", () => {
      const corruptJson = JSON.stringify({ property: { id: "wrong-tenant" } });
      assert.throws(() => importDemoSandboxJson(corruptJson), /property ID mismatch/);
    });

    it("verifies all exported TypeScript types and contracts are constructible", () => {
      const hotelProp: DemoHotelProperty = DEMO_PROPERTY_DOSSIER;
      assert.strictEqual(hotelProp.id, DEMO_TENANT_ID);

      const room: DemoRoom = DEMO_ROOMS[0] as DemoRoom;
      assert.strictEqual(room.roomNumber, "101");

      const res: DemoReservation = DEMO_RESERVATIONS[0] as DemoReservation;
      assert.strictEqual(res.id, "res-8921");

      const dish: DemoDish = DEMO_DISHES[0] as DemoDish;
      assert.strictEqual(dish.id, "dish-kottu");

      const order: DemoOrder = DEMO_ORDERS[0] as DemoOrder;
      assert.strictEqual(order.id, "order-1021");

      const folio: DemoFolio = DEMO_FOLIOS[0] as DemoFolio;
      assert.strictEqual(folio.id, "folio-402");

      const orderItem: DemoOrderItem = {
        dishId: "d1",
        dishName: "Curry",
        quantity: 1,
        unitPriceLkr: 500,
      };
      assert.strictEqual(orderItem.dishId, "d1");

      const folioLine: DemoFolioLine = {
        id: "fl1",
        description: "Charge",
        category: "ROOM",
        amountLkr: 1000,
        isCredit: false,
        timestampIso: "2026-10-21T00:00:00Z",
      };
      assert.strictEqual(folioLine.category, "ROOM");

      const roomStatus: DemoRoomStatus = "VACANT_CLEAN";
      assert.strictEqual(roomStatus, "VACANT_CLEAN");

      const mealPlan: DemoMealPlan = "HB";
      assert.strictEqual(mealPlan, "HB");

      const resStatus: DemoReservationStatus = "CHECKED_IN";
      assert.strictEqual(resStatus, "CHECKED_IN");

      const orderStatus: DemoOrderStatus = "PREPARING";
      assert.strictEqual(orderStatus, "PREPARING");

      const sandboxState: DemoSandboxState = createDefaultDemoSandboxState();
      assert.strictEqual(sandboxState.version, "1.0.0");
    });
  });
});
