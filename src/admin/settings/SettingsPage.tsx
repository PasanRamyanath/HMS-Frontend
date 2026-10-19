import { useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { ExchangeRateCard } from "./ExchangeRateCard.js";
import { OnboardingChecklist } from "./OnboardingChecklist.js";
import { PaymentSettingsForm } from "./PaymentSettingsForm.js";
import { PropertyProfileForm } from "./PropertyProfileForm.js";
import { SaasBillingCard } from "./SaasBillingCard.js";
import { SmsSettingsForm } from "./SmsSettingsForm.js";
import { StaffUserManager } from "./StaffUserManager.js";
import { TaxSettingsForm } from "./TaxSettingsForm.js";

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
    description: "Hotel branding, SLTDA registration, contact info, and GPS coordinates.",
  },
  {
    id: "TAXES",
    label: "Taxes & Compliance",
    shortLabel: "Taxes",
    description:
      "Service Charge (10%), TDL (1%), SSCL (2.5%), VAT (18%) and IRD RAMIS TIN numbers.",
    badge: "IRD Statutory",
  },
  {
    id: "PAYMENTS",
    label: "Payments & Currency",
    shortLabel: "Payments",
    description: "LankaQR EMVCo merchant codes, PayHere, CBSL exchange rates, and bank accounts.",
  },
  {
    id: "SMS",
    label: "SMS Notifications",
    shortLabel: "SMS",
    description:
      "SMSGo.lk and Notify.lk Sri Lankan sender masks, check-in templates, and guest alerts.",
  },
  {
    id: "STAFF",
    label: "Staff & Service Charge",
    shortLabel: "Staff",
    description:
      "Cognito RBAC roles, EPF/ETF statutory contributions, and 10% Service Charge points pool.",
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
  { id: "TAXES", label: "Taxes" },
  { id: "PAYMENTS", label: "Payments" },
  { id: "SMS", label: "SMS" },
  { id: "STAFF", label: "Staff & SC" },
  { id: "BILLING", label: "Billing" },
];

// ============================================================================
// Sub-Components (Cognitive Complexity <= 12)
// ============================================================================

interface SettingsHeaderProps {
  readonly propertyTitle?: string | undefined;
  readonly activeTabInfo: SettingsTab;
}

function SettingsHeader({ propertyTitle, activeTabInfo }: SettingsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {propertyTitle ? `${propertyTitle} — ${activeTabInfo.label}` : activeTabInfo.label}
          </h1>
          {activeTabInfo.badge && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-apple-blue/10 text-apple-blue">
              {activeTabInfo.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {activeTabInfo.description}
        </p>
      </div>
    </div>
  );
}

interface PaymentsTabContentProps {
  readonly onSaveSuccess?: ((section: string) => void) | undefined;
}

function PaymentsTabContent({ onSaveSuccess }: PaymentsTabContentProps) {
  return (
    <div className="space-y-6">
      <PaymentSettingsForm
        onSave={() => {
          onSaveSuccess?.("Payment & LankaQR Settings");
        }}
      />
      <ExchangeRateCard
        onSave={() => {
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
        <PropertyProfileForm
          onSave={() => {
            onSaveSuccess?.("Property Profile");
          }}
        />
      );
    case "TAXES":
      return (
        <TaxSettingsForm
          onSave={() => {
            onSaveSuccess?.("Tax Configuration");
          }}
        />
      );
    case "PAYMENTS":
      return <PaymentsTabContent onSaveSuccess={onSaveSuccess} />;
    case "SMS":
      return (
        <SmsSettingsForm
          onSave={() => {
            onSaveSuccess?.("SMS Settings");
          }}
        />
      );
    case "STAFF":
      return (
        <StaffUserManager
          onSaveStaffRoster={() => {
            onSaveSuccess?.("Staff Roster");
          }}
        />
      );
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

  const activeTabInfo =
    SETTINGS_TABS.find((t) => t.id === activeTab) ?? (SETTINGS_TABS[0] as SettingsTab);

  const handleTabSelect = (tabId: SettingsTabId) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <div className={`space-y-6 max-w-7xl mx-auto pb-12 font-sf-pro ${className}`}>
      {/* Top Header */}
      <SettingsHeader propertyTitle={propertyTitle} activeTabInfo={activeTabInfo} />

      {/* Onboarding Readiness Checklist Banner */}
      {showOnboardingBanner && (
        <OnboardingChecklist
          propertyName={propertyTitle}
          onStepAction={(step) => {
            if (step.id === "TAX_CONFIG") {
              handleTabSelect("TAXES");
            }
          }}
        />
      )}

      {/* Apple HIG Segmented Navigation Control */}
      <GlassCard material="regular" radius="xl" className="p-2">
        <SegmentedControl
          options={SETTINGS_SEGMENTED_OPTIONS}
          value={activeTab}
          onChange={handleTabSelect}
          size="md"
        />
      </GlassCard>

      {/* Active Tab Panel Content */}
      <div className="transition-apple-spring">
        <TabPanelContent activeTab={activeTab} onSaveSuccess={onSaveSuccess} />
      </div>
    </div>
  );
}
