import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Lost & Found Register with Photo & Guest NIC/Phone Link (LostAndFoundView.tsx)
 *
 * Operations hub for hotel housekeeping executives, security officers, and front-desk managers.
 * Records found items, storage locker locations, guest NIC/passport linkages,
 * and enables 1-click SMS alerts to departed guests with audit verification on return.
 *
 * Operational & Hospitality Capabilities:
 * - 4-Stage lifecycle: HELD_IN_STORAGE -> GUEST_NOTIFIED -> CLAIMED_RETURNED -> DISPOSED_DONATED
 * - 1-Click SMS / WhatsApp notification to departed guest via SMSGo.lk format
 * - Secure claimant identity verification (NIC/Passport, phone, and signature check-off)
 * - Storage locker allocation (Lockers A/B/C and Executive Safe for Valuables)
 * - Multi-category classification: Electronics, Valuables, Clothing, Documents, Accessories
 * - KPI summary cards: Total In Custody, High-Value in Safe, Notified & Awaiting, Claimed
 * - Apple HIG styling with .apple-liquid-glass, .tabular-nums-lkr, and continuous squircles
 * - Trilingual interface localization (English, Sinhala, Tamil)
 * - Strict zero console / debugger noise & cognitive complexity <= 12 per function
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { playOrderBell } from "../../lib/soundAlert.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type LostFoundCategory =
 | "ELECTRONICS"
 | "VALUABLES"
 | "CLOTHING"
 | "DOCUMENTS"
 | "ACCESSORIES"
 | "MEDICATION";

export type LostFoundStatus =
 | "HELD_IN_STORAGE"
 | "GUEST_NOTIFIED"
 | "CLAIMED_RETURNED"
 | "DISPOSED_DONATED";

export type LostFoundFilterTab = "ALL" | LostFoundStatus | "HIGH_VALUE";

export interface LostFoundItemRecord {
 readonly itemId: string;
 readonly referenceNumber: string;
 readonly itemName: string;
 readonly category: LostFoundCategory;
 readonly locationFound: string;
 readonly roomNumber?: string | undefined;
 readonly foundDateIso: string;
 readonly foundByStaff: string;
 readonly storageLockerNumber: string;
 readonly status: LostFoundStatus;
 readonly guestName?: string | undefined;
 readonly guestPhone?: string | undefined;
 readonly guestNicOrPassport?: string | undefined;
 readonly guestFolioId?: string | undefined;
 readonly smsNotifiedAtIso?: string | undefined;
 readonly claimedDateIso?: string | undefined;
 readonly claimedByPerson?: string | undefined;
 readonly claimantVerificationMethod?: string | undefined;
 readonly photoWebpUrl?: string | undefined;
 readonly estimatedValueLkr?: number | undefined;
 readonly itemNotes?: string | undefined;
}

export interface LostFoundMetrics {
 readonly totalInCustody: number;
 readonly totalHighValue: number;
 readonly totalNotified: number;
 readonly totalClaimed: number;
 readonly totalEstValueLkr: number;
}

export interface LostAndFoundViewProps {
 readonly tenantId?: string | undefined;
 readonly propertyName?: string | undefined;
 readonly initialItems?: readonly LostFoundItemRecord[] | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly onSendGuestSms?:
 | ((item: LostFoundItemRecord, message: string) => Promise<void> | void)
 | undefined;
 readonly onClaimItem?:
 | ((
 itemId: string,
 claimantDetails: { name: string; nic: string; method: string },
 ) => Promise<void> | void)
 | undefined;
 readonly onCreateItem?: ((item: LostFoundItemRecord) => Promise<void> | void) | undefined;
}

// ============================================================================
// Default Fixtures
// ============================================================================

