import { DynamicTokenIcon } from "../components/SvgIcons.js";
/**
 * 1-Tap Express Housekeeping & Room Amenity Request Panel (ExpressHousekeepingTab.tsx)
 * Purpose-built for Sri Lankan hotels, resorts, and villas.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - 1-Tap instant request cards with vibrant icon badges & squircle shapes
 * - Presets: Make Up Room, DND, Extra Towels, Mineral Water, Mosquito Coil/Vaporizer, Bellboy Pickup
 * - Request urgency toggle (Normal vs Urgent)
 * - Custom note text field for guest specifications
 * - Active requests list with live progress pill indicators
 * - Audio confirmation via harmonic chime synthesizer
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12
 */

import { type FC, useId, useState } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";
import { playOrderBell } from "../lib/soundAlert.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type HousekeepingRequestType =
 | "MAKE_UP_ROOM"
 | "DO_NOT_DISTURB"
 | "EXTRA_TOWELS"
 | "BOTTLED_WATER"
 | "MOSQUITO_SHIELD"
 | "LUGGAGE_PICKUP"
 | "EXTRA_PILLOWS"
 | "TOILETRIES_KIT";

export type HousekeepingUrgency = "NORMAL" | "URGENT";

export type RequestStatus = "PENDING" | "DISPATCHED" | "COMPLETED";

export interface AmenityPreset {
 readonly type: HousekeepingRequestType;
 readonly icon: string;
 readonly defaultQuantity?: number | undefined;
}

export interface HousekeepingRequest {
 readonly id: string;
 readonly roomNumber: string;
 readonly type: HousekeepingRequestType;
 readonly urgency: HousekeepingUrgency;
 readonly status: RequestStatus;
 readonly requestedAt: string;
 readonly notes?: string | undefined;
 readonly quantity?: number | undefined;
}

export interface ExpressHousekeepingTabProps {
 /** Room or villa display name (e.g. "Room 104") */
 readonly roomNumber: string;
 /** Trilingual language selection */
 readonly language?: SupportedLanguage | undefined;
 /** External submission callback */
 readonly onRequestSubmitted?: (request: HousekeepingRequest) => void;
 /** Initial active requests for the room */
 readonly initialRequests?: ReadonlyArray<HousekeepingRequest> | undefined;
 /** Test identifier */
 readonly testId?: string | undefined;
}

export const AMENITY_PRESETS: ReadonlyArray<AmenityPreset> = [
 { type: "MAKE_UP_ROOM", icon: "Clean" },
 { type: "DO_NOT_DISTURB", icon: "86" },
 { type: "EXTRA_TOWELS", icon: "Steam", defaultQuantity: 2 },
 { type: "BOTTLED_WATER", icon: "Water", defaultQuantity: 2 },
 { type: "MOSQUITO_SHIELD", icon: "Eco" },
 { type: "LUGGAGE_PICKUP", icon: "Bag" },
 { type: "EXTRA_PILLOWS", icon: "Room", defaultQuantity: 2 },
 { type: "TOILETRIES_KIT", icon: "Bath", defaultQuantity: 1 },
];

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface PresetLocalization {
 readonly title: string;
 readonly subtitle: string;
}

interface HousekeepingTranslations {
 readonly headerTitle: string;
 readonly headerSubtitle: string;
 readonly expressPresetsHeading: string;
 readonly presets: Record<HousekeepingRequestType, PresetLocalization>;
 readonly urgencyLabel: string;
 readonly normalUrgency: string;
 readonly urgentUrgency: string;
 readonly customNotePlaceholder: string;
 readonly submitAction: string;
 readonly activeRequestsHeading: string;
 readonly noActiveRequests: string;
 readonly statusLabels: Record<RequestStatus, string>;
 readonly requestSuccessToast: string;
 readonly dndActiveNotice: string;
}

