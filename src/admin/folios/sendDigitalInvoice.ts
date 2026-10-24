import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type DigitalDispatchChannel = "WHATSAPP" | "SMSGO" | "EMAIL" | "CLIPBOARD_COPY";

export interface DigitalInvoiceContext {
 readonly tenantId: string;
 readonly hotelName: string;
 readonly hotelPhone?: string | undefined;
 readonly invoiceId: string;
 readonly invoiceNumber: string;
 readonly invoiceDate: string;
 readonly guestFullName: string;
 readonly guestPhone94: string;
 readonly guestEmail?: string | undefined;
 readonly roomNumber: string;
 readonly grandTotalLkr: number;
 readonly balanceDueLkr: number;
 readonly isSettled: boolean;
 readonly cloudFrontCdnUrl?: string | undefined;
}

export interface DigitalInvoiceMessage {
 readonly plainText: string;
 readonly smsText: string;
 readonly invoiceUrl: string;
 readonly whatsappUrl: string;
 readonly mailtoUrl?: string | undefined;
}

export interface DigitalDispatchResult {
 readonly channel: DigitalDispatchChannel;
 readonly success: boolean;
 readonly destination: string;
 readonly message: DigitalInvoiceMessage;
 readonly dispatchedAt: string;
 readonly transactionId: string;
}

// ============================================================================
// Pure Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function normalizePhoneForWhatsApp(phone: string): string {
 const digits = phone.replace(/[^0-9]/g, "");
 if (digits.startsWith("0")) {
 return `94${digits.slice(1)}`;
 }
 if (digits.startsWith("94")) {
 return digits;
 }
 if (digits.length === 9) {
 return `94${digits}`;
 }
 return digits;
}

export function buildDigitalInvoiceUrl(
 tenantId: string,
 invoiceNumber: string,
 cdnDomain?: string,
): string {
 const domain = cdnDomain || "invoices.srilankahms.com";
 const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
 return `https://${cleanDomain}/${tenantId}/${invoiceNumber}.pdf`;
}

export function composeInvoiceTextMessage(
 context: DigitalInvoiceContext,
 invoiceUrl: string,
): string {
 const firstName = context.guestFullName.split(" ")[0] ?? context.guestFullName;
 const settlementStatus = context.isSettled
 ? "Fully Settled"
 : `Balance: ${formatLkr(context.balanceDueLkr)}`;

 return `Ayubowan ${firstName}, thank you for staying at ${context.hotelName}!\n\nTax Invoice: ${context.invoiceNumber}\nRoom: ${context.roomNumber}\nTotal: ${formatLkr(context.grandTotalLkr)} (${settlementStatus})\n\nView and download your official IRD tax invoice here:\n${invoiceUrl}\n\nWe look forward to welcoming you back to Sri Lanka!`;
}

export function composeSmsGoMessage(context: DigitalInvoiceContext, invoiceUrl: string): string {
 const settlementStatus = context.isSettled
 ? "Settled"
 : `Bal: ${formatLkr(context.balanceDueLkr)}`;
 return `${context.hotelName}: Invoice ${context.invoiceNumber} for ${formatLkr(context.grandTotalLkr)} (${settlementStatus}). Download: ${invoiceUrl}`;
}

export function buildWhatsAppDeepLink(recipientPhone: string, text: string): string {
 const normalizedPhone = normalizePhoneForWhatsApp(recipientPhone);
 return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
}

export function buildMailtoLink(email: string, subject: string, body: string): string {
 return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function formatDigitalInvoiceMessages(
 context: DigitalInvoiceContext,
): DigitalInvoiceMessage {
 const invoiceUrl = buildDigitalInvoiceUrl(
 context.tenantId,
 context.invoiceNumber,
 context.cloudFrontCdnUrl,
 );

 const plainText = composeInvoiceTextMessage(context, invoiceUrl);
 const smsText = composeSmsGoMessage(context, invoiceUrl);
 const whatsappUrl = buildWhatsAppDeepLink(context.guestPhone94, plainText);

 let mailtoUrl: string | undefined;
 if (context.guestEmail && context.guestEmail.trim().length > 0) {
 const subject = `${context.hotelName} - Tax Invoice ${context.invoiceNumber}`;
 mailtoUrl = buildMailtoLink(context.guestEmail.trim(), subject, plainText);
 }

 return {
 plainText,
 smsText,
 invoiceUrl,
 whatsappUrl,
 mailtoUrl,
 };
}

export function generateDispatchTransactionId(channel: DigitalDispatchChannel): string {
 const prefixMap: Record<DigitalDispatchChannel, string> = {
 WHATSAPP: "WA",
 SMSGO: "SMS",
 EMAIL: "EML",
 CLIPBOARD_COPY: "CPY",
 };
 const prefix = prefixMap[channel] ?? "MSG";
 const now = Date.now();
 return `TX-${prefix}-${now}`;
}

// ============================================================================
// Core Dispatch Execution: dispatchDigitalInvoice
// ============================================================================

export async function dispatchDigitalInvoice(
 context: DigitalInvoiceContext,
 channel: DigitalDispatchChannel,
 openWindow = true,
): Promise<DigitalDispatchResult> {
 const message = formatDigitalInvoiceMessages(context);
 const now = new Date().toISOString();
 const transactionId = generateDispatchTransactionId(channel);

 if (channel === "WHATSAPP") {
 if (openWindow && typeof window !== "undefined" && typeof window.open === "function") {
 window.open(message.whatsappUrl, "_blank", "noopener,noreferrer");
 }
 return {
 channel,
 success: true,
 destination: normalizePhoneForWhatsApp(context.guestPhone94),
 message,
 dispatchedAt: now,
 transactionId,
 };
 }

 if (channel === "SMSGO") {
 return {
 channel,
 success: true,
 destination: normalizePhoneForWhatsApp(context.guestPhone94),
 message,
 dispatchedAt: now,
 transactionId,
 };
 }

 if (channel === "EMAIL") {
 if (openWindow && message.mailtoUrl && typeof window !== "undefined") {
 window.location.href = message.mailtoUrl;
 }
 return {
 channel,
 success: Boolean(context.guestEmail),
 destination: context.guestEmail ?? "NO_EMAIL_PROVIDED",
 message,
 dispatchedAt: now,
 transactionId,
 };
 }

 // CLIPBOARD_COPY
 if (
 typeof navigator !== "undefined" &&
 navigator.clipboard &&
 typeof navigator.clipboard.writeText === "function"
 ) {
 await navigator.clipboard.writeText(message.invoiceUrl);
 }

 return {
 channel: "CLIPBOARD_COPY",
 success: true,
 destination: "CLIPBOARD",
 message,
 dispatchedAt: now,
 transactionId,
 };
}
