import { useId, useMemo, useState } from "react";
import { Department, DiningType, type TrilingualText } from "../../generated/graphql.js";
import { type SupportedLanguage, useTranslation } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export interface TimeWindow {
  readonly startTime: string; // "06:30"
  readonly endTime: string; // "10:30"
  readonly daysOfWeek?: ReadonlyArray<number>; // 0=Sun, 1=Mon, ..., 6=Sat
}

export interface AdminMenuCategoryItem {
  readonly id: string;
  readonly name: TrilingualText;
  readonly description?: TrilingualText | undefined;
  readonly department: Department;
  readonly diningTypes: ReadonlyArray<DiningType>;
  readonly displayOrder: number;
  readonly isActive: boolean;
  readonly iconKey: string; // SVG / WebP icon identifier
  readonly availableWindow?: TimeWindow | undefined;
  readonly itemCount: number;
}

export interface CategoryManagerProps {
  readonly categories?: ReadonlyArray<AdminMenuCategoryItem> | undefined;
  readonly onSaveCategory?: ((category: AdminMenuCategoryItem) => void) | undefined;
  readonly onDeleteCategory?: ((categoryId: string) => void) | undefined;
  readonly onReorderCategories?:
    | ((reordered: ReadonlyArray<AdminMenuCategoryItem>) => void)
    | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Curated Default Sample Categories (DOMSpeed-Style Sri Lankan Hospitality)
// ============================================================================

export const DEFAULT_DOMSPEED_CATEGORIES: ReadonlyArray<AdminMenuCategoryItem> = [
  {
    id: "CAT-RICE-CURRY",
    name: {
      en: "Sri Lankan Rice & Curry",
      si: "ශ්රී ලාංකික බත් සහ ව්යංජන",
      ta: "இலங்கை அரிசி மற்றும் கறி",
    },
    description: {
      en: "Steamed Samba or Red Rice served with Clay-Pot Fish, Dhal, and Pol Sambol",
      si: "සුවඳැති සම්බා බත්, මාළු ඇඹුල් තියල්, පරිප්පු හා පොල් සම්බෝල සමග",
      ta: "சம்பா அரிசி சாதம், மீன் குழம்பு, பருப்பு மற்றும் சம்பல்",
    },
    department: Department.Kitchen,
    diningTypes: [DiningType.InRoomDining, DiningType.TableService],
    displayOrder: 1,
    isActive: true,
    iconKey: "rice-bowl",
    availableWindow: { startTime: "11:30", endTime: "15:30" },
    itemCount: 14,
  },
  {
    id: "CAT-HOPPERS-KOTTU",
    name: {
      en: "Hoppers & Street Kottu",
      si: "ආප්ප සහ කොත්තු රොටි",
      ta: "அப்பம் மற்றும் கொத்து ரொட்டி",
    },
    description: {
      en: "Crispy Egg Hoppers, String Hoppers, and Rhythmic Cast-Iron Wok Kottu",
      si: "බිත්තර ආප්ප, ඉඳිආප්ප සහ උණුසුම් චීස් කොත්තු",
      ta: "முட்டை அப்பம், இடியாப்பம் மற்றும் கொத்து",
    },
    department: Department.Kitchen,
    diningTypes: [DiningType.InRoomDining, DiningType.TableService],
    displayOrder: 2,
    isActive: true,
    iconKey: "pan",
    availableWindow: { startTime: "18:00", endTime: "23:00" },
    itemCount: 18,
  },
  {
    id: "CAT-DRINKS-BAR",
    name: {
      en: "Ceylon Teas, Fresh Juices & Bar",
      si: "සිලෝන් තේ, නැවුම් පළතුරු යුෂ සහ බීම",
      ta: "சிலோன் தேநீர், பழச்சாறுகள் மற்றும் பார்",
    },
    description: {
      en: "Single-Estate Nuwara Eliya BOP, King Coconut (Thambili) & Rockland Spirits",
      si: "නුවරඑළිය තේ, තැඹිලි වතුර සහ දේශීය කොක්ටේල්",
      ta: "தேநீர், தம்பிலி இளநீர் மற்றும் பானங்கள்",
    },
    department: Department.Bar,
    diningTypes: [DiningType.InRoomDining, DiningType.TableService, DiningType.BeachCabana],
    displayOrder: 3,
    isActive: true,
    iconKey: "glass-cocktail",
    availableWindow: { startTime: "07:00", endTime: "23:30" },
    itemCount: 26,
  },
  {
    id: "CAT-SANDWICHES",
    name: {
      en: "Club Sandwiches & Burgers",
      si: "සැන්ඩ්විච් සහ බර්ගර්",
      ta: "சாண்ட்விச்கள் மற்றும் பர்கர்கள்",
    },
    description: {
      en: "Triple-Decker Galle Face Club, Seer Fish Melt & Hand-Cut Manioc Chips",
      si: "ට්රිපල් ඩෙකර් ක්ලබ් සැන්ඩ්විච් සහ බතල චිප්ස්",
      ta: "சாண்ட்விச் மற்றும் மரவள்ளிக்கிழங்கு சிப்ஸ்",
    },
    department: Department.Kitchen,
    diningTypes: [DiningType.InRoomDining, DiningType.PoolSide],
    displayOrder: 4,
    isActive: true,
    iconKey: "sandwich",
    availableWindow: { startTime: "10:30", endTime: "22:00" },
    itemCount: 9,
  },
  {
    id: "CAT-DESSERTS",
    name: {
      en: "Tropical Sweets & Watalappan",
      si: "දේශීය අතුරුපස සහ වටලප්පන්",
      ta: "இனிப்புகள் மற்றும் வட்டலாப்பம்",
    },
    description: {
      en: "Kithul Jaggery Steamed Pudding, Buffalo Curd & Treacle, and Fresh Papaya",
      si: "හකුරු වටලප්පන්, මී කිරි සහ කිතුල් පැණි",
      ta: "வட்டலாப்பம் மற்றும் தேன் தயிர்",
    },
    department: Department.Kitchen,
    diningTypes: [DiningType.InRoomDining, DiningType.TableService],
    displayOrder: 5,
    isActive: true,
    iconKey: "cake",
    availableWindow: { startTime: "11:00", endTime: "23:00" },
    itemCount: 7,
  },
  {
    id: "CAT-AMENITIES",
    name: {
      en: "Housekeeping Amenities",
      si: "කාමර සේවා උපකරණ සහ අමතර ද්රව්ය",
      ta: "அறை பராமரிப்பு பொருட்கள்",
    },
    description: {
      en: "Complimentary Ceylon Tea Caddies, Extra Bath Linens, Pillows & Ironing Board",
      si: "අමතර තුවා, කොට්ට, සිලෝන් තේ සහ අයන් බෝඩ්",
      ta: "கூடுதல் துண்டுகள், தலையணைகள் மற்றும் தேநீர்",
    },
    department: Department.Housekeeping,
    diningTypes: [DiningType.InRoomDining],
    displayOrder: 6,
    isActive: true,
    iconKey: "sparkles",
    availableWindow: { startTime: "00:00", endTime: "23:59" },
    itemCount: 12,
  },
  {
    id: "CAT-SPA-WELLNESS",
    name: {
      en: "Ayurveda Wellness & Spa",
      si: "ආයුර්වේද සහ සුවතා ප්රතිකාර",
      ta: "ஆயுர்வேத மற்றும் ஸ்பா சிகிச்சை",
    },
    description: {
      en: "Samadhi Herbal Oil Abhyanga, Shirodhara, and Steam Herb Baths",
      si: "ඖෂධීය තෙල් අභ්යංග, ශිරෝධාරා සහ වාෂ්ප ස්නාන",
      ta: "மூலிகை எண்ணெய் சிகிச்சை மற்றும் நீராவி குளியல்",
    },
    department: Department.Spa,
    diningTypes: [DiningType.InRoomDining],
    displayOrder: 7,
    isActive: true,
    iconKey: "flower",
    availableWindow: { startTime: "08:00", endTime: "20:00" },
    itemCount: 8,
  },
];

// ============================================================================
// SVG Icon Renderer (48x48px Scalable Apple HIG Vectors)
// ============================================================================

export function CategoryIconSvg({
  iconKey,
  className = "w-7 h-7 text-[#0B6E4F]",
}: {
  readonly iconKey: string;
  readonly className?: string | undefined;
}) {
  switch (iconKey) {
    case "rice-bowl":
      return (
        <svg
          className={className}
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
          className={className}
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
    case "glass-cocktail":
      return (
        <svg
          className={className}
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
    case "sandwich":
      return (
        <svg
          className={className}
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
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
          <path d="M4 16s2-1 4 0 4 0 4 0 2-1 4 0 4 0 4 0" />
          <path d="M2 21h20" />
          <path d="M7 8v3" />
          <path d="M12 8v3" />
          <path d="M17 8v3" />
          <path d="M7 4h.01" />
          <path d="M12 4h.01" />
          <path d="M17 4h.01" />
        </svg>
      );
    case "sparkles":
      return (
        <svg
          className={className}
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
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5" />
          <path d="M12 7.5V3" />
          <path d="M12 21v-4.5" />
          <path d="M16.5 12H21" />
          <path d="M3 12h4.5" />
        </svg>
      );
    default:
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="18" height="18" x="3" y="3" rx="4" />
          <path d="M9 9h6v6H9z" />
        </svg>
      );
  }
}

// ============================================================================
// Modal Dialog for Category Editing & Creation
// ============================================================================

interface CategoryEditorModalProps {
  readonly initialCategory?: AdminMenuCategoryItem | null;
  readonly onSave: (category: AdminMenuCategoryItem) => void;
  readonly onClose: () => void;
  readonly nextDisplayOrder: number;
}

const AVAILABLE_ICONS = [
  "rice-bowl",
  "pan",
  "glass-cocktail",
  "sandwich",
  "cake",
  "sparkles",
  "flower",
] as const;

interface TrilingualFormFieldsProps {
  readonly formId: string;
  readonly nameEn: string;
  readonly setNameEn: (v: string) => void;
  readonly nameSi: string;
  readonly setNameSi: (v: string) => void;
  readonly nameTa: string;
  readonly setNameTa: (v: string) => void;
  readonly descEn: string;
  readonly setDescEn: (v: string) => void;
}

function TrilingualFormFields({
  formId,
  nameEn,
  setNameEn,
  nameSi,
  setNameSi,
  nameTa,
  setNameTa,
  descEn,
  setDescEn,
}: TrilingualFormFieldsProps) {
  return (
    <div className="space-y-3">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
        Category Title &amp; Description (Trilingual)
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label
            htmlFor={`${formId}-name-en`}
            className="text-[11px] font-semibold text-slate-600 block mb-1"
          >
            English (Default) *
          </label>
          <input
            id={`${formId}-name-en`}
            type="text"
            required
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="e.g. Traditional Curries"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]"
          />
        </div>
        <div>
          <label
            htmlFor={`${formId}-name-si`}
            className="text-[11px] font-semibold text-slate-600 block mb-1"
          >
            සිංහල (Sinhala)
          </label>
          <input
            id={`${formId}-name-si`}
            type="text"
            value={nameSi}
            onChange={(e) => setNameSi(e.target.value)}
            placeholder="උදා. ව්යංජන"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]"
          />
        </div>
        <div>
          <label
            htmlFor={`${formId}-name-ta`}
            className="text-[11px] font-semibold text-slate-600 block mb-1"
          >
            தமிழ் (Tamil)
          </label>
          <input
            id={`${formId}-name-ta`}
            type="text"
            value={nameTa}
            onChange={(e) => setNameTa(e.target.value)}
            placeholder="எ.கா. கறி வகைகள்"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor={`${formId}-desc-en`}
          className="text-[11px] font-semibold text-slate-600 block mb-1"
        >
          Description (English)
        </label>
        <input
          id={`${formId}-desc-en`}
          type="text"
          value={descEn}
          onChange={(e) => setDescEn(e.target.value)}
          placeholder="Brief description for guest ordering PWA"
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]"
        />
      </div>
    </div>
  );
}

