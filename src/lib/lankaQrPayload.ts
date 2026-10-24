/**
 * Shared EMVCo LankaQR Payload Builder & CRC-16 Engine (src/lib/lankaQrPayload.ts)
 * Shared between Admin Settings/Folios and Guest Contactless QR ordering.
 * Zero dependency, pure TypeScript.
 */

export interface LankaQrInput {
 readonly merchantId: string;
 readonly merchantName: string;
 readonly merchantCity: string;
 readonly mcc?: string | undefined;
 readonly amountLkr?: number | undefined;
 readonly referenceId?: string | undefined;
 readonly isDynamic?: boolean | undefined;
}

export function formatTlv(tagId: string, value: string): string {
 const lenStr = String(value.length).padStart(2, "0");
 return `${tagId}${lenStr}${value}`;
}

export function crc16CcittFalse(payload: string): string {
 let crc = 0xffff;
 const len = payload.length;

 for (let i = 0; i < len; i++) {
 const charCode = payload.charCodeAt(i) & 0xff;
 crc ^= charCode << 8;

 for (let bit = 0; bit < 8; bit++) {
 if ((crc & 0x8000) !== 0) {
 crc = ((crc << 1) ^ 0x1021) & 0xffff;
 } else {
 crc = (crc << 1) & 0xffff;
 }
 }
 }

 return (crc >>> 0).toString(16).toUpperCase().padStart(4, "0");
}

export function buildLankaQrPayload(input: LankaQrInput): string {
 const isDynamic = input.isDynamic ?? (input.amountLkr !== undefined && input.amountLkr > 0);
 const mcc = input.mcc ?? "7011";
 const cleanName = input.merchantName.trim().slice(0, 25) || "HOTEL MERCHANT";
 const cleanCity = input.merchantCity.trim().slice(0, 15) || "COLOMBO";
 const cleanMid = input.merchantId.trim() || "000000000012345";

 let buffer = formatTlv("00", "01");
 buffer += formatTlv("01", isDynamic ? "12" : "11");

 const subtag00 = formatTlv("00", "COM.LANKAQR");
 const subtag01 = formatTlv("01", cleanMid);
 buffer += formatTlv("26", `${subtag00}${subtag01}`);

 buffer += formatTlv("52", mcc);
 buffer += formatTlv("53", "144"); // LKR currency code

 if (isDynamic && input.amountLkr !== undefined && input.amountLkr > 0) {
 const amountStr = input.amountLkr.toFixed(2);
 buffer += formatTlv("54", amountStr);
 }

 buffer += formatTlv("58", "LK");
 buffer += formatTlv("59", cleanName);
 buffer += formatTlv("60", cleanCity);

 if (input.referenceId && input.referenceId.trim().length > 0) {
 const refStr = input.referenceId.trim().slice(0, 25);
 const subtag05 = formatTlv("05", refStr);
 buffer += formatTlv("62", subtag05);
 }

 const payloadWithoutChecksum = `${buffer}6304`;
 const checksum = crc16CcittFalse(payloadWithoutChecksum);

 return `${payloadWithoutChecksum}${checksum}`;
}