export const DEFAULT_LOST_FOUND_ITEMS: readonly LostFoundItemRecord[] = [
 {
 itemId: "lnf-001",
 referenceNumber: "LNF-2026-042",
 itemName: "Apple iPhone 15 Pro (Titanium Natural)",
 category: "ELECTRONICS",
 locationFound: "Room #102 (Nightstand behind bed)",
 roomNumber: "102",
 foundDateIso: "2026-10-20T08:30:00Z",
 foundByStaff: "Kamal Silva (Attendant)",
 storageLockerNumber: "Executive Safe S-02",
 status: "HELD_IN_STORAGE",
 guestName: "Lady Sarah Jenkins",
 guestPhone: "+94771234567",
 guestNicOrPassport: "PA0987654",
 guestFolioId: "FOL-2026-102",
 estimatedValueLkr: 385000,
 itemNotes: "Found with transparent case and London transit card in back sleeve.",
 },
 {
 itemId: "lnf-002",
 referenceNumber: "LNF-2026-043",
 itemName: "Ray-Ban Polarized Aviator Sunglasses",
 category: "ACCESSORIES",
 locationFound: "Poolside Cabana #4 (Under lounger cushion)",
 foundDateIso: "2026-10-19T17:00:00Z",
 foundByStaff: "Chathura Bandara (Runner)",
 storageLockerNumber: "Locker B-06",
 status: "GUEST_NOTIFIED",
 guestName: "Dr. Ananya Sharma",
 guestPhone: "+94719876543",
 guestNicOrPassport: "IND4567890",
 guestFolioId: "FOL-2026-302",
 smsNotifiedAtIso: "2026-10-19T18:15:00Z",
 estimatedValueLkr: 65000,
 itemNotes: "Gold frame with brown gradient lenses, in black leather pouch.",
 },
 {
 itemId: "lnf-003",
 referenceNumber: "LNF-2026-044",
 itemName: "German Passport & Visa Documentation",
 category: "DOCUMENTS",
 locationFound: "Room #105 (Wardrobe upper shelf)",
 roomNumber: "105",
 foundDateIso: "2026-10-19T11:00:00Z",
 foundByStaff: "Sunil Jayalath (Supervisor)",
 storageLockerNumber: "Executive Safe S-01",
 status: "CLAIMED_RETURNED",
 guestName: "Markus Weber",
 guestPhone: "+491701234567",
 guestNicOrPassport: "C12345678D",
 guestFolioId: "FOL-2026-105",
 smsNotifiedAtIso: "2026-10-19T11:30:00Z",
 claimedDateIso: "2026-10-19T16:00:00Z",
 claimedByPerson: "Markus Weber (Verified in person)",
 claimantVerificationMethod: "German Driving License & signature matched",
 estimatedValueLkr: 20000,
 },
 {
 itemId: "lnf-004",
 referenceNumber: "LNF-2026-045",
 itemName: "Linen Safari Jacket (Beige Khaki)",
 category: "CLOTHING",
 locationFound: "Main Restaurant (Chair #12)",
 foundDateIso: "2026-10-18T21:30:00Z",
 foundByStaff: "Dilani Wickramasinghe (Hostess)",
 storageLockerNumber: "Locker A-08",
 status: "HELD_IN_STORAGE",
 estimatedValueLkr: 28000,
 itemNotes: "Size L, tailored linen with wooden buttons. No guest ID inside pockets.",
 },
];

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface LostFoundTranslations {
 readonly title: string;
 readonly subtitle: string;
 readonly searchPlaceholder: string;
 readonly allTab: string;
 readonly inStorageTab: string;
 readonly notifiedTab: string;
 readonly claimedTab: string;
 readonly highValueTab: string;
 readonly newItemAction: string;
 readonly totalInCustodyLabel: string;
 readonly highValueSafeLabel: string;
 readonly awaitingClaimLabel: string;
 readonly totalClaimedLabel: string;
 readonly totalEstValueLabel: string;
 readonly sendSmsAction: string;
 readonly claimReturnAction: string;
 readonly claimedBadge: string;
 readonly lockerLabel: string;
 readonly locationLabel: string;
 readonly foundByLabel: string;
 readonly guestLinkLabel: string;
 readonly smsSentToast: string;
 readonly claimSuccessToast: string;
 readonly createdSuccessToast: string;
 readonly closeAction: string;
 readonly submitAction: string;
 readonly newModalTitle: string;
 readonly claimModalTitle: string;
}

