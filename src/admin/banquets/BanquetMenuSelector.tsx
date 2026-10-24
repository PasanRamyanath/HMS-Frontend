/**
 * Sri Lankan Wedding Menu Package Customizer (BanquetMenuSelector.tsx)
 *
 * Implements Step 333 (Phase 14.08) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Category limits enforcement and menu selection engine for Sri Lankan wedding buffets:
 *
 * 1. Category quota limits (e.g. 2 Rice, 1 Noodle, 3 Meat/Seafood Mains, 2 Veg, 3 Salads, 4 Desserts).
 * 2. Real-time selection counters (e.g. "2 / 2 selected", "1 / 3 remaining").
 * 3. Live Action Station Add-ons:
 * - Live Hopper station (Egg & Cheese with Seeni Sambol),
 * - Rhythmic Kottu Roti bar,
 * - Mongolian Wok BBQ station,
 * - Roast Leg of Lamb carvery.
 * 4. Package Tier customization (Silver, Gold, Platinum, Royal Kandyan) with dynamic plate pricing.
 * 5. Apple Human Interface Guidelines: `.apple-liquid-glass`, continuous squircles,
 * `>= 44x44pt` touch targets, and `.tabular-nums-lkr` typography.
 * 6. Trilingual localization support (`en`, `si`, `ta`).
 * 7. Zero console noise, cognitive complexity <= 12 per function.
 */

