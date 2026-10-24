/**
 * Trilingual Localization Engine for Sri Lankan Cloud SaaS HMS & Guest QR Platform.
 * Supports English (en), Sinhala (si / සිංහල), and Tamil (ta / தமிழ்).
 * Includes optical line-height and typography tuning to prevent Sinhala/Tamil script clipping.
 */

import { useSyncExternalStore } from "react";

export type SupportedLanguage = "en" | "si" | "ta";

export interface LanguageInfo {
 readonly code: SupportedLanguage;
 readonly label: string;
 readonly nativeLabel: string;
 readonly fontFamily: string;
 readonly pillLineHeightClass: string;
}

export const SUPPORTED_LANGUAGES: Readonly<Record<SupportedLanguage, LanguageInfo>> = {
 en: {
 code: "en",
 label: "English",
 nativeLabel: "English",
 fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', sans-serif",
 pillLineHeightClass: "leading-normal",
 },
 si: {
 code: "si",
 label: "Sinhala",
 nativeLabel: "සිංහල",
 fontFamily:
 "'Noto Sans Sinhala', 'Iskoola Pota', -apple-system, BlinkMacSystemFont, sans-serif",
 pillLineHeightClass: "leading-relaxed py-0.5",
 },
 ta: {
 code: "ta",
 label: "Tamil",
 nativeLabel: "தமிழ்",
 fontFamily: "'Noto Sans Tamil', 'Latha', -apple-system, BlinkMacSystemFont, sans-serif",
 pillLineHeightClass: "leading-relaxed py-0.5",
 },
};

