import { useId, useMemo, useState } from "react";
import { Department, type TrilingualText } from "../../generated/graphql.js";
import { type SupportedLanguage, formatLkr, useTranslation } from "../../lib/i18n.js";
import { DEFAULT_DOMSPEED_CATEGORIES } from "./CategoryManager.js";
import { AppleToggleSwitch } from "./SharedCatalogCard.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export interface AdminMenuItem {
 readonly id: string;
 readonly tenantId?: string | undefined;
 readonly categoryId: string;
 readonly code: string; // e.g. "KOT-402", "CUR-105"
 readonly title: TrilingualText;
 readonly description: TrilingualText;
 readonly imageUrl?: string | null | undefined;
 readonly priceLkr: number;
 readonly department: Department;
 readonly kitchenStation?: string | null | undefined;
 readonly isVegetarian: boolean;
 readonly isVegan: boolean;
 readonly isHalal: boolean;
 readonly isGlutenFree: boolean;
 readonly spicyLevel: number; // 0 = Mild, 1 = Medium, 2 = Hot, 3 = Sri Lankan Hot
 readonly isAvailable: boolean; // In Stock vs 86'd
 readonly displayOrder: number;
 readonly prepTimeMins?: number | undefined;
 readonly createdAt?: string | undefined;
 readonly updatedAt?: string | undefined;
}

export interface CategoryFilterOption {
 readonly id: string;
 readonly name: TrilingualText;
 readonly iconKey?: string | undefined;
}

export interface MenuItemGridProps {
 readonly items?: ReadonlyArray<AdminMenuItem> | undefined;
 readonly categories?: ReadonlyArray<CategoryFilterOption> | undefined;
 readonly selectedCategoryId?: string | undefined;
 readonly onSelectCategory?: ((categoryId: string | null) => void) | undefined;
 readonly onToggleAvailability?: ((itemId: string, isAvailable: boolean) => void) | undefined;
 readonly onEditItem?: ((item: AdminMenuItem) => void) | undefined;
 readonly onAddNewItem?: ((categoryId?: string | undefined) => void) | undefined;
 readonly className?: string | undefined;
}

export type StockFilterType = "all" | "in_stock" | "out_of_stock";

// ============================================================================
// Curated Default Sample Dishes (DOMSpeed Sri Lankan Hospitality Parity)
// ============================================================================

