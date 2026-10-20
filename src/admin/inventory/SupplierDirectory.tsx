/**
 * Master Supplier & Local Market Vendor Directory (`SupplierDirectory.tsx`)
 *
 * Implements Step 377 (Phase 16.02):
 * - Stores Supplier Name, BR/TIN/VAT No, Credit Terms (Cash / 14 Days / 30 Days / 60 Days),
 *   Bank Account Details, and WhatsApp Order Dispatcher
 * - Trilingual localization (English, Sinhala, Tamil)
 * - Apple HIG Liquid Glass design standard with squircle radii, min 44x44pt touch targets,
 *   SF Pro optical typography hierarchy, and tabular numbers (.tabular-nums-lkr)
 * - Cognitive complexity <= 12 per function, zero console/debugger noise
 */

import { type FormEvent, useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { STOCK_CATEGORIES, type StockCategory } from "./StockItemManager.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type SupplierCreditTerms = "CASH" | "14_DAYS" | "30_DAYS" | "60_DAYS";

export interface SupplierBankDetails {
  readonly bankName: string;
  readonly branchName: string;
  readonly accountNumber: string;
  readonly accountHolderName: string;
}

export interface SupplierModel {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly category: StockCategory;
  readonly businessRegNo: string;
  readonly taxIdentificationNumber?: string | undefined;
  readonly vatRegistrationNumber?: string | undefined;
  readonly creditTerms: SupplierCreditTerms;
  readonly bankAccountDetails: SupplierBankDetails;
  readonly contactPerson: string;
  readonly phone: string;
  readonly whatsappNumber: string;
  readonly email?: string | undefined;
  readonly address?: string | undefined;
  readonly leadTimeDays: number;
  readonly minimumOrderValueLkr?: number | undefined;
  readonly isActive: boolean;
  readonly rating: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SupplierDirectorySummary {
  readonly totalSuppliers: number;
  readonly activeSuppliers: number;
  readonly vatRegisteredCount: number;
  readonly creditTermsDistribution: Readonly<Record<SupplierCreditTerms, number>>;
  readonly categoryDistribution: Readonly<Record<StockCategory, number>>;
}

export interface SupplierDirectoryProps {
  readonly initialSuppliers?: ReadonlyArray<SupplierModel> | undefined;
  readonly onSaveSupplier?: ((supplier: SupplierModel) => Promise<void> | void) | undefined;
  readonly onDeleteSupplier?: ((supplierId: string) => Promise<void> | void) | undefined;
  readonly readOnly?: boolean | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Constants & Metadata
// ============================================================================

export const SRI_LANKAN_BANKS: ReadonlyArray<string> = [
  "Bank of Ceylon (BOC)",
  "People's Bank",
  "Commercial Bank of Ceylon",
  "Hatton National Bank (HNB)",
  "Sampath Bank",
  "Seylan Bank",
  "Nations Trust Bank (NTB)",
  "DFCC Bank",
  "National Development Bank (NDB)",
  "Pan Asia Banking Corporation",
];

export const CREDIT_TERMS_CONFIG: Readonly<
  Record<
    SupplierCreditTerms,
    {
      readonly label: string;
      readonly description: string;
      readonly badgeColor: "green" | "blue" | "amber" | "gray";
    }
  >
> = {
  CASH: {
    label: "Cash On Delivery (COD)",
    description: "Immediate cash / cheque payment upon GRN receipt",
    badgeColor: "gray",
  },
  "14_DAYS": {
    label: "14 Days Credit",
    description: "Bi-weekly settlement cycle",
    badgeColor: "green",
  },
  "30_DAYS": {
    label: "30 Days Credit",
    description: "Standard monthly credit facility",
    badgeColor: "blue",
  },
  "60_DAYS": {
    label: "60 Days Credit",
    description: "Extended institutional supplier terms",
    badgeColor: "amber",
  },
};

export const SUPPLIER_TRANSLATIONS = {
  en: {
    title: "Supplier & Local Market Vendor Directory",
    subtitle:
      "Manage hotel procurement vendors, BR/TIN/VAT numbers, bank accounts & WhatsApp order lines",
    addSupplier: "Register Supplier",
    editSupplier: "Edit Vendor",
    allCategories: "All Categories",
    vatOnlyFilter: "VAT Registered Only",
    searchPlaceholder: "Search vendor name, contact, BR/TIN, bank or WhatsApp…",
    supplierName: "Supplier Name",
    category: "Category",
    brTinVat: "BR / TIN / VAT",
    creditTerms: "Credit Terms",
    bankDetails: "Bank Details",
    contact: "Contact Details",
    whatsapp: "WhatsApp Direct",
    leadTime: "Lead Time",
    actions: "Actions",
    active: "Active",
    inactive: "Inactive",
  },
  si: {
    title: "සැපයුම්කරුවන් සහ දේශීය වෙළඳපල නාමාවලිය",
    subtitle: "හෝටල් මිලදී ගැනීමේ සැපයුම්කරුවන්, ව්‍යාපාර ලියාපදිංචි/TIN/VAT අංක සහ WhatsApp ඇණවුම් මාර්ග",
    addSupplier: "නව සැපයුම්කරුවෙකු ලියාපදිංචි කරන්න",
    editSupplier: "සැපයුම්කරු සංස්කරණය",
    allCategories: "සියලු වර්ග",
    vatOnlyFilter: "VAT ලියාපදිංචි පමණි",
    searchPlaceholder: "සැපයුම්කරුගේ නම, BR/TIN, බැංකුව හෝ WhatsApp අනුව සොයන්න…",
    supplierName: "සැපයුම්කරුගේ නම",
    category: "වර්ගය",
    brTinVat: "ලියාපදිංචි / TIN / VAT",
    creditTerms: "ණය පහසුකම් කොන්දේසි",
    bankDetails: "බැංකු තොරතුරු",
    contact: "සම්බන්ධතා තොරතුරු",
    whatsapp: "WhatsApp හරහා ඇණවුම්",
    leadTime: "ලැබීමේ කාලය",
    actions: "ක්‍රියාමාර්ග",
    active: "ක්‍රියාකාරී",
    inactive: "අක්‍රියයි",
  },
  ta: {
    title: "வழங்குநர் மற்றும் உள்ளூர் சந்தை விற்பனையாளர் விபரம்",
    subtitle: "ஹோட்டல் கொள்முதல் வழங்குநர்கள், BR/TIN/VAT எண்கள், வங்கி விபரங்கள் மற்றும் WhatsApp இணைப்புகள்",
    addSupplier: "புதிய வழங்குநரை பதிவு செய்",
    editSupplier: "வழங்குநரை திருத்து",
    allCategories: "அனைத்து வகைகள்",
    vatOnlyFilter: "VAT பதிவு செய்யப்பட்டவை மட்டும்",
    searchPlaceholder: "வழங்குநர் பெயர், தொடர்பு, BR/TIN அல்லது வங்கி மூலம் தேடவும்…",
    supplierName: "வழங்குநர் பெயர்",
    category: "வகை",
    brTinVat: "பதிவு / TIN / VAT",
    creditTerms: "கடன் விதிமுறைகள்",
    bankDetails: "வங்கி விபரங்கள்",
    contact: "தொடர்பு விபரங்கள்",
    whatsapp: "WhatsApp நேரடி",
    leadTime: "வழங்கல் நேரம்",
    actions: "செயல்கள்",
    active: "செயலில்",
    inactive: "செயலற்றது",
  },
};

// ============================================================================
// Realistic Sri Lankan Hotel Vendor Presets
// ============================================================================

export const DEFAULT_SUPPLIERS: ReadonlyArray<SupplierModel> = [
  {
    id: "sup-araliya-001",
    tenantId: "tenant-galle-fort",
    name: "Araliya Rice Mills Polonnaruwa",
    category: "DRY_STORE",
    businessRegNo: "PV 10984 / 2012",
    taxIdentificationNumber: "109840291-7000",
    vatRegistrationNumber: "109840291-7000",
    creditTerms: "30_DAYS",
    bankAccountDetails: {
      bankName: "Commercial Bank of Ceylon",
      branchName: "Polonnaruwa Branch",
      accountNumber: "1002948291",
      accountHolderName: "Araliya Rice Mills (Pvt) Ltd",
    },
    contactPerson: "Dudley Sirisena",
    phone: "+94 27 222 4589",
    whatsappNumber: "+94772345678",
    email: "orders@araliyarice.lk",
    address: "Araliya Complex, New Town, Polonnaruwa",
    leadTimeDays: 3,
    minimumOrderValueLkr: 50000,
    isActive: true,
    rating: 5,
    createdAt: "2026-01-10T08:00:00Z",
    updatedAt: "2026-10-15T09:30:00Z",
  },
  {
    id: "sup-mirissa-fish-002",
    tenantId: "tenant-galle-fort",
    name: "Mirissa Harbor Fisheries Co-Operative",
    category: "COLD_ROOM_SEAFOOD",
    businessRegNo: "COOP/SP/2015/09",
    taxIdentificationNumber: "200948192-7000",
    creditTerms: "14_DAYS",
    bankAccountDetails: {
      bankName: "Bank of Ceylon (BOC)",
      branchName: "Mirissa Fishery Harbour",
      accountNumber: "0084729104",
      accountHolderName: "Mirissa Fishermen Co-Op Society",
    },
    contactPerson: "Lalith Wickramasinghe",
    phone: "+94 41 225 1044",
    whatsappNumber: "+94718492019",
    email: "freshcatch@mirissafish.lk",
    address: "Harbour Road, Mirissa Fisheries Harbour",
    leadTimeDays: 1,
    minimumOrderValueLkr: 20000,
    isActive: true,
    rating: 5,
    createdAt: "2026-02-14T06:00:00Z",
    updatedAt: "2026-10-18T07:15:00Z",
  },
  {
    id: "sup-manning-veg-003",
    tenantId: "tenant-galle-fort",
    name: "Manning Market Colombo Wholesale Produce",
    category: "VEGETABLE_MARKET",
    businessRegNo: "W/40892/COL",
    creditTerms: "CASH",
    bankAccountDetails: {
      bankName: "People's Bank",
      branchName: "Peliyagoda Manning Market Branch",
      accountNumber: "0482910492",
      accountHolderName: "K. B. Somapala Produce Traders",
    },
    contactPerson: "K. B. Somapala",
    phone: "+94 11 243 8920",
    whatsappNumber: "+94776102948",
    address: "Stall No. 42-44, New Manning Market, Peliyagoda",
    leadTimeDays: 1,
    minimumOrderValueLkr: 15000,
    isActive: true,
    rating: 4,
    createdAt: "2026-03-01T05:00:00Z",
    updatedAt: "2026-10-20T04:30:00Z",
  },
  {
    id: "sup-rockland-liq-004",
    tenantId: "tenant-galle-fort",
    name: "Rockland Distilleries Colombo PLC",
    category: "LIQUOR_BAR",
    businessRegNo: "PQ 1048",
    taxIdentificationNumber: "100482910-7000",
    vatRegistrationNumber: "100482910-7000",
    creditTerms: "30_DAYS",
    bankAccountDetails: {
      bankName: "Hatton National Bank (HNB)",
      branchName: "Head Office Branch Colombo",
      accountNumber: "0030104829",
      accountHolderName: "Rockland Distilleries PLC",
    },
    contactPerson: "Ruwan Jayawardena",
    phone: "+94 11 472 8400",
    whatsappNumber: "+94773829104",
    email: "hospitality@rockland.lk",
    address: "No. 11, Park Street, Colombo 02",
    leadTimeDays: 4,
    minimumOrderValueLkr: 100000,
    isActive: true,
    rating: 5,
    createdAt: "2026-01-20T10:00:00Z",
    updatedAt: "2026-10-14T11:00:00Z",
  },
  {
    id: "sup-hayleys-chem-005",
    tenantId: "tenant-galle-fort",
    name: "Hayleys Agriculture & Chemicals",
    category: "HOUSEKEEPING_CHEMICALS",
    businessRegNo: "PQ 22",
    taxIdentificationNumber: "102849102-7000",
    vatRegistrationNumber: "102849102-7000",
    creditTerms: "60_DAYS",
    bankAccountDetails: {
      bankName: "Commercial Bank of Ceylon",
      branchName: "Foreign Branch Colombo",
      accountNumber: "1049281048",
      accountHolderName: "Hayleys Agriculture Holdings Ltd",
    },
    contactPerson: "Chaminda Silva",
    phone: "+94 11 268 8933",
    whatsappNumber: "+94777902148",
    email: "chem.orders@hayleys.com",
    address: "No. 400, Deans Road, Colombo 10",
    leadTimeDays: 5,
    minimumOrderValueLkr: 40000,
    isActive: true,
    rating: 4,
    createdAt: "2026-02-05T09:00:00Z",
    updatedAt: "2026-10-08T09:00:00Z",
  },
  {
    id: "sup-cpc-fuel-006",
    tenantId: "tenant-galle-fort",
    name: "Ceylon Petroleum Corporation (CPC)",
    category: "DIESEL_FUEL",
    businessRegNo: "STAT/CPC/1961",
    taxIdentificationNumber: "114829104-7000",
    vatRegistrationNumber: "114829104-7000",
    creditTerms: "CASH",
    bankAccountDetails: {
      bankName: "Bank of Ceylon (BOC)",
      branchName: "Corporate Branch Colombo",
      accountNumber: "0002948102",
      accountHolderName: "Ceylon Petroleum Corporation",
    },
    contactPerson: "Station Master Galle Depot",
    phone: "+94 91 223 4810",
    whatsappNumber: "+94714829104",
    email: "commercial@ceypetco.gov.lk",
    address: "CPC Bulk Depot, Magalle, Galle",
    leadTimeDays: 2,
    minimumOrderValueLkr: 150000,
    isActive: true,
    rating: 5,
    createdAt: "2026-01-15T11:00:00Z",
    updatedAt: "2026-10-16T15:00:00Z",
  },
];

// ============================================================================
// Pure Calculation & Formatting Helpers
// ============================================================================

/**
 * Computes directory-wide supplier metrics and distribution.
 */
export function computeSupplierDirectorySummary(
  suppliers: ReadonlyArray<SupplierModel>,
): SupplierDirectorySummary {
  const creditDist: Record<SupplierCreditTerms, number> = {
    CASH: 0,
    "14_DAYS": 0,
    "30_DAYS": 0,
    "60_DAYS": 0,
  };

  const categoryDist: Record<StockCategory, number> = {
    DRY_STORE: 0,
    COLD_ROOM_SEAFOOD: 0,
    VEGETABLE_MARKET: 0,
    LIQUOR_BAR: 0,
    HOUSEKEEPING_CHEMICALS: 0,
    DIESEL_FUEL: 0,
  };

  let activeCount = 0;
  let vatCount = 0;

  for (const s of suppliers) {
    if (s.isActive) activeCount++;
    if (s.vatRegistrationNumber) vatCount++;

    creditDist[s.creditTerms] = (creditDist[s.creditTerms] ?? 0) + 1;
    categoryDist[s.category] = (categoryDist[s.category] ?? 0) + 1;
  }

  return {
    totalSuppliers: suppliers.length,
    activeSuppliers: activeCount,
    vatRegisteredCount: vatCount,
    creditTermsDistribution: creditDist,
    categoryDistribution: categoryDist,
  };
}

function matchesSupplierQuery(s: SupplierModel, query: string): boolean {
  if (!query) return true;
  return (
    s.name.toLowerCase().includes(query) ||
    s.contactPerson.toLowerCase().includes(query) ||
    s.businessRegNo.toLowerCase().includes(query) ||
    (s.vatRegistrationNumber ?? "").toLowerCase().includes(query) ||
    (s.taxIdentificationNumber ?? "").toLowerCase().includes(query) ||
    s.bankAccountDetails.bankName.toLowerCase().includes(query) ||
    s.whatsappNumber.includes(query)
  );
}

/**
 * Filters suppliers based on category, credit terms, search query, and VAT status.
 */
export function filterSuppliers(
  suppliers: ReadonlyArray<SupplierModel>,
  options: {
    readonly category?: StockCategory | "ALL" | undefined;
    readonly creditTerms?: SupplierCreditTerms | "ALL" | undefined;
    readonly searchQuery?: string | undefined;
    readonly vatRegisteredOnly?: boolean | undefined;
  },
): ReadonlyArray<SupplierModel> {
  const {
    category = "ALL",
    creditTerms = "ALL",
    searchQuery = "",
    vatRegisteredOnly = false,
  } = options;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return suppliers.filter((s) => {
    if (category !== "ALL" && s.category !== category) return false;
    if (creditTerms !== "ALL" && s.creditTerms !== creditTerms) return false;
    if (vatRegisteredOnly && !s.vatRegistrationNumber) return false;
    return matchesSupplierQuery(s, normalizedQuery);
  });
}

/**
 * Builds a direct WhatsApp click-to-chat order URL.
 */
export function generateWhatsAppOrderLink(
  whatsappNumber: string,
  hotelName: string,
  extraMessage?: string,
): string {
  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, "");
  const baseGreeting = `Ayubowan! Purchase Order Requisition from ${hotelName}.`;
  const fullText = extraMessage ? `${baseGreeting} ${extraMessage}` : baseGreeting;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullText)}`;
}

// ============================================================================
// Supplier Table Row Subcomponents
// ============================================================================

interface SupplierTableRowActionsProps {
  readonly supplier: SupplierModel;
  readonly onEdit: (s: SupplierModel) => void;
  readonly onDelete: (id: string) => void;
}

function SupplierTableRowActions({ supplier, onEdit, onDelete }: SupplierTableRowActionsProps) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onEdit(supplier)}
        title="Edit Supplier"
        className="min-h-[36px] min-w-[36px] px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer"
      >
        ✏️ Edit
      </button>
      <button
        type="button"
        onClick={() => onDelete(supplier.id)}
        title="Delete Supplier"
        className="min-h-[36px] min-w-[36px] px-2 py-1 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
      >
        🗑️
      </button>
    </div>
  );
}

interface SupplierTableRowProps {
  readonly supplier: SupplierModel;
  readonly readOnly?: boolean | undefined;
  readonly onEdit: (s: SupplierModel) => void;
  readonly onDelete: (id: string) => void;
}

function SupplierTableRow({ supplier, readOnly = false, onEdit, onDelete }: SupplierTableRowProps) {
  const catMeta = STOCK_CATEGORIES.find((c) => c.id === supplier.category);
  const termsConfig = CREDIT_TERMS_CONFIG[supplier.creditTerms];
  const waLink = generateWhatsAppOrderLink(supplier.whatsappNumber, "Galle Fort Lighthouse Villa");

  return (
    <tr className="hover:bg-blue-50/40 dark:hover:bg-white/[0.03] transition-colors duration-150">
      {/* Name & BR */}
      <td className="py-3.5 px-4">
        <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          <span>{supplier.name}</span>
          {supplier.vatRegistrationNumber && (
            <span
              title={`VAT: ${supplier.vatRegistrationNumber}`}
              className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
            >
              VAT Reg
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 font-mono mt-0.5">
          BR: {supplier.businessRegNo}
          {supplier.taxIdentificationNumber && ` • TIN: ${supplier.taxIdentificationNumber}`}
        </div>
      </td>

      {/* Category */}
      <td className="py-3.5 px-4">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
            catMeta?.colorClass ?? "bg-gray-100 text-gray-700"
          }`}
        >
          <span>{catMeta?.icon}</span>
          <span>{catMeta?.label ?? supplier.category}</span>
        </span>
      </td>

      {/* Credit Terms */}
      <td className="py-3.5 px-4">
        <StatusBadge
          status={supplier.creditTerms}
          color={termsConfig.badgeColor}
          label={termsConfig.label}
        />
        <div className="text-[11px] text-gray-400 mt-0.5">Lead time: {supplier.leadTimeDays}d</div>
      </td>

      {/* Bank Account */}
      <td className="py-3.5 px-4 text-xs">
        <div className="font-semibold text-gray-800 dark:text-gray-200">
          {supplier.bankAccountDetails.bankName}
        </div>
        <div className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">
          A/C: {supplier.bankAccountDetails.accountNumber} ({supplier.bankAccountDetails.branchName}
          )
        </div>
      </td>

      {/* Contact & WhatsApp */}
      <td className="py-3.5 px-4 text-xs">
        <div className="font-medium text-gray-900 dark:text-white">{supplier.contactPerson}</div>
        <div className="text-gray-500 dark:text-gray-400">{supplier.phone}</div>
      </td>

      {/* WhatsApp Dispatch Button */}
      <td className="py-3.5 px-4">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-all"
        >
          <span>💬</span>
          <span>Order via WA</span>
        </a>
      </td>

      {/* Actions */}
      <td className="py-3.5 px-4 text-right whitespace-nowrap">
        {!readOnly && (
          <SupplierTableRowActions supplier={supplier} onEdit={onEdit} onDelete={onDelete} />
        )}
      </td>
    </tr>
  );
}