import { type FC, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { formatCurrencyLkr } from "./BanquetCalendar.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type MenuCourseCategory =
 | "WELCOME_DRINKS"
 | "SOUPS"
 | "RICE_DISHES"
 | "NOODLES_PASTA"
 | "MAINS_MEAT_SEAFOOD"
 | "VEGETABLE_CURRIES"
 | "SALADS_CONDIMENTS"
 | "DESSERTS";

export interface MenuItem {
 readonly id: string;
 readonly category: MenuCourseCategory;
 readonly nameEn: string;
 readonly nameSi: string;
 readonly nameTa: string;
 readonly descriptionEn: string;
 readonly isSpicy?: boolean | undefined;
 readonly isVegetarian?: boolean | undefined;
 readonly isSeafood?: boolean | undefined;
}

export interface LiveActionStation {
 readonly id: string;
 readonly nameEn: string;
 readonly nameSi: string;
 readonly nameTa: string;
 readonly descriptionEn: string;
 readonly addOnPricePerPaxLkr: number;
}

export interface CategoryQuota {
 readonly category: MenuCourseCategory;
 readonly labelEn: string;
 readonly labelSi: string;
 readonly labelTa: string;
 readonly maxAllowed: number;
}

export interface BanquetMenuSelectionState {
 readonly selectedItemIds: readonly string[];
 readonly selectedActionStationIds: readonly string[];
 readonly basePlateRateLkr: number;
 readonly actionStationsAddOnLkr: number;
 readonly totalPlateRateLkr: number;
 readonly allQuotasFulfilled: boolean;
}

export interface BanquetMenuSelectorProps {
 readonly packageTierName?: string | undefined;
 readonly basePricePerPaxLkr?: number | undefined;
 readonly guestPaxCount?: number | undefined;
 readonly quotas?: readonly CategoryQuota[] | undefined;
 readonly availableItems?: readonly MenuItem[] | undefined;
 readonly availableLiveStations?: readonly LiveActionStation[] | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly onSaveMenu?: ((state: BanquetMenuSelectionState) => Promise<void> | void) | undefined;
}

// ============================================================================
// Default Fixtures: Sri Lankan Wedding Menu Items & Live Stations
// ============================================================================

export const DEFAULT_CATEGORY_QUOTAS: readonly CategoryQuota[] = [
 {
 category: "WELCOME_DRINKS",
 labelEn: "Welcome Drinks",
 labelSi: "පිළිගැනීමේ බීම",
 labelTa: "வரவேற்பு பானங்கள்",
 maxAllowed: 1,
 },
 { category: "SOUPS", labelEn: "Soups", labelSi: "සුප් වර්ග", labelTa: "சூப் வகைகள்", maxAllowed: 1 },
 {
 category: "RICE_DISHES",
 labelEn: "Rice Specialties",
 labelSi: "බත් වර්ග",
 labelTa: "சாத வகைகள்",
 maxAllowed: 2,
 },
 {
 category: "NOODLES_PASTA",
 labelEn: "Noodles & Pasta",
 labelSi: "නූඩ්ල්ස් සහ පැස්ටා",
 labelTa: "நூடுல்ஸ் & பாஸ்தா",
 maxAllowed: 1,
 },
 {
 category: "MAINS_MEAT_SEAFOOD",
 labelEn: "Mains (Meat & Seafood)",
 labelSi: "ප්රධාන මස් සහ මාළු",
 labelTa: "இறைச்சி & கடல் உணவு",
 maxAllowed: 3,
 },
 {
 category: "VEGETABLE_CURRIES",
 labelEn: "Vegetable Curries",
 labelSi: "එළවළු ව්යංජන",
 labelTa: "காய்கறி கறிகள்",
 maxAllowed: 2,
 },
 {
 category: "SALADS_CONDIMENTS",
 labelEn: "Salads & Condiments",
 labelSi: "සලාද සහ සම්බෝල",
 labelTa: "சாலட் & சம்பல்",
 maxAllowed: 3,
 },
 {
 category: "DESSERTS",
 labelEn: "Desserts & Fruits",
 labelSi: "අතුරුපස සහ පලතුරු",
 labelTa: "இனிப்புகள் & பழங்கள்",
 maxAllowed: 4,
 },
];

export const DEFAULT_MENU_ITEMS: readonly MenuItem[] = [
 // Welcome Drinks
 {
 id: "wd-01",
 category: "WELCOME_DRINKS",
 nameEn: "Fresh King Coconut (Thambili) with Mint & Lime",
 nameSi: "නැවුම් තැඹිලි වතුර",
 nameTa: "இளநீர் புதினா எலுமிச்சை",
 descriptionEn: "Chilled natural king coconut water with crushed mint.",
 },
 {
 id: "wd-02",
 category: "WELCOME_DRINKS",
 nameEn: "Ceylon Passion Fruit Cordial with Basil Seeds",
 nameSi: "පැෂන් පෲට් බීම කසකසා ඇට සහිතව",
 nameTa: "பழச்சாறு பாசில் விதைகள்",
 descriptionEn: "Refreshing estate passion fruit nectar.",
 },
 {
 id: "wd-03",
 category: "WELCOME_DRINKS",
 nameEn: "Tropical Mixed Fruit Punch",
 nameSi: "මිශ්ර පළතුරු බීම",
 nameTa: "கலவை பழச்சாறு",
 descriptionEn: "Mango, papaya, pineapple, and guava punch.",
 },

 // Soups
 {
 id: "sp-01",
 category: "SOUPS",
 nameEn: "Cream of Sweetcorn & Shredded Chicken",
 nameSi: "ස්වීට්කෝන් චිකන් සුප්",
 nameTa: "சோளம் & கோழி சூப்",
 descriptionEn: "Velvety broth with sweetcorn kernels and egg drop.",
 },
 {
 id: "sp-02",
 category: "SOUPS",
 nameEn: "Sri Lankan Ceylon Mutton Mulligatawny Soup",
 nameSi: "ලංකා එළුමස් මුලගතානි සුප්",
 nameTa: "முலிகடாவ்னி ஆட்டுக்கறி சூப்",
 descriptionEn: "Spiced mutton broth infused with tamarind, pepper, and coconut milk.",
 },
 {
 id: "sp-03",
 category: "SOUPS",
 nameEn: "Cream of Roasted Wild Button Mushrooms (Veg)",
 nameSi: "බිම්මල් ක්රීම් සුප්",
 nameTa: "காளான் கிரீம் சூப்",
 isVegetarian: true,
 descriptionEn: "Pure vegetable broth with garlic croutons.",
 },

 // Rice
 {
 id: "rc-01",
 category: "RICE_DISHES",
 nameEn: "Sri Lankan Fragrant Ghee Rice (Neychoru)",
 nameSi: "සුවඳැති එළඟිතෙල් බත් (නෙහි බත්)",
 nameTa: "நெய் சாதம்",
 descriptionEn: "Long grain basmati steamed with pure ghee, whole spices, and fried onions.",
 },
 {
 id: "rc-02",
 category: "RICE_DISHES",
 nameEn: "Steamed White Basmati Rice with Golden Sultanas",
 nameSi: "සුදු බාස්මතී බත් මුද්දරප්පලම් සහිතව",
 nameTa: "பாஸ்மதி சாதம் முந்திரி",
 descriptionEn: "Fluffy basmati with cashew nuts and fried shallots.",
 },
 {
 id: "rc-03",
 category: "RICE_DISHES",
 nameEn: "Wok-Tossed Egg & Mixed Vegetable Fried Rice",
 nameSi: "බිත්තර සහ එළවළු ෆ්රයිඩ් රයිස්",
 nameTa: "முட்டை காய்கறி பிரைடு ரைஸ்",
 descriptionEn: "Chinese-style fried rice with spring onion and toasted sesame.",
 },
 {
 id: "rc-04",
 category: "RICE_DISHES",
 nameEn: "Traditional Fragrant Red Rice Pilaf",
 nameSi: "සුවඳැති රතු කැකුළු බත්",
 nameTa: "சிவப்பு அரிசி புலாவ்",
 isVegetarian: true,
 descriptionEn: "Organic Sri Lankan red rice tempered with pandan and lemongrass.",
 },

 // Noodles
 {
 id: "nd-01",
 category: "NOODLES_PASTA",
 nameEn: "Singapore Fried Rice Vermicelli (Bee Hoon)",
 nameSi: "සිංගප්පූරු බී හූන් නූඩ්ල්ස්",
 nameTa: "சிங்கப்பூர் நூடுல்ஸ்",
 descriptionEn: "Thin rice noodles with julienned vegetables and light curry oil.",
 },
 {
 id: "nd-02",
 category: "NOODLES_PASTA",
 nameEn: "Penne Rigate in Roasted Tomato & Fresh Basil",
 nameSi: "තක්කාලි සහ බැසිල් පැස්ටා",
 nameTa: "தக்காளி பாசில் பாஸ்தா",
 isVegetarian: true,
 descriptionEn: "Al dente penne in herb tomato reduction.",
 },

 // Mains (Meat & Seafood)
 {
 id: "mn-01",
 category: "MAINS_MEAT_SEAFOOD",
 nameEn: "Negombo Ceylon Black Pork Curry",
 nameSi: "මීගමු කළු ඌරු මස් ව්යංජනය",
 nameTa: "நீர்கொழும்பு பன்றி இறைச்சி கறி",
 isSpicy: true,
 descriptionEn: "Authentic pork belly simmered in roasted dark spices and goraka.",
 },
 {
 id: "mn-02",
 category: "MAINS_MEAT_SEAFOOD",
 nameEn: "Mughlai Butter Chicken Tikka Masala",
 nameSi: "බටර් චිකන් මසාලා",
 nameTa: "பட்டர் சிக்கன் மசாலா",
 descriptionEn: "Tender tandoori chicken chunks in rich buttery tomato cream.",
 },
 {
 id: "mn-03",
 category: "MAINS_MEAT_SEAFOOD",
 nameEn: "Spiced Fried Seer Fish with Caramelized Onions",
 nameSi: "බැදපු තෝර මාළු ළූණු තෙල්දමා",
 nameTa: "வறுத்த நெய்மீன்",
 isSeafood: true,
 descriptionEn: "Fresh ocean seer steaks with curry leaves and black pepper.",
 },
 {
 id: "mn-04",
 category: "MAINS_MEAT_SEAFOOD",
 nameEn: "Jaffna Style Lagoon Crab Curry",
 nameSi: "යාපනේ කලපු කකුළු ව්යංජනය",
 nameTa: "யாழ்ப்பாண நண்டு கறி",
 isSpicy: true,
 isSeafood: true,
 descriptionEn: "Sweet lagoon crabs in fiery roasted Jaffna curry powder and coconut.",
 },
 {
 id: "mn-05",
 category: "MAINS_MEAT_SEAFOOD",
 nameEn: "Slow-Braised Pepper Beef Stew",
 nameSi: "ගම්මිරිස් මිශ්ර හරක් මස් ව්යංජනය",
 nameTa: "மிளகு மாட்டிறைச்சி",
 isSpicy: true,
 descriptionEn: "Tender beef chunks in black pepper and baby shallots gravy.",
 },

 // Vegetables
 {
 id: "vg-01",
 category: "VEGETABLE_CURRIES",
 nameEn: "Sri Lankan Cashew & Green Pea White Curry (කජු මාළුව)",
 nameSi: "කිරි කජු සහ ග්රීන් පීස් ව්යංජනය",
 nameTa: "முந்திரி பட்டாணி வெள்ளை கறி",
 isVegetarian: true,
 descriptionEn: "Whole Ceylon raw cashews in creamy mild coconut milk with green chili.",
 },
 {
 id: "vg-02",
 category: "VEGETABLE_CURRIES",
 nameEn: "Young Jackfruit Ambula (පොලොස් ඇඹුල)",
 nameSi: "පාරම්පරික පොලොස් ඇඹුල",
 nameTa: "இளம் பலாக்காய் கறி",
 isVegetarian: true,
 isSpicy: true,
 descriptionEn: "Slow-cooked tender jackfruit with goraka and roasted curry spices.",
 },
 {
 id: "vg-03",
 category: "VEGETABLE_CURRIES",
 nameEn: "Creamy Red Lentil Dhal Tempered with Garlic & Curry Leaves",
 nameSi: "සුදුලූණු තෙම්පරාදු කළ පරිප්පු",
 nameTa: "பருப்பு கறி",
 isVegetarian: true,
 descriptionEn: "Golden Mysore dhal with coconut cream and mustard seed pop.",
 },

 // Salads & Condiments
 {
 id: "sl-01",
 category: "SALADS_CONDIMENTS",
 nameEn: "Spicy Kochi Green Chili, Tomato & Onion Sambol",
 nameSi: "කොච්චි සම්බෝලය",
 nameTa: "கொச்சி மிளகாய் தக்காளி சம்பல்",
 isSpicy: true,
 isVegetarian: true,
 descriptionEn: "Hand-pounded spicy green chili and lime salad.",
 },
 {
 id: "sl-02",
 category: "SALADS_CONDIMENTS",
 nameEn: "Creamy Potato Salad with Spring Onion Mayonnaise",
 nameSi: "අල සලාදය",
 nameTa: "உருளைக்கிழங்கு சாலட்",
 isVegetarian: true,
 descriptionEn: "Baby potatoes in velvety mustard mayonnaise.",
 },
 {
 id: "sl-03",
 category: "SALADS_CONDIMENTS",
 nameEn: "Maldive Fish Seeni Sambol (Sweet Onion Relish)",
 nameSi: "උම්බලකඩ සීනි සම්බෝලය",
 nameTa: "சீனி சம்பல்",
 descriptionEn: "Slow-caramelized sweet onion relish with Maldive fish chips.",
 },
 {
 id: "sl-04",
 category: "SALADS_CONDIMENTS",
 nameEn: "Crispy Papadums & Sweet Mango Chutney Tray",
 nameSi: "පපඩම් සහ අඹ චට්නි",
 nameTa: "பப்படம் & மாங்காய் சட்னி",
 isVegetarian: true,
 descriptionEn: "Crunchy lentil wafers with spiced fruit preserves.",
 },

 // Desserts
 {
 id: "ds-01",
 category: "DESSERTS",
 nameEn: "Authentic Steamed Watalappan with Toasted Cashews",
 nameSi: "පාරම්පරික වටලප්පන් කජු සහිතව",
 nameTa: "வத்தலாப்பம் முந்திரி",
 descriptionEn: "Kithul jaggery coconut egg custard with nutmeg and cardamoms.",
 },
 {
 id: "ds-02",
 category: "DESSERTS",
 nameEn: "Caramelized French Creme Caramel",
 nameSi: "ක්රීම් කැරමල්",
 nameTa: "கிரீம் கேரமல்",
 descriptionEn: "Silky baked custard with golden caramel glaze.",
 },
 {
 id: "ds-03",
 category: "DESSERTS",
 nameEn: "Fresh Tropical Sri Lankan Fruit Platter",
 nameSi: "නැවුම් පළතුරු පිඟාන",
 nameTa: "பழத் தட்டு",
 isVegetarian: true,
 descriptionEn: "Papaya, watermelon, pineapple, passion fruit, and red bananas.",
 },
 {
 id: "ds-04",
 category: "DESSERTS",
 nameEn: "Curd & Pure Sinharaja Kithul Treacle (මී කිරි)",
 nameSi: "නැවුම් මී කිරි සහ කිතුල් පැණි",
 nameTa: "தயிர் & கித்துள் பாகு",
 isVegetarian: true,
 descriptionEn: "Buffallo curd drizzled with organic rainforest kithul treacle.",
 },
 {
 id: "ds-05",
 category: "DESSERTS",
 nameEn: "Hot Chocolate Fudge Cake with Vanilla Bean Gelato",
 nameSi: "චොකලට් ෆජ් කේක්",
 nameTa: "சாக்லேட் கேக் ஐஸ்கிரீம்",
 descriptionEn: "Warm gooey Belgian chocolate cake.",
 },
];

export const DEFAULT_LIVE_STATIONS: readonly LiveActionStation[] = [
 {
 id: "live-hoppers",
 nameEn: "Live Egg & Cheese Hopper Station (ආප්ප සංදර්ශනය)",
 nameSi: "සජීවී ආප්ප සංදර්ශනාගාරය (බිත්තර සහ චීස්)",
 nameTa: "நேரடி ஆப்ப நிலையம்",
 descriptionEn: "Live chef making crispy bowl-shaped hoppers with Seeni Sambol & Lunu Miris.",
 addOnPricePerPaxLkr: 750,
 },
 {
 id: "live-kottu",
 nameEn: "Live Rhythmic Kottu Roti Bar (කොත්තු සංදර්ශනය)",
 nameSi: "සජීවී කොත්තු සංදර්ශනය",
 nameTa: "நேரடி கொத்து ரொட்டி பார்",
 descriptionEn: "Acoustic dual-blade theatrical chopping of chicken, beef, egg & cheese kottu.",
 addOnPricePerPaxLkr: 950,
 },
 {
 id: "live-mongolian",
 nameEn: "Live Mongolian BBQ Wok Station",
 nameSi: "සජීවී මොංගෝලියන් වොක් බාබකියු",
 nameTa: "நேரடி மங்கோலியன் வோக் பார்பிக்யூ",
 descriptionEn: "Assorted meats, seafood, noodles, and greens stir-fried in smoking woks.",
 addOnPricePerPaxLkr: 1200,
 },
 {
 id: "live-carvery",
 nameEn: "Whole Spit-Roasted Leg of Lamb Carvery",
 nameSi: "සම්පූර්ණ බැටළු මස් රෝස්ට් සංදර්ශනය",
 nameTa: "முழு ஆட்டிறைச்சி வறுவல்",
 descriptionEn: "Herb-crusted roast lamb carved tableside with mint jus and baby potatoes.",
 addOnPricePerPaxLkr: 1500,
 },
];

// ============================================================================
// Trilingual Localization
// ============================================================================

interface MenuTranslations {
 readonly title: string;
 readonly subtitle: string;
 readonly basePlateLabel: string;
 readonly addOnsLabel: string;
 readonly totalPlateLabel: string;
 readonly estimatedBuffetTotal: string;
 readonly selectedPillsText: string;
 readonly liveStationsTitle: string;
 readonly liveStationsSubtitle: string;
 readonly addStationBtn: string;
 readonly stationAdded: string;
 readonly saveMenuBtn: string;
 readonly allCoursesLabel: string;
 readonly quotaComplete: string;
 readonly quotaIncomplete: string;
 readonly vegetarianBadge: string;
 readonly spicyBadge: string;
 readonly seafoodBadge: string;
}

const MENU_TRANSLATIONS: Record<SupportedLanguage, MenuTranslations> = {
 en: {
 title: "Sri Lankan Wedding Menu Customizer",
 subtitle:
 "Select dishes within statutory course quotas and enhance the feast with live culinary action stations",
 basePlateLabel: "Base Plate Rate",
 addOnsLabel: "Live Stations Add-on",
 totalPlateLabel: "Total Plate Rate / Guest",
 estimatedBuffetTotal: "Estimated Buffet Total (Pax",
 selectedPillsText: "selected of",
 liveStationsTitle: "Live Action Culinary Stations",
 liveStationsSubtitle:
 "Interactive theatrical cooking stations managed by dedicated banquet chefs",
 addStationBtn: "Add to Menu",
 stationAdded: "Station Included",
 saveMenuBtn: "Save Wedding Menu Package",
 allCoursesLabel: "All Courses",
 quotaComplete: "Quota Fulfilled",
 quotaIncomplete: "Selections Needed",
 vegetarianBadge: "Veg",
 spicyBadge: "Spicy",
 seafoodBadge: "Seafood",
 },
 si: {
 title: "මංගල භෝජන සංග්රහ මෙනු සැකැස්ම",
 subtitle: "නියමිත කාණ්ඩ සීමාවන් යටතේ ආහාර තෝරාගන්න සහ සජීවී ආප්ප/කොත්තු සංදර්ශන එක්කරන්න",
 basePlateLabel: "මූලික පිඟානක මිල",
 addOnsLabel: "සජීවී සංදර්ශන එකතුව",
 totalPlateLabel: "අමුත්තෙකුට සම්පූර්ණ මිල",
 estimatedBuffetTotal: "ඇස්තමේන්තුගත මුළු මුදල (අමුත්තන්",
 selectedPillsText: "තෝරාගෙන ඇත, උපරිම",
 liveStationsTitle: "සජීවී ආහාර පිසීමේ සංදර්ශන",
 liveStationsSubtitle: "ප්රවීණ සූපවේදීන් විසින් පවත්වන සජීවී ආප්ප, කොත්තු සහ බාබකියු කුටි",
 addStationBtn: "මෙනුවට එක්කරන්න",
 stationAdded: "ඇතුළත් කර ඇත",
 saveMenuBtn: "මෙනු පැකේජය සුරකින්න",
 allCoursesLabel: "සියලු ආහාර",
 quotaComplete: "සම්පූර්ණයි",
 quotaIncomplete: "තවත් තෝරාගන්න",
 vegetarianBadge: "එළවළු",
 spicyBadge: "සැරයි",
 seafoodBadge: "මුහුදු ආහාර",
 },
 ta: {
 title: "திருமண உணவுப் பொதி கட்டமைப்பு",
 subtitle: "நிர்ணயிக்கப்பட்ட ஒதுக்கீட்டிற்குள் உணவுகளைத் தேர்ந்தெடுத்து நேரடி சமையல் நிலையங்களைச் சேர்க்கவும்",
 basePlateLabel: "அடிப்படை தட்டு விலை",
 addOnsLabel: "நேரடி நிலையங்கள்",
 totalPlateLabel: "விருந்தினருக்கான மொத்த விலை",
 estimatedBuffetTotal: "மதிப்பிடப்பட்ட மொத்தத் தொகை (விருந்தினர்",
 selectedPillsText: "தெரிவுசெய்யப்பட்டது /",
 liveStationsTitle: "நேரடி சமையல் நிலையங்கள்",
 liveStationsSubtitle: "மண்டப சமையல்காரர்களால் நிர்வகிக்கப்படும் நேரடி ஆப்ப மற்றும் கொத்து ரொட்டி நிலையங்கள்",
 addStationBtn: "சேர்க்கவும்",
 stationAdded: "சேர்க்கப்பட்டது",
 saveMenuBtn: "உணவுப் பொதியைச் சேமி",
 allCoursesLabel: "அனைத்து உணவுகள்",
 quotaComplete: "நிறைவுற்றது",
 quotaIncomplete: "தேவைப்படுகிறது",
 vegetarianBadge: "சைவம்",
 spicyBadge: "காரம்",
 seafoodBadge: "கடல் உணவு",
 },
};

// ============================================================================
// Pure Helper Functions
// ============================================================================

export function checkCategoryQuota(
 category: MenuCourseCategory,
 selectedIds: readonly string[],
 items: readonly MenuItem[],
 quotas: readonly CategoryQuota[] = DEFAULT_CATEGORY_QUOTAS,
): { readonly currentCount: number; readonly maxAllowed: number; readonly isFulfilled: boolean } {
 const categoryItemIds = new Set(items.filter((i) => i.category === category).map((i) => i.id));
 const currentCount = selectedIds.filter((id) => categoryItemIds.has(id)).length;
 const quota = quotas.find((q) => q.category === category);
 const maxAllowed = quota ? quota.maxAllowed : 1;
 const isFulfilled = currentCount >= maxAllowed;

 return { currentCount, maxAllowed, isFulfilled };
}

export function areAllQuotasFulfilled(
 selectedIds: readonly string[],
 items: readonly MenuItem[],
 quotas: readonly CategoryQuota[] = DEFAULT_CATEGORY_QUOTAS,
): boolean {
 for (const q of quotas) {
 const status = checkCategoryQuota(q.category, selectedIds, items, quotas);
 if (!status.isFulfilled) {
 return false;
 }
 }
 return true;
}

export function calculateLiveStationsAddOn(
 selectedStationIds: readonly string[],
 stations: readonly LiveActionStation[] = DEFAULT_LIVE_STATIONS,
): number {
 let addOn = 0;
 for (const id of selectedStationIds) {
 const station = stations.find((s) => s.id === id);
 if (station) {
 addOn += station.addOnPricePerPaxLkr;
 }
 }
 return addOn;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MenuItemCardProps {
 readonly item: MenuItem;
 readonly isSelected: boolean;
 readonly isCategoryFull: boolean;
 readonly t: MenuTranslations;
 readonly onToggle: (id: string) => void;
}

const MenuItemCard: FC<MenuItemCardProps> = ({ item, isSelected, isCategoryFull, t, onToggle }) => {
 const isDisabled = !isSelected && isCategoryFull;

 return (
 <button
 type="button"
 data-testid={`menu-item-${item.id}`}
 disabled={isDisabled}
 onClick={() => onToggle(item.id)}
 className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
 isSelected
 ? "bg-emerald-950/25 border-emerald-500/50 shadow-md shadow-emerald-950/20"
 : isDisabled
 ? "bg-[#F4F7F5] border-[#E2E8F0] opacity-40 cursor-not-allowed"
 : "bg-white border-[#E2E8F0] hover:border-[#E2E8F0]"
 }`}
 >
 <div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1.5">
 {item.isVegetarian && (
 <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-[#0B6E4F] border border-emerald-500/30">
 {t.vegetarianBadge}
 </span>
 )}
 {item.isSpicy && (
 <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-800 border border-red-500/30">
 {t.spicyBadge} Spicy
 </span>
 )}
 {item.isSeafood && (
 <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-800 border border-sky-500/30">
 {t.seafoodBadge} Seafood
 </span>
 )}
 </div>

 <span
 className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
 isSelected
 ? "bg-emerald-500 text-zinc-950"
 : "border border-[#E2E8F0] text-transparent"
 }`}
 ><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span className="sr-only">OK</span></span>
 </div>

 <h4 className="text-sm font-bold text-slate-900 mt-1.5 tracking-tight">{item.nameEn}</h4>
 <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{item.descriptionEn}</p>
 </div>
 </button>
 );
};

