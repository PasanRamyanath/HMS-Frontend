import { useEffect, useMemo, useState } from "react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { navigateTo } from "../../lib/router.js";
import { AdminPageHeader } from "../components/AdminPageHeader.js";
import { ExchangeRateCard } from "./ExchangeRateCard.js";
import { OnboardingChecklist } from "./OnboardingChecklist.js";
import { PaymentSettingsForm } from "./PaymentSettingsForm.js";
import { PropertyProfileForm } from "./PropertyProfileForm.js";
import { SaasBillingCard } from "./SaasBillingCard.js";
import { SmsSettingsForm } from "./SmsSettingsForm.js";
import { StaffUserManager } from "./StaffUserManager.js";
import { TaxSettingsForm } from "./TaxSettingsForm.js";
import { ThemeColorPicker } from "./ThemeColorPicker.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type SettingsTabId = "PROFILE" | "TAXES" | "PAYMENTS" | "SMS" | "STAFF" | "BILLING";

export interface SettingsTab {
  readonly id: SettingsTabId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly badge?: string | undefined;
}

export interface SettingsPageProps {
  readonly initialTab?: SettingsTabId | undefined;
  readonly propertyTitle?: string | undefined;
  readonly onTabChange?: ((tabId: SettingsTabId) => void) | undefined;
  readonly onSaveSuccess?: ((section: string) => void) | undefined;
  readonly showOnboardingBanner?: boolean | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Tab Configuration Constants
// ============================================================================

export const SETTINGS_TABS: ReadonlyArray<SettingsTab> = [
  {
    id: "PROFILE",
    label: "Property Profile",
    shortLabel: "Profile",
    description:
      "5-step onboarding checklist, CBSL/SLTDA registration, 4-stage tax rules, and gateway credentials",
  },
  {
    id: "TAXES",
    label: "Taxes & Compliance",
    shortLabel: "Taxes",
    description:
      "Service Charge (10%), TDL (1%), SSCL (2.5%), VAT (18%) and IRD RAMIS TIN numbers.",
    badge: "1.34343×",
  },
  {
    id: "PAYMENTS",
    label: "Payments & Currency",
    shortLabel: "Payments",
    description: "LankaQR EMVCo merchant codes, PayHere, CBSL exchange rates, and bank accounts.",
    badge: "PayHere",
  },
  {
    id: "SMS",
    label: "SMS Notifications",
    shortLabel: "SMS",
    description:
      "SMSGo.lk and Notify.lk Sri Lankan sender masks, check-in templates, and guest alerts.",
    badge: "SMSGo",
  },
  {
    id: "STAFF",
    label: "Staff & Service Charge",
    shortLabel: "Staff",
    description:
      "Cognito RBAC roles, EPF/ETF statutory contributions, and 10% Service Charge points pool.",
    badge: "10%",
  },
  {
    id: "BILLING",
    label: "SaaS Subscription",
    shortLabel: "Billing",
    description:
      "Cloud HMS subscription tier, WebXPay recurring billing, and tenant resource usage.",
  },
];

export const SETTINGS_SEGMENTED_OPTIONS: ReadonlyArray<SegmentedControlOption<SettingsTabId>> = [
  { id: "PROFILE", label: "Profile" },
  { id: "TAXES", label: "Taxes", badge: "1.34343×" },
  { id: "PAYMENTS", label: "Payments", badge: "PayHere" },
  { id: "SMS", label: "SMS", badge: "SMSGo" },
  { id: "STAFF", label: "Staff & SC", badge: "10%" },
  { id: "BILLING", label: "Billing" },
];

// ============================================================================
// Sub-Components (Matching Screen 07 of Version 2.zip)
// ============================================================================

interface SettingsHeaderProps {
  readonly propertyTitle?: string | undefined;
  readonly activeTabInfo: SettingsTab;
  readonly onSave?: (() => void) | undefined;
}

function SettingsHeader({ propertyTitle, activeTabInfo, onSave }: SettingsHeaderProps) {
  const title = propertyTitle ? `${propertyTitle} — ${activeTabInfo.label}` : activeTabInfo.label;

  return (
    <AdminPageHeader
      title={title}
      subtitle={activeTabInfo.description}
      propertyTitle={propertyTitle}
      statusBadge={
        activeTabInfo.badge ? { label: activeTabInfo.badge, variant: "success" } : undefined
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => navigateTo("/admin/rooms")}
            className="admin-btn-secondary min-h-[38px] text-xs cursor-pointer"
          >
            Print Room QRs
          </button>
          <button
            type="button"
            onClick={() => onSave?.()}
            className="admin-btn-primary min-h-[38px] text-xs cursor-pointer"
          >
            + Save Configuration
          </button>
        </>
      }
    />
  );
}

interface PaymentsTabContentProps {
  readonly onSaveSuccess?: ((section: string) => void) | undefined;
}

