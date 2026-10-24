/**
 * Allergen, Halal, Vegetarian, Vegan & Pork/Beef Free Dietary Badges.
 * Purpose-built for Sri Lankan multi-faith & international resort guests.
 * Conforms to Apple Human Interface Guidelines and Liquid Glass design tokens.
 */

import { useState } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type DietaryTag =
 | "VEGETARIAN"
 | "VEGAN"
 | "HALAL"
 | "CONTAINS_SHELLFISH"
 | "CONTAINS_PORK"
 | "CONTAINS_BEEF"
 | "GLUTEN_FREE"
 | "CONTAINS_NUTS"
 | "CONTAINS_DAIRY"
 | "SPICY_MILD"
 | "SPICY_MEDIUM"
 | "SPICY_HOT"
 | "SPICY_EXTRA_HOT";

export type DietaryCategory = "PREFERENCE" | "RELIGIOUS_FAITH" | "ALLERGEN_WARNING" | "SPICE_LEVEL";

export interface TrilingualContent {
 readonly en: string;
 readonly si: string;
 readonly ta: string;
}

export interface DietaryBadgeConfig {
 readonly id: DietaryTag;
 readonly shortCode: string;
 readonly category: DietaryCategory;
 readonly label: TrilingualContent;
 readonly description: TrilingualContent;
 readonly badgeClass: string;
 readonly borderClass: string;
 readonly textClass: string;
 readonly isAllergenWarning: boolean;
 readonly isReligiousWarning: boolean;
 readonly iconType:
 | "leaf"
 | "sprout"
 | "crescent"
 | "shellfish"
 | "pork"
 | "beef"
 | "wheat"
 | "nut"
 | "dairy"
 | "pepper";
}

export interface DietaryItemAttributes {
 readonly isVegetarian?: boolean | undefined;
 readonly isVegan?: boolean | undefined;
 readonly isHalal?: boolean | undefined;
 readonly isGlutenFree?: boolean | undefined;
 readonly containsShellfish?: boolean | undefined;
 readonly containsPork?: boolean | undefined;
 readonly containsBeef?: boolean | undefined;
 readonly containsNuts?: boolean | undefined;
 readonly containsDairy?: boolean | undefined;
 readonly spicyLevel?: number | undefined;
 readonly dietaryTags?: readonly (DietaryTag | string)[] | undefined;
}

export type DietaryBadgeSize = "xs" | "sm" | "md" | "lg";
export type DietaryBadgeVariant = "pill" | "compact" | "subtle" | "detailed";

// ============================================================================
// Dictionary & Configuration Registry
// ============================================================================