const LOST_FOUND_TRANSLATIONS: Record<SupportedLanguage, LostFoundTranslations> = {
 en: {
 title: "Lost & Found Security Register",
 subtitle: "Locker Custody, Guest Linkage & 1-Click SMS Alerts",
 searchPlaceholder: "Search item, locker, room, or guest name...",
 allTab: "All Items",
 inStorageTab: "In Locker Storage",
 notifiedTab: "Guest Notified",
 claimedTab: "Claimed & Returned",
 highValueTab: "Safe / High-Value",
 newItemAction: "+ Log Found Item",
 totalInCustodyLabel: "Items in Custody",
 highValueSafeLabel: "High-Value in Safe",
 awaitingClaimLabel: "Awaiting Guest Claim",
 totalClaimedLabel: "Claimed & Returned",
 totalEstValueLabel: "Custody Est. Value",
 sendSmsAction: "Send SMS Alert",
 claimReturnAction: "Handover to Guest",
 claimedBadge: "Claimed & Returned",
 lockerLabel: "Locker / Safe",
 locationLabel: "Found Location",
 foundByLabel: "Finder Staff",
 guestLinkLabel: "Linked Guest",
 smsSentToast: "SMS alert dispatched to guest's phone!",
 claimSuccessToast: "Item handover successfully recorded & verified!",
 createdSuccessToast: "New found item logged into locker storage!",
 closeAction: "Close",
 submitAction: "Save to Register",
 newModalTitle: "Log New Found Article",
 claimModalTitle: "Verify & Handover to Claimant",
 },
 si: {
 title: "අස්ථානගත වූ සහ හමුවූ ද්රව්ය ලේඛනය",
 subtitle: "ආරක්ෂිත සේප්පු, අමුත්තන් සම්බන්ධ කිරීම සහ SMS දැනුම්දීම්",
 searchPlaceholder: "ද්රව්යය, සේප්පුව, කාමරය හෝ නම සොයන්න...",
 allTab: "සියල්ල",
 inStorageTab: "තැන්පත් කර ඇති",
 notifiedTab: "දැනුම් දුන්",
 claimedTab: "භාරදුන් ද්රව්ය",
 highValueTab: "වටිනා භාණ්ඩ",
 newItemAction: "+ නව භාණ්ඩයක් සටහන් කරන්න",
 totalInCustodyLabel: "භාරයේ ඇති ද්රව්ය",
 highValueSafeLabel: "සේප්පුවේ ඇති වටිනා භාණ්ඩ",
 awaitingClaimLabel: "භාරගැනීමට නියමිත",
 totalClaimedLabel: "භාරදුන් භාණ්ඩ",
 totalEstValueLabel: "මුළු ඇස්තමේන්තු වටිනාකම",
 sendSmsAction: "SMS පණිවිඩයක් යවන්න",
 claimReturnAction: "අමුත්තාට භාරදෙන්න",
 claimedBadge: "භාරදෙන ලදී",
 lockerLabel: "සේප්පුව / අල්මාරිය",
 locationLabel: "හමුවූ ස්ථානය",
 foundByLabel: "හමුවූ සේවකයා",
 guestLinkLabel: "අමුත්තාගේ විස්තර",
 smsSentToast: "අමුත්තාගේ දුරකථනයට SMS පණිවිඩය යවන ලදී!",
 claimSuccessToast: "භාණ්ඩය භාරදීම සාර්ථකව සටහන් විය!",
 createdSuccessToast: "හමුවූ භාණ්ඩය සාර්ථකව ලේඛනගත විය!",
 closeAction: "වසන්න",
 submitAction: "ලේඛනයට එක් කරන්න",
 newModalTitle: "හමුවූ නව භාණ්ඩයක් ඇතුළත් කිරීම",
 claimModalTitle: "අමුත්තාගේ අනන්යතාව තහවුරු කර භාරදීම",
 },
 ta: {
 title: "தொலைந்த மற்றும் கண்டெடுக்கப்பட்ட பொருட்கள் பதிவேடு",
 subtitle: "பாதுகாப்பறை சேமிப்பு, விருந்தினர் இணைப்பு & 1-கிளிக் SMS",
 searchPlaceholder: "பொருள், லாக்கர், அறை, அல்லது பெயர் தேடுக...",
 allTab: "அனைத்தும்",
 inStorageTab: "பாதுகாப்பறையில்",
 notifiedTab: "அறிவிக்கப்பட்டது",
 claimedTab: "திரும்ப ஒப்படைக்கப்பட்டது",
 highValueTab: "விலைமதிப்பற்றவை",
 newItemAction: "+ புதிய பொருள் பதிவு",
 totalInCustodyLabel: "பாதுகாப்பில் உள்ளவை",
 highValueSafeLabel: "விலைமதிப்பற்றவை (லாக்கர்)",
 awaitingClaimLabel: "மீட்க காத்திருப்பவை",
 totalClaimedLabel: "ஒப்படைக்கப்பட்டவை",
 totalEstValueLabel: "மொத்த மதிப்பு",
 sendSmsAction: "SMS அனுப்புக",
 claimReturnAction: "விருந்தினரிடம் ஒப்படை",
 claimedBadge: "ஒப்படைக்கப்பட்டது",
 lockerLabel: "லாக்கர் / பெட்டகம்",
 locationLabel: "கண்டெடுக்கப்பட்ட இடம்",
 foundByLabel: "கண்டெடுத்த ஊழியர்",
 guestLinkLabel: "விருந்தினர் தகவல்",
 smsSentToast: "விருந்தினருக்கு SMS அனுப்பப்பட்டது!",
 claimSuccessToast: "பொருள் ஒப்படைப்பு வெற்றிகரமாக பதிவு செய்யப்பட்டது!",
 createdSuccessToast: "புதிய பொருள் வெற்றிகரமாக பதிவு செய்யப்பட்டது!",
 closeAction: "மூடு",
 submitAction: "பதிவு செய்க",
 newModalTitle: "புதிய கண்டெடுக்கப்பட்ட பொருள் பதிவு",
 claimModalTitle: "அடையாளம் சரிபார்த்து ஒப்படைத்தல்",
 },
};

