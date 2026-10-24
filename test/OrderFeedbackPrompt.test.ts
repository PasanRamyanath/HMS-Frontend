import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  COMPLIMENT_TAGS,
  ISSUE_TAGS,
  type OrderFeedbackPayload,
  OrderFeedbackPrompt,
  type OrderFeedbackPromptProps,
  getFeedbackText,
} from "../src/qr/OrderFeedbackPrompt.js";

describe("OrderFeedbackPrompt (Step 268)", () => {
  it("provides complete trilingual translations for en, si, ta", () => {
    const en = getFeedbackText("en");
    const si = getFeedbackText("si");
    const ta = getFeedbackText("ta");

    assert.ok(en.promptTitle.includes("meal"));
    assert.ok(si.promptTitle.includes("ආහාර"));
    assert.ok(ta.promptTitle.includes("உணவு"));

    assert.strictEqual(Object.keys(en.starLabels).length, 5);
    assert.strictEqual(Object.keys(si.starLabels).length, 5);
    assert.strictEqual(Object.keys(ta.starLabels).length, 5);

    assert.ok(en.managerAlertBannerTitle.includes("Manager"));
    assert.ok(si.managerAlertBannerTitle.includes("කළමනාකාර"));
    assert.ok(ta.managerAlertBannerTitle.includes("மேலாள"));
  });

  it("exports valid compliment and issue tags", () => {
    assert.ok(COMPLIMENT_TAGS.length >= 4);
    assert.ok(ISSUE_TAGS.length >= 4);
    assert.ok(COMPLIMENT_TAGS.some((t) => t.includes("Piping Hot")));
    assert.ok(ISSUE_TAGS.some((t) => t.includes("Slow")));
  });

  it("renders null when isOpen is false", () => {
    const props: OrderFeedbackPromptProps = {
      isOpen: false,
      orderId: "ORD-998877",
      roomNumber: "Ocean Villa 202",
      onClose: () => undefined,
      onSubmitFeedback: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(OrderFeedbackPrompt, props));
    assert.strictEqual(html, "");
  });

  it("renders open modal dialog sheet with 5-star praise view", () => {
    const props: OrderFeedbackPromptProps = {
      isOpen: true,
      orderId: "ORD-998877",
      roomNumber: "Ocean Villa 202",
      language: "en",
      onClose: () => undefined,
      onSubmitFeedback: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(OrderFeedbackPrompt, props));
    assert.ok(html.includes("Ocean Villa 202"));
    assert.ok(html.includes("ORD-998877".slice(-6)));
    assert.ok(html.includes("How was your meal?"));
    assert.ok(html.includes("Exceptional!"));
    assert.ok(html.includes("Loved your stay?"));
    assert.ok(html.includes("Piping Hot"));
  });

  it("renders in Sinhala language correctly", () => {
    const props: OrderFeedbackPromptProps = {
      isOpen: true,
      orderId: "ORD-112233",
      roomNumber: "Room 104",
      language: "si",
      onClose: () => undefined,
      onSubmitFeedback: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(OrderFeedbackPrompt, props));
    assert.ok(html.includes("ඔබගේ ආහාර වේල කෙසේද?"));
    assert.ok(html.includes("විශිෂ්ටයි!"));
  });

  it("renders in Tamil language correctly", () => {
    const props: OrderFeedbackPromptProps = {
      isOpen: true,
      orderId: "ORD-445566",
      roomNumber: "Villa 05",
      language: "ta",
      onClose: () => undefined,
      onSubmitFeedback: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(OrderFeedbackPrompt, props));
    assert.ok(html.includes("உங்கள் உணவு எவ்வாறு இருந்தது?"));
    assert.ok(html.includes("அருமை!"));
  });

  it("constructs valid OrderFeedbackPayload interface", () => {
    const payload: OrderFeedbackPayload = {
      orderId: "ORD-TEST-001",
      roomNumber: "Room 102",
      rating: 2,
      selectedTags: ["Food was Lukewarm", "Delivery was Slow"],
      comments: "Food arrived 40 minutes late and was cold",
      managerEscalated: true,
      submittedAt: new Date().toISOString(),
    };

    assert.strictEqual(payload.rating, 2);
    assert.strictEqual(payload.managerEscalated, true);
    assert.strictEqual(payload.selectedTags.length, 2);
  });
});