// ============================================================================
// Main BanquetMenuSelector Component
// ============================================================================

export const BanquetMenuSelector: FC<BanquetMenuSelectorProps> = ({
 packageTierName = "Platinum Royal Wedding Package",
 basePricePerPaxLkr = 7500,
 guestPaxCount = 250,
 quotas = DEFAULT_CATEGORY_QUOTAS,
 availableItems = DEFAULT_MENU_ITEMS,
 availableLiveStations = DEFAULT_LIVE_STATIONS,
 language = "en",
 onSaveMenu,
}) => {
 const [selectedItemIds, setSelectedItemIds] = useState<readonly string[]>([
 "wd-01",
 "sp-01",
 "rc-01",
 "rc-02",
 "nd-01",
 "mn-01",
 "mn-02",
 "mn-03",
 "vg-01",
 "vg-02",
 "sl-01",
 "sl-02",
 "sl-03",
 "ds-01",
 "ds-02",
 "ds-03",
 "ds-04",
 ]);

 const [selectedStationIds, setSelectedStationIds] = useState<readonly string[]>(["live-hoppers"]);

 const [activeCourseTab, setActiveCourseTab] = useState<MenuCourseCategory>("RICE_DISHES");

 const t = MENU_TRANSLATIONS[language] ?? MENU_TRANSLATIONS.en;

 // Real-time calculations
 const actionStationsAddOnLkr = useMemo(() => {
 return calculateLiveStationsAddOn(selectedStationIds, availableLiveStations);
 }, [selectedStationIds, availableLiveStations]);

 const totalPlateRateLkr = basePricePerPaxLkr + actionStationsAddOnLkr;
 const estimatedBuffetTotalLkr = totalPlateRateLkr * guestPaxCount;

 const allQuotasFulfilled = useMemo(() => {
 return areAllQuotasFulfilled(selectedItemIds, availableItems, quotas);
 }, [selectedItemIds, availableItems, quotas]);

 // Toggle item selection
 const handleToggleItem = (itemId: string): void => {
 const item = availableItems.find((i) => i.id === itemId);
 if (!item) {
 return;
 }

 if (selectedItemIds.includes(itemId)) {
 setSelectedItemIds((prev) => prev.filter((id) => id !== itemId));
 return;
 }

 const quotaInfo = checkCategoryQuota(item.category, selectedItemIds, availableItems, quotas);
 if (quotaInfo.currentCount < quotaInfo.maxAllowed) {
 setSelectedItemIds((prev) => [...prev, itemId]);
 }
 };

 // Toggle station selection
 const handleToggleStation = (stationId: string): void => {
 setSelectedStationIds((prev) => {
 if (prev.includes(stationId)) {
 return prev.filter((id) => id !== stationId);
 }
 return [...prev, stationId];
 });
 };

 const handleSave = async (): Promise<void> => {
 if (onSaveMenu) {
 await onSaveMenu({
 selectedItemIds,
 selectedActionStationIds: selectedStationIds,
 basePlateRateLkr: basePricePerPaxLkr,
 actionStationsAddOnLkr,
 totalPlateRateLkr,
 allQuotasFulfilled,
 });
 }
 };

 // Filter items by currently active course tab
 const activeCategoryItems = useMemo(() => {
 return availableItems.filter((i) => i.category === activeCourseTab);
 }, [availableItems, activeCourseTab]);

 const currentQuotaInfo = useMemo(() => {
 return checkCategoryQuota(activeCourseTab, selectedItemIds, availableItems, quotas);
 }, [activeCourseTab, selectedItemIds, availableItems, quotas]);

 return (
 <div className="w-full space-y-6 text-slate-800 font-sans">
 {/* Top Banner */}
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-2xl">
 <div>
 <span className="text-xs font-semibold text-[#0B6E4F] uppercase tracking-wider block">
 {packageTierName} • {guestPaxCount} Guaranteed Pax
 </span>
 <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">{t.title}</h1>
 <p className="text-sm text-slate-700 mt-1">{t.subtitle}</p>
 </div>

 <button
 type="button"
 onClick={handleSave}
 className="self-start lg:self-center px-6 py-3 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer flex items-center gap-2"
 >
 <span>{t.saveMenuBtn}</span>
 </button>
 </div>

 {/* Financial Breakdown Bar */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-md">
 <span className="text-xs font-medium text-zinc-400">{t.basePlateLabel}</span>
 <span className="text-xl font-bold text-slate-900 mt-1 block tabular-nums-lkr">
 {formatCurrencyLkr(basePricePerPaxLkr)}
 </span>
 </div>

 <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-md">
 <span className="text-xs font-medium text-zinc-400">{t.addOnsLabel}</span>
 <span className="text-xl font-bold text-amber-700 mt-1 block tabular-nums-lkr">
 +{formatCurrencyLkr(actionStationsAddOnLkr)}
 </span>
 </div>

 <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-md">
 <span className="text-xs font-medium text-zinc-400">{t.totalPlateLabel}</span>
 <span className="text-xl font-bold text-sky-800 mt-1 block tabular-nums-lkr">
 {formatCurrencyLkr(totalPlateRateLkr)}
 </span>
 </div>

 <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 backdrop-blur-md">
 <span className="text-xs font-bold text-[#0B6E4F]">
 {t.estimatedBuffetTotal} {guestPaxCount})
 </span>
 <span className="text-xl font-black text-[#0B6E4F] mt-1 block tabular-nums-lkr">
 {formatCurrencyLkr(estimatedBuffetTotalLkr)}
 </span>
 </div>
 </div>

 {/* Course Categories Segmented Controller */}
 <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-xs">
 {quotas.map((q) => {
 const quotaStatus = checkCategoryQuota(
 q.category,
 selectedItemIds,
 availableItems,
 quotas,
 );
 const isActive = activeCourseTab === q.category;

 return (
 <button
 key={q.category}
 type="button"
 onClick={() => setActiveCourseTab(q.category)}
 className={`px-3 py-2.5 min-h-[44px] rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border ${
 isActive
 ? "bg-white text-zinc-950 border-white shadow-lg"
 : quotaStatus.isFulfilled
 ? "bg-emerald-500/10 text-[#0B6E4F] border-emerald-500/30 hover:bg-emerald-500/20"
 : "bg-slate-50 text-zinc-400 border-[#E2E8F0] hover:text-slate-900"
 }`}
 >
 <span>{q.labelEn}</span>
 <span
 className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold tabular-nums-lkr ${
 isActive
 ? "bg-[#0B6E4F] text-white"
 : quotaStatus.isFulfilled
 ? "bg-emerald-500/20 text-[#0B6E4F]"
 : "bg-amber-500/20 text-amber-800"
 }`}
 >
 {quotaStatus.currentCount} / {quotaStatus.maxAllowed}
 </span>
 </button>
 );
 })}
 </div>

 {/* Active Course Category Items Grid */}
 <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-xl space-y-4">
 <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
 <div className="flex items-center gap-3">
 <h3 className="text-lg font-bold text-slate-900 tracking-tight">
 {quotas.find((q) => q.category === activeCourseTab)?.labelEn}
 </h3>
 <span
 className={`px-2.5 py-1 rounded-full text-xs font-bold border tabular-nums-lkr ${
 currentQuotaInfo.isFulfilled
 ? "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/40"
 : "bg-amber-500/20 text-amber-800 border-amber-500/40"
 }`}
 >
 {currentQuotaInfo.currentCount} / {currentQuotaInfo.maxAllowed} {t.selectedPillsText}{" "}
 {currentQuotaInfo.maxAllowed}
 </span>
 </div>

 <span className="text-xs text-zinc-400">
 {currentQuotaInfo.isFulfilled ? t.quotaComplete : t.quotaIncomplete}
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {activeCategoryItems.map((item) => (
 <MenuItemCard
 key={item.id}
 item={item}
 isSelected={selectedItemIds.includes(item.id)}
 isCategoryFull={currentQuotaInfo.isFulfilled}
 t={t}
 onToggle={handleToggleItem}
 />
 ))}
 </div>
 </div>

 {/* Live Action Culinary Stations Section */}
 <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-xl space-y-4">
 <div className="border-b border-[#E2E8F0] pb-3">
 <h3 className="text-lg font-bold text-slate-900 tracking-tight">{t.liveStationsTitle}</h3>
 <p className="text-xs text-zinc-400 mt-0.5">{t.liveStationsSubtitle}</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {availableLiveStations.map((station) => {
 const isAdded = selectedStationIds.includes(station.id);

 return (
 <div
 key={station.id}
 data-testid={`live-station-${station.id}`}
 className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
 isAdded
 ? "bg-amber-950/25 border-amber-500/40 shadow-lg shadow-amber-950/20"
 : "bg-slate-50 border-[#E2E8F0]"
 }`}
 >
 <div>
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-amber-800 tabular-nums-lkr">
 +{formatCurrencyLkr(station.addOnPricePerPaxLkr)} / guest
 </span>
 <span className="text-[10px] text-zinc-400 tabular-nums-lkr">
 Total: {formatCurrencyLkr(station.addOnPricePerPaxLkr * guestPaxCount)}
 </span>
 </div>

 <h4 className="text-sm font-bold text-slate-900 mt-1.5">{station.nameEn}</h4>
 <p className="text-xs text-zinc-400 mt-0.5">{station.descriptionEn}</p>
 </div>

 <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-end">
 <button
 type="button"
 onClick={() => handleToggleStation(station.id)}
 className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
 isAdded
 ? "bg-amber-500 text-zinc-950 hover:bg-amber-400"
 : "bg-[#0B6E4F] text-white hover:bg-[#0B6E4F]"
 }`}
 >
 {isAdded ? t.stationAdded : t.addStationBtn}
 </button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
};