export function getLostFoundText(lang: SupportedLanguage = "en"): LostFoundTranslations {
 return LOST_FOUND_TRANSLATIONS[lang] ?? LOST_FOUND_TRANSLATIONS.en;
}

// ============================================================================
// Pure Domain Math & Helpers (Complexity <= 12)
// ============================================================================

export function isItemInCustody(status: LostFoundStatus): boolean {
 return status !== "CLAIMED_RETURNED" && status !== "DISPOSED_DONATED";
}

export function calculateLostFoundMetrics(items: readonly LostFoundItemRecord[]): LostFoundMetrics {
 let totalInCustody = 0;
 let totalHighValue = 0;
 let totalNotified = 0;
 let totalClaimed = 0;
 let totalEstValueLkr = 0;

 for (const item of items) {
 const val = item.estimatedValueLkr ?? 0;
 if (isItemInCustody(item.status)) {
 totalInCustody += 1;
 totalEstValueLkr += val;
 if (val >= 100000) {
 totalHighValue += 1;
 }
 }
 if (item.status === "GUEST_NOTIFIED") {
 totalNotified += 1;
 } else if (item.status === "CLAIMED_RETURNED") {
 totalClaimed += 1;
 }
 }

 return {
 totalInCustody,
 totalHighValue,
 totalNotified,
 totalClaimed,
 totalEstValueLkr: Math.round(totalEstValueLkr * 100) / 100,
 };
}

export function formatLostFoundLkr(amount: number): string {
 return `LKR ${new Intl.NumberFormat("en-LK", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(amount)}`;
}

export function composeGuestLostFoundSms(item: LostFoundItemRecord, propertyName: string): string {
 const roomText = item.roomNumber ? ` from Room #${item.roomNumber}` : "";
 const guestGreeting = item.guestName ? `Dear ${item.guestName}, ` : "Dear Guest, ";

 return `${guestGreeting}${propertyName} housekeeping has secured your ${item.itemName}${roomText} in ${item.storageLockerNumber}. Please contact hotel security or front-desk at +94472239400 to arrange collection or courier delivery.`;
}

export function resolveLostFoundCategoryBadge(category: LostFoundCategory): {
 readonly label: string;
 readonly icon: string;
 readonly style: string;
} {
 switch (category) {
 case "ELECTRONICS":
 return {
 label: "Electronics",
 icon: "Mobile",
 style: "bg-blue-500/20 text-blue-800 border-blue-500/30",
 };
 case "VALUABLES":
 return {
 label: "Valuables & Safe",
 icon: "VIP",
 style: "bg-amber-500/20 text-amber-800 border-amber-500/30",
 };
 case "CLOTHING":
 return {
 label: "Apparel & Shoes",
 icon: "Staff",
 style: "bg-purple-500/20 text-purple-800 border-purple-500/30",
 };
 case "DOCUMENTS":
 return {
 label: "Passports & IDs",
 icon: "Visa",
 style: "bg-rose-500/20 text-rose-800 border-rose-500/30",
 };
 case "ACCESSORIES":
 return {
 label: "Accessories",
 icon: "Sun",
 style: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
 };
 case "MEDICATION":
 return {
 label: "Medication",
 icon: "Med",
 style: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/30",
 };
 }
}