export const DIETARY_CONFIG_REGISTRY: Readonly<Record<DietaryTag, DietaryBadgeConfig>> = {
 VEGETARIAN: {
 id: "VEGETARIAN",
 shortCode: "VEG",
 category: "PREFERENCE",
 label: {
 en: "Vegetarian",
 si: "නිර්මාංශ",
 ta: "சைவம்",
 },
 description: {
 en: "Lacto-vegetarian: Prepared without meat, poultry, or fish. May contain dairy products.",
 si: "කිරි අඩංගු විය හැකි මස්, මාළු හෝ බිත්තර රහිත සම්ප්රදායික නිර්මාංශ ආහාරයකි.",
 ta: "பால் சேர்க்கப்படலாம். இறைச்சி, மீன், முட்டை இல்லாத சைவ உணவு.",
 },
 badgeClass: "bg-emerald-500/15 ",
 borderClass: "border-emerald-500/30 ",
 textClass: "text-emerald-700 ",
 isAllergenWarning: false,
 isReligiousWarning: false,
 iconType: "leaf",
 },
 VEGAN: {
 id: "VEGAN",
 shortCode: "VEGAN",
 category: "PREFERENCE",
 label: {
 en: "Vegan",
 si: "සම්පූර්ණ ශාකමය",
 ta: "முழு சைவம்",
 },
 description: {
 en: "100% plant-based: strictly free from milk, curd (meekiri), ghee, honey, eggs, and all animal products.",
 si: "100% ශාකමය: කිරි, මීකිරි, එළඟිතෙල්, බිත්තර හෝ කිසිදු සත්ව නිෂ්පාදනයක් අඩංගු නොවේ.",
 ta: "100% தாவர உணவு: பால், தயிர், நெய், முட்டை போன்ற எவ்வித விலங்குப் பொருட்களும் இல்லை.",
 },
 badgeClass: "bg-lime-500/15 ",
 borderClass: "border-lime-500/30 ",
 textClass: "text-lime-700 ",
 isAllergenWarning: false,
 isReligiousWarning: false,
 iconType: "sprout",
 },
 HALAL: {
 id: "HALAL",
 shortCode: "HALAL",
 category: "RELIGIOUS_FAITH",
 label: {
 en: "Halal Sourced",
 si: "හලාල් සහතිකලත්",
 ta: "ஹலால் சான்றளிக்கப்பட்டது",
 },
 description: {
 en: "Sourced from certified Halal suppliers. Prepared without pork, lard, or alcohol in separate utensils.",
 si: "හලාල් අනුමත කුකුළු මස්/ද්රව්ය වලින් සකස් කර ඇති අතර ඌරු මස් හෝ මධ්යසාර මිශ්ර නොවේ.",
 ta: "ஹலால் அங்கீகாரம் பெற்ற இறைச்சி. பன்றி இறைச்சி மற்றும் மது சேர்க்கப்படாமல் தயாரிக்கப்பட்டது.",
 },
 badgeClass: "bg-teal-500/15 ",
 borderClass: "border-teal-500/30 ",
 textClass: "text-teal-700 ",
 isAllergenWarning: false,
 isReligiousWarning: true,
 iconType: "crescent",
 },
 CONTAINS_SHELLFISH: {
 id: "CONTAINS_SHELLFISH",
 shortCode: "SHELLFISH",
 category: "ALLERGEN_WARNING",
 label: {
 en: "Contains Shellfish",
 si: "ඉස්සන් / කකුළුවන් අඩංගුයි",
 ta: "இறால் / சிப்பி மீன் உள்ளது",
 },
 description: {
 en: "Allergen Alert: Contains prawns, crab, lobster, or molluscs. Not suitable for crustacean allergy sufferers.",
 si: "ආසාත්මිකතා අවවාදයයි: ඉස්සන්, කකුළුවන් හෝ බෙල්ලන් අඩංගු බැවින් කවච ආසාත්මිකතා ඇති අයට නුසුදුසුය.",
 ta: "ஒவ்வாமை எச்சரிக்கை: இறால், நண்டு அல்லது சிப்பி மீன் உள்ளது. ஒவ்வாமை உள்ளவர்களுக்கு உகந்ததல்ல.",
 },
 badgeClass: "bg-amber-500/15 ",
 borderClass: "border-amber-500/30 ",
 textClass: "text-amber-700 ",
 isAllergenWarning: true,
 isReligiousWarning: false,
 iconType: "shellfish",
 },
 CONTAINS_PORK: {
 id: "CONTAINS_PORK",
 shortCode: "PORK",
 category: "RELIGIOUS_FAITH",
 label: {
 en: "Contains Pork",
 si: "ඌරු මස් අඩංගුයි",
 ta: "பன்றி இறைச்சி உள்ளது",
 },
 description: {
 en: "Contains pork, bacon, ham, or lard. Strictly non-Halal and non-Kosher.",
 si: "ඌරු මස්, බේකන් හෝ ඌරු තෙල් අඩංගු වේ. හලාල් නොවේ.",
 ta: "பன்றி இறைச்சி அல்லது கொழுப்பு உள்ளது. ஹலால் அல்ல.",
 },
 badgeClass: "bg-rose-500/15 ",
 borderClass: "border-rose-500/30 ",
 textClass: "text-rose-700 ",
 isAllergenWarning: false,
 isReligiousWarning: true,
 iconType: "pork",
 },
 CONTAINS_BEEF: {
 id: "CONTAINS_BEEF",
 shortCode: "BEEF",
 category: "RELIGIOUS_FAITH",
 label: {
 en: "Contains Beef",
 si: "ගව මස් අඩංගුයි",
 ta: "மாட்டிறைச்சி உள்ளது",
 },
 description: {
 en: "Contains beef or veal. Not suitable for Hindu guests or beef-abstaining Buddhist patrons.",
 si: "ගව මස් අඩංගු වන බැවින් හින්දු භක්තිකයින්ට හා ගවමස් නොගන්නා අයට නුසුදුසුය.",
 ta: "மாட்டிறைச்சி உள்ளது. இந்து பக்தர்கள் மற்றும் மாட்டிறைச்சி உண்ணாதவர்களுக்கு உகந்ததல்ல.",
 },
 badgeClass: "bg-red-500/15 ",
 borderClass: "border-red-500/30 ",
 textClass: "text-red-700 ",
 isAllergenWarning: false,
 isReligiousWarning: true,
 iconType: "beef",
 },
 GLUTEN_FREE: {
 id: "GLUTEN_FREE",
 shortCode: "GF",
 category: "ALLERGEN_WARNING",
 label: {
 en: "Gluten-Free",
 si: "ග්ලූටන් රහිත",
 ta: "பசையம் இல்லாதது",
 },
 description: {
 en: "Prepared without wheat, barley, or rye ingredients. Ideal for guests with celiac disease or gluten intolerance.",
 si: "තිරිඟු හෝ බාර්ලි නොමැතිව පිළියෙල කර ඇති අතර ග්ලූටන් ආසාත්මික අයට සුදුසුය.",
 ta: "கோதுமை அல்லது பார்லி இல்லாமல் தயாரிக்கப்பட்டது. பசையம் ஒவ்வாமை உள்ளவர்களுக்கு ஏற்றது.",
 },
 badgeClass: "bg-sky-500/15 ",
 borderClass: "border-sky-500/30 ",
 textClass: "text-sky-700 ",
 isAllergenWarning: true,
 isReligiousWarning: false,
 iconType: "wheat",
 },
 CONTAINS_NUTS: {
 id: "CONTAINS_NUTS",
 shortCode: "NUTS",
 category: "ALLERGEN_WARNING",
 label: {
 en: "Contains Nuts",
 si: "කජු / ඇට වර්ග අඩංගුයි",
 ta: "கொட்டைகள் / முந்திரி உள்ளது",
 },
 description: {
 en: "Contains tree nuts, cashews (kaju), or peanuts. Severe anaphylactic allergen risk.",
 si: "කජු හෝ රටකජු වැනි ඇට වර්ග අඩංගු බැවින් දැඩි ආසාත්මිකතා අවදානමක් ඇත.",
 ta: "முந்திரி அல்லது நிலக்கடலை உள்ளது. கடுமையான ஒவ்வாமை ஏற்படலாம்.",
 },
 badgeClass: "bg-amber-600/15 ",
 borderClass: "border-amber-600/30 ",
 textClass: "text-amber-800 ",
 isAllergenWarning: true,
 isReligiousWarning: false,
 iconType: "nut",
 },
 CONTAINS_DAIRY: {
 id: "CONTAINS_DAIRY",
 shortCode: "DAIRY",
 category: "ALLERGEN_WARNING",
 label: {
 en: "Contains Dairy",
 si: "කිරි නිෂ්පාදන අඩංගුයි",
 ta: "பால் பொருட்கள் உள்ளது",
 },
 description: {
 en: "Contains cow milk, butter, cheese, or curd (meekiri). Not suitable for lactose intolerant guests.",
 si: "එළකිරි, බටර්, චීස් හෝ මීකිරි අඩංගු බැවින් ලැක්ටෝස් නොඉවසන අයට නුසුදුසුය.",
 ta: "பசுவின் பால், வெண்ணெய், சீஸ் அல்லது தயிர் உள்ளது. லாக்டோஸ் ஒவ்வாமைக்கு உகந்ததல்ல.",
 },
 badgeClass: "bg-indigo-500/15 ",
 borderClass: "border-indigo-500/30 ",
 textClass: "text-indigo-700 ",
 isAllergenWarning: true,
 isReligiousWarning: false,
 iconType: "dairy",
 },
 SPICY_MILD: {
 id: "SPICY_MILD",
 shortCode: "MILD",
 category: "SPICE_LEVEL",
 label: {
 en: "Mild Spice",
 si: "මඳ සැර",
 ta: "குறைந்த காரம்",
 },
 description: {
 en: "Gentle tropical seasoning with mild Ceylon spices and coconut milk; very mild heat.",
 si: "මඳ ලංකා කුළුබඩු හා පොල්කිරි සමඟ සකස් කර ඇති අතර වැඩි සැරක් නැත.",
 ta: "மிதமான இலங்கை மசாலா மற்றும் தேங்காய்ப் பால் கொண்டு சமைக்கப்பட்டது.",
 },
 badgeClass: "bg-orange-500/15 ",
 borderClass: "border-orange-500/30 ",
 textClass: "text-orange-700 ",
 isAllergenWarning: false,
 isReligiousWarning: false,
 iconType: "pepper",
 },
 SPICY_MEDIUM: {
 id: "SPICY_MEDIUM",
 shortCode: "MED",
 category: "SPICE_LEVEL",
 label: {
 en: "Medium Spice",
 si: "මධ්යම සැර",
 ta: "நடுத்தர காரம்",
 },
 description: {
 en: "Traditional Sri Lankan balanced spice level with black pepper and roasted chili powder.",
 si: "සාම්ප්රදායික ලාංකීය රසයට ගැළපෙන සමබර ගම්මිරිස් හා මිරිස් කුඩු සැර.",
 ta: "பாரம்பரிய இலங்கை பாணியிலான சீரான மிளகு மற்றும் மிளகாய்த்தூள் காரம்.",
 },
 badgeClass: "bg-red-500/15 ",
 borderClass: "border-red-500/30 ",
 textClass: "text-red-700 ",
 isAllergenWarning: false,
 isReligiousWarning: false,
 iconType: "pepper",
 },
 SPICY_HOT: {
 id: "SPICY_HOT",
 shortCode: "HOT",
 category: "SPICE_LEVEL",
 label: {
 en: "Authentic Hot",
 si: "නියම සැර (දැවිල්ල)",
 ta: "அதிக காரம்",
 },
 description: {
 en: "Authentic spicy Ceylon devil/mirisata curry with crushed kochchi and green chilies.",
 si: "නියම ලාංකීය කොච්චි සහ අමුමිරිස් යොදා සකසන ලද දැවිල්ල සහිත සුවිශේෂී ව්යංජනයකි.",
 ta: "உண்மையான இலங்கை பாணி பச்சை மிளகாய் மற்றும் காரமான மசாலா கறி.",
 },
 badgeClass: "bg-rose-600/15 ",
 borderClass: "border-rose-600/30 ",
 textClass: "text-rose-700 ",
 isAllergenWarning: false,
 isReligiousWarning: false,
 iconType: "pepper",
 },
 SPICY_EXTRA_HOT: {
 id: "SPICY_EXTRA_HOT",
 shortCode: "EXTRA HOT",
 category: "SPICE_LEVEL",
 label: {
 en: "Dynamite Hot",
 si: "අතිශය සැර",
 ta: "மிக அதிக காரம்",
 },
 description: {
 en: "Extremely fiery: Prepared with indigenous hot Nai Miris (cobra chili). For adventurous eaters.",
 si: "නයි මිරිස් යෙදූ අතිශයින් සැර ආහාරයකි. ප්රවේශමෙන් රස බලන්න.",
 ta: "நை மிரிஸ் (நாக மிளகாய்) சேர்க்கப்பட்ட தீவிர காரம்.",
 },
 badgeClass: "bg-red-700/20 ",
 borderClass: "border-red-700/40 ",
 textClass: "text-red-800 ",
 isAllergenWarning: false,
 isReligiousWarning: false,
 iconType: "pepper",
 },
};

