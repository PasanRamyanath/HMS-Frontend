import assert from "node:assert";
import { describe, it } from "node:test";
import {
  type DigitalDispatchChannel,
  type DigitalDispatchResult,
  type DigitalInvoiceContext,
  type DigitalInvoiceMessage,
  buildDigitalInvoiceUrl,
  buildMailtoLink,
  buildWhatsAppDeepLink,
  composeInvoiceTextMessage,
  composeSmsGoMessage,
  dispatchDigitalInvoice,
  formatDigitalInvoiceMessages,
  generateDispatchTransactionId,
  normalizePhoneForWhatsApp,
} from "../src/admin/folios/sendDigitalInvoice.js";

describe("Step 220: sendDigitalInvoice & WhatsApp / SMS Digital Link Sender", () => {
  const mockContext: DigitalInvoiceContext = {
    tenantId: "TENANT-LIGHTHOUSE",
    hotelName: "Jetwing Lighthouse Galle",
    hotelPhone: "+94912223744",
    invoiceId: "INV-2026-00410",
    invoiceNumber: "INV-2026-00410",
    invoiceDate: "2026-10-18T14:30:00Z",
    guestFullName: "Alexander von Humboldt",
    guestPhone94: "0771234567",
    guestEmail: "alexander@humboldt.de",
    roomNumber: "Ocean Villa 301",
    grandTotalLkr: 321948,
    balanceDueLkr: 0,
    isSettled: true,
  };

  describe("1. Phone Normalization & URL Builders", () => {
    it("normalizes Sri Lankan phone numbers for WhatsApp e164 international format without plus sign", () => {
      assert.strictEqual(normalizePhoneForWhatsApp("0771234567"), "94771234567");
      assert.strictEqual(normalizePhoneForWhatsApp("+94771234567"), "94771234567");
      assert.strictEqual(normalizePhoneForWhatsApp("94771234567"), "94771234567");
      assert.strictEqual(normalizePhoneForWhatsApp("771234567"), "94771234567");
      assert.strictEqual(normalizePhoneForWhatsApp("071 987 6543"), "94719876543");
    });

    it("builds canonical CloudFront digital invoice receipt PDF URLs", () => {
      const defaultUrl = buildDigitalInvoiceUrl("TENANT-LIGHTHOUSE", "INV-2026-00410");
      assert.strictEqual(
        defaultUrl,
        "https://invoices.srilankahms.com/TENANT-LIGHTHOUSE/INV-2026-00410.pdf",
      );

      const customCdnUrl = buildDigitalInvoiceUrl(
        "TENANT-LIGHTHOUSE",
        "INV-2026-00410",
        "https://cdn.jetwinghotels.com/assets",
      );
      assert.strictEqual(
        customCdnUrl,
        "https://cdn.jetwinghotels.com/assets/TENANT-LIGHTHOUSE/INV-2026-00410.pdf",
      );
    });

    it("constructs WhatsApp deep-link with URL-encoded greeting and invoice URL", () => {
      const waUrl = buildWhatsAppDeepLink(
        "0771234567",
        "Hello Alexander! Invoice link: https://test.com",
      );
      assert.ok(waUrl.startsWith("https://wa.me/94771234567?text="));
      assert.ok(waUrl.includes("Hello%20Alexander"));
    });

    it("constructs standard mailto: links with encoded subject and body", () => {
      const mailto = buildMailtoLink("guest@example.com", "Your Invoice", "Thank you!");
      assert.strictEqual(
        mailto,
        "mailto:guest@example.com?subject=Your%20Invoice&body=Thank%20you!",
      );
    });
  });

  describe("2. Message Composition & Formatting", () => {
    it("composes personalized trilingual-friendly WhatsApp invoice message", () => {
      const invoiceUrl = "https://invoices.srilankahms.com/TENANT-LIGHTHOUSE/INV-2026-00410.pdf";
      const message = composeInvoiceTextMessage(mockContext, invoiceUrl);

      assert.ok(message.includes("Ayubowan Alexander"));
      assert.ok(message.includes("Jetwing Lighthouse Galle"));
      assert.ok(message.includes("INV-2026-00410"));
      assert.ok(message.includes("Ocean Villa 301"));
      assert.ok(message.includes("Fully Settled"));
      assert.ok(message.includes(invoiceUrl));
    });

    it("composes concise single-segment SMS message for SMSGo gateway", () => {
      const invoiceUrl = "https://tiny.lk/inv-410";
      const sms = composeSmsGoMessage(mockContext, invoiceUrl);

      assert.ok(sms.includes("Jetwing Lighthouse Galle: Invoice INV-2026-00410"));
      assert.ok(sms.includes("Settled"));
      assert.ok(sms.includes(invoiceUrl));
      assert.ok(sms.length <= 160);
    });

    it("formats complete bundle of digital invoice messages", () => {
      const bundle: DigitalInvoiceMessage = formatDigitalInvoiceMessages(mockContext);

      assert.ok(bundle.plainText.includes("Ayubowan Alexander"));
      assert.ok(bundle.smsText.includes("INV-2026-00410"));
      assert.ok(bundle.invoiceUrl.endsWith(".pdf"));
      assert.ok(bundle.whatsappUrl.startsWith("https://wa.me/94771234567"));
      assert.ok(bundle.mailtoUrl?.startsWith("mailto:alexander@humboldt.de"));
    });
  });

  describe("3. Dispatch Engine Execution", () => {
    it("generates channel-specific transaction identifiers", () => {
      assert.ok(generateDispatchTransactionId("WHATSAPP").startsWith("TX-WA-"));
      assert.ok(generateDispatchTransactionId("SMSGO").startsWith("TX-SMS-"));
      assert.ok(generateDispatchTransactionId("EMAIL").startsWith("TX-EML-"));
      assert.ok(generateDispatchTransactionId("CLIPBOARD_COPY").startsWith("TX-CPY-"));
    });

    it("successfully dispatches WhatsApp digital invoice without error", async () => {
      const res: DigitalDispatchResult = await dispatchDigitalInvoice(
        mockContext,
        "WHATSAPP",
        false, // openWindow = false for unit tests
      );

      assert.strictEqual(res.channel, "WHATSAPP");
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.destination, "94771234567");
      assert.ok(res.message.whatsappUrl.includes("94771234567"));
      assert.ok(res.transactionId.startsWith("TX-WA-"));
      assert.ok(res.dispatchedAt);
    });

    it("successfully dispatches SMSGo digital invoice notification", async () => {
      const res = await dispatchDigitalInvoice(mockContext, "SMSGO", false);

      assert.strictEqual(res.channel, "SMSGO");
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.destination, "94771234567");
      assert.ok(res.message.smsText.includes("INV-2026-00410"));
      assert.ok(res.transactionId.startsWith("TX-SMS-"));
    });

    it("dispatches Email receipt and respects missing email fallback", async () => {
      const res = await dispatchDigitalInvoice(mockContext, "EMAIL", false);
      assert.strictEqual(res.channel, "EMAIL");
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.destination, "alexander@humboldt.de");

      // Without email
      const contextNoEmail: DigitalInvoiceContext = { ...mockContext, guestEmail: undefined };
      const resNoEmail = await dispatchDigitalInvoice(contextNoEmail, "EMAIL", false);
      assert.strictEqual(resNoEmail.success, false);
      assert.strictEqual(resNoEmail.destination, "NO_EMAIL_PROVIDED");
    });

    it("handles clipboard copy dispatch cleanly", async () => {
      const res = await dispatchDigitalInvoice(mockContext, "CLIPBOARD_COPY", false);
      assert.strictEqual(res.channel, "CLIPBOARD_COPY");
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.destination, "CLIPBOARD");
      assert.ok(res.message.invoiceUrl.endsWith(".pdf"));
    });

    it("verifies constructible types and interfaces", () => {
      const channel: DigitalDispatchChannel = "WHATSAPP";
      const message: DigitalInvoiceMessage = formatDigitalInvoiceMessages(mockContext);
      assert.strictEqual(channel, "WHATSAPP");
      assert.ok(message.invoiceUrl);
    });
  });
});