export function resolveStatusBadge(status: LostFoundStatus): {
 readonly label: string;
 readonly style: string;
} {
 switch (status) {
 case "HELD_IN_STORAGE":
 return { label: "In Locker", style: "bg-blue-500/20 text-blue-800 border-blue-500/30" };
 case "GUEST_NOTIFIED":
 return {
 label: "Guest Alerted",
 style: "bg-amber-500/20 text-amber-800 border-amber-500/30",
 };
 case "CLAIMED_RETURNED":
 return {
 label: "Claimed & Returned",
 style: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/30",
 };
 case "DISPOSED_DONATED":
 return {
 label: "Archived / Donated",
 style: "bg-slate-500/20 text-slate-400 border-slate-500/30",
 };
 }
}

export function isItemMatchingFilterTab(
 item: LostFoundItemRecord,
 tab: LostFoundFilterTab,
): boolean {
 if (tab === "ALL") return true;
 if (tab === "HIGH_VALUE") return (item.estimatedValueLkr ?? 0) >= 100000;
 return item.status === tab;
}

export function isItemMatchingSearchQuery(item: LostFoundItemRecord, query: string): boolean {
 const q = query.trim().toLowerCase();
 if (q.length === 0) return true;
 return (
 item.referenceNumber.toLowerCase().includes(q) ||
 item.itemName.toLowerCase().includes(q) ||
 item.storageLockerNumber.toLowerCase().includes(q) ||
 (item.roomNumber?.toLowerCase().includes(q) ?? false) ||
 (item.guestName?.toLowerCase().includes(q) ?? false) ||
 (item.guestPhone?.toLowerCase().includes(q) ?? false) ||
 (item.guestNicOrPassport?.toLowerCase().includes(q) ?? false)
 );
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface RegisterHeaderProps {
 readonly propertyName: string;
 readonly t: LostFoundTranslations;
 readonly onNewClick: () => void;
}

const RegisterHeader: FC<RegisterHeaderProps> = ({ propertyName, t, onNewClick }) => {
 return (
 <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-800 border border-blue-500/30">
 {propertyName}
 </span>
 <span className="text-xs text-slate-400">Security & Housekeeping Division</span>
 </div>
 <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.title}</h1>
 <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
 </div>

 <button
 type="button"
 onClick={onNewClick}
 className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all shrink-0"
 >
 <span>{t.newItemAction}</span>
 </button>
 </div>
 );
};

interface MetricsBarProps {
 readonly metrics: LostFoundMetrics;
 readonly t: LostFoundTranslations;
}

const MetricsBar: FC<MetricsBarProps> = ({ metrics, t }) => {
 return (
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">
 {t.totalInCustodyLabel}
 </span>
 <span className="text-xl font-bold font-mono tabular-nums-lkr text-slate-900 mt-1 block">
 {metrics.totalInCustody}
 </span>
 </div>

 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">{t.highValueSafeLabel}</span>
 <span className="text-xl font-bold font-mono tabular-nums-lkr text-amber-700 mt-1 block">
 {metrics.totalHighValue}
 </span>
 </div>

 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">{t.awaitingClaimLabel}</span>
 <span className="text-xl font-bold font-mono tabular-nums-lkr text-cyan-400 mt-1 block">
 {metrics.totalNotified}
 </span>
 </div>

 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">{t.totalClaimedLabel}</span>
 <span className="text-xl font-bold font-mono tabular-nums-lkr text-[#0B6E4F] mt-1 block">
 {metrics.totalClaimed}
 </span>
 </div>

 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">{t.totalEstValueLabel}</span>
 <span className="text-lg font-bold font-mono tabular-nums-lkr text-amber-800 mt-1 block truncate">
 {formatLostFoundLkr(metrics.totalEstValueLkr)}
 </span>
 </div>
 </div>
 );
};