// ============================================================================
// Pure Domain & Normalization Helpers (Complexity <= 12)
// ============================================================================

/**
 * Normalizes shortcode strings or tag identifiers to canonical DietaryTag enum.
 */
export function normalizeDietaryTag(raw: string): DietaryTag | null {
 const clean = raw.trim().toUpperCase().replace(/[\s-]/g, "_");
 if (clean in DIETARY_CONFIG_REGISTRY) {
 return clean as DietaryTag;
 }
 switch (clean) {
 case "VEG":
 return "VEGETARIAN";
 case "PLANT_BASED":
 return "VEGAN";
 case "CRAB":
 case "PRAWN":
 case "SHRIMP":
 case "SEAFOOD":
 case "SHELLFISH":
 return "CONTAINS_SHELLFISH";
 case "PORK_FREE":
 return null;
 case "PORK":
 return "CONTAINS_PORK";
 case "BEEF_FREE":
 return null;
 case "BEEF":
 return "CONTAINS_BEEF";
 case "GF":
 case "GLUTENFREE":
 return "GLUTEN_FREE";
 case "PEANUT":
 case "CASHEW":
 case "NUT":
 return "CONTAINS_NUTS";
 case "MILK":
 case "LACTOSE":
 return "CONTAINS_DAIRY";
 case "MILD":
 return "SPICY_MILD";
 case "MEDIUM":
 return "SPICY_MEDIUM";
 case "HOT":
 case "SPICY":
 return "SPICY_HOT";
 case "EXTRA_HOT":
 case "VERY_HOT":
 return "SPICY_EXTRA_HOT";
 default:
 return null;
 }
}

