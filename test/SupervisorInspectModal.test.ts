import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type InspectionPointKey,
  type InspectionStatus,
  SupervisorInspectModal,
  TROPICAL_INSPECTION_CHECKLIST,
  countChecklistProgress,
  getFailedPoints,
  getInspectionText,
} from "../src/staff/housekeeping/SupervisorInspectModal.js";

const noop = () => undefined;

describe("Step 304: Room Inspection Checklist Modal for Housekeeping Supervisors (SupervisorInspectModal.tsx)", () => {
  describe("1. Pure Checklist Assessment & Progress Calculators", () => {
    it("defines exactly the 6-point tropical resort checklist items", () => {
      assert.equal(TROPICAL_INSPECTION_CHECKLIST.length, 6);
      const keys = TROPICAL_INSPECTION_CHECKLIST.map((i) => i.key);
      assert.deepEqual(keys, [
        "AC_FAN",
        "MOSQUITO_NET",
        "CEYLON_TEA_TRAY",
        "BATHROOM_SEAL",
        "QR_STAND",
        "SAFE_UNLOCKED",
      ]);
    });

    it("evaluates progress correctly when all points are pending", () => {
      const results: Record<InspectionPointKey, InspectionStatus> = {
        AC_FAN: "PENDING",
        MOSQUITO_NET: "PENDING",
        CEYLON_TEA_TRAY: "PENDING",
        BATHROOM_SEAL: "PENDING",
        QR_STAND: "PENDING",
        SAFE_UNLOCKED: "PENDING",
      };

      const progress = countChecklistProgress(results);
      assert.equal(progress.passedCount, 0);
      assert.equal(progress.failedCount, 0);
      assert.equal(progress.allPassed, false);
    });

    it("evaluates progress as allPassed when all 6 points are passed", () => {
      const results: Record<InspectionPointKey, InspectionStatus> = {
        AC_FAN: "PASSED",
        MOSQUITO_NET: "PASSED",
        CEYLON_TEA_TRAY: "PASSED",
        BATHROOM_SEAL: "PASSED",
        QR_STAND: "PASSED",
        SAFE_UNLOCKED: "PASSED",
      };

      const progress = countChecklistProgress(results);
      assert.equal(progress.passedCount, 6);
      assert.equal(progress.failedCount, 0);
      assert.equal(progress.allPassed, true);
    });

    it("identifies failed points accurately with getFailedPoints", () => {
      const results: Record<InspectionPointKey, InspectionStatus> = {
        AC_FAN: "FAILED",
        MOSQUITO_NET: "PASSED",
        CEYLON_TEA_TRAY: "PASSED",
        BATHROOM_SEAL: "FAILED",
        QR_STAND: "PASSED",
        SAFE_UNLOCKED: "PASSED",
      };

      const progress = countChecklistProgress(results);
      assert.equal(progress.passedCount, 4);
      assert.equal(progress.failedCount, 2);
      assert.equal(progress.allPassed, false);

      const failed = getFailedPoints(results);
      assert.deepEqual(failed, ["AC_FAN", "BATHROOM_SEAL"]);
    });
  });

  describe("2. React Static Markup & Apple HIG Design Standards", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(SupervisorInspectModal, {
          isOpen: false,
          onClose: noop,
          roomId: "rm-101",
          roomNumber: "101",
          onApproveInspected: noop,
          onRejectBackToAttendant: noop,
        }),
      );
      assert.equal(html, "");
    });

    it("renders modal dialog with room number, attendant, and 6 checklist items", () => {
      const html = renderToStaticMarkup(
        React.createElement(SupervisorInspectModal, {
          isOpen: true,
          onClose: noop,
          roomId: "rm-101",
          roomNumber: "101",
          roomTypeName: "Deluxe Ocean Villa",
          attendantName: "Kamal Silva",
          guestName: "Pasan Ramyanath",
          supervisorName: "Sunil Perera",
          onApproveInspected: noop,
          onRejectBackToAttendant: noop,
        }),
      );

      assert.ok(html.includes("Room 101"));
      assert.ok(html.includes("Deluxe Ocean Villa"));
      assert.ok(html.includes("Kamal Silva"));
      assert.ok(html.includes("Pasan Ramyanath"));
      assert.ok(html.includes("SUPERVISOR INSPECTION"));
      assert.ok(html.includes("AC &amp; Ceiling Fan Test"));
      assert.ok(html.includes("Mosquito Net &amp; Vaporizer"));
      assert.ok(html.includes("Ceylon BOPF Tea Tray &amp; Water"));
      assert.ok(html.includes("Bathroom Sanitization &amp; Seal"));
      assert.ok(html.includes("Bedside Room QR Stand"));
      assert.ok(html.includes("Digital Safe Open &amp; Reset"));
      assert.ok(html.includes("Pass All 6 Points"));
    });

    it("enforces >= 44x44pt touch targets on interactive controls", () => {
      const html = renderToStaticMarkup(
        React.createElement(SupervisorInspectModal, {
          isOpen: true,
          onClose: noop,
          roomId: "rm-204",
          roomNumber: "204",
          onApproveInspected: noop,
          onRejectBackToAttendant: noop,
        }),
      );

      assert.ok(html.includes("min-w-[44px]"));
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("min-h-[48px]"));
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("renders trilingual localized checklist in Sinhala and Tamil", () => {
      const textSi = getInspectionText("si");
      assert.equal(textSi.title, "පරීක්ෂක කාමර පරීක්ෂාව");
      assert.equal(textSi.passAllAction, "ලක්ෂ්‍ය 6 ම සමත් කරන්න");
      assert.equal(textSi.approveAction, "කාමරය පරීක්ෂා කළ බවට අනුමත කරන්න");

      const textTa = getInspectionText("ta");
      assert.equal(textTa.title, "மேற்பார்வையாளர் அறை ஆய்வு");
      assert.equal(textTa.passAllAction, "அனைத்து 6 அம்சங்களையும் ஏற்கவும்");
      assert.equal(textTa.approveAction, "அறையை ஆய்வுக்கு உட்பட்டதாக அங்கீகரிக்கவும்");

      const htmlSi = renderToStaticMarkup(
        React.createElement(SupervisorInspectModal, {
          isOpen: true,
          onClose: noop,
          roomId: "rm-301",
          roomNumber: "301",
          language: "si",
          onApproveInspected: noop,
          onRejectBackToAttendant: noop,
        }),
      );
      assert.ok(htmlSi.includes("වායු සමීකරණ හා විදුලි පංකා පරීක්ෂාව"));
      assert.ok(htmlSi.includes("මදුරු දැල් සහ වාෂ්පකාරක"));
      assert.ok(htmlSi.includes("සීලෝන් තේ තැටිය සහ පානීය ජලය"));
      assert.ok(htmlSi.includes("ලක්ෂ්‍ය 6 ම සමත් කරන්න"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(SupervisorInspectModal, {
          isOpen: true,
          onClose: noop,
          roomId: "rm-301",
          roomNumber: "301",
          language: "ta",
          onApproveInspected: noop,
          onRejectBackToAttendant: noop,
        }),
      );
      assert.ok(htmlTa.includes("ஏசி &amp; மின்விசிறி சோதனை"));
      assert.ok(htmlTa.includes("கொசு வலை &amp; விரட்டி"));
      assert.ok(htmlTa.includes("சிலோன் தேநீர் தட்டு &amp; குடிநீர்"));
      assert.ok(htmlTa.includes("அனைத்து 6 அம்சங்களையும் ஏற்கவும்"));
    });
  });
});