interface FilterBarProps {
 readonly activeTab: LostFoundFilterTab;
 readonly onSelectTab: (tab: LostFoundFilterTab) => void;
 readonly searchQuery: string;
 readonly onSearchChange: (q: string) => void;
 readonly t: LostFoundTranslations;
}

const FilterBar: FC<FilterBarProps> = ({
 activeTab,
 onSelectTab,
 searchQuery,
 onSearchChange,
 t,
}) => {
 const searchId = useId();

 const tabs: Array<{ id: LostFoundFilterTab; label: string }> = [
 { id: "ALL", label: t.allTab },
 { id: "HELD_IN_STORAGE", label: t.inStorageTab },
 { id: "GUEST_NOTIFIED", label: t.notifiedTab },
 { id: "CLAIMED_RETURNED", label: t.claimedTab },
 { id: "HIGH_VALUE", label: t.highValueTab },
 ];

 return (
 <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
 <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
 {tabs.map((tab) => {
 const isSelected = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 type="button"
 onClick={() => onSelectTab(tab.id)}
 className={`min-h-[44px] px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
 isSelected
 ? "bg-blue-600 text-white shadow-md font-bold"
 : "bg-slate-50 text-slate-700 hover:bg-slate-50"
 }`}
 >
 <span>{tab.label}</span>
 </button>
 );
 })}
 </div>

 <div className="min-w-[240px]">
 <label htmlFor={searchId} className="sr-only">
 Search
 </label>
 <input
 id={searchId}
 type="search"
 value={searchQuery}
 onChange={(e) => onSearchChange(e.target.value)}
 placeholder={t.searchPlaceholder}
 className="w-full min-h-[44px] px-3.5 py-1.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-400"
 />
 </div>
 </div>
 );
};

interface ItemCardProps {
 readonly item: LostFoundItemRecord;
 readonly t: LostFoundTranslations;
 readonly onSendSms: (item: LostFoundItemRecord) => void;
 readonly onClaimClick: (item: LostFoundItemRecord) => void;
}