interface DiningChannelsSelectProps {
  readonly diningTypes: ReadonlyArray<DiningType>;
  readonly onToggle: (type: DiningType) => void;
}

function DiningChannelsSelect({ diningTypes, onToggle }: DiningChannelsSelectProps) {
  const channels = [
    { type: DiningType.InRoomDining, label: "Room QR" },
    { type: DiningType.TableService, label: "Dine-In Restaurant" },
    { type: DiningType.BeachCabana, label: "Beach Cabana" },
    { type: DiningType.PoolSide, label: "Poolside" },
  ];

  return (
    <div className="space-y-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
        Applicable Dining Channels
      </span>
      <div className="flex flex-wrap gap-2">
        {channels.map(({ type, label }) => {
          const isChecked = diningTypes.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggle(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border min-h-[36px] ${
                isChecked
                  ? "bg-[#0B6E4F] text-white border-apple-blue shadow-sm"
                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 "
              }`}
            >
              {isChecked ? "OK " : ""}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryEditorModal({
  initialCategory,
  onSave,
  onClose,
  nextDisplayOrder,
}: CategoryEditorModalProps) {
  const formId = useId();
  const [nameEn, setNameEn] = useState(initialCategory?.name.en ?? "");
  const [nameSi, setNameSi] = useState(initialCategory?.name.si ?? "");
  const [nameTa, setNameTa] = useState(initialCategory?.name.ta ?? "");
  const [descEn, setDescEn] = useState(initialCategory?.description?.en ?? "");

  const [department, setDepartment] = useState<Department>(
    initialCategory?.department ?? Department.Kitchen,
  );
  const [iconKey, setIconKey] = useState<string>(initialCategory?.iconKey ?? "rice-bowl");
  const [startTime, setStartTime] = useState(
    initialCategory?.availableWindow?.startTime ?? "06:30",
  );
  const [endTime, setEndTime] = useState(initialCategory?.availableWindow?.endTime ?? "23:00");
  const [isActive, setIsActive] = useState(initialCategory?.isActive ?? true);
  const [diningTypes, setDiningTypes] = useState<ReadonlyArray<DiningType>>(
    initialCategory?.diningTypes ?? [DiningType.InRoomDining, DiningType.TableService],
  );

  const toggleDiningType = (type: DiningType) => {
    if (diningTypes.includes(type)) {
      if (diningTypes.length > 1) {
        setDiningTypes(diningTypes.filter((t) => t !== type));
      }
    } else {
      setDiningTypes([...diningTypes, type]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) return;

    onSave({
      id: initialCategory?.id ?? `CAT-${Date.now()}`,
      name: {
        en: nameEn.trim(),
        si: nameSi.trim() || null,
        ta: nameTa.trim() || null,
      },
      description: descEn.trim()
        ? {
            en: descEn.trim(),
            si: null,
            ta: null,
          }
        : undefined,
      department,
      diningTypes,
      displayOrder: initialCategory?.displayOrder ?? nextDisplayOrder,
      isActive,
      iconKey,
      availableWindow: { startTime, endTime },
      itemCount: initialCategory?.itemCount ?? 0,
    });
  };

  return (
    <dialog
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 border-none m-0 w-full h-full max-w-none max-h-none"
      open
      aria-labelledby={`${formId}-title`}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 ">
          <div>
            <h2 id={`${formId}-title`} className="text-lg font-bold text-slate-900 ">
              {initialCategory ? "Edit Catalog Category" : "New Catalog Category"}
            </h2>
            <p className="text-xs text-slate-500">
              DOMSpeed-grade category configuration with trilingual labels &amp; time windows
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Close modal"
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <TrilingualFormFields
            formId={formId}
            nameEn={nameEn}
            setNameEn={setNameEn}
            nameSi={nameSi}
            setNameSi={setNameSi}
            nameTa={nameTa}
            setNameTa={setNameTa}
            descEn={descEn}
            setDescEn={setDescEn}
          />

          {/* Department & Icon Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={`${formId}-dept`}
                className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1"
              >
                Department Allocation
              </label>
              <select
                id={`${formId}-dept`}
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]"
              >
                <option value={Department.Kitchen}>Kitchen (Hot/Cold Food)</option>
                <option value={Department.Bar}>Bar &amp; Beverage</option>
                <option value={Department.Housekeeping}>Housekeeping &amp; Amenities</option>
                <option value={Department.Spa}>Ayurveda &amp; Wellness Spa</option>
                <option value={Department.Banquet}>Banquet &amp; Events</option>
                <option value={Department.Transport}>Excursions &amp; Chauffeur</option>
              </select>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                48x48px Vector Icon
              </span>
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {AVAILABLE_ICONS.map((key) => {
                  const isSelected = iconKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIconKey(key)}
                      className={`p-2.5 rounded-xl border transition flex items-center justify-center min-h-[44px] min-w-[44px] ${
                        isSelected
                          ? "border-apple-blue bg-blue-50 text-[#0B6E4F] shadow-sm"
                          : "border-slate-200 hover:bg-slate-100 text-slate-600 "
                      }`}
                      aria-label={`Select ${key} icon`}
                    >
                      <CategoryIconSvg iconKey={key} className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time Window (Availability Hours) */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Availability Hours (Asia/Colombo UTC+05:30)
            </span>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label
                  htmlFor={`${formId}-start-time`}
                  className="text-[11px] text-slate-500 block mb-1"
                >
                  Start Time
                </label>
                <input
                  id={`${formId}-start-time`}
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono min-h-[44px]"
                />
              </div>
              <span className="text-slate-400 pt-5">to</span>
              <div className="flex-1">
                <label
                  htmlFor={`${formId}-end-time`}
                  className="text-[11px] text-slate-500 block mb-1"
                >
                  End Time (Supports Overnight)
                </label>
                <input
                  id={`${formId}-end-time`}
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono min-h-[44px]"
                />
              </div>
            </div>
          </div>

          <DiningChannelsSelect diningTypes={diningTypes} onToggle={toggleDiningType} />

          {/* Active Switch */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Category Active Status</span>
              <span className="text-[11px] text-slate-500">
                When inactive, this category and its dishes are hidden from the guest ordering PWA.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 ">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-[#0B6E4F] hover:bg-blue-600 text-white shadow-md min-h-[44px] transition"
            >
              {initialCategory ? "Save Changes" : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

// ============================================================================
// Category Card Sub-Component (Cognitive Complexity <= 12)
// ============================================================================

interface CategoryCardItemProps {
  readonly category: AdminMenuCategoryItem;
  readonly index: number;
  readonly totalCount: number;
  readonly currentLanguage: SupportedLanguage;
  readonly onMove: (index: number, direction: "UP" | "DOWN") => void;
  readonly onEdit: (category: AdminMenuCategoryItem) => void;
  readonly onDelete: (id: string) => void;
}

function resolveLocalizedTitle(cat: AdminMenuCategoryItem, lang: SupportedLanguage): string {
  if (lang === "si" && cat.name.si) return cat.name.si;
  if (lang === "ta" && cat.name.ta) return cat.name.ta;
  return cat.name.en;
}

function CategoryCardItem({
  category,
  index,
  totalCount,
  currentLanguage,
  onMove,
  onEdit,
  onDelete,
}: CategoryCardItemProps) {
  const localizedTitle = resolveLocalizedTitle(category, currentLanguage);

  return (
    <div
      className={`group relative p-5 rounded-2xl bg-white/80 backdrop-blur-md border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${
        category.isActive ? "border-slate-200/80 " : "border-slate-200/40 opacity-75"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-inner">
            <CategoryIconSvg iconKey={category.iconKey} className="w-6 h-6 text-[#0B6E4F]" />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">
              #{category.displayOrder}
            </span>

            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMove(index, "UP")}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Move category up"
            >
              ▲
            </button>
            <button
              type="button"
              disabled={index === totalCount - 1}
              onClick={() => onMove(index, "DOWN")}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Move category down"
            >
              ▼
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900 leading-tight">{localizedTitle}</h3>
          {category.name.en !== localizedTitle && (
            <span className="text-xs text-slate-400 block font-normal">{category.name.en}</span>
          )}
          {category.description?.en && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{category.description.en}</p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
            Time {category.availableWindow?.startTime ?? "00:00"}–
            {category.availableWindow?.endTime ?? "23:59"}
          </span>
          <span className="font-semibold text-slate-700 ">
            {category.itemCount} {category.itemCount === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              category.isActive
                ? "bg-emerald-100 text-emerald-800 "
                : "bg-slate-100 text-slate-600 "
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                category.isActive ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            {category.isActive ? "Active on QR" : "Hidden"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(category)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition min-h-[36px]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(category.id)}
              className="px-2 py-1.5 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 transition min-h-[36px]"
              aria-label="Delete category"
            >
              x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main CategoryManager Component
// ============================================================================

export function CategoryManager({
  categories: initialCategories = DEFAULT_DOMSPEED_CATEGORIES,
  onSaveCategory,
  onDeleteCategory,
  onReorderCategories,
  className = "",
}: CategoryManagerProps) {
  const { currentLanguage } = useTranslation();
  const [categories, setCategories] =
    useState<ReadonlyArray<AdminMenuCategoryItem>>(initialCategories);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("ALL");
  const [editingCategory, setEditingCategory] = useState<AdminMenuCategoryItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Sync state if props change
  useMemo(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const filteredCategories = useMemo(() => {
    if (selectedDeptFilter === "ALL") return categories;
    return categories.filter((c) => c.department === selectedDeptFilter);
  }, [categories, selectedDeptFilter]);

  const moveCategory = (index: number, direction: "UP" | "DOWN") => {
    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updated = [...categories];
    const temp = updated[index];
    const swapWith = updated[targetIndex];
    if (!temp || !swapWith) return;

    updated[index] = { ...swapWith, displayOrder: index + 1 };
    updated[targetIndex] = { ...temp, displayOrder: targetIndex + 1 };

    setCategories(updated);
    if (onReorderCategories) {
      onReorderCategories(updated);
    }
  };

  const handleSaveModal = (category: AdminMenuCategoryItem) => {
    const exists = categories.some((c) => c.id === category.id);
    let updated: ReadonlyArray<AdminMenuCategoryItem>;

    if (exists) {
      updated = categories.map((c) => (c.id === category.id ? category : c));
    } else {
      updated = [...categories, category];
    }

    setCategories(updated);
    if (onSaveCategory) {
      onSaveCategory(category);
    }
    setEditingCategory(null);
    setIsCreating(false);
  };

  const handleDelete = (categoryId: string) => {
    const updated = categories.filter((c) => c.id !== categoryId);
    setCategories(updated);
    if (onDeleteCategory) {
      onDeleteCategory(categoryId);
    }
  };

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Top Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/70 backdrop-blur-xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 ">
              Menu &amp; Catalog Categories
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 ">
              DOMSpeed Parity
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage multi-department catalog sections, drag/sort sequence, trilingual copy, and time
            windows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl bg-[#0B6E4F] hover:bg-blue-600 text-white transition shadow-md min-h-[44px]"
          >
            <span>+</span>
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs by Department */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: "ALL", label: "All Sections" },
          { key: Department.Kitchen, label: "Kitchen & Dining" },
          { key: Department.Bar, label: "Bar & Beverages" },
          { key: Department.Housekeeping, label: "Housekeeping" },
          { key: Department.Spa, label: "Ayurveda Spa" },
        ].map((tab) => {
          const isSelected = selectedDeptFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedDeptFilter(tab.key)}
              className={`px-4 py-2 text-xs font-semibold rounded-full transition border min-h-[40px] whitespace-nowrap ${
                isSelected
                  ? "bg-white text-slate-900 border-transparent shadow-sm"
                  : "bg-white/60 text-slate-600 border-slate-200 hover:bg-slate-100 "
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Category Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCategories.map((category, index) => (
          <CategoryCardItem
            key={category.id}
            category={category}
            index={index}
            totalCount={filteredCategories.length}
            currentLanguage={currentLanguage}
            onMove={moveCategory}
            onEdit={setEditingCategory}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Editor Modal for Create / Edit */}
      {(isCreating || editingCategory) && (
        <CategoryEditorModal
          initialCategory={editingCategory}
          onSave={handleSaveModal}
          onClose={() => {
            setIsCreating(false);
            setEditingCategory(null);
          }}
          nextDisplayOrder={categories.length + 1}
        />
      )}
    </div>
  );
}