const HOUSEKEEPING_TRANSLATIONS: Record<SupportedLanguage, HousekeepingTranslations> = {
 en: {
 headerTitle: "Express Housekeeping & Amenities",
 headerSubtitle: "1-Tap requests dispatched directly to your floor butler runner.",
 expressPresetsHeading: "Instant Room Services",
 presets: {
 MAKE_UP_ROOM: {
 title: "Make Up Room",
 subtitle: "Full linen change, dusting, and room refresh.",
 },
 DO_NOT_DISTURB: {
 title: "Do Not Disturb",
 subtitle: "Privacy mode active; attendants will not knock.",
 },
 EXTRA_TOWELS: {
 title: "Fresh Towels",
 subtitle: "Clean plush bath and pool towels.",
 },
 BOTTLED_WATER: {
 title: "Mineral Water",
 subtitle: "Complimentary sealed Sri Lankan drinking water bottles.",
 },
 MOSQUITO_SHIELD: {
 title: "Mosquito Shield",
 subtitle: "Tropical vaporizer liquid refill or citronella incense.",
 },
 LUGGAGE_PICKUP: {
 title: "Luggage Assistance",
 subtitle: "Bellboy dispatch for check-out bags or porter service.",
 },
 EXTRA_PILLOWS: {
 title: "Extra Pillows",
 subtitle: "Hypoallergenic feather or microfibre sleeping pillows.",
 },
 TOILETRIES_KIT: {
 title: "Dental & Shaving Kit",
 subtitle: "Bamboo toothbrush, toothpaste, and luxury amenities.",
 },
 },
 urgencyLabel: "Urgency Level",
 normalUrgency: "Standard (Within 20 min)",
 urgentUrgency: "Express Urgent (Within 5-10 min)",
 customNotePlaceholder: "Add special instructions (e.g. please knock softly)...",
 submitAction: "Request Amenity",
 activeRequestsHeading: "Active Requests for This Room",
 noActiveRequests: "No pending requests. Room attendants stand ready.",
 statusLabels: {
 PENDING: "Received by Housekeeping",
 DISPATCHED: "Runner on the Way",
 COMPLETED: "Delivered & Done",
 },
 requestSuccessToast: "Request sent to floor runner!",
 dndActiveNotice: "Privacy 'Do Not Disturb' status has been activated for this room.",
 },
 si: {
 headerTitle: "ක්ෂණික කාමර සේවා සහ පහසුකම්",
 headerSubtitle: "බොත්තමක් එබීමෙන් කාර්ය මණ්ඩලයට සෘජුවම දැනුම් දෙන්න.",
 expressPresetsHeading: "ක්ෂණික කාමර ඉල්ලීම්",
 presets: {
 MAKE_UP_ROOM: {
 title: "කාමරය පිරිසිදු කරන්න",
 subtitle: "ඇඳ ඇතිරිලි මාරු කිරීම සහ කාමරය පිළිවෙල කිරීම.",
 },
 DO_NOT_DISTURB: {
 title: "බාධා නොකරන්න (DND)",
 subtitle: "පුද්ගලිකත්වය අවශ්යයි; සේවකයින් නොපැමිණේ.",
 },
 EXTRA_TOWELS: {
 title: "නැවුම් තුවා",
 subtitle: "පිරිසිදු නාන සහ පිහිනුම් තුවා ලබාගන්න.",
 },
 BOTTLED_WATER: {
 title: "පානීය ජල බෝතල්",
 subtitle: "නොමිලේ ලබාදෙන පිරිසිදු පානීය ජලය.",
 },
 MOSQUITO_SHIELD: {
 title: "මදුරු දඟර / වාෂ්පකාරක",
 subtitle: "රාත්රිය සඳහා මදුරු මර්දන පහසුකම්.",
 },
 LUGGAGE_PICKUP: {
 title: "ගමන් මලු සහාය",
 subtitle: "පිටවීමේදී ගමන් මලු රැගෙන යාමට සේවක සහාය.",
 },
 EXTRA_PILLOWS: {
 title: "අමතර කොට්ට",
 subtitle: "සුවපහසු අමතර නිදන කොට්ට.",
 },
 TOILETRIES_KIT: {
 title: "දත් බුරුසු / ආලේපන කට්ටලය",
 subtitle: "දත් බුරුසු, පේස්ට් සහ නාන කාමර ද්රව්ය.",
 },
 },
 urgencyLabel: "අවශ්යතාවයේ තරම",
 normalUrgency: "සාමාන්ය (විනාඩි 20 තුළ)",
 urgentUrgency: "කඩිනම් (විනාඩි 5-10 තුළ)",
 customNotePlaceholder: "විශේෂ සටහනක් ඇත්නම් මෙහි සටහන් කරන්න...",
 submitAction: "ඉල්ලීම යවන්න",
 activeRequestsHeading: "මෙම කාමරය සඳහා වන සක්රිය ඉල්ලීම්",
 noActiveRequests: "පොරොත්තු ඉල්ලීම් නොමැත.",
 statusLabels: {
 PENDING: "කාර්ය මණ්ඩලයට ලැබිණි",
 DISPATCHED: "සේවකයා කාමරයට පැමිණෙමින්",
 COMPLETED: "සම්පූර්ණයි",
 },
 requestSuccessToast: "සේවක සහාය ඉල්ලීම සාර්ථකව යවන ලදී!",
 dndActiveNotice: "'බාධා නොකරන්න' තත්ත්වය සක්රිය කරන ලදී.",
 },
 ta: {
 headerTitle: "துரித அறை பராமரிப்பு & வசதிகள்",
 headerSubtitle: "ஒரு தொடுதலில் பணியாளருக்கு நேரடியாக அறிவிக்கவும்.",
 expressPresetsHeading: "துரித அறை சேவைகள்",
 presets: {
 MAKE_UP_ROOM: {
 title: "அறையை சுத்தம் செய்க",
 subtitle: "விரிப்புகள் மாற்றுதல் மற்றும் அறையைச் சீரமைத்தல்.",
 },
 DO_NOT_DISTURB: {
 title: "தொந்தரவு செய்ய வேண்டாம்",
 subtitle: "தனிமை நிலை; பணியாளர்கள் அழைக்க மாட்டார்கள்.",
 },
 EXTRA_TOWELS: {
 title: "கூடுதல் துண்டுகள்",
 subtitle: "புதிய குளியல் மற்றும் நீச்சல் துண்டுகள்.",
 },
 BOTTLED_WATER: {
 title: "குடிநீர் பாட்டில்கள்",
 subtitle: "இலவச இலங்கை சுத்திகரிக்கப்பட்ட குடிநீர்.",
 },
 MOSQUITO_SHIELD: {
 title: "கொசு விரட்டி",
 subtitle: "இரவு நேர கொசு பாதுகாப்பு சாதனங்கள்.",
 },
 LUGGAGE_PICKUP: {
 title: "சாமான்கள் உதவி",
 subtitle: "சாமான்களை எடுத்துச் செல்ல பணியாளர் உதவி.",
 },
 EXTRA_PILLOWS: {
 title: "கூடுதல் தலையணைகள்",
 subtitle: "வசதியான கூடுதல் தூக்க தலையணைகள்.",
 },
 TOILETRIES_KIT: {
 title: "பல் துலக்கும் பொருட்கள்",
 subtitle: "பல் துலக்கி, பற்பசை மற்றும் குளியல் பொருட்கள்.",
 },
 },
 urgencyLabel: "அவசர நிலை",
 normalUrgency: "வழக்கமான (20 நிமிடத்திற்குள்)",
 urgentUrgency: "மிக அவசரம் (5-10 நிமிடத்திற்குள்)",
 customNotePlaceholder: "சிறப்புக் குறிப்புகள் ஏதேனும் இருப்பின் குறிப்பிடவும்...",
 submitAction: "கோரிக்கையை அனுப்புக",
 activeRequestsHeading: "இந்த அறைக்கான செயலில் உள்ள கோரிக்கைகள்",
 noActiveRequests: "செயலில் உள்ள கோரிக்கைகள் இல்லை.",
 statusLabels: {
 PENDING: "கோரிக்கை பெறப்பட்டது",
 DISPATCHED: "பணியாளர் வந்து கொண்டிருக்கிறார்",
 COMPLETED: "நிறைவடைந்தது",
 },
 requestSuccessToast: "கோரிக்கை வெற்றிகரமாக அனுப்பப்பட்டது!",
 dndActiveNotice: "'தொந்தரவு செய்ய வேண்டாம்' நிலை செயல்படுத்தப்பட்டது.",
 },
};