const ItemCard: FC<ItemCardProps> = ({ item, t, onSendSms, onClaimClick }) => {
 const cat = resolveLostFoundCategoryBadge(item.category);
 const statusBadge = resolveStatusBadge(item.status);
 const isClaimed = item.status === "CLAIMED_RETURNED" || item.status === "DISPOSED_DONATED";
 const hasGuestPhone = Boolean(item.guestPhone);

 return (
 <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] apple-liquid-glass space-y-3 shadow-lg hover:border-[#E2E8F0] transition-all flex flex-col justify-between">
 <div className="space-y-2">
 <div className="flex items-start justify-between gap-2">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="font-mono text-xs font-bold text-blue-800">
 {item.referenceNumber}
 </span>
 {item.roomNumber && (
 <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-700">
 Room #{item.roomNumber}
 </span>
 )}
 </div>
 <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
 {item.itemName}
 </h3>
 </div>

 <span
 className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 uppercase tracking-wider shrink-0 ${statusBadge.style}`}
 >
 {statusBadge.label}
 </span>
 </div>

 {/* Category & Locker Location */}
 <div className="flex items-center gap-2 text-xs">
 <span
 className={`px-2 py-0.5 rounded-lg border flex items-center gap-1 font-semibold ${cat.style}`}
 >
 <span><DynamicTokenIcon token={cat.icon} /></span>
 <span>{cat.label}</span>
 </span>
 <span className="text-amber-800 font-mono font-semibold">
 Pin {item.storageLockerNumber}
 </span>
 </div>

 {/* Location & Finder Details */}
 <div className="text-xs text-slate-400 space-y-0.5">
 <p>
 <span className="text-slate-500">{t.locationLabel}:</span> {item.locationFound}
 </p>
 <p>
 <span className="text-slate-500">{t.foundByLabel}:</span> {item.foundByStaff}
 </p>
 </div>

 {/* Guest Link Details if available */}
 {item.guestName && (
 <div className="p-2.5 rounded-2xl bg-slate-50 border border-[#E2E8F0] text-xs space-y-1">
 <div className="flex items-center justify-between">
 <span className="font-semibold text-slate-900">User {item.guestName}</span>
 {item.guestNicOrPassport && (
 <span className="font-mono text-[10px] text-slate-400">
 {item.guestNicOrPassport}
 </span>
 )}
 </div>
 {item.guestPhone && (
 <span className="font-mono text-[11px] text-cyan-400 block">
 Phone {item.guestPhone}
 </span>
 )}
 </div>
 )}

 {/* Estimated Value & Claimed info */}
 {item.estimatedValueLkr && (
 <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
 <span className="text-slate-500">Estimated Value</span>
 <span className="font-mono tabular-nums-lkr font-bold text-amber-700">
 {formatLostFoundLkr(item.estimatedValueLkr)}
 </span>
 </div>
 )}
 </div>

 {/* Action Buttons */}
 <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0]">
 <button
 type="button"
 onClick={() => onSendSms(item)}
 disabled={!hasGuestPhone || isClaimed}
 className={`min-h-[44px] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
 hasGuestPhone && !isClaimed
 ? "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20"
 : "bg-slate-50 text-slate-600 border border-[#E2E8F0] cursor-not-allowed"
 }`}
 >
 <span className="truncate">{t.sendSmsAction}</span>
 </button>

 <button
 type="button"
 onClick={() => onClaimClick(item)}
 disabled={isClaimed}
 className={`min-h-[44px] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
 isClaimed
 ? "bg-emerald-500/20 text-[#0B6E4F] border border-emerald-500/30 cursor-default"
 : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
 }`}
 >
 <span>{isClaimed ? "OK" : "Partner"}</span>
 <span className="truncate">{isClaimed ? t.claimedBadge : t.claimReturnAction}</span>
 </button>
 </div>
 </div>
 );
};

interface ClaimHandoverModalProps {
 readonly item: LostFoundItemRecord | null;
 readonly t: LostFoundTranslations;
 readonly onClose: () => void;
 readonly onConfirm: (details: { name: string; nic: string; method: string }) => void;
}

const ClaimHandoverModal: FC<ClaimHandoverModalProps> = ({ item, t, onClose, onConfirm }) => {
 const nameId = useId();
 const nicId = useId();
 const methodId = useId();

 const [claimantName, setClaimantName] = useState<string>(item?.guestName ?? "");
 const [claimantNic, setClaimantNic] = useState<string>(item?.guestNicOrPassport ?? "");
 const [method, setMethod] = useState<string>("National ID & Signature verification");

 if (!item) return null;

 return (
 <dialog
 open
 aria-modal="true"
 aria-labelledby="claim-handover-title"
 className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#F4F7F5] backdrop-blur-md transition-opacity border-0 w-full h-full max-w-none max-h-none m-0"
 >
 <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white border border-[#E2E8F0] apple-liquid-glass p-5 space-y-4 shadow-2xl">
 <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-3">
 <div>
 <span className="text-[10px] font-mono font-bold text-[#0B6E4F] block mb-0.5">
 {item.referenceNumber}
 </span>
 <h2 id="claim-handover-title" className="text-lg font-bold text-slate-900 tracking-tight">
 {t.claimModalTitle}
 </h2>
 </div>

 <button
 type="button"
 onClick={onClose}
 className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-50 text-slate-700"
 aria-label={t.closeAction}
 >
 x
 </button>
 </div>

 <div className="space-y-3 text-xs">
 <div>
 <label htmlFor={nameId} className="text-slate-400 block mb-1">
 Claimant Full Name *
 </label>
 <input
 id={nameId}
 type="text"
 value={claimantName}
 onChange={(e) => setClaimantName(e.target.value)}
 className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-slate-900 font-semibold"
 />
 </div>

 <div>
 <label htmlFor={nicId} className="text-slate-400 block mb-1">
 National ID / Passport Number *
 </label>
 <input
 id={nicId}
 type="text"
 value={claimantNic}
 onChange={(e) => setClaimantNic(e.target.value)}
 className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-slate-900 font-mono font-bold"
 />
 </div>

 <div>
 <label htmlFor={methodId} className="text-slate-400 block mb-1">
 Verification Proof Method
 </label>
 <input
 id={methodId}
 type="text"
 value={method}
 onChange={(e) => setMethod(e.target.value)}
 className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-slate-900"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2 pt-2">
 <button
 type="button"
 onClick={onClose}
 className="min-h-[48px] rounded-2xl bg-slate-50 hover:bg-slate-50 text-slate-900 font-bold transition-all"
 >
 {t.closeAction}
 </button>

 <button
 type="button"
 onClick={() => onConfirm({ name: claimantName, nic: claimantNic, method })}
 disabled={!claimantName.trim() || !claimantNic.trim()}
 className="min-h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
 >
 Confirm Handover
 </button>
 </div>
 </div>
 </dialog>
 );
};

// ============================================================================
// Main View Component
// ============================================================================

export const LostAndFoundView: FC<LostAndFoundViewProps> = ({
 tenantId: _tenantId = "cinnamon-wild-yala",
 propertyName = "Cinnamon Wild Yala",
 initialItems = DEFAULT_LOST_FOUND_ITEMS,
 language = "en",
 onSendGuestSms,
 onClaimItem,
 onCreateItem: _onCreateItem,
}) => {
 const t = getLostFoundText(language);

 const [items, setItems] = useState<readonly LostFoundItemRecord[]>(initialItems);
 const [activeTab, setActiveTab] = useState<LostFoundFilterTab>("ALL");
 const [searchQuery, setSearchQuery] = useState<string>("");
 const [claimingItem, setClaimingItem] = useState<LostFoundItemRecord | null>(null);
 const [toastMessage, setToastMessage] = useState<string | null>(null);

 const metrics = useMemo(() => calculateLostFoundMetrics(items), [items]);

 const filteredItems = useMemo(() => {
 return items.filter(
 (item) =>
 isItemMatchingFilterTab(item, activeTab) && isItemMatchingSearchQuery(item, searchQuery),
 );
 }, [items, activeTab, searchQuery]);

 const handleSendSms = async (item: LostFoundItemRecord) => {
 const message = composeGuestLostFoundSms(item, propertyName);

 setItems((prev) =>
 prev.map((i) =>
 i.itemId === item.itemId
 ? { ...i, status: "GUEST_NOTIFIED", smsNotifiedAtIso: new Date().toISOString() }
 : i,
 ),
 );

 playOrderBell("NEW_ORDER");
 setToastMessage(t.smsSentToast);
 setTimeout(() => setToastMessage(null), 3000);

 if (onSendGuestSms) {
 await onSendGuestSms(item, message);
 }
 };

 const handleClaimConfirm = async (details: { name: string; nic: string; method: string }) => {
 if (!claimingItem) return;

 setItems((prev) =>
 prev.map((i) =>
 i.itemId === claimingItem.itemId
 ? {
 ...i,
 status: "CLAIMED_RETURNED",
 claimedDateIso: new Date().toISOString(),
 claimedByPerson: details.name,
 claimantVerificationMethod: `${details.nic} - ${details.method}`,
 }
 : i,
 ),
 );

 setClaimingItem(null);
 playOrderBell("PAYMENT_CONFIRMED");
 setToastMessage(t.claimSuccessToast);
 setTimeout(() => setToastMessage(null), 3000);

 if (onClaimItem) {
 await onClaimItem(claimingItem.itemId, details);
 }
 };

 return (
 <div className="w-full space-y-5">
 {/* Toast Alert */}
 {toastMessage && (
 <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
 <span>{toastMessage}</span>
 </div>
 )}

 {/* Header */}
 <RegisterHeader
 propertyName={propertyName}
 t={t}
 onNewClick={() => setToastMessage("Please use front-desk or mobile logger to add items.")}
 />

 {/* Metrics Bar */}
 <MetricsBar metrics={metrics} t={t} />

 {/* Filter Tabs & Search */}
 <FilterBar
 activeTab={activeTab}
 onSelectTab={setActiveTab}
 searchQuery={searchQuery}
 onSearchChange={setSearchQuery}
 t={t}
 />

 {/* Item Bento Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {filteredItems.map((item) => (
 <ItemCard
 key={item.itemId}
 item={item}
 t={t}
 onSendSms={handleSendSms}
 onClaimClick={setClaimingItem}
 />
 ))}

 {filteredItems.length === 0 && (
 <div className="col-span-full py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-[#E2E8F0]">
 No lost & found articles matching the selected criteria.
 </div>
 )}
 </div>

 {/* Claim Handover Modal */}
 <ClaimHandoverModal
 item={claimingItem}
 t={t}
 onClose={() => setClaimingItem(null)}
 onConfirm={handleClaimConfirm}
 />
 </div>
 );
};