/**
 * Resolves an active list of canonical DietaryTags from item attributes or tag lists.
 */
export function resolveDietaryBadges(
 input: DietaryItemAttributes | readonly (DietaryTag | string)[],
): DietaryTag[] {
 if (Array.isArray(input)) {
 return resolveTagsFromArray(input);
 }
 return resolveTagsFromAttributes(input as DietaryItemAttributes);
}

function resolveTagsFromArray(list: readonly (DietaryTag | string)[]): DietaryTag[] {
 const result: DietaryTag[] = [];
 for (const item of list) {
 const norm = normalizeDietaryTag(item);
 if (norm && !result.includes(norm)) {
 result.push(norm);
 }
 }
 return result;
}

function appendPlantBasedBadges(attrs: DietaryItemAttributes, result: DietaryTag[]): void {
 if (attrs.isVegan) {
 result.push("VEGAN");
 } else if (attrs.isVegetarian) {
 result.push("VEGETARIAN");
 }
}

function appendFaithBadges(attrs: DietaryItemAttributes, result: DietaryTag[]): void {
 if (attrs.isHalal) {
 result.push("HALAL");
 }
 if (attrs.containsPork) {
 result.push("CONTAINS_PORK");
 }
 if (attrs.containsBeef) {
 result.push("CONTAINS_BEEF");
 }
}