function PaymentsTabContent({ onSaveSuccess }: PaymentsTabContentProps) {
  const initialPaymentData = useMemo(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("hms_payment_settings");
        if (stored) return JSON.parse(stored);
      } catch {
        // storage fallback
      }
    }
    return undefined;
  }, []);

  const initialRates = useMemo(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("hms_exchange_rates");
        if (stored) return JSON.parse(stored);
      } catch {
        // storage fallback
      }
    }
    return undefined;
  }, []);

  return (
    <div className="space-y-6">
      <PaymentSettingsForm
        initialData={initialPaymentData}
        onSave={(data) => {
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("hms_payment_settings", JSON.stringify(data));
            } catch {
              // storage fallback
            }
          }
          onSaveSuccess?.("Payment & LankaQR Settings");
        }}
      />
      <ExchangeRateCard
        initialRates={initialRates}
        onSave={(rates) => {
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("hms_exchange_rates", JSON.stringify(rates));
            } catch {
              // storage fallback
            }
          }
          onSaveSuccess?.("CBSL Exchange Rates");
        }}
      />
    </div>
  );
}

interface TabPanelContentProps {
  readonly activeTab: SettingsTabId;
  readonly onSaveSuccess?: ((section: string) => void) | undefined;
}

function TabPanelContent({ activeTab, onSaveSuccess }: TabPanelContentProps) {
  switch (activeTab) {
    case "PROFILE":
      return (
        <div className="space-y-6">
          <PropertyProfileForm
            onSave={() => {
              onSaveSuccess?.("Property Profile");
            }}
          />
          <ThemeColorPicker />
        </div>
      );
    case "TAXES": {
      const initialTaxData =
        typeof window !== "undefined"
          ? (() => {
              try {
                const stored = localStorage.getItem("hms_tax_settings");
                if (stored) return JSON.parse(stored);
              } catch {
                // storage fallback
              }
              return undefined;
            })()
          : undefined;

      return (
        <TaxSettingsForm
          initialData={initialTaxData}
          onSave={(data) => {
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("hms_tax_settings", JSON.stringify(data));
              } catch {
                // storage fallback
              }
            }
            onSaveSuccess?.("Tax Configuration");
          }}
        />
      );
    }
    case "PAYMENTS":
      return <PaymentsTabContent onSaveSuccess={onSaveSuccess} />;
    case "SMS": {
      const initialSmsData =
        typeof window !== "undefined"
          ? (() => {
              try {
                const stored = localStorage.getItem("hms_sms_settings");
                if (stored) return JSON.parse(stored);
              } catch {
                // storage fallback
              }
              return undefined;
            })()
          : undefined;

      return (
        <SmsSettingsForm
          initialData={initialSmsData}
          onSave={(data) => {
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("hms_sms_settings", JSON.stringify(data));
              } catch {
                // storage fallback
              }
            }
            onSaveSuccess?.("SMS Settings");
          }}
        />
      );
    }
    case "STAFF": {
      const initialStaff =
        typeof window !== "undefined"
          ? (() => {
              try {
                const stored = localStorage.getItem("hms_staff_roster");
                if (stored) return JSON.parse(stored);
              } catch {
                // storage fallback
              }
              return undefined;
            })()
          : undefined;

      return (
        <StaffUserManager
          initialStaff={initialStaff}
          onSaveStaffRoster={(roster) => {
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("hms_staff_roster", JSON.stringify(roster));
              } catch {
                // storage fallback
              }
            }
            onSaveSuccess?.("Staff Roster");
          }}
        />
      );
    }
    case "BILLING":
      return (
        <SaasBillingCard
          onUpgradePlan={() => {
            onSaveSuccess?.("Subscription Plan");
          }}
        />
      );
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function SettingsPage({
  initialTab = "PROFILE",
  propertyTitle = "Galle Fort Lighthouse Villa",
  onTabChange,
  onSaveSuccess,
  showOnboardingBanner = true,
  className = "",
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const activeTabInfo =
    SETTINGS_TABS.find((t) => t.id === activeTab) ?? (SETTINGS_TABS[0] as SettingsTab);

  const handleTabSelect = (tabId: SettingsTabId) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <div className={`space-y-5 font-sf-pro ${className}`}>
      {/* Top Header */}
      <SettingsHeader
        propertyTitle={propertyTitle}
        activeTabInfo={activeTabInfo}
        onSave={() => onSaveSuccess?.(activeTabInfo.label)}
      />

      {/* Segmented Navigation Control */}
      <div className="border-b border-slate-200 pb-3 overflow-x-auto">
        <SegmentedControl
          options={SETTINGS_SEGMENTED_OPTIONS}
          value={activeTab}
          onChange={handleTabSelect}
          size="md"
          className="w-full sm:w-auto"
        />
      </div>

      {/* Onboarding Readiness Checklist Banner */}
      {showOnboardingBanner && (
        <OnboardingChecklist
          propertyName={propertyTitle}
          onStepAction={(step) => {
            if (step.id === "TAX_CONFIG") {
              handleTabSelect("TAXES");
            } else if (step.id === "ROOMS" || step.id === "QR_PRINT") {
              navigateTo("/admin/rooms");
            } else if (step.id === "MENU") {
              navigateTo("/admin/menus");
            } else if (step.id === "TEST_ORDER") {
              navigateTo("/admin/orders");
            }
          }}
        />
      )}

      {/* Active Tab Panel Content */}
      <div>
        <TabPanelContent activeTab={activeTab} onSaveSuccess={onSaveSuccess} />
      </div>
    </div>
  );
}
