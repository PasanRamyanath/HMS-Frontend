import { useId, useMemo } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export interface TrilingualName {
  readonly en: string;
  readonly si?: string | undefined;
  readonly ta?: string | undefined;
}

export interface QrCategoryItem {
  readonly id: string;
  readonly name: TrilingualName;
  readonly description?: TrilingualName | undefined;
  readonly department: string; // "DINING" | "BAR" | "HOUSEKEEPING" | "LAUNDRY" | "SPA" or Department enum string
  readonly iconKey: string;
  readonly itemCount: number;
  readonly badge?: string | undefined;
  readonly isActive?: boolean | undefined;
}

export interface CategoryPillsBarProps {
  readonly categories?: ReadonlyArray<QrCategoryItem> | undefined;
  readonly selectedCategoryId?: string | undefined;
  readonly onSelectCategory?: ((categoryId: string) => void) | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly isSticky?: boolean | undefined;
  readonly variant?: "cards" | "pills" | undefined;
  readonly activeDepartment?: string | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Curated Default Sample Categories (DOMSpeed-Style Sri Lankan Resort)
// ============================================================================

export const DEFAULT_GUEST_QR_CATEGORIES: ReadonlyArray<QrCategoryItem> = [
  {
    id: "CAT-RICE-CURRY",
    name: {
      en: "Rice & Curry",
      si: "බත් සහ ව්‍යංජන",
      ta: "அரிசி மற்றும் கறி",
    },
    description: {
      en: "Clay-Pot Fish Ambul Thiyal, Dhal & Pol Sambol",
      si: "මාළු ඇඹුල් තියල්, පරිප්පු හා පොල් සම්බෝල",
      ta: "மீன் குழம்பு, பருப்பு மற்றும் சம்பல்",
    },
    department: "DINING",
    iconKey: "rice-bowl",
    itemCount: 14,
    badge: "Popular",
    isActive: true,
  },
  {
    id: "CAT-HOPPERS-KOTTU",
    name: {
      en: "Hoppers & Kottu",
      si: "ආප්ප සහ කොත්තු",
      ta: "அப்பம் மற்றும் கொத்து",
    },
    description: {
      en: "Egg Hoppers, String Hoppers & Rhythmic Wok Kottu",
      si: "බිත්තර ආප්ප, ඉඳිආප්ප සහ චීස් කොත්තු",
      ta: "முட்டை அப்பம் மற்றும் கொத்து ரொட்டி",
    },
    department: "DINING",
    iconKey: "pan",
    itemCount: 18,
    badge: "Chef Special",
    isActive: true,
  },
  {
    id: "CAT-SEAFOOD-GRILL",
    name: {
      en: "Seafood & Grill",
      si: "නැවුම් මුහුදු ආහාර",
      ta: "கடல் உணவு மற்றும் கிரில்",
    },
    description: {
      en: "Lagoon Jumbo Prawns, Seer Fish & Butter Garlic Crab",
      si: "ජම්බෝ ඉස්සන්, තෝර මාළු සහ කකුළුවන්",
      ta: "இறால், மீன் மற்றும் நண்டு",
    },
    department: "DINING",
    iconKey: "fish",
    itemCount: 12,
    badge: "Catch of the Day",
    isActive: true,
  },
  {
    id: "CAT-SANDWICHES",
    name: {
      en: "Sandwiches & Bites",
      si: "සැන්ඩ්විච් සහ බයිට්ස්",
      ta: "சாண்ட்விச்கள் மற்றும் சிற்றுண்டி",
    },
    description: {
      en: "Galle Face Club Sandwiches & Manioc Chips",
      si: "ක්ලබ් සැන්ඩ්විච් සහ බතල චිප්ස්",
      ta: "சாண்ட்விச் மற்றும் மரவள்ளிக்கிழங்கு சிப்ஸ்",
    },
    department: "DINING",
    iconKey: "sandwich",
    itemCount: 9,
    isActive: true,
  },
  {
    id: "CAT-DESSERTS",
    name: {
      en: "Desserts & Curd",
      si: "දේශීය අතුරුපස",
      ta: "இனிப்புகள் மற்றும் தயிர்",
    },
    description: {
      en: "Buffalo Curd & Kithul Treacle, Steamed Watalappan",
      si: "මී කිරි සහ කිතුල් පැණි, වටලප්පන්",
      ta: "வட்டலாப்பம் மற்றும் தேன் தயிர்",
    },
    department: "DINING",
    iconKey: "cake",
    itemCount: 7,
    isActive: true,
  },
  {
    id: "CAT-CEYLON-TEA",
    name: {
      en: "Ceylon Tea & Coffee",
      si: "සිලෝන් තේ සහ කෝපි",
      ta: "சிலோன் தேநீர் மற்றும் காபி",
    },
    description: {
      en: "Single-Estate Nuwara Eliya BOP & Fresh Ginger Tea",
      si: "නුවරඑළිය තේ සහ ඉඟුරු තේ",
      ta: "நூவரெலியா தேநீர் மற்றும் இஞ்சி தேநீர்",
    },
    department: "BAR",
    iconKey: "coffee",
    itemCount: 15,
    badge: "Organic",
    isActive: true,
  },
  {
    id: "CAT-COCKTAILS",
    name: {
      en: "Tropical Cocktails",
      si: "දේශීය කොක්ටේල්",
      ta: "காக்டெய்ல்கள்",
    },
    description: {
      en: "Ceylon Arrack Sour, Passion Fruit Mojito & Lion Draught",
      si: "අරක්කු සවර් සහ පැෂන් මොහිටෝ",
      ta: "அராக் சவர் மற்றும் மொஹிட்டோ",
    },
    department: "BAR",
    iconKey: "glass-cocktail",
    itemCount: 22,
    badge: "Happy Hour",
    isActive: true,
  },
  {
    id: "CAT-AMENITIES",
    name: {
      en: "Towels & Toiletries",
      si: "තුවා සහ වැසිකිලි ද්‍රව්‍ය",
      ta: "துண்டுகள் மற்றும் பொருட்கள்",
    },
    description: {
      en: "Extra Egyptian Cotton Towels, Ayurvedic Soaps & Dental Kits",
      si: "අමතර තුවා, සබන් සහ දත් බුරුසු",
      ta: "கூடுதல் துண்டுகள் மற்றும் சோப்புகள்",
    },
    department: "HOUSEKEEPING",
    iconKey: "sparkles",
    itemCount: 8,
    badge: "Complimentary",
    isActive: true,
  },
  {
    id: "CAT-LAUNDRY",
    name: {
      en: "Laundry & Pressing",
      si: "රෙදි සේදීම සහ මැදීම",
      ta: "சலவை மற்றும் அயர்னிங்",
    },
    description: {
      en: "Same-Day Express Laundry, Dry Cleaning & Steam Press",
      si: "එක්ස්ප්‍රස් රෙදි සේදීම සහ ස්ටීම් මැදීම",
      ta: "அதிவேக சலவை மற்றும் அயர்னிங்",
    },
    department: "LAUNDRY",
    iconKey: "sparkles",
    itemCount: 6,
    isActive: true,
  },
  {
    id: "CAT-SPA",
    name: {
      en: "Ayurveda Spa",
      si: "ආයුර්වේද ප්‍රතිකාර",
      ta: "ஆயுர்வேத ஸ்பா",
    },
    description: {
      en: "Herbal Oil Abhyanga, Shirodhara & Head Massages",
      si: "ඖෂධීය තෙල් අභ්‍යංග සහ ශිරෝධාරා",
      ta: "மூலிகை எண்ணெய் சிகிச்சை மற்றும் மசாஜ்",
    },
    department: "SPA",
    iconKey: "flower",
    itemCount: 5,
    badge: "Bookable",
    isActive: true,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolves localized name with strict fallback hierarchy:
 * 1. Specified language
 * 2. English
 * 3. Empty string
 */
export function resolveCategoryName(
  name: TrilingualName | undefined,
  lang: SupportedLanguage = "en",
): string {
  if (!name) return "";
  if (lang === "si" && name.si?.trim()) {
    return name.si.trim();
  }
  if (lang === "ta" && name.ta?.trim()) {
    return name.ta.trim();
  }
  return name.en || "";
}

/**
 * Filters categories by active department if specified.
 */
export function filterCategoriesByDepartment(
  categories: ReadonlyArray<QrCategoryItem>,
  department?: string | undefined,
): ReadonlyArray<QrCategoryItem> {
  if (!department || department === "ALL") {
    return categories.filter((c) => c.isActive !== false);
  }
  const normalizedDept = department.toUpperCase();
  return categories.filter((c) => {
    if (c.isActive === false) return false;
    return c.department.toUpperCase() === normalizedDept;
  });
}

/**
 * Smoothly scrolls to target menu category section and focuses it if available.
 */
export function scrollToMenuSection(categoryId: string): void {
  if (typeof document === "undefined") return;

  const targetId = `menu-category-section-${categoryId}`;
  const element = document.getElementById(targetId);
  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
  }
}

// ============================================================================
// 48x48px Scalable SVG Icon Component
// ============================================================================

export function CategoryPillIcon({
  iconKey,
  isSelected,
  className = "w-6 h-6",
}: {
  readonly iconKey: string;
  readonly isSelected: boolean;
  readonly className?: string | undefined;
}) {
  const iconClasses = isSelected
    ? `${className} text-orange-600 dark:text-orange-400`
    : `${className} text-slate-700 dark:text-slate-300`;

  switch (iconKey) {
    case "rice-bowl":
      return (
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 11h16a8 8 0 0 1-16 0Z" />
          <path d="M12 3v3" />
          <path d="M8 4v2" />
          <path d="M16 4v2" />
          <path d="M8 19h8" />
        </svg>
      );
    case "pan":
      return (
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 11h14a3 3 0 0 1 3 3v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a3 3 0 0 1 2-3Z" />
          <path d="M17 14l4-4" />
          <path d="M6 6c1 1 1 2 0 3" />
          <path d="M10 6c1 1 1 2 0 3" />
        </svg>
      );
    case "fish":
      return (
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.46-3.44 6-7 6s-7.56-2.54-8.5-6Z" />
          <path d="M18 12c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3Z" />
          <path d="M2 16l4.5-4L2 8" />
        </svg>
      );
    case "sandwich":
      return (
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 11h18v2H3z" />
          <path d="M5 11V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" />
          <path d="M5 13v4a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-4" />
        </svg>
      );
    case "cake":
      return (
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
          <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
          <path d="M2 21h20" />
          <path d="M7 8v3" />
          <path d="M12 8v3" />
          <path d="M17 8v3" />
          <circle cx="7" cy="4" r="1" />
          <circle cx="12" cy="4" r="1" />
          <circle cx="17" cy="4" r="1" />
        </svg>
      );
    case "coffee":
      return (
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          <line x1="6" x2="6" y1="2" y2="4" />
          <line x1="10" x2="10" y1="2" y2="4" />
          <line x1="14" x2="14" y1="2" y2="4" />
        </svg>
      );
    case "glass-cocktail":
      return (
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8 22h8" />
          <path d="M12 15v7" />
          <path d="m19 3-7 8-7-8Z" />
          <path d="M5 3h14" />
        </svg>
      );
    case "sparkles":
      return (
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
        </svg>
      );
    case "flower":
      return (
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2a4 4 0 0 0-4 4c0 3 4 6 4 6s4-3 4-6a4 4 0 0 0-4-4Z" />
          <path d="M12 22a4 4 0 0 0 4-4c0-3-4-6-4-6s-4 3-4 6a4 4 0 0 0 4 4Z" />
          <path d="M2 12a4 4 0 0 0 4 4c3 0 6-4 6-4s-3-4-6-4a4 4 0 0 0-4 4Z" />
          <path d="M22 12a4 4 0 0 0-4-4c-3 0-6 4-6 4s3 4 6 4a4 4 0 0 0 4-4Z" />
        </svg>
      );
    default:
      return (
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      );
  }
}

interface CategoryButtonProps {
  readonly cat: QrCategoryItem;
  readonly isSelected: boolean;
  readonly localizedName: string;
  readonly onClick: () => void;
}

function CategoryPillButton({ cat, isSelected, localizedName, onClick }: CategoryButtonProps) {
  const pillClasses = isSelected
    ? "bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]"
    : "bg-slate-100/90 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200/90 dark:hover:bg-white/15";

  const countClasses = isSelected
    ? "bg-white/20 text-white"
    : "bg-slate-200/80 dark:bg-white/15 text-slate-500 dark:text-slate-300";

  return (
    <button
      type="button"
      role="tab"
      id={`cat-tab-${cat.id}`}
      aria-selected={isSelected}
      aria-controls={`menu-category-section-${cat.id}`}
      tabIndex={isSelected ? 0 : -1}
      onClick={onClick}
      className={`snap-start shrink-0 min-h-[44px] px-3.5 py-2 rounded-full inline-flex items-center gap-2 text-xs font-semibold tracking-tight transition-all duration-200 ease-apple-spring select-none ${pillClasses}`}
    >
      <CategoryPillIcon iconKey={cat.iconKey} isSelected={isSelected} className="w-4 h-4" />
      <span>{localizedName}</span>
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium tabular-nums ${countClasses}`}
      >
        {cat.itemCount}
      </span>
    </button>
  );
}

function CategoryCardButton({ cat, isSelected, localizedName, onClick }: CategoryButtonProps) {
  const iconContainerClasses = isSelected
    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-500/40 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-105"
    : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-white/15 border border-black/5 dark:border-white/5";

  const textClasses = isSelected
    ? "text-orange-600 dark:text-orange-400 font-bold"
    : "text-slate-800 dark:text-slate-200";

  return (
    <button
      type="button"
      role="tab"
      id={`cat-tab-${cat.id}`}
      aria-selected={isSelected}
      aria-controls={`menu-category-section-${cat.id}`}
      tabIndex={isSelected ? 0 : -1}
      onClick={onClick}
      className="snap-start shrink-0 flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-2xl p-1 transition-transform duration-200 ease-apple-spring active:scale-95 group select-none min-w-[76px]"
    >
      {/* 48x48px Squircle Icon Container */}
      <div
        className={`relative w-12 h-12 rounded-[14px] flex items-center justify-center transition-all duration-200 ease-apple-spring ${iconContainerClasses}`}
      >
        <CategoryPillIcon iconKey={cat.iconKey} isSelected={isSelected} className="w-6 h-6" />

        {cat.badge && (
          <span className="absolute -top-1.5 -right-1 px-1 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-xs leading-tight scale-90">
            ★
          </span>
        )}
      </div>

      {/* Title & Count */}
      <div className="flex flex-col items-center text-center max-w-[84px]">
        <span
          className={`text-[11px] font-semibold tracking-tight truncate max-w-full ${textClasses}`}
        >
          {localizedName}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tabular-nums leading-none">
          {cat.itemCount} items
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// Main Component: CategoryPillsBar
// ============================================================================

export function CategoryPillsBar({
  categories = DEFAULT_GUEST_QR_CATEGORIES,
  selectedCategoryId,
  onSelectCategory,
  language = "en",
  isSticky = true,
  variant = "cards",
  activeDepartment,
  className = "",
}: CategoryPillsBarProps) {
  const barId = useId();

  // Filter categories by active department if provided
  const displayCategories = useMemo(() => {
    return filterCategoriesByDepartment(categories, activeDepartment);
  }, [categories, activeDepartment]);

  // Determine effective selected category ID (first item if not set)
  const activeId = useMemo(() => {
    if (selectedCategoryId) return selectedCategoryId;
    return displayCategories[0]?.id ?? "";
  }, [selectedCategoryId, displayCategories]);

  const handleCategoryClick = (catId: string) => {
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
    scrollToMenuSection(catId);
  };

  if (displayCategories.length === 0) {
    return null;
  }

  const containerClasses = [
    isSticky ? "sticky top-[96px] z-30" : "relative",
    "apple-liquid-glass bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-black/5 dark:border-white/10 shadow-xs",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <nav
      id={`category-bar-${barId}`}
      aria-label="Menu category carousel"
      data-testid="category-pills-bar"
      className={containerClasses}
    >
      <div
        className="flex items-center gap-3 px-4 py-2.5 overflow-x-auto scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-orientation="horizontal"
      >
        {displayCategories.map((cat) => {
          const isSelected = cat.id === activeId;
          const localizedName = resolveCategoryName(cat.name, language);

          if (variant === "pills") {
            return (
              <CategoryPillButton
                key={cat.id}
                cat={cat}
                isSelected={isSelected}
                localizedName={localizedName}
                onClick={() => handleCategoryClick(cat.id)}
              />
            );
          }

          return (
            <CategoryCardButton
              key={cat.id}
              cat={cat}
              isSelected={isSelected}
              localizedName={localizedName}
              onClick={() => handleCategoryClick(cat.id)}
            />
          );
        })}
      </div>
    </nav>
  );
}