function appendAllergenBadges(attrs: DietaryItemAttributes, result: DietaryTag[]): void {
 if (attrs.containsShellfish) {
 result.push("CONTAINS_SHELLFISH");
 }
 if (attrs.containsNuts) {
 result.push("CONTAINS_NUTS");
 }
 if (attrs.containsDairy) {
 result.push("CONTAINS_DAIRY");
 }
 if (attrs.isGlutenFree) {
 result.push("GLUTEN_FREE");
 }
}

function appendExtraTags(attrs: DietaryItemAttributes, result: DietaryTag[]): void {
 if (attrs.spicyLevel !== undefined && attrs.spicyLevel > 0) {
 const spiceTag = mapSpiceLevelToTag(attrs.spicyLevel);
 if (spiceTag) {
 result.push(spiceTag);
 }
 }

 if (attrs.dietaryTags && attrs.dietaryTags.length > 0) {
 for (const raw of attrs.dietaryTags) {
 const norm = normalizeDietaryTag(raw);
 if (norm && !result.includes(norm)) {
 result.push(norm);
 }
 }
 }
}

function resolveTagsFromAttributes(attrs: DietaryItemAttributes): DietaryTag[] {
 const result: DietaryTag[] = [];
 appendPlantBasedBadges(attrs, result);
 appendFaithBadges(attrs, result);
 appendAllergenBadges(attrs, result);
 appendExtraTags(attrs, result);
 return result;
}

function mapSpiceLevelToTag(level: number): DietaryTag | null {
 if (level <= 0) return null;
 if (level === 1) return "SPICY_MILD";
 if (level === 2) return "SPICY_MEDIUM";
 if (level === 3) return "SPICY_HOT";
 if (level >= 4) return "SPICY_EXTRA_HOT";
 return null;
}

/**
 * Checks if a dish contains high-risk allergens (shellfish, nuts, dairy, or faith alerts).
 */
export function hasAllergenWarnings(
 input: DietaryItemAttributes | readonly (DietaryTag | string)[],
): boolean {
 const tags = resolveDietaryBadges(input);
 return tags.some((t) => {
 const conf = DIETARY_CONFIG_REGISTRY[t];
 return conf?.isAllergenWarning || conf?.isReligiousWarning;
 });
}

/**
 * Retrieves configuration for a given dietary tag.
 */
export function getDietaryBadgeConfig(tag: DietaryTag): DietaryBadgeConfig {
 return DIETARY_CONFIG_REGISTRY[tag];
}

/**
 * Returns localized label for spicy chili pepper meter.
 */
export function getSpicinessLabel(level: number, language: SupportedLanguage = "en"): string {
 const tag = mapSpiceLevelToTag(level);
 if (!tag) {
 return language === "si" ? "සැර නැත" : language === "ta" ? "காரம் இல்லை" : "Not Spicy";
 }
 const conf = DIETARY_CONFIG_REGISTRY[tag];
 return conf.label[language] ?? conf.label.en;
}

// ============================================================================
// SVG Micro-Icons (Apple HIG Vector Craft)
// ============================================================================