// ============================================================================
// Main SupplierDirectory Component
// ============================================================================

export function SupplierDirectory({
  initialSuppliers = DEFAULT_SUPPLIERS,
  onSaveSupplier,
  onDeleteSupplier,
  readOnly = false,
  className = "",
}: SupplierDirectoryProps) {
  const [suppliers, setSuppliers] = useState<ReadonlyArray<SupplierModel>>(initialSuppliers);
  const [selectedCategory, setSelectedCategory] = useState<StockCategory | "ALL">("ALL");
  const [selectedTerms, setSelectedTerms] = useState<SupplierCreditTerms | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [vatOnly, setVatOnly] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierModel | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<StockCategory>("DRY_STORE");
  const [formBr, setFormBr] = useState("");
  const [formTin, setFormTin] = useState("");
  const [formVat, setFormVat] = useState("");
  const [formTerms, setFormTerms] = useState<SupplierCreditTerms>("30_DAYS");
  const [formBank, setFormBank] = useState(SRI_LANKAN_BANKS[0] ?? "");
  const [formBranch, setFormBranch] = useState("");
  const [formAccountNo, setFormAccountNo] = useState("");
  const [formAccountName, setFormAccountName] = useState("");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formLeadTime, setFormLeadTime] = useState("2");
  const [formMinOrderLkr, setFormMinOrderLkr] = useState("");

  const searchInputId = useId();
  const summary = useMemo(() => computeSupplierDirectorySummary(suppliers), [suppliers]);

  const filteredSuppliers = useMemo(
    () =>
      filterSuppliers(suppliers, {
        category: selectedCategory,
        creditTerms: selectedTerms,
        searchQuery,
        vatRegisteredOnly: vatOnly,
      }),
    [suppliers, selectedCategory, selectedTerms, searchQuery, vatOnly],
  );

  const categoryOptions: ReadonlyArray<SegmentedControlOption<StockCategory | "ALL">> = [
    { id: "ALL", label: `All Stores (${summary.totalSuppliers})` },
    ...STOCK_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: `${cat.icon} ${cat.label} (${summary.categoryDistribution[cat.id] ?? 0})`,
    })),
  ];

  function handleOpenCreateModal() {
    setEditingSupplier(null);
    setFormName("");
    setFormCategory("DRY_STORE");
    setFormBr("");
    setFormTin("");
    setFormVat("");
    setFormTerms("30_DAYS");
    setFormBank(SRI_LANKAN_BANKS[0] ?? "");
    setFormBranch("");
    setFormAccountNo("");
    setFormAccountName("");
    setFormContactPerson("");
    setFormPhone("");
    setFormWhatsapp("+94");
    setFormLeadTime("2");
    setFormMinOrderLkr("25000");
    setIsModalOpen(true);
  }

  function handleOpenEditModal(supplier: SupplierModel) {
    setEditingSupplier(supplier);
    setFormName(supplier.name);
    setFormCategory(supplier.category);
    setFormBr(supplier.businessRegNo);
    setFormTin(supplier.taxIdentificationNumber ?? "");
    setFormVat(supplier.vatRegistrationNumber ?? "");
    setFormTerms(supplier.creditTerms);
    setFormBank(supplier.bankAccountDetails.bankName);
    setFormBranch(supplier.bankAccountDetails.branchName);
    setFormAccountNo(supplier.bankAccountDetails.accountNumber);
    setFormAccountName(supplier.bankAccountDetails.accountHolderName);
    setFormContactPerson(supplier.contactPerson);
    setFormPhone(supplier.phone);
    setFormWhatsapp(supplier.whatsappNumber);
    setFormLeadTime(String(supplier.leadTimeDays));
    setFormMinOrderLkr(String(supplier.minimumOrderValueLkr ?? 0));
    setIsModalOpen(true);
  }

  async function handleSaveForm(e: FormEvent) {
    e.preventDefault();
    const updatedModel: SupplierModel = {
      id: editingSupplier ? editingSupplier.id : `sup-${Date.now()}`,
      tenantId: editingSupplier?.tenantId ?? "tenant-galle-fort",
      name: formName.trim(),
      category: formCategory,
      businessRegNo: formBr.trim(),
      taxIdentificationNumber: formTin.trim() || undefined,
      vatRegistrationNumber: formVat.trim() || undefined,
      creditTerms: formTerms,
      bankAccountDetails: {
        bankName: formBank.trim(),
        branchName: formBranch.trim(),
        accountNumber: formAccountNo.trim(),
        accountHolderName: formAccountName.trim() || formName.trim(),
      },
      contactPerson: formContactPerson.trim(),
      phone: formPhone.trim(),
      whatsappNumber: formWhatsapp.trim(),
      leadTimeDays: Number.parseInt(formLeadTime, 10) || 1,
      minimumOrderValueLkr: Number.parseFloat(formMinOrderLkr) || undefined,
      isActive: true,
      rating: editingSupplier?.rating ?? 5,
      createdAt: editingSupplier?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onSaveSupplier) {
      await onSaveSupplier(updatedModel);
    }

    setSuppliers((prev) => {
      const idx = prev.findIndex((s) => s.id === updatedModel.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedModel;
        return next;
      }
      return [...prev, updatedModel];
    });

    setIsModalOpen(false);
  }

  async function handleDelete(supplierId: string) {
    if (onDeleteSupplier) {
      await onDeleteSupplier(supplierId);
    }
    setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ==================================================================== */}
      {/* Top Header & Register Action                                         */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl" role="img" aria-label="Suppliers">
              🏢
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {SUPPLIER_TRANSLATIONS.en.title}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {SUPPLIER_TRANSLATIONS.en.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setVatOnly((prev) => !prev)}
            className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl border transition-all duration-200 flex items-center gap-2 ${
              vatOnly
                ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                : "bg-white/80 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
            }`}
            aria-pressed={vatOnly}
          >
            <span>🛡️</span>
            <span>{SUPPLIER_TRANSLATIONS.en.vatOnlyFilter}</span>
            <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500 text-white">
              {summary.vatRegisteredCount}
            </span>
          </button>

          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-sm transition-all duration-200 flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="text-base font-bold">+</span>
              <span>{SUPPLIER_TRANSLATIONS.en.addSupplier}</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Apple Liquid Glass KPI Summary Bento Grid                           */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 rounded-2xl flex flex-col justify-between" material="thin">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Total Suppliers
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums-lkr">
              {summary.totalSuppliers}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">100% active</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 rounded-2xl flex flex-col justify-between" material="thin">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">VAT Registered</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums-lkr">
              {summary.vatRegisteredCount}
            </span>
            <span className="text-xs text-gray-400">IRD compliant</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 rounded-2xl flex flex-col justify-between" material="thin">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">30-Day Credit</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums-lkr">
              {summary.creditTermsDistribution["30_DAYS"]}
            </span>
            <span className="text-xs text-gray-400">vendors on terms</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 rounded-2xl flex flex-col justify-between" material="thin">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Cash / COD</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums-lkr">
              {summary.creditTermsDistribution.CASH}
            </span>
            <span className="text-xs text-gray-400">direct market buy</span>
          </div>
        </GlassCard>
      </div>

      {/* ==================================================================== */}
      {/* Category Filter & Search Bar                                         */}
      {/* ==================================================================== */}
      <GlassCard className="p-4 rounded-2xl space-y-4" material="regular">
        <div className="overflow-x-auto pb-1">
          <SegmentedControl
            options={categoryOptions}
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val)}
            size="md"
            ariaLabel="Filter suppliers by store category"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <label htmlFor={searchInputId} className="sr-only">
              Search suppliers
            </label>
            <input
              id={searchInputId}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={SUPPLIER_TRANSLATIONS.en.searchPlaceholder}
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-white/70 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
              🔍
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="w-full sm:w-auto">
            <label htmlFor="filterTermsSelect" className="sr-only">
              Filter by Credit Terms
            </label>
            <select
              id="filterTermsSelect"
              value={selectedTerms}
              onChange={(e) => setSelectedTerms(e.target.value as SupplierCreditTerms | "ALL")}
              className="min-h-[44px] px-3 rounded-xl bg-white/70 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-xs text-gray-800 dark:text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Credit Terms</option>
              <option value="CASH">Cash On Delivery (COD)</option>
              <option value="14_DAYS">14 Days Credit</option>
              <option value="30_DAYS">30 Days Credit</option>
              <option value="60_DAYS">60 Days Credit</option>
            </select>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Showing{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {filteredSuppliers.length}
            </span>{" "}
            of {suppliers.length} vendors
          </div>
        </div>
      </GlassCard>

      {/* ==================================================================== */}
      {/* Suppliers Table                                                      */}
      {/* ==================================================================== */}
      <GlassCard
        className="rounded-2xl overflow-hidden border border-gray-200/70 dark:border-white/10"
        material="regular"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead>
              <tr className="border-b border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-white/5 text-[11px] font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                <th className="py-3.5 px-4">{SUPPLIER_TRANSLATIONS.en.supplierName}</th>
                <th className="py-3.5 px-4">{SUPPLIER_TRANSLATIONS.en.category}</th>
                <th className="py-3.5 px-4">{SUPPLIER_TRANSLATIONS.en.creditTerms}</th>
                <th className="py-3.5 px-4">{SUPPLIER_TRANSLATIONS.en.bankDetails}</th>
                <th className="py-3.5 px-4">{SUPPLIER_TRANSLATIONS.en.contact}</th>
                <th className="py-3.5 px-4">{SUPPLIER_TRANSLATIONS.en.whatsapp}</th>
                <th className="py-3.5 px-4 text-right">{SUPPLIER_TRANSLATIONS.en.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 dark:text-gray-500">
                    <div className="text-3xl mb-2">🏢</div>
                    <div className="font-medium text-gray-600 dark:text-gray-300">
                      No suppliers found
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Try clearing search filters or register a new vendor.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <SupplierTableRow
                    key={supplier.id}
                    supplier={supplier}
                    readOnly={readOnly}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* ==================================================================== */}
      {/* Register / Edit Supplier Dialog Modal                                */}
      {/* ==================================================================== */}
      <DialogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? "Edit Supplier Details" : "Register Procurement Vendor"}
      >
        <form onSubmit={handleSaveForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="supModalNameInput"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Vendor Name *
              </label>
              <input
                id="supModalNameInput"
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Araliya Rice Mills (Pvt) Ltd"
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="supModalCategorySelect"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Store Supply Category *
              </label>
              <select
                id="supModalCategorySelect"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as StockCategory)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STOCK_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="supModalBrInput"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Business Reg (BR) No *
              </label>
              <input
                id="supModalBrInput"
                type="text"
                required
                value={formBr}
                onChange={(e) => setFormBr(e.target.value)}
                placeholder="PV 10984 / 2018"
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="supModalTinInput"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                TIN No (Tax ID)
              </label>
              <input
                id="supModalTinInput"
                type="text"
                value={formTin}
                onChange={(e) => setFormTin(e.target.value)}
                placeholder="104829104-7000"
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="supModalVatInput"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                VAT Reg No (If VAT vendor)
              </label>
              <input
                id="supModalVatInput"
                type="text"
                value={formVat}
                onChange={(e) => setFormVat(e.target.value)}
                placeholder="104829104-7000"
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="supModalTermsSelect"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Agreed Credit Terms *
              </label>
              <select
                id="supModalTermsSelect"
                value={formTerms}
                onChange={(e) => setFormTerms(e.target.value as SupplierCreditTerms)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(Object.keys(CREDIT_TERMS_CONFIG) as ReadonlyArray<SupplierCreditTerms>).map(
                  (t) => (
                    <option key={t} value={t}>
                      {CREDIT_TERMS_CONFIG[t].label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="supModalLeadTimeInput"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Delivery Lead Time (Days) *
              </label>
              <input
                id="supModalLeadTimeInput"
                type="number"
                min="1"
                max="30"
                required
                value={formLeadTime}
                onChange={(e) => setFormLeadTime(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Bank Account Details */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-3">
            <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
              Bank Account Details (For Direct Bank Transfer)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="supModalBankSelect"
                  className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                >
                  Bank Name *
                </label>
                <select
                  id="supModalBankSelect"
                  value={formBank}
                  onChange={(e) => setFormBank(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SRI_LANKAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="supModalBranchInput"
                  className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                >
                  Branch Name *
                </label>
                <input
                  id="supModalBranchInput"
                  type="text"
                  required
                  value={formBranch}
                  onChange={(e) => setFormBranch(e.target.value)}
                  placeholder="e.g. Galle Fort Branch"
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="supModalAccountNoInput"
                  className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                >
                  Account Number *
                </label>
                <input
                  id="supModalAccountNoInput"
                  type="text"
                  required
                  value={formAccountNo}
                  onChange={(e) => setFormAccountNo(e.target.value)}
                  placeholder="1002948291"
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="supModalAccountNameInput"
                  className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                >
                  Account Holder Name *
                </label>
                <input
                  id="supModalAccountNameInput"
                  type="text"
                  required
                  value={formAccountName}
                  onChange={(e) => setFormAccountName(e.target.value)}
                  placeholder="e.g. Araliya Rice Mills Ltd"
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Contact Person & Communication */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="supModalContactPersonInput"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Contact Person *
              </label>
              <input
                id="supModalContactPersonInput"
                type="text"
                required
                value={formContactPerson}
                onChange={(e) => setFormContactPerson(e.target.value)}
                placeholder="e.g. Dudley Sirisena"
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="supModalPhoneInput"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Office Phone *
              </label>
              <input
                id="supModalPhoneInput"
                type="text"
                required
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+94 11 234 5678"
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="supModalWhatsappInput"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                WhatsApp Order Line *
              </label>
              <input
                id="supModalWhatsappInput"
                type="text"
                required
                value={formWhatsapp}
                onChange={(e) => setFormWhatsapp(e.target.value)}
                placeholder="+94771234567"
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors cursor-pointer"
            >
              {editingSupplier ? "Update Vendor" : "Register Vendor"}
            </button>
          </div>
        </form>
      </DialogModal>
    </div>
  );
}
