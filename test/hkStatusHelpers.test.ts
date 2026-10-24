/**
 * Unit Tests for Step 325: Shared Housekeeping Status Helpers & Rung 7 Alignment (hkStatusHelpers.test.ts)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STATUS_STYLES,
  STATUS_TRILINGUAL_LABELS,
  canTransitionToClean,
  canTransitionToDirty,
  canTransitionToInspected,
  getPriorityWeight,
  getStatusLocalizedLabel,
  getStatusStyle,
  isRoomBlocked,
  isRoomReadyForCheckIn,
  isRoomTurnaroundActive,
  normalizeHousekeepingStatus,
} from "../src/staff/housekeeping/index.js";

describe("Step 325: Shared Housekeeping Status Helpers & Theme Tokens (hkStatusHelpers.ts)", () => {
  // --------------------------------------------------------------------------
  // 1. Status Normalizer
  // --------------------------------------------------------------------------
  describe("1. Canonical Status Normalizer (normalizeHousekeepingStatus)", () => {
    it("normalizes standard mobile room statuses accurately", () => {
      assert.strictEqual(normalizeHousekeepingStatus("CLEAN"), "CLEAN");
      assert.strictEqual(normalizeHousekeepingStatus("clean"), "CLEAN");
      assert.strictEqual(normalizeHousekeepingStatus("INSPECTED"), "INSPECTED");
      assert.strictEqual(normalizeHousekeepingStatus("DIRTY"), "DIRTY");
      assert.strictEqual(normalizeHousekeepingStatus("TOUCH_UP"), "TOUCH_UP");
      assert.strictEqual(normalizeHousekeepingStatus("DO_NOT_DISTURB"), "DO_NOT_DISTURB");
      assert.strictEqual(normalizeHousekeepingStatus("OUT_OF_ORDER"), "OUT_OF_ORDER");
      assert.strictEqual(normalizeHousekeepingStatus("OUT_OF_SERVICE"), "OUT_OF_SERVICE");
    });

    it("maps front-desk and floor sheet composite statuses into canonical states", () => {
      assert.strictEqual(normalizeHousekeepingStatus("INSPECTED_CLEAN"), "INSPECTED");
      assert.strictEqual(normalizeHousekeepingStatus("VACANT_DIRTY"), "DIRTY");
      assert.strictEqual(normalizeHousekeepingStatus("OCCUPIED_DIRTY"), "DIRTY");
      assert.strictEqual(normalizeHousekeepingStatus("STAYOVER"), "TOUCH_UP");
      assert.strictEqual(normalizeHousekeepingStatus("DND"), "DO_NOT_DISTURB");
      assert.strictEqual(normalizeHousekeepingStatus("OOO"), "OUT_OF_ORDER");
      assert.strictEqual(normalizeHousekeepingStatus("OOS"), "OUT_OF_SERVICE");
    });

    it("defaults unknown or malformed status strings to DIRTY safely", () => {
      assert.strictEqual(normalizeHousekeepingStatus("UNKNOWN_CODE"), "DIRTY");
      assert.strictEqual(normalizeHousekeepingStatus(""), "DIRTY");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Apple HIG Dynamic Theme Tokens & Localized Labels
  // --------------------------------------------------------------------------
  describe("2. Apple HIG Theme Tokens & Trilingual Localization", () => {
    it("resolves Apple HIG OLED vibrancy theme tokens for all room statuses", () => {
      const clean = getStatusStyle("CLEAN");
      assert.ok(clean.badgeBg.includes("emerald"));
      assert.strictEqual(clean.hexColor, "#34C759");
      assert.strictEqual(clean.icon, "OK");

      const inspected = getStatusStyle("INSPECTED_CLEAN");
      assert.ok(inspected.badgeBg.includes("sky"));
      assert.strictEqual(inspected.hexColor, "#007AFF");
      assert.strictEqual(inspected.icon, "*");

      const touchUp = getStatusStyle("TOUCH_UP");
      assert.ok(touchUp.badgeBg.includes("amber"));
      assert.strictEqual(touchUp.hexColor, "#FF9500");

      const dnd = getStatusStyle("DO_NOT_DISTURB");
      assert.ok(dnd.badgeBg.includes("purple"));
      assert.strictEqual(dnd.hexColor, "#AF52DE");

      const ooo = getStatusStyle("OUT_OF_ORDER");
      assert.ok(ooo.badgeBg.includes("slate"));
      assert.strictEqual(ooo.hexColor, "#8E8E93");

      const dirty = getStatusStyle("VACANT_DIRTY");
      assert.ok(dirty.badgeBg.includes("rose"));
      assert.strictEqual(dirty.hexColor, "#FF3B30");
      assert.strictEqual(dirty.icon, "Clean");
    });

    it("verifies dictionary completeness of STATUS_STYLES and STATUS_TRILINGUAL_LABELS", () => {
      const statuses = [
        "DIRTY",
        "CLEAN",
        "INSPECTED",
        "TOUCH_UP",
        "DO_NOT_DISTURB",
        "OUT_OF_ORDER",
        "OUT_OF_SERVICE",
      ] as const;

      for (const st of statuses) {
        assert.ok(STATUS_STYLES[st]);
        assert.ok(STATUS_TRILINGUAL_LABELS[st].en);
        assert.ok(STATUS_TRILINGUAL_LABELS[st].si);
        assert.ok(STATUS_TRILINGUAL_LABELS[st].ta);
      }
    });

    it("resolves trilingual localized labels in English, Sinhala, and Tamil", () => {
      assert.strictEqual(getStatusLocalizedLabel("CLEAN", "en"), "Clean");
      assert.strictEqual(getStatusLocalizedLabel("CLEAN", "si"), "පිරිසිදුයි");
      assert.strictEqual(getStatusLocalizedLabel("CLEAN", "ta"), "சுத்தமானது");

      assert.strictEqual(getStatusLocalizedLabel("INSPECTED", "en"), "Inspected");
      assert.strictEqual(getStatusLocalizedLabel("INSPECTED", "si"), "පරීක්ෂා කර ඇත");
      assert.strictEqual(getStatusLocalizedLabel("INSPECTED", "ta"), "ஆய்வு செய்யப்பட்டது");

      assert.strictEqual(getStatusLocalizedLabel("DIRTY", "en"), "Dirty");
      assert.strictEqual(getStatusLocalizedLabel("DIRTY", "si"), "අපිරිසිදුයි");
      assert.strictEqual(getStatusLocalizedLabel("DIRTY", "ta"), "அசுத்தமானது");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Operational Predicates & Rung 7 Gatekeepers
  // --------------------------------------------------------------------------
  describe("3. Operational Predicates & State Transition Guards", () => {
    it("isRoomReadyForCheckIn permits check-in only for inspected rooms", () => {
      assert.strictEqual(isRoomReadyForCheckIn("INSPECTED"), true);
      assert.strictEqual(isRoomReadyForCheckIn("INSPECTED_CLEAN"), true);
      assert.strictEqual(isRoomReadyForCheckIn("CLEAN"), false);
      assert.strictEqual(isRoomReadyForCheckIn("DIRTY"), false);
      assert.strictEqual(isRoomReadyForCheckIn("OUT_OF_ORDER"), false);
    });

    it("isRoomTurnaroundActive identifies rooms in active turnaround pipeline", () => {
      assert.strictEqual(isRoomTurnaroundActive("DIRTY"), true);
      assert.strictEqual(isRoomTurnaroundActive("VACANT_DIRTY"), true);
      assert.strictEqual(isRoomTurnaroundActive("OCCUPIED_DIRTY"), true);
      assert.strictEqual(isRoomTurnaroundActive("TOUCH_UP"), true);
      assert.strictEqual(isRoomTurnaroundActive("CLEAN"), true);
      assert.strictEqual(isRoomTurnaroundActive("DO_NOT_DISTURB"), false);
      assert.strictEqual(isRoomTurnaroundActive("OUT_OF_ORDER"), false);
      assert.strictEqual(isRoomTurnaroundActive("INSPECTED"), false);
    });

    it("isRoomBlocked detects blocked rooms", () => {
      assert.strictEqual(isRoomBlocked("DO_NOT_DISTURB"), true);
      assert.strictEqual(isRoomBlocked("DND"), true);
      assert.strictEqual(isRoomBlocked("OUT_OF_ORDER"), true);
      assert.strictEqual(isRoomBlocked("OOO"), true);
      assert.strictEqual(isRoomBlocked("OUT_OF_SERVICE"), true);
      assert.strictEqual(isRoomBlocked("DIRTY"), false);
      assert.strictEqual(isRoomBlocked("CLEAN"), false);
    });

    it("guards attendant and supervisor state transitions", () => {
      // Attendant: Dirty / Touch-up -> Clean
      assert.strictEqual(canTransitionToClean("DIRTY"), true);
      assert.strictEqual(canTransitionToClean("TOUCH_UP"), true);
      assert.strictEqual(canTransitionToClean("CLEAN"), false);
      assert.strictEqual(canTransitionToClean("INSPECTED"), false);

      // Supervisor: Clean -> Inspected
      assert.strictEqual(canTransitionToInspected("CLEAN"), true);
      assert.strictEqual(canTransitionToInspected("DIRTY"), false);
      assert.strictEqual(canTransitionToInspected("INSPECTED"), false);

      // Reopen: Inspected -> Dirty
      assert.strictEqual(canTransitionToDirty("INSPECTED"), true);
      assert.strictEqual(canTransitionToDirty("INSPECTED_CLEAN"), true);
      assert.strictEqual(canTransitionToDirty("DIRTY"), false);
    });

    it("calculates priority weight matching queue ordering contract", () => {
      assert.strictEqual(
        getPriorityWeight({ priority: "ARRIVAL_TODAY_DIRTY", status: "DIRTY" }),
        0,
      );
      assert.strictEqual(getPriorityWeight({ status: "DIRTY" }), 1);
      assert.strictEqual(getPriorityWeight({ status: "TOUCH_UP" }), 2);
      assert.strictEqual(getPriorityWeight({ status: "CLEAN" }), 3);
      assert.strictEqual(getPriorityWeight({ status: "INSPECTED" }), 4);
      assert.strictEqual(getPriorityWeight({ status: "DO_NOT_DISTURB" }), 5);
      assert.strictEqual(getPriorityWeight({ status: "OUT_OF_ORDER" }), 6);
    });
  });
});