export function DietaryIcon({
 type,
 className = "w-3 h-3",
}: {
 readonly type: DietaryBadgeConfig["iconType"];
 readonly className?: string | undefined;
}) {
 switch (type) {
 case "leaf":
 return (
 <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
 <path
 fillRule="evenodd"
 d="M10 2a8 8 0 100 16 8 8 0 000-16zm-1 5a1 1 0 112 0v6a1 1 0 11-2 0V7z"
 clipRule="evenodd"
 />
 </svg>
 );
 case "sprout":
 return (
 <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
 <path d="M11 2a1 1 0 011 1v1.171c3.054.453 5.426 2.825 5.879 5.879A1 1 0 0117 11h-1.171a7.994 7.994 0 01-2.95 4.879A1 1 0 0111 16v2a1 1 0 11-2 0v-2a1 1 0 01-.879-.121A7.994 7.994 0 015.171 11H4a1 1 0 01-.879-.95C3.574 6.996 5.946 4.624 9 4.171V3a1 1 0 011-1z" />
 </svg>
 );
 case "crescent":
 return (
 <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
 <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
 </svg>
 );
 case "shellfish":
 return (
 <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
 <path
 fillRule="evenodd"
 d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
 clipRule="evenodd"
 />
 </svg>
 );
 case "pork":
 case "beef":
 return (
 <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
 <path
 fillRule="evenodd"
 d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
 clipRule="evenodd"
 />
 </svg>
 );
 case "wheat":
 return (
 <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
 <path
 fillRule="evenodd"
 d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
 clipRule="evenodd"
 />
 </svg>
 );
 case "pepper":
 return (
 <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
 <path
 fillRule="evenodd"
 d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.636.982-.873 2.126-.957 3.25-.084 1.127.018 2.259.356 3.328.675 2.138 2.124 3.985 4.095 4.975a1 1 0 001.378-1.258 7.97 7.97 0 01-.606-2.912c.03-.984.343-1.956.883-2.812a1 1 0 00-.236-1.336 6.012 6.012 0 00-2.64-3.73z"
 clipRule="evenodd"
 />
 </svg>
 );
 default:
 return (
 <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
 <circle cx="10" cy="10" r="8" />
 </svg>
 );
 }
}

// ============================================================================
// Component 1: Single DietaryBadge
// ============================================================================

export interface DietaryBadgeProps {
 readonly tag: DietaryTag | string;
 readonly size?: DietaryBadgeSize | undefined;
 readonly variant?: DietaryBadgeVariant | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly showIcon?: boolean | undefined;
 readonly interactive?: boolean | undefined;
 readonly onClick?: ((tag: DietaryTag) => void) | undefined;
 readonly className?: string | undefined;
}

export function DietaryBadge({
 tag,
 size = "sm",
 variant = "pill",
 language = "en",
 showIcon = true,
 interactive = false,
 onClick,
 className = "",
}: DietaryBadgeProps) {
 const norm = normalizeDietaryTag(tag);
 if (!norm) return null;

 const conf = DIETARY_CONFIG_REGISTRY[norm];
 const labelText = conf.label[language] ?? conf.label.en;
 const descriptionText = conf.description[language] ?? conf.description.en;

 const sizeClasses = getSizeClasses(size);
 const variantClasses = getVariantClasses(variant, conf);
 const interactiveClasses = interactive
 ? "cursor-pointer active:scale-[0.96] transition-transform duration-200 select-none hover:opacity-90"
 : "";

 const titleTooltip = `${labelText} (${conf.shortCode}): ${descriptionText}`;

 return (
 <span
 className={`inline-flex items-center gap-1 font-semibold rounded-lg border transition-all ${sizeClasses} ${variantClasses} ${interactiveClasses} ${className}`}
 title={titleTooltip}
 role={interactive ? "button" : "status"}
 tabIndex={interactive ? 0 : undefined}
 onClick={() => onClick?.(norm)}
 onKeyDown={(e) => {
 if (interactive && (e.key === "Enter" || e.key === " ")) {
 e.preventDefault();
 onClick?.(norm);
 }
 }}
 data-testid={`dietary-badge-${norm.toLowerCase()}`}
 data-category={conf.category}
 >
 {showIcon && <DietaryIcon type={conf.iconType} className={getIconSize(size)} />}
 <span>{variant === "compact" ? conf.shortCode : labelText}</span>
 </span>
 );
}

function getSizeClasses(size: DietaryBadgeSize): string {
 switch (size) {
 case "xs":
 return "text-[9px] px-1 py-0.2 tracking-tight";
 case "sm":
 return "text-[10px] px-1.5 py-0.5 tracking-tight";
 case "md":
 return "text-xs px-2.5 py-1 tracking-normal";
 case "lg":
 return "text-sm px-3.5 py-1.5 font-bold tracking-normal min-h-11";
 }
}

function getIconSize(size: DietaryBadgeSize): string {
 switch (size) {
 case "xs":
 return "w-2.5 h-2.5 shrink-0";
 case "sm":
 return "w-3 h-3 shrink-0";
 case "md":
 return "w-3.5 h-3.5 shrink-0";
 case "lg":
 return "w-4 h-4 shrink-0";
 }
}

function getVariantClasses(variant: DietaryBadgeVariant, conf: DietaryBadgeConfig): string {
 switch (variant) {
 case "compact":
 case "pill":
 return `${conf.badgeClass} ${conf.borderClass} ${conf.textClass}`;
 case "subtle":
 return `bg-apple-gray-100 border-apple-gray-200 ${conf.textClass}`;
 case "detailed":
 return `${conf.badgeClass} ${conf.borderClass} ${conf.textClass} shadow-sm`;
 }
}