export const DEFAULT_DOMSPEED_MENU_ITEMS: ReadonlyArray<AdminMenuItem> = [
 {
 id: "ITEM-RICE-CHKN",
 categoryId: "CAT-RICE-CURRY",
 code: "CUR-101",
 title: {
 en: "Village Style Chicken Rice & Curry",
 si: "ගමේ ක්රමයට සැකසූ කුකුළු මස් බත් සහ ව්යංජන",
 ta: "கிராமத்து முறை கோழிக்கறி அரிசி சாதம்",
 },
 description: {
 en: "Steamed Samba rice served with Sri Lankan spiced chicken curry, dhal, pol sambol, and papadam",
 si: "සුවඳැති සම්බා බත්, කුළුබඩු මිශ්ර කුකුළු මස්, පරිප්පු, පොල් සම්බෝල හා කර කරගෑ පාපඩම්",
 ta: "சுவையான சம்பா சாதம், காரசாரமான சிக்கன் குழம்பு, பருப்பு, சம்பல் மற்றும் அப்பளம்",
 },
 imageUrl:
 "/images/dish-jaffna-crab-hoppers.jpg",
 priceLkr: 2250,
 department: Department.Kitchen,
 kitchenStation: "Curry Station",
 isVegetarian: false,
 isVegan: false,
 isHalal: true,
 isGlutenFree: true,
 spicyLevel: 2,
 isAvailable: true,
 displayOrder: 1,
 prepTimeMins: 20,
 },
 {
 id: "ITEM-BLACK-PORK",
 categoryId: "CAT-RICE-CURRY",
 code: "CUR-105",
 title: {
 en: "Southern Black Pork Curry with Roast Paan",
 si: "දකුණේ කළු ඌරු මස් ව්යංජනය සහ රෝස් පාන්",
 ta: "தெற்கு கறுப்பு பன்றி இறைச்சி மற்றும் ரோஸ்ட் ரொட்டி",
 },
 description: {
 en: "Slow-simmered pork in roasted dark spices and Goraka tamarind with crispy wood-fired roast paan",
 si: "බැදපු තුනපහ හා ගොරකා මිශ්රව මඳ ගින්නේ ඉදුණු කළු ඌරු මස් සහ රෝස් පාන් පෙති",
 ta: "வறுத்த மசாலாக்கள் மற்றும் கொரக்கா சேர்த்து சமைத்த கறி மற்றும் ரோஸ்ட் ரொட்டி",
 },
 imageUrl:
 "/images/dish-cuttlefish-arrack.jpg",
 priceLkr: 3200,
 department: Department.Kitchen,
 kitchenStation: "Curry Station",
 isVegetarian: false,
 isVegan: false,
 isHalal: false,
 isGlutenFree: false,
 spicyLevel: 3,
 isAvailable: true,
 displayOrder: 2,
 prepTimeMins: 25,
 },
 {
 id: "ITEM-DHAL-CURRY",
 categoryId: "CAT-RICE-CURRY",
 code: "CUR-102",
 title: {
 en: "Clay-Pot Dhal with Coconut Milk",
 si: "මැටි වළඳේ පිසූ පරිප්පු ව්යංජනය",
 ta: "மண்பானை தேங்காய்ப்பால் பருப்பு",
 },
 description: {
 en: "Creamy Mysore lentils tempered with mustard seeds, curry leaves, onions, and rich coconut cream",
 si: "අබ, කරපිංචා හා ළූණු තෙම්පරාදු කර උකු පොල් කිරි මුසු කළ මයිසූර් පරිප්පු",
 ta: "தாளித்த மைசூர் பருப்பு மற்றும் தேங்காய்ப்பால் குழம்பு",
 },
 imageUrl: null,
 priceLkr: 1250,
 department: Department.Kitchen,
 kitchenStation: "Curry Station",
 isVegetarian: true,
 isVegan: true,
 isHalal: true,
 isGlutenFree: true,
 spicyLevel: 1,
 isAvailable: true,
 displayOrder: 3,
 prepTimeMins: 15,
 },
 {
 id: "ITEM-KOTTU-CHKN",
 categoryId: "CAT-HOPPERS-KOTTU",
 code: "KOT-402",
 title: {
 en: "Chicken Cheese Kottu Roti",
 si: "චිකන් චීස් කොත්තු රොටි",
 ta: "சிக்கன் சீஸ் கொத்து ரொட்டி",
 },
 description: {
 en: "Shredded godamba roti chopped on cast iron with tender chicken, farm egg, crunchy leeks, and melted cheese",
 si: "යකඩ තැටියේ කපා ගත් ගෝදම්බ රොටි, කුකුළු මස්, බිත්තර, ලීක්ස් සහ දියවූ චීස්",
 ta: "கொத்து ரொட்டி, சிக்கன், முட்டை, காய்கறிகள் மற்றும் சீஸ்",
 },
 imageUrl:
 "/images/dish-jaffna-crab-hoppers.jpg",
 priceLkr: 2450,
 department: Department.Kitchen,
 kitchenStation: "Hot Wok",
 isVegetarian: false,
 isVegan: false,
 isHalal: true,
 isGlutenFree: false,
 spicyLevel: 2,
 isAvailable: true,
 displayOrder: 4,
 prepTimeMins: 15,
 },
 {
 id: "ITEM-EGG-HOPPER",
 categoryId: "CAT-HOPPERS-KOTTU",
 code: "HOP-201",
 title: {
 en: "Crispy Egg Hopper Duo with Katta Sambol",
 si: "බිත්තර ආප්ප යුගලය සහ කට්ට සම්බෝල",
 ta: "முட்டை அப்பம் இரட்டை மற்றும் கட்ட சம்பல்",
 },
 description: {
 en: "Bowl-shaped fermented rice-flour hoppers with soft-set egg center and spicy crushed chili katta sambol",
 si: "මැද තැම්බුණු බිත්තරය සහිත කරස් ගානා ආප්ප දෙකක් සහ සැර කට්ට සම්බෝල",
 ta: "மொறுமொறுப்பான முட்டை அப்பங்கள் மற்றும் காரசாரமான கட்ட சம்பல்",
 },
 imageUrl:
 "/images/dish-jaffna-crab-hoppers.jpg",
 priceLkr: 1650,
 department: Department.Kitchen,
 kitchenStation: "Hopper Station",
 isVegetarian: true,
 isVegan: false,
 isHalal: true,
 isGlutenFree: true,
 spicyLevel: 2,
 isAvailable: true,
 displayOrder: 5,
 prepTimeMins: 12,
 },
 {
 id: "ITEM-CEYLON-TEA",
 categoryId: "CAT-DRINKS-BAR",
 code: "BAR-010",
 title: {
 en: "Single-Estate Nuwara Eliya BOP Tea",
 si: "නුවරඑළිය තනි වතු තේ (BOP)",
 ta: "நுவரெலியா பிரீமியம் தேநீர் (BOP)",
 },
 description: {
 en: "Delicate high-grown Ceylon black tea with floral notes served in an English ceramic pot with fresh milk and brown sugar",
 si: "සුවඳැති කඳුකර සිලෝන් කළු තේ, නැවුම් එළකිරි සහ හකුරු සමග",
 ta: "சுவையான மலையக சிலோன் கறுப்பு தேநீர், பால் மற்றும் சர்க்கரையுடன்",
 },
 imageUrl:
 "/images/dish-cuttlefish-arrack.jpg",
 priceLkr: 950,
 department: Department.Bar,
 kitchenStation: "Beverage Dispense",
 isVegetarian: true,
 isVegan: true,
 isHalal: true,
 isGlutenFree: true,
 spicyLevel: 0,
 isAvailable: true,
 displayOrder: 6,
 prepTimeMins: 5,
 },
 {
 id: "ITEM-THAMBILI",
 categoryId: "CAT-DRINKS-BAR",
 code: "BAR-015",
 title: {
 en: "King Coconut (Fresh Thambili)",
 si: "නැවුම් තැඹිලි ගෙඩිය",
 ta: "புதிய தம்பிலி இளநீர்",
 },
 description: {
 en: "Chilled indigenous golden king coconut served directly with bamboo straw and tender flesh spoon",
 si: "සිසිල් කළ නැවුම් ස්වභාවික තැඹිලි වතුර සහ මදය ආහාරයට ගැනීමට හැන්දක් සමග",
 ta: "குளிர்ந்த சுவையான இயற்கை தம்பிலி இளநீர்",
 },
 imageUrl:
 "/images/dish-cuttlefish-arrack.jpg",
 priceLkr: 850,
 department: Department.Bar,
 kitchenStation: "Juice Bar",
 isVegetarian: true,
 isVegan: true,
 isHalal: true,
 isGlutenFree: true,
 spicyLevel: 0,
 isAvailable: true,
 displayOrder: 7,
 prepTimeMins: 3,
 },
 {
 id: "ITEM-WATALAPPAN",
 categoryId: "CAT-DESSERTS",
 code: "DES-501",
 title: {
 en: "Traditional Coconut Jaggery Watalappan",
 si: "සාම්ප්රදායික කිතුල් හකුරු වටලප්පන්",
 ta: "பாரம்பரிய கித்துல் வத்தலாப்பம்",
 },
 description: {
 en: "Steamed coconut milk and pure kithul jaggery custard perfumed with cardamom, nutmeg, and roasted cashew nuts",
 si: "එනසාල් හා සාදික්කා සුවඳැති, බැදපු කජු මිශ්ර පිරිසිදු කිතුල් හකුරු සහ උකු පොල් කිරි වටලප්පන්",
 ta: "ஏலக்காய், முந்திரி மற்றும் கித்துல் சர்க்கரை கலந்த சுவையான வத்தலாப்பம்",
 },
 imageUrl: null,
 priceLkr: 1450,
 department: Department.Kitchen,
 kitchenStation: "Pastry & Cold",
 isVegetarian: true,
 isVegan: false,
 isHalal: true,
 isGlutenFree: true,
 spicyLevel: 0,
 isAvailable: true,
 displayOrder: 8,
 prepTimeMins: 5,
 },
 {
 id: "ITEM-CLUB-SAND",
 categoryId: "CAT-SANDWICHES",
 code: "SND-301",
 title: {
 en: "Ceylon Spiced Chicken Club Sandwich",
 si: "සිලෝන් චිකන් ක්ලබ් සැන්ඩ්විච්",
 ta: "சிக்கன் கிளப் சான்ட்விச்",
 },
 description: {
 en: "Triple-decker toasted bread with grilled curry chicken breast, fried egg, lettuce, tomato, and seasoned manioc chips",
 si: "ග්රිල් කළ කුකුළු මස්, බිත්තර, සලාද කොළ හා තක්කාලි සහිත තට්ටු තුනේ සැන්ඩ්විච් සහ මඤ්ඤොක්කා චිප්ස්",
 ta: "சிக்கன், முட்டை, தக்காளி மற்றும் மரவள்ளிக்கிழங்கு சிப்ஸ் உடன் சான்ட்விச்",
 },
 imageUrl: null,
 priceLkr: 2850,
 department: Department.Kitchen,
 kitchenStation: "Pantry",
 isVegetarian: false,
 isVegan: false,
 isHalal: true,
 isGlutenFree: false,
 spicyLevel: 1,
 isAvailable: false, // 86'd out of stock for testing
 displayOrder: 9,
 prepTimeMins: 15,
 },
 {
 id: "ITEM-AYUR-HERB",
 categoryId: "CAT-SPA-WELLNESS",
 code: "SPA-801",
 title: {
 en: "Ayurvedic Warm Herbal Compress Therapy",
 si: "ආයුර්වේද ඖෂධීය පොට්ටනි සම්බාහනය",
 ta: "ஆயுர்வேத மூலிகை ஒத்தடம் சிகிச்சை",
 },
 description: {
 en: "Warm medicinal herbal poultice infused with indigenous Ceylon oils to soothe tension and revitalize muscles (60 mins)",
 si: "දේශීය ඖෂධ පැළෑටි හා තෙල් වර්ග යොදා ගනිමින් සිදු කරන විඩාව සමනය කරන සම්බාහන සත්කාරය",
 ta: "பாரம்பரிய மூலிகைகள் மற்றும் எண்ணெய் கலந்த உடற்பிடிப்பு சிகிச்சை",
 },
 imageUrl: null,
 priceLkr: 9500,
 department: Department.Spa,
 kitchenStation: "Ayurveda Pavilion",
 isVegetarian: true,
 isVegan: true,
 isHalal: true,
 isGlutenFree: true,
 spicyLevel: 0,
 isAvailable: true,
 displayOrder: 10,
 prepTimeMins: 60,
 },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function resolveTrilingual(text: TrilingualText, lang: SupportedLanguage): string {
 if (lang === "si" && text.si) return text.si;
 if (lang === "ta" && text.ta) return text.ta;
 return text.en;
}

export function getDepartmentLabel(dept: Department): string {
 switch (dept) {
 case Department.Kitchen:
 return "Kitchen";
 case Department.Bar:
 return "Bar";
 case Department.Housekeeping:
 return "Housekeeping";
 case Department.Spa:
 return "Spa";
 case Department.FrontOffice:
 return "Front Office";
 case Department.Banquet:
 return "Banquet";
 case Department.Accounts:
 return "Accounts";
 case Department.Maintenance:
 return "Maintenance";
 default:
 return dept;
 }
}

export function getDepartmentBadgeColor(dept: Department): string {
 switch (dept) {
 case Department.Kitchen:
 return "bg-amber-500/15 text-amber-700 border-amber-500/25";
 case Department.Bar:
 return "bg-purple-500/15 text-purple-700 border-purple-500/25";
 case Department.Housekeeping:
 return "bg-sky-500/15 text-sky-700 border-sky-500/25";
 case Department.Spa:
 return "bg-emerald-500/15 text-emerald-700 border-emerald-500/25";
 default:
 return "bg-slate-500/15 text-slate-700 border-slate-500/25";
 }
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

/**
 * 1:1 Square (110x110px) WebP Thumbnail with squircle rounded borders and 86'd status overlay.
 */
export function MenuItemThumbnail({
 title,
 imageUrl,
 department,
 isAvailable,
}: {
 readonly title: string;
 readonly imageUrl?: string | null | undefined;
 readonly department: Department;
 readonly isAvailable: boolean;
}) {
 return (
 <div
 className={`relative w-[110px] h-[110px] min-w-[110px] min-h-[110px] rounded-2xl overflow-hidden shrink-0 transition-all duration-300 ease-apple-spring border border-black/5 ${
 isAvailable
 ? "bg-slate-100 "
 : "bg-slate-200 opacity-75 grayscale-50"
 }`}
 >
 {imageUrl ? (
 <img
 src={imageUrl}
 alt={title}
 width={110}
 height={110}
 loading="lazy"
 className="w-full h-full object-cover rounded-2xl"
 />
 ) : (
 <div className="w-full h-full flex flex-col items-center justify-center p-3 text-slate-400 ">
 <ThumbnailFallbackSvg department={department} />
 </div>
 )}

 {/* 86'd Out of Stock Badge Overlay */}
 {!isAvailable && (
 <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-1">
 <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[10px] tracking-wider uppercase shadow-md animate-pulse">
 86&apos;d
 </span>
 </div>
 )}
 </div>
 );
}

function ThumbnailFallbackSvg({ department }: { readonly department: Department }) {
 if (department === Department.Bar) {
 return (
 <svg
 className="w-10 h-10"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={1.5}
 d="M8 21h8m-4-7v7m-7-14h14l-2 7H7l-2-7zm2 2h10"
 />
 </svg>
 );
 }
 if (department === Department.Spa) {
 return (
 <svg
 className="w-10 h-10"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={1.5}
 d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-15v6m0 4h.01"
 />
 </svg>
 );
 }
 return (
 <svg
 className="w-10 h-10"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={1.5}
 d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
 />
 </svg>
 );
}

/**
 * Sri Lankan Spice Level Indicator (0=Mild, 1=Medium, 2=Hot, 3=Authentic Sri Lankan Spicy).
 */
export function SpiceLevelIndicator({ level }: { readonly level: number }) {
 if (level <= 0) {
 return (
 <span
 className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"
 title="Mild / Non-Spicy"
 >
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
 Mild
 </span>
 );
 }

 const chiliCount = Math.min(3, Math.max(1, level));
 const isSriLankanHot = level >= 3;

 return (
 <span
 className={`inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
 isSriLankanHot
 ? "bg-rose-500/15 text-rose-700 border-rose-500/30 font-semibold"
 : "bg-amber-500/15 text-amber-700 border-amber-500/30"
 }`}
 title={isSriLankanHot ? "Authentic Sri Lankan Hot (Level 3)" : `Spice Level ${level}`}
 >
 
 <span>{isSriLankanHot ? "SL Spicy (3x)" : level === 2 ? "Hot (2x)" : "Medium (1x)"}</span>
 </span>
 );
}

/**
 * Dietary Classification Pills (VEG, VEGAN, HALAL, GF).
 */
export function DietaryPillBadges({
 isVegetarian,
 isVegan,
 isHalal,
 isGlutenFree,
}: {
 readonly isVegetarian: boolean;
 readonly isVegan: boolean;
 readonly isHalal: boolean;
 readonly isGlutenFree: boolean;
}) {
 return (
 <div className="flex flex-wrap items-center gap-1">
 {isVegan && (
 <span
 className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 border border-emerald-500/20"
 title="Vegan Certified"
 >
 VEGAN
 </span>
 )}
 {!isVegan && isVegetarian && (
 <span
 className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-700 border border-green-500/20"
 title="Vegetarian"
 >
 VEG
 </span>
 )}
 {isHalal && (
 <span
 className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-700 border border-teal-500/20"
 title="Halal Sourced"
 >
 HALAL
 </span>
 )}
 {isGlutenFree && (
 <span
 className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 border border-blue-500/20"
 title="Gluten-Free"
 >
 GF
 </span>
 )}
 </div>
 );
}

/**
 * Instant 1-Click Stock Availability Toggle Switch (>= 44x44pt touch target).
 */
export function StockAvailabilityToggle({
 itemId,
 isAvailable,
 onToggle,
}: {
 readonly itemId: string;
 readonly isAvailable: boolean;
 readonly onToggle: (itemId: string, newStatus: boolean) => void;
}) {
 const switchId = useId();

 return (
 <div className="flex items-center gap-2">
 <AppleToggleSwitch
 id={switchId}
 checked={isAvailable}
 onChange={(newChecked) => onToggle(itemId, newChecked)}
 ariaLabel={
 isAvailable
 ? "Item is in stock. Click to 86 item."
 : "Item is 86'd out of stock. Click to put in stock."
 }
 />

 <span
 className={`text-xs font-semibold select-none ${
 isAvailable
 ? "text-emerald-700 "
 : "text-rose-600 "
 }`}
 >
 {isAvailable ? "In Stock" : "86'd"}
 </span>
 </div>
 );
}

/**
 * Single Menu Item Card in DOMSpeed Bento Style.
 */
export function MenuItemCard({
 item,
 onToggleAvailability,
 onEditItem,
}: {
 readonly item: AdminMenuItem;
 readonly onToggleAvailability: (itemId: string, isAvailable: boolean) => void;
 readonly onEditItem?: ((item: AdminMenuItem) => void) | undefined;
}) {
 const { currentLanguage } = useTranslation();
 const displayTitle = resolveTrilingual(item.title, currentLanguage);
 const displayDescription = resolveTrilingual(item.description, currentLanguage);
 const deptColor = getDepartmentBadgeColor(item.department);

 return (
 <article
 data-testid={`menu-item-card-${item.id}`}
 className={`apple-liquid-glass rounded-2xl p-4 border transition-all duration-300 ease-apple-spring hover:shadow-xl flex flex-col justify-between ${
 item.isAvailable
 ? "border-white/50 "
 : "border-rose-400/40 bg-rose-50/20 "
 }`}
 >
 <div className="flex gap-4">
 {/* 1:1 Square 110x110px Thumbnail */}
 <MenuItemThumbnail
 title={displayTitle}
 imageUrl={item.imageUrl}
 department={item.department}
 isAvailable={item.isAvailable}
 />

 {/* Content & Metadata */}
 <div className="flex-1 min-w-0 flex flex-col justify-between">
 <div>
 <div className="flex items-center justify-between gap-2 mb-1">
 <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-black/5 ">
 {item.code}
 </span>

 <span
 className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${deptColor}`}
 >
 {item.kitchenStation
 ? `${getDepartmentLabel(item.department)} • ${item.kitchenStation}`
 : getDepartmentLabel(item.department)}
 </span>
 </div>

 <h3
 className="text-sm font-semibold text-slate-900 truncate"
 title={displayTitle}
 >
 {displayTitle}
 </h3>

 {/* Trilingual Subtitle if active language is Sinhala/Tamil */}
 {currentLanguage !== "en" && item.title.en && (
 <p className="text-[11px] text-slate-400 truncate">
 {item.title.en}
 </p>
 )}

 <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-snug">
 {displayDescription}
 </p>
 </div>

 <div className="mt-2.5 flex flex-wrap items-center gap-2">
 <SpiceLevelIndicator level={item.spicyLevel} />
 <DietaryPillBadges
 isVegetarian={item.isVegetarian}
 isVegan={item.isVegan}
 isHalal={item.isHalal}
 isGlutenFree={item.isGlutenFree}
 />
 </div>
 </div>
 </div>

 {/* Footer: Price, 86'd Toggle, and Actions */}
 <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between gap-3">
 <div>
 <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
 Selling Price
 </span>
 <span className="text-base font-bold tabular-nums-lkr text-slate-900 ">
 {formatLkr(item.priceLkr)}
 </span>
 </div>

 <div className="flex items-center gap-3">
 <StockAvailabilityToggle
 itemId={item.id}
 isAvailable={item.isAvailable}
 onToggle={onToggleAvailability}
 />

 {onEditItem && (
 <button
 type="button"
 aria-label={`Edit ${displayTitle}`}
 onClick={() => onEditItem(item)}
 className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors duration-200 cursor-pointer"
 >
 <svg
 className="w-4 h-4"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
 />
 </svg>
 </button>
 )}
 </div>
 </div>
 </article>
 );
}

/**
 * Top KPI Summary Header Bar.
 */
export function MenuItemSummaryBar({
 totalCount,
 inStockCount,
 outOfStockCount,
 onAddNewItem,
 selectedCategoryId,
}: {
 readonly totalCount: number;
 readonly inStockCount: number;
 readonly outOfStockCount: number;
 readonly onAddNewItem?: ((categoryId?: string) => void) | undefined;
 readonly selectedCategoryId?: string | undefined;
}) {
 return (
 <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl apple-liquid-glass border border-white/50 ">
 <div className="flex flex-wrap items-center gap-6">
 <div>
 <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">
 Total Dishes
 </span>
 <span className="text-xl font-bold tabular-nums-lkr text-slate-900 ">
 {totalCount}
 </span>
 </div>

 <div className="h-8 w-px bg-slate-200 " />

 <div>
 <span className="text-[11px] font-medium text-emerald-600 block uppercase tracking-wider">
 In Stock
 </span>
 <span className="text-xl font-bold tabular-nums-lkr text-emerald-600 ">
 {inStockCount}
 </span>
 </div>

 <div className="h-8 w-px bg-slate-200 " />

 <div>
 <span className="text-[11px] font-medium text-rose-600 block uppercase tracking-wider">
 86&apos;d (Unavailable)
 </span>
 <span className="text-xl font-bold tabular-nums-lkr text-rose-600 ">
 {outOfStockCount}
 </span>
 </div>
 </div>

 {onAddNewItem && (
 <button
 type="button"
 onClick={() => onAddNewItem(selectedCategoryId)}
 className="min-h-[44px] px-5 py-2.5 rounded-xl bg-apple-blue hover:bg-blue-600 text-white font-semibold text-sm transition-all duration-200 shadow-md flex items-center gap-2 cursor-pointer"
 >
 <svg
 className="w-4 h-4"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 aria-hidden="true"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
 </svg>
 Add Dish
 </button>
 )}
 </div>
 );
}

/**
 * Filter Pill Tabs Bar.
 */
export function CategoryPillTabs({
 categories,
 selectedCategoryId,
 onSelectCategory,
}: {
 readonly categories: ReadonlyArray<CategoryFilterOption>;
 readonly selectedCategoryId: string | null;
 readonly onSelectCategory: (id: string | null) => void;
}) {
 const { currentLanguage } = useTranslation();

 return (
 <nav
 aria-label="Filter dishes by catalog category"
 className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
 >
 <button
 type="button"
 onClick={() => onSelectCategory(null)}
 className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
 selectedCategoryId === null
 ? "bg-white text-slate-900 shadow-sm"
 : "bg-slate-100 hover:bg-slate-200 text-slate-600 "
 }`}
 >
 All Categories
 </button>

 {categories.map((cat) => {
 const isSelected = selectedCategoryId === cat.id;
 const catName = resolveTrilingual(cat.name, currentLanguage);

 return (
 <button
 key={cat.id}
 type="button"
 onClick={() => onSelectCategory(cat.id)}
 className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
 isSelected
 ? "bg-apple-blue text-white shadow-sm"
 : "bg-slate-100 hover:bg-slate-200 text-slate-600 "
 }`}
 >
 {catName}
 </button>
 );
 })}
 </nav>
 );
}

/**
 * Empty State when search or category filter has no matching items.
 */
export function MenuItemEmptyState({
 onReset,
}: {
 readonly onReset: () => void;
}) {
 return (
 <div className="py-16 px-4 text-center apple-liquid-glass rounded-2xl border border-[#E2E8F0] ">
 <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
 <svg
 className="w-7 h-7"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={1.5}
 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
 />
 </svg>
 </div>
 <h4 className="text-base font-semibold text-slate-900 ">No dishes found</h4>
 <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-5">
 No menu items matched your current filter or search criteria.
 </p>
 <button
 type="button"
 onClick={onReset}
 className="min-h-[44px] px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-semibold cursor-pointer"
 >
 Reset Filters
 </button>
 </div>
 );
}

export function matchesSearchQuery(item: AdminMenuItem, rawQuery: string): boolean {
 const q = rawQuery.toLowerCase().trim();
 if (!q) return true;
 if (item.code.toLowerCase().includes(q)) return true;
 if (item.title.en.toLowerCase().includes(q)) return true;
 if (item.title.si?.toLowerCase().includes(q)) return true;
 if (item.title.ta?.toLowerCase().includes(q)) return true;
 if (item.description.en.toLowerCase().includes(q)) return true;
 return item.kitchenStation?.toLowerCase().includes(q) ?? false;
}

export function matchesStockFilter(isAvailable: boolean, filter: StockFilterType): boolean {
 if (filter === "in_stock") return isAvailable;
 if (filter === "out_of_stock") return !isAvailable;
 return true;
}

export function matchesItemFilters(
 item: AdminMenuItem,
 category: string | null,
 dept: string,
 stock: StockFilterType,
 query: string,
): boolean {
 if (category && item.categoryId !== category) return false;
 if (dept !== "all" && item.department !== dept) return false;
 if (!matchesStockFilter(item.isAvailable, stock)) return false;
 return matchesSearchQuery(item, query);
}

// ============================================================================
// Main MenuItemGrid Component
// ============================================================================

export function MenuItemGrid({
 items: propItems,
 categories: propCategories,
 selectedCategoryId: propSelectedCategoryId,
 onSelectCategory,
 onToggleAvailability,
 onEditItem,
 onAddNewItem,
 className = "",
}: MenuItemGridProps) {
 // Local state for items so instant toggling works out-of-the-box
 const [internalItems, setInternalItems] = useState<ReadonlyArray<AdminMenuItem>>(
 () => propItems ?? DEFAULT_DOMSPEED_MENU_ITEMS,
 );

 // Sync internal items if prop changes
 const activeItems = propItems ?? internalItems;

 // Categories list
 const activeCategories: ReadonlyArray<CategoryFilterOption> = useMemo(() => {
 if (propCategories && propCategories.length > 0) return propCategories;
 return DEFAULT_DOMSPEED_CATEGORIES.map((c) => ({
 id: c.id,
 name: c.name,
 iconKey: c.iconKey,
 }));
 }, [propCategories]);

 // Filtering states
 const [localSelectedCategory, setLocalSelectedCategory] = useState<string | null>(
 propSelectedCategoryId ?? null,
 );
 const currentCategory =
 propSelectedCategoryId !== undefined ? propSelectedCategoryId : localSelectedCategory;

 const [searchQuery, setSearchQuery] = useState("");
 const [stockFilter, setStockFilter] = useState<StockFilterType>("all");
 const [departmentFilter, setDepartmentFilter] = useState<string>("all");

 const handleCategorySelect = (categoryId: string | null) => {
 setLocalSelectedCategory(categoryId);
 onSelectCategory?.(categoryId);
 };

 const handleToggle = (itemId: string, newStatus: boolean) => {
 if (onToggleAvailability) {
 onToggleAvailability(itemId, newStatus);
 }
 // Update local state copy
 setInternalItems((prev) =>
 prev.map((item) => (item.id === itemId ? { ...item, isAvailable: newStatus } : item)),
 );
 };

 // Filter evaluation
 const filteredItems = useMemo(() => {
 return activeItems.filter((item) =>
 matchesItemFilters(item, currentCategory, departmentFilter, stockFilter, searchQuery),
 );
 }, [activeItems, currentCategory, departmentFilter, stockFilter, searchQuery]);

 // Overall metric counts
 const totalCount = activeItems.length;
 const inStockCount = useMemo(
 () => activeItems.filter((i) => i.isAvailable).length,
 [activeItems],
 );
 const outOfStockCount = totalCount - inStockCount;

 return (
 <section aria-label="Menu Items Catalog" className={`space-y-6 ${className}`}>
 {/* 1. Metric KPI Strip */}
 <MenuItemSummaryBar
 totalCount={totalCount}
 inStockCount={inStockCount}
 outOfStockCount={outOfStockCount}
 onAddNewItem={onAddNewItem}
 selectedCategoryId={currentCategory ?? undefined}
 />

 {/* 2. Category Pill Filter Navigation */}
 <CategoryPillTabs
 categories={activeCategories}
 selectedCategoryId={currentCategory}
 onSelectCategory={handleCategorySelect}
 />

 {/* 3. Search and Secondary Filters Bar */}
 <div className="flex flex-wrap items-center justify-between gap-3">
 {/* Instant Search Bar */}
 <div className="relative flex-1 min-w-[240px] max-w-md">
 <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
 <svg
 className="w-4 h-4"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
 />
 </svg>
 </div>
 <input
 type="search"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search dish name, code (e.g. KOT-402), station…"
 className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]"
 />
 {searchQuery && (
 <button
 type="button"
 aria-label="Clear search"
 onClick={() => setSearchQuery("")}
 className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
 >
 x
 </button>
 )}
 </div>

 {/* Secondary Department & Stock Status Segmented Filters */}
 <div className="flex flex-wrap items-center gap-2">
 {/* Department Filter */}
 <select
 value={departmentFilter}
 onChange={(e) => setDepartmentFilter(e.target.value)}
 aria-label="Filter by department"
 className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-apple-blue"
 >
 <option value="all">All Departments</option>
 <option value={Department.Kitchen}>Kitchen</option>
 <option value={Department.Bar}>Bar</option>
 <option value={Department.Spa}>Spa</option>
 <option value={Department.Housekeeping}>Housekeeping</option>
 </select>

 {/* Stock Filter Segmented Control */}
 <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 ">
 <button
 type="button"
 onClick={() => setStockFilter("all")}
 className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
 stockFilter === "all"
 ? "bg-white text-slate-900 shadow-sm"
 : "text-slate-500 hover:text-slate-900 "
 }`}
 >
 All
 </button>
 <button
 type="button"
 onClick={() => setStockFilter("in_stock")}
 className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
 stockFilter === "in_stock"
 ? "bg-emerald-500 text-white shadow-sm"
 : "text-slate-500 hover:text-slate-900 "
 }`}
 >
 In Stock
 </button>
 <button
 type="button"
 onClick={() => setStockFilter("out_of_stock")}
 className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
 stockFilter === "out_of_stock"
 ? "bg-rose-600 text-white shadow-sm"
 : "text-slate-500 hover:text-slate-900 "
 }`}
 >
 86&apos;d
 </button>
 </div>
 </div>
 </div>

 {/* 4. Dishes Bento Grid or Empty State */}
 {filteredItems.length === 0 ? (
 <MenuItemEmptyState
 onReset={() => {
 setSearchQuery("");
 setStockFilter("all");
 setDepartmentFilter("all");
 handleCategorySelect(null);
 }}
 />
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
 {filteredItems.map((item) => (
 <MenuItemCard
 key={item.id}
 item={item}
 onToggleAvailability={handleToggle}
 onEditItem={onEditItem}
 />
 ))}
 </div>
 )}
 </section>
 );
}