export const DICTIONARY = {
 // Navigation & General
 welcome: {
 en: "Welcome",
 si: "ආයුබෝවන්",
 ta: "வணக்கம்",
 },
 roomService: {
 en: "Room Service",
 si: "කාමර සේවාව",
 ta: "அறை சேவை",
 },
 loading: {
 en: "Loading…",
 si: "පූරණය වෙමින් පවතී…",
 ta: "ஏற்றுகிறது…",
 },
 pleaseWait: {
 en: "Please wait",
 si: "කරුණාකර රැඳී සිටින්න",
 ta: "தயவுசெய்து காத்திருக்கவும்",
 },
 retry: {
 en: "Retry",
 si: "නැවත උත්සාහ කරන්න",
 ta: "மீண்டும் முயற்சிக்கவும்",
 },
 cancel: {
 en: "Cancel",
 si: "අවලංගු කරන්න",
 ta: "ரத்து செய்",
 },
 confirm: {
 en: "Confirm",
 si: "තහවුරු කරන්න",
 ta: "உறுதிப்படுத்துக",
 },
 success: {
 en: "Success",
 si: "සාර්ථකයි",
 ta: "வெற்றி",
 },
 error: {
 en: "Error",
 si: "දෝෂයකි",
 ta: "பிழை",
 },

 // QR Guest Ordering & Menu
 browseMenu: {
 en: "Browse Menu",
 si: "මෙනුව බලන්න",
 ta: "மெனுவை பார்க்கவும்",
 },
 categories: {
 en: "Categories",
 si: "කාණ්ඩ",
 ta: "பிரிவுகள்",
 },
 popularDishes: {
 en: "Popular Dishes",
 si: "ජනප්රිය ආහාර",
 ta: "பிரபலமான உணவுகள்",
 },
 addToCart: {
 en: "Add to Order",
 si: "ඇණවුමට එකතු කරන්න",
 ta: "ஆர்டரில் சேர்க்கவும்",
 },
 specialInstructions: {
 en: "Special Instructions",
 si: "විශේෂ උපදෙස්",
 ta: "சிறப்பு வழிமுறைகள்",
 },
 spiceLevel: {
 en: "Spice Level",
 si: "සැර ප්රමාණය",
 ta: "கார அளவு",
 },
 mild: {
 en: "Mild",
 si: "අඩු සැර",
 ta: "குறைந்த காரம்",
 },
 medium: {
 en: "Medium",
 si: "මධ්යම සැර",
 ta: "நடுத்தர காரம்",
 },
 spicy: {
 en: "Sri Lankan Spicy",
 si: "ලංකාවේ සැර",
 ta: "இலங்கை காரம்",
 },

 // Cart & Checkout
 yourCart: {
 en: "Your Order",
 si: "ඔබේ ඇණවුම",
 ta: "உங்கள் ஆர்டர்",
 },
 placeOrder: {
 en: "Place Order",
 si: "ඇණවුම යොමු කරන්න",
 ta: "ஆர்டர் செய்யவும்",
 },
 orderSummary: {
 en: "Order Summary",
 si: "ඇණවුම් සාරාංශය",
 ta: "ஆர்டர் சுருக்கம்",
 },
 subtotal: {
 en: "Subtotal",
 si: "අතුරු එකතුව",
 ta: "உப மொத்தம்",
 },
 serviceCharge: {
 en: "10% Service Charge",
 si: "10% සේවා ගාස්තුව",
 ta: "10% சேவை கட்டணம்",
 },
 statutoryTaxes: {
 en: "Taxes (TDL/SSCL/VAT)",
 si: "නීතිමය බදු (TDL/SSCL/VAT)",
 ta: "சட்டப்பூர்வ வரிகள் (TDL/SSCL/VAT)",
 },
 totalAmount: {
 en: "Total",
 si: "මුළු එකතුව",
 ta: "மொத்தம்",
 },
 billToRoom: {
 en: "Bill to Room Folio",
 si: "කාමර ගිණුමට එක් කරන්න",
 ta: "அறை கணக்கில் சேர்க்கவும்",
 },
 payLankaQr: {
 en: "Pay with LankaQR",
 si: "LankaQR මඟින් ගෙවන්න",
 ta: "LankaQR மூலம் செலுத்தவும்",
 },
 scanLankaQrPrompt: {
 en: "Scan with any Sri Lankan banking app",
 si: "ඕනෑම ශ්රී ලාංකික බැංකු යෙදුමකින් ස්කෑන් කරන්න",
 ta: "எந்தவொரு இலங்கை வங்கி செயலியிலும் ஸ்கேன் செய்யவும்",
 },

 // Order Status
 orderPlaced: {
 en: "Order Placed",
 si: "ඇණවුම බාරගන්නා ලදී",
 ta: "ஆர்டர் வைக்கப்பட்டது",
 },
 kitchenPreparing: {
 en: "Kitchen is Preparing",
 si: "මුළුතැන්ගෙයි පිළියෙල කරමින් පවතී",
 ta: "சமையலறையில் தயாராகிறது",
 },
 orderOnTheWay: {
 en: "Order is on the Way",
 si: "ඇණවුම රැගෙන එමින් පවතී",
 ta: "ஆர்டர் வழியில் உள்ளது",
 },
 orderDelivered: {
 en: "Order Delivered",
 si: "ඇණවුම භාරදෙන ලදී",
 ta: "ஆர்டர் வழங்கப்பட்டது",
 },

 // Housekeeping & Amenities
 housekeeping: {
 en: "Housekeeping",
 si: "කාමර පිරිසිදු කිරීම්",
 ta: "அறை பராமரிப்பு",
 },
 requestCleaning: {
 en: "Request Room Cleaning",
 si: "කාමරය පිරිසිදු කිරීමට ඉල්ලන්න",
 ta: "அறை சுத்தம் செய்யக் கோரவும்",
 },
 extraTowels: {
 en: "Fresh Towels",
 si: "අමතර තුවා",
 ta: "கூடுதல் துண்டுகள்",
 },
 drinkingWater: {
 en: "Bottled Water",
 si: "පානීය ජල බෝතල්",
 ta: "குடிநீர் பாட்டில்கள்",
 },
 callWaiter: {
 en: "Call Server / Assistance",
 si: "සේවකයෙකු අමතන්න",
 ta: "பணியாளரை அழைக்கவும்",
 },

 // KDS & Kitchen Controls
 kdsTitle: {
 en: "Kitchen Display System (KDS)",
 si: "මුළුතැන්ගෙයි තිරය (KDS)",
 ta: "சமையலறை காட்சி திரை (KDS)",
 },
 markReady: {
 en: "Mark as Ready",
 si: "සූදානම් ලෙස සලකුණු කරන්න",
 ta: "தயார் என குறிக்கவும்",
 },
 bumpOrder: {
 en: "Complete / Bump",
 si: "සම්පූර්ණ කර ඉවත් කරන්න",
 ta: "முடிக்கப்பட்டது",
 },

 // Shift & Cashier
 morningShift: {
 en: "Morning Shift",
 si: "උදෑසන මුරය",
 ta: "காலை முறை",
 },
 eveningShift: {
 en: "Evening Shift",
 si: "සවස මුරය",
 ta: "மாலை முறை",
 },
 nightShift: {
 en: "Night Shift",
 si: "රාත්රී මුරය",
 ta: "இரவு முறை",
 },
} as const;