// ============================================================================
// Component 2: DietaryBadges / DietaryBadgeGroup
// ============================================================================

export interface DietaryBadgesProps {
 readonly item?: DietaryItemAttributes | undefined;
 readonly tags?: readonly (DietaryTag | string)[] | undefined;
 readonly size?: DietaryBadgeSize | undefined;
 readonly variant?: DietaryBadgeVariant | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly maxVisible?: number | undefined;
 readonly showModalOnMore?: boolean | undefined;
 readonly className?: string | undefined;
 readonly onBadgeClick?: ((tag: DietaryTag) => void) | undefined;
}

export function DietaryBadges({
 item,
 tags,
 size = "sm",
 variant = "pill",
 language = "en",
 maxVisible,
 showModalOnMore = true,
 className = "",
 onBadgeClick,
}: DietaryBadgesProps) {
 const [selectedTag, setSelectedTag] = useState<DietaryTag | null>(null);
 const [isModalOpen, setIsModalOpen] = useState(false);

 const resolved = item ? resolveDietaryBadges(item) : tags ? resolveDietaryBadges(tags) : [];

 if (resolved.length === 0) {
 return null;
 }

 const hasLimit = maxVisible !== undefined && maxVisible > 0 && resolved.length > maxVisible;
 const visibleTags = hasLimit ? resolved.slice(0, maxVisible) : resolved;
 const overflowCount = hasLimit ? resolved.length - maxVisible : 0;

 const handleBadgeClick = (tag: DietaryTag) => {
 setSelectedTag(tag);
 if (showModalOnMore) {
 setIsModalOpen(true);
 }
 onBadgeClick?.(tag);
 };

 return (
 <>
 <div
 className={`flex flex-wrap items-center gap-1.5 ${className}`}
 data-testid="dietary-badges-group"
 >
 {visibleTags.map((tag) => (
 <DietaryBadge
 key={tag}
 tag={tag}
 size={size}
 variant={variant}
 language={language}
 interactive={true}
 onClick={handleBadgeClick}
 />
 ))}

 {overflowCount > 0 && (
 <button
 type="button"
 className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-apple-gray-200 text-apple-gray-700 border border-apple-gray-300 cursor-pointer active:scale-[0.96] transition-transform duration-200"
 title="View all dietary classifications & allergen advisory"
 onClick={() => setIsModalOpen(true)}
 data-testid="dietary-badges-more-button"
 >
 +{overflowCount} more
 </button>
 )}
 </div>

 {/* Accessible Apple Liquid Glass Dialog Modal */}
 {isModalOpen && (
 <DietaryAllergenModal
 tags={resolved}
 initialSelectedTag={selectedTag}
 language={language}
 onClose={() => {
 setIsModalOpen(false);
 setSelectedTag(null);
 }}
 />
 )}
 </>
 );
}

// ============================================================================
// Component 3: DietaryAllergenModal (Apple Liquid Glass Modal Sheet)
// ============================================================================

export interface DietaryAllergenModalProps {
 readonly tags: readonly DietaryTag[];
 readonly initialSelectedTag?: DietaryTag | null | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly onClose: () => void;
}

