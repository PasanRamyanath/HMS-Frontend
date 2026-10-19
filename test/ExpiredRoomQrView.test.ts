import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ExpiredRoomQrView,
  type ExpiredRoomQrViewProps,
  type ExpiredRoomReason,
  getExpiredViewText,
} from "../src/qr/ExpiredRoomQrView.js";

describe("ExpiredRoomQrView (Step 269)", () => {
  it("provides complete trilingual translations for en, si, ta", () => {
    const en = getExpiredViewText("en");
    const si = getExpiredViewText("si");
    const ta = getExpiredViewText("ta");

    assert.ok(en.heading.includes("Stay Session"));
    assert.ok(si.heading.includes("නවාතැන් සැසිය"));
    assert.ok(ta.heading.includes("தங்குமிடம்"));

    assert.ok(en.statusBadge.includes("Locked"));
    assert.ok(si.statusBadge.includes("අගුලු"));
    assert.ok(ta.statusBadge.includes("பூட்டப்பட்டு"));

    assert.ok(en.continuePrepaidAction.includes("Prepaid"));
    assert.ok(si.continuePrepaidAction.includes("පෙරගෙවුම්"));
    assert.ok(ta.continuePrepaidAction.includes("முன்பணம்"));
  });

  it("renders expired room fallback view with room name & prepaid action", () => {
    const props: ExpiredRoomQrViewProps = {
      roomDisplayName: "Room 104",
      hotelName: "Galle Fort Lighthouse Villa",
      receptionPhone: "+94912234567",
      whatsappPhone: "94771234567",
      reason: "CHECKED_OUT",
      language: "en",
      onContinueAsPrepaidGuest: () => undefined,
      onVerifyRoomCode: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(ExpiredRoomQrView, props));
    assert.ok(html.includes("Room 104"));
    assert.ok(html.includes("Stay Session Concluded"));
    assert.ok(html.includes("Galle Fort Lighthouse Villa"));
    assert.ok(html.includes("Browse Menu (Prepaid Only)"));
    assert.ok(html.includes("Checked in today? Enter Stay PIN"));
    assert.ok(html.includes("tel:+94912234567"));
    assert.ok(html.includes("wa.me/94771234567"));
  });

  it("renders in Sinhala language correctly", () => {
    const props: ExpiredRoomQrViewProps = {
      roomDisplayName: "Ocean Villa 02",
      language: "si",
      onContinueAsPrepaidGuest: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(ExpiredRoomQrView, props));
    assert.ok(html.includes("Ocean Villa 02"));
    assert.ok(html.includes("නවාතැන් සැසිය අවසන් වී ඇත"));
    assert.ok(html.includes("මෙනුව බලන්න (පෙරගෙවුම් පමණි)"));
  });

  it("renders in Tamil language correctly", () => {
    const props: ExpiredRoomQrViewProps = {
      roomDisplayName: "Suite 305",
      language: "ta",
      onContinueAsPrepaidGuest: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(ExpiredRoomQrView, props));
    assert.ok(html.includes("Suite 305"));
    assert.ok(html.includes("தங்குமிடம் அமர்வு முடிவடைந்தது"));
    assert.ok(html.includes("உணவுப் பட்டியலைக் காண்க (முன்பணம் மட்டும்)"));
  });

  it("omits PIN input box when onVerifyRoomCode is not provided", () => {
    const props: ExpiredRoomQrViewProps = {
      roomDisplayName: "Room 108",
      onContinueAsPrepaidGuest: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(ExpiredRoomQrView, props));
    assert.ok(!html.includes("Enter Stay PIN"));
  });

  it("validates type reasons are constructible", () => {
    const r1: ExpiredRoomReason = "CHECKED_OUT";
    const r2: ExpiredRoomReason = "SESSION_EXPIRED";
    const r3: ExpiredRoomReason = "VACANT_ROOM";
    const r4: ExpiredRoomReason = "INVALID_TOKEN";

    assert.strictEqual(r1, "CHECKED_OUT");
    assert.strictEqual(r2, "SESSION_EXPIRED");
    assert.strictEqual(r3, "VACANT_ROOM");
    assert.strictEqual(r4, "INVALID_TOKEN");
  });
});