export type TranslationKey = keyof typeof DICTIONARY;

let currentLanguage: SupportedLanguage = "en";
const listeners = new Set<() => void>();

function notifyLanguageListeners(): void {
 for (const listener of listeners) {
 listener();
 }
}

export function getCurrentLanguage(): SupportedLanguage {
 return currentLanguage;
}

export function setLanguage(newLang: SupportedLanguage): void {
 if (currentLanguage !== newLang && (newLang === "en" || newLang === "si" || newLang === "ta")) {
 currentLanguage = newLang;
 if (typeof localStorage !== "undefined") {
 try {
 localStorage.setItem("hms_lang", newLang);
 } catch {
 // no-op for privacy or storage-disabled environments
 }
 }
 notifyLanguageListeners();
 }
}

export function subscribeLanguage(listener: () => void): () => void {
 listeners.add(listener);
 return () => {
 listeners.delete(listener);
 };
}

function readSavedLanguage(): SupportedLanguage | null {
 if (typeof localStorage === "undefined") return null;
 try {
 const saved = localStorage.getItem("hms_lang");
 if (saved === "en" || saved === "si" || saved === "ta") {
 return saved;
 }
 } catch {
 // storage unavailable
 }
 return null;
}

function detectNavigatorLanguage(): SupportedLanguage | null {
 if (typeof navigator === "undefined" || !navigator.languages) return null;
 for (const lang of navigator.languages) {
 if (lang.startsWith("si")) return "si";
 if (lang.startsWith("ta")) return "ta";
 }
 return null;
}

/**
 * Initializes language from saved localStorage or browser navigator settings.
 */
export function initLanguage(): SupportedLanguage {
 const saved = readSavedLanguage();
 if (saved) {
 currentLanguage = saved;
 return saved;
 }
 const detected = detectNavigatorLanguage();
 currentLanguage = detected ?? "en";
 return currentLanguage;
}

/**
 * Translates a key with optional dynamic template variable interpolation.
 * Example: t("welcome") -> "ආයුබෝවන්"
 */
export function t(
 key: TranslationKey,
 params?: Record<string, string | number>,
 explicitLang?: SupportedLanguage,
): string {
 const lang = explicitLang ?? currentLanguage;
 const entry = DICTIONARY[key];
 if (!entry) {
 return String(key);
 }

 let text: string = entry[lang] ?? entry.en ?? String(key);

 if (params) {
 for (const [k, val] of Object.entries(params)) {
 text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(val));
 }
 }

 return text;
}

/**
 * Optical typography styling classes that prevent Sinhala/Tamil script clipping
 * inside Apple Liquid Glass pills, badges, and segmented controls.
 */
export function getScriptOpticalClasses(lang?: SupportedLanguage): {
 readonly lineHeightClass: string;
 readonly fontFamilyStyle: string;
 readonly isIndicScript: boolean;
} {
 const active = lang ?? currentLanguage;
 const isIndic = active === "si" || active === "ta";
 return {
 lineHeightClass: isIndic ? "leading-relaxed py-0.5" : "leading-normal",
 fontFamilyStyle: SUPPORTED_LANGUAGES[active].fontFamily,
 isIndicScript: isIndic,
 };
}

/**
 * Formats a currency value with Sri Lankan Rupee (LKR) tabular number standards.
 */
export function formatLkr(amount: number): string {
 const formatted = new Intl.NumberFormat("en-LK", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(amount);
 return `LKR ${formatted}`;
}

/**
 * Calculates indicative USD estimate from LKR based on current exchange rate.
 */
export function formatUsdEstimate(amountLkr: number, rate = 310): string {
 const usd = amountLkr / rate;
 return `~$${usd.toFixed(2)}`;
}

export interface UseTranslationResult {
 readonly currentLanguage: SupportedLanguage;
 readonly setLanguage: (lang: SupportedLanguage) => void;
 readonly t: (key: TranslationKey, params?: Record<string, string | number>) => string;
 readonly opticalClasses: {
 readonly lineHeightClass: string;
 readonly fontFamilyStyle: string;
 readonly isIndicScript: boolean;
 };
}

/**
 * React hook for accessing current language and responsive translation function.
 */
export function useTranslation(): UseTranslationResult {
 const lang = useSyncExternalStore<SupportedLanguage>(
 subscribeLanguage,
 getCurrentLanguage,
 () => "en",
 );

 return {
 currentLanguage: lang,
 setLanguage,
 t: (key, params) => t(key, params, lang),
 opticalClasses: getScriptOpticalClasses(lang),
 };
}