export function DietaryAllergenModal({
 tags,
 initialSelectedTag,
 language = "en",
 onClose,
}: DietaryAllergenModalProps) {
 const [activeHighlight, setActiveHighlight] = useState<DietaryTag | null>(
 initialSelectedTag ?? (tags.length > 0 ? (tags[0] ?? null) : null),
 );

 const modalTitle =
 language === "si"
 ? "ආහාර හා ආසාත්මිකතා විස්තරය"
 : language === "ta"
 ? "உணவு மற்றும் ஒவ்வாமை விபரம்"
 : "Dietary & Allergen Information";

 const closeBtnText = language === "si" ? "වසන්න" : language === "ta" ? "மூடுக" : "Close";

 return (
 <dialog
 open
 className="fixed inset-0 z-50 flex items-center justify-center p-4 w-full h-full bg-black/45 backdrop-blur-sm border-0"
 aria-modal="true"
 aria-labelledby="dietary-modal-title"
 data-testid="dietary-allergen-modal"
 >
 <div className="relative w-full max-w-lg rounded-2xl apple-liquid-glass p-6 text-apple-gray-900 shadow-2xl border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-200">
 {/* Header */}
 <div className="flex items-center justify-between pb-4 border-b border-apple-gray-200 ">
 <div>
 <h3 id="dietary-modal-title" className="text-lg font-bold">
 {modalTitle}
 </h3>
 <p className="text-xs text-apple-gray-500 mt-0.5">
 Sri Lankan Multi-Faith & Allergen Safety Standard
 </p>
 </div>
 <button
 type="button"
 className="w-9 h-9 rounded-full flex items-center justify-center bg-apple-gray-200/60 text-apple-gray-600 hover:bg-apple-gray-300 cursor-pointer active:scale-[0.95] transition-all"
 onClick={onClose}
 aria-label="Close modal"
 >
 x
 </button>
 </div>

 {/* Badges List */}
 <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
 {tags.map((t) => {
 const conf = DIETARY_CONFIG_REGISTRY[t];
 const isHighlighted = activeHighlight === t;
 return (
 <button
 type="button"
 key={t}
 className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
 isHighlighted
 ? `${conf.badgeClass} ${conf.borderClass} ring-2 ring-apple-blue/30`
 : "bg-apple-gray-100/70 border-apple-gray-200/60 "
 }`}
 onClick={() => setActiveHighlight(t)}
 >
 <div className="flex items-center justify-between mb-1">
 <div className="flex items-center gap-2">
 <span
 className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-md ${conf.badgeClass} ${conf.textClass}`}
 >
 <DietaryIcon type={conf.iconType} className="w-3.5 h-3.5" />
 {conf.shortCode}
 </span>
 <span className="font-semibold text-sm">
 {conf.label[language] ?? conf.label.en}
 </span>
 </div>

 {conf.isAllergenWarning && (
 <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 ">
 Allergen
 </span>
 )}
 {conf.isReligiousWarning && (
 <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-700 ">
 Faith Tag
 </span>
 )}
 </div>

 <p className="text-xs text-apple-gray-600 leading-relaxed mt-1.5">
 {conf.description[language] ?? conf.description.en}
 </p>
 </button>
 );
 })}
 </div>

 {/* Cross-Contamination Kitchen Advisory Banner */}
 <div className="mt-4 p-3 rounded-xl bg-apple-gray-100 border border-apple-gray-200 text-[11px] text-apple-gray-500 leading-normal flex items-start gap-2">
 <span className="text-amber-500 font-bold shrink-0">ℹ</span>
 <span>
 {language === "si"
 ? "අපගේ මුළුතැන්ගෙයි කවච මත්ස්ය, කජු සහ කිරි නිෂ්පාදන පරිහරණය කෙරේ. දැඩි ආසාත්මිකතා ඇත්නම් ඇණවුම් කිරීමට පෙර සේවක මණ්ඩලය දැනුවත් කරන්න."
 : language === "ta"
 ? "எங்கள் சமையலறையில் கொட்டைகள், பால் மற்றும் சிப்பி மீன்கள் கையாளப்படுகின்றன. கடுமையான ஒவ்வாமை இருந்தால் ஊழியர்களிடம் தெரிவிக்கவும்."
 : "Cross-Contact Notice: Kitchen prepares items containing shellfish, tree nuts, and dairy. Please inform service staff of severe food allergies prior to ordering."}
 </span>
 </div>

 {/* Footer */}
 <div className="mt-5 flex justify-end">
 <button
 type="button"
 className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-[#0B6E4F] text-white shadow hover:bg-[#0B6E4F]/90 cursor-pointer active:scale-[0.97] transition-all min-h-11"
 onClick={onClose}
 >
 {closeBtnText}
 </button>
 </div>
 </div>
 </dialog>
 );
}

// ============================================================================
// Component 4: SpicyChiliBar (Visual Hotness Meter)
// ============================================================================

export interface SpicyChiliBarProps {
 readonly level: number; // 0 to 4
 readonly maxLevel?: number | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly showLabel?: boolean | undefined;
 readonly className?: string | undefined;
}

export function SpicyChiliBar({
 level,
 maxLevel = 3,
 language = "en",
 showLabel = true,
 className = "",
}: SpicyChiliBarProps) {
 if (level <= 0) return null;

 const peppers = Array.from({ length: maxLevel }, (_, i) => i + 1);
 const label = getSpicinessLabel(level, language);

 return (
 <div
 className={`inline-flex items-center gap-1.5 ${className}`}
 title={`Spiciness: ${label}`}
 data-testid="spicy-chili-bar"
 >
 <div className="flex items-center gap-0.5">
 {peppers.map((idx) => {
 const isActive = idx <= level;
 return (
 <span
 key={idx}
 className={`text-xs transition-opacity ${
 isActive ? "opacity-100 scale-105" : "opacity-25 grayscale"
 }`}
 >
 Spicy
 </span>
 );
 })}
 </div>
 {showLabel && (
 <span className="text-[10px] font-bold text-red-600 uppercase tracking-tight">
 {label}
 </span>
 )}
 </div>
 );
}