export function getHousekeepingText(lang: SupportedLanguage = "en"): HousekeepingTranslations {
 return HOUSEKEEPING_TRANSLATIONS[lang] ?? HOUSEKEEPING_TRANSLATIONS.en;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function createHousekeepingRequest(
 roomNumber: string,
 type: HousekeepingRequestType,
 urgency: HousekeepingUrgency = "NORMAL",
 notes?: string,
 quantity?: number,
): HousekeepingRequest {
 const timestamp = Date.now().toString(36).toUpperCase().slice(-5);
 return {
 id: `HK-${type}-${timestamp}`,
 roomNumber,
 type,
 urgency,
 status: "PENDING",
 requestedAt: new Date().toISOString(),
 notes: notes?.trim() || undefined,
 quantity,
 };
}

export function getStatusBadgeClass(status: RequestStatus): string {
 switch (status) {
 case "PENDING":
 return "bg-amber-500/20 text-amber-800 border-amber-500/30";
 case "DISPATCHED":
 return "bg-sky-500/20 text-sky-800 border-sky-500/30";
 case "COMPLETED":
 return "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/30";
 }
}

// ============================================================================
// Main Component Implementation
// ============================================================================

export const ExpressHousekeepingTab: FC<ExpressHousekeepingTabProps> = ({
 roomNumber,
 language = "en",
 onRequestSubmitted,
 initialRequests = [],
 testId = "express-housekeeping-tab",
}) => {
 const [requests, setRequests] = useState<ReadonlyArray<HousekeepingRequest>>(initialRequests);
 const [selectedPreset, setSelectedPreset] = useState<HousekeepingRequestType>("EXTRA_TOWELS");
 const [urgency, setUrgency] = useState<HousekeepingUrgency>("NORMAL");
 const [customNotes, setCustomNotes] = useState<string>("");
 const [isDndActive, setIsDndActive] = useState<boolean>(false);
 const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

 const headingId = useId();
 const notesInputId = useId();
 const t = getHousekeepingText(language);

 const handle1TapPreset = (preset: AmenityPreset) => {
 setSelectedPreset(preset.type);
 if (preset.type === "DO_NOT_DISTURB") {
 setIsDndActive((prev) => !prev);
 playOrderBell("PAYMENT_CONFIRMED");
 setFeedbackToast(t.dndActiveNotice);
 setTimeout(() => setFeedbackToast(null), 3500);
 return;
 }

 const newReq = createHousekeepingRequest(
 roomNumber,
 preset.type,
 urgency,
 customNotes,
 preset.defaultQuantity,
 );

 setRequests((prev) => [newReq, ...prev]);
 playOrderBell("NEW_ORDER");
 setFeedbackToast(t.requestSuccessToast);
 setCustomNotes("");
 if (onRequestSubmitted) {
 onRequestSubmitted(newReq);
 }
 setTimeout(() => setFeedbackToast(null), 3000);
 };

 const handleManualSubmit = () => {
 const preset = AMENITY_PRESETS.find((p) => p.type === selectedPreset);
 if (preset) {
 handle1TapPreset(preset);
 }
 };

 return (
 <div data-testid={testId} className="w-full max-w-xl mx-auto space-y-4 pb-12 animate-fade-in">
 {/* Header Banner */}
 <div className="flex items-center justify-between px-1">
 <div>
 <span className="text-[11px] font-bold text-sky-500 tracking-wider uppercase">
 {roomNumber}
 </span>
 <h2
 id={headingId}
 className="text-lg sm:text-xl font-black text-slate-900 "
 >
 {t.headerTitle}
 </h2>
 <p className="text-xs text-slate-500 mt-0.5">{t.headerSubtitle}</p>
 </div>

 {isDndActive && (
 <div className="px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-800 text-xs font-bold flex items-center gap-1.5 animate-pulse">
 <span>86</span>
 <span>DND</span>
 </div>
 )}
 </div>

 {/* Floating Instant Feedback Toast */}
 {feedbackToast && (
 <div className="p-3.5 rounded-2xl bg-emerald-600/90 text-white font-bold text-xs flex items-center justify-between shadow-lg backdrop-blur-md animate-fade-in">
 <div className="flex items-center gap-2">
 <span>{feedbackToast}</span>
 </div>
 <button
 type="button"
 onClick={() => setFeedbackToast(null)}
 className="text-slate-700 hover:text-slate-900 text-sm"
 >
 x
 </button>
 </div>
 )}

 {/* 1-Tap Express Amenity Cards Grid */}
 <div className="space-y-2">
 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
 {t.expressPresetsHeading}
 </h3>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
 {AMENITY_PRESETS.map((preset) => {
 const isDndSelected = preset.type === "DO_NOT_DISTURB" && isDndActive;
 const isPresetActive = selectedPreset === preset.type;
 const loc = t.presets[preset.type];

 return (
 <button
 key={preset.type}
 type="button"
 onClick={() => handle1TapPreset(preset)}
 className={`p-3 rounded-2xl text-left transition-all duration-300 ease-apple-spring flex flex-col justify-between min-h-[96px] cursor-pointer border ${
 isDndSelected
 ? "bg-rose-500/20 border-rose-500/40 text-rose-800 ring-2 ring-rose-500/50"
 : isPresetActive
 ? "apple-liquid-glass bg-sky-500/15 border-sky-500/40 text-white ring-1 ring-sky-400/40"
 : "apple-liquid-glass bg-white border-slate-200 hover:border-sky-500/30 text-slate-900 "
 }`}
 >
 <div className="flex items-center justify-between w-full">
 <span className="text-2xl"><DynamicTokenIcon token={preset.icon} /></span>
 {preset.defaultQuantity && (
 <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 ">
 ×{preset.defaultQuantity}
 </span>
 )}
 </div>

 <div className="mt-2">
 <p className="text-xs font-bold line-clamp-1">{loc.title}</p>
 <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
 {loc.subtitle}
 </p>
 </div>
 </button>
 );
 })}
 </div>
 </div>

 {/* Urgency & Notes Customizer Card */}
 <div className="p-4 rounded-2xl apple-liquid-glass bg-white border border-slate-200 shadow-md space-y-3">
 {/* Urgency Segmented Control */}
 <div>
 <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
 {t.urgencyLabel}
 </span>
 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => setUrgency("NORMAL")}
 className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 min-h-[44px] cursor-pointer border ${
 urgency === "NORMAL"
 ? "bg-sky-600 text-white border-sky-600 shadow-sm"
 : "bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200 "
 }`}
 >
 {t.normalUrgency}
 </button>
 <button
 type="button"
 onClick={() => setUrgency("URGENT")}
 className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 min-h-[44px] cursor-pointer border ${
 urgency === "URGENT"
 ? "bg-amber-600 text-white border-amber-600 shadow-sm"
 : "bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200 "
 }`}
 >
 {t.urgentUrgency}
 </button>
 </div>
 </div>

 {/* Custom Special Instructions */}
 <div>
 <label
 htmlFor={notesInputId}
 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5"
 >
 Special Instructions (Optional)
 </label>
 <div className="flex gap-2">
 <input
 id={notesInputId}
 type="text"
 value={customNotes}
 onChange={(e) => setCustomNotes(e.target.value)}
 placeholder={t.customNotePlaceholder}
 className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
 />
 <button
 type="button"
 onClick={handleManualSubmit}
 className="px-4 py-2.5 rounded-xl bg-[#E8772E] hover:bg-[#d46720] text-white text-xs font-bold transition-all duration-300 min-h-[44px] cursor-pointer whitespace-nowrap shadow-md"
 >
 {t.submitAction}
 </button>
 </div>
 </div>
 </div>

 {/* Active Requests List for Room */}
 <div className="space-y-2">
 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
 {t.activeRequestsHeading}
 </h3>

 {requests.length === 0 ? (
 <div className="p-4 rounded-2xl apple-liquid-glass bg-white border border-slate-200 text-center text-xs text-slate-500 ">
 {t.noActiveRequests}
 </div>
 ) : (
 <div className="space-y-2">
 {requests.map((req) => {
 const preset = AMENITY_PRESETS.find((p) => p.type === req.type);
 const loc = t.presets[req.type];
 const badgeClass = getStatusBadgeClass(req.status);

 return (
 <div
 key={req.id}
 className="p-3.5 rounded-2xl apple-liquid-glass bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-3 text-xs"
 >
 <div className="flex items-center gap-3">
 <span className="text-xl">{preset?.icon ?? "Bell"}</span>
 <div>
 <p className="font-bold text-slate-900 ">
 {loc?.title ?? req.type}
 {req.quantity && req.quantity > 1 ? ` (×${req.quantity})` : ""}
 {req.urgency === "URGENT" && (
 <span className="ml-1.5 text-amber-500 font-extrabold"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span className="sr-only">Fast</span></span>
 )}
 </p>
 {req.notes && (
 <p className="text-[11px] text-slate-500 italic">
 “{req.notes}”
 </p>
 )}
 </div>
 </div>

 <span
 className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeClass}`}
 >
 {t.statusLabels[req.status] ?? req.status}
 </span>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 );
};
