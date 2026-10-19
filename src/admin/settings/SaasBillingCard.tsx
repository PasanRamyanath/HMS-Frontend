import { useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type SaasPlanId = "COMMUNITY_FREE" | "PRO_RESORT" | "ENTERPRISE_LUXURY";

export type SaasSubscriptionStatus = "ACTIVE" | "PAST_DUE" | "TRIALING" | "CANCELLED";

export interface SaasUsageMeter {
  readonly id: string;
  readonly name: string;
  readonly current: number;
  readonly limit: number;
  readonly unit: string;
  readonly isAwsFreeTier: boolean;
}

export interface SaasPlan {
  readonly id: SaasPlanId;
  readonly name: string;
  readonly priceLkr: number;
  readonly maxRooms: number;
  readonly maxOrdersPerMonth: number;
  readonly features: ReadonlyArray<string>;
  readonly isPopular?: boolean | undefined;
}

export interface SaasSubscriptionData {
  readonly planId: SaasPlanId;
  readonly status: SaasSubscriptionStatus;
  readonly currentPeriodEnd: string;
  readonly cardLast4?: string | undefined;
  readonly autoRenew: boolean;
  readonly activeRoomsCount: number;
  readonly monthlyOrdersCount: number;
  readonly meters: ReadonlyArray<SaasUsageMeter>;
}

export interface SaasBillingCardProps {
  readonly subscription?: SaasSubscriptionData | undefined;
  readonly onUpgradePlan?: ((planId: SaasPlanId) => Promise<void> | void) | undefined;
  readonly onUpdatePaymentMethod?: (() => Promise<void> | void) | undefined;
  readonly onToggleAutoRenew?: ((enabled: boolean) => Promise<void> | void) | undefined;
}

// ============================================================================
// Constants & Plan Catalog
// ============================================================================

export const SAAS_PLANS: ReadonlyArray<SaasPlan> = [
  {
    id: "COMMUNITY_FREE",
    name: "Community Boutique",
    priceLkr: 0,
    maxRooms: 5,
    maxOrdersPerMonth: 200,
    features: [
      "Up to 5 physical rooms / villas",
      "200 QR contactless guest orders / mo",
      "LankaQR EMVCo instant dynamic payments",
      "Permanent AWS Mumbai Free Tier architecture",
      "Standard Housekeeping & Room Service",
    ],
  },
  {
    id: "PRO_RESORT",
    name: "Pro Resort & Villas",
    priceLkr: 14500,
    maxRooms: 35,
    maxOrdersPerMonth: 2500,
    features: [
      "Up to 35 physical rooms / villas",
      "2,500 QR contactless guest orders / mo",
      "Sri Lankan 4-stage tax engine (SC, TDL, SSCL, VAT)",
      "Chauffeur driver dormitory management",
      "Monthly 10% Service Charge distribution pool",
      "Real-time Kitchen KDS & Bar BOT displays",
      "WebXPay recurring subscription billing",
    ],
    isPopular: true,
  },
  {
    id: "ENTERPRISE_LUXURY",
    name: "Enterprise Star-Class",
    priceLkr: 38500,
    maxRooms: 999,
    maxOrdersPerMonth: 99999,
    features: [
      "Unlimited guest rooms, suites & luxury cabanas",
      "Unlimited contactless dining & pool QR orders",
      "Dedicated AppSync WebSocket channel",
      "Custom Notify.lk / SMSGo.lk branded sender mask",
      "Consolidated multi-property revenue reporting",
      "24/7 Colombo priority technical support",
    ],
  },
];

export const DEFAULT_USAGE_METERS: ReadonlyArray<SaasUsageMeter> = [
  {
    id: "meter-appsync",
    name: "AppSync GraphQL Operations",
    current: 42500,
    limit: 250000,
    unit: "ops",
    isAwsFreeTier: true,
  },
  {
    id: "meter-dynamo",
    name: "DynamoDB Table Storage",
    current: 1.8,
    limit: 25.0,
    unit: "GB",
    isAwsFreeTier: true,
  },
  {
    id: "meter-s3",
    name: "S3 WebP Photos & Menu Assets",
    current: 0.65,
    limit: 5.0,
    unit: "GB",
    isAwsFreeTier: true,
  },
  {
    id: "meter-lambda",
    name: "Lambda Execution Invocations",
    current: 85200,
    limit: 1000000,
    unit: "invocations",
    isAwsFreeTier: true,
  },
  {
    id: "meter-orders",
    name: "Monthly Guest QR Orders",
    current: 342,
    limit: 2500,
    unit: "orders",
    isAwsFreeTier: false,
  },
  {
    id: "meter-rooms",
    name: "Configured Room Inventory",
    current: 14,
    limit: 35,
    unit: "rooms",
    isAwsFreeTier: false,
  },
];

export const DEFAULT_SUBSCRIPTION_DATA: SaasSubscriptionData = {
  planId: "PRO_RESORT",
  status: "ACTIVE",
  currentPeriodEnd: "2026-11-01",
  cardLast4: "4242",
  autoRenew: true,
  activeRoomsCount: 14,
  monthlyOrdersCount: 342,
  meters: DEFAULT_USAGE_METERS,
};

// ============================================================================
// Domain Functions
// ============================================================================

export function calculateMeterUsagePercent(current: number, limit: number): number {
  if (limit <= 0) {
    return 0;
  }
  const ratio = (current / limit) * 100;
  return Math.min(100, Math.max(0, Math.round(ratio * 10) / 10));
}

export function getUsageStatusColor(percent: number): "emerald" | "amber" | "red" {
  if (percent >= 90) {
    return "red";
  }
  if (percent >= 70) {
    return "amber";
  }
  return "emerald";
}

export function formatMeterValue(val: number, unit: string): string {
  if (unit === "GB") {
    return `${val.toFixed(2)} GB`;
  }
  if (unit === "ops" || unit === "invocations") {
    return `${val.toLocaleString()} ${unit}`;
  }
  return `${val.toLocaleString()} ${unit}`;
}

export function validateSubscriptionPlanChange(
  currentPlanId: SaasPlanId,
  targetPlanId: SaasPlanId,
  activeRoomsCount: number,
): { isAllowed: boolean; reason?: string } {
  if (currentPlanId === targetPlanId) {
    return { isAllowed: false, reason: "You are already subscribed to this plan." };
  }

  const targetPlan = SAAS_PLANS.find((p) => p.id === targetPlanId);
  if (!targetPlan) {
    return { isAllowed: false, reason: "Unknown subscription plan." };
  }

  if (activeRoomsCount > targetPlan.maxRooms) {
    return {
      isAllowed: false,
      reason: `Cannot downgrade to ${targetPlan.name}. Your property has ${activeRoomsCount} active rooms, but this plan allows a maximum of ${targetPlan.maxRooms} rooms.`,
    };
  }

  return { isAllowed: true };
}

// ============================================================================
// Subcomponents
// ============================================================================

interface UsageMeterRowProps {
  readonly meter: SaasUsageMeter;
}

function UsageMeterRow({ meter }: UsageMeterRowProps) {
  const percent = calculateMeterUsagePercent(meter.current, meter.limit);
  const color = getUsageStatusColor(percent);

  const barColorClass =
    color === "red" ? "bg-red-500" : color === "amber" ? "bg-amber-500" : "bg-apple-blue";

  return (
    <div className="space-y-1.5 p-3 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{meter.name}</span>
          {meter.isAwsFreeTier && (
            <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              AWS Free Tier
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1 text-[11px] tabular-nums-lkr">
          <span className="font-bold text-slate-900 dark:text-white">
            {formatMeterValue(meter.current, meter.unit)}
          </span>
          <span className="text-slate-400">/ {formatMeterValue(meter.limit, meter.unit)}</span>
          <span className="text-[10px] text-slate-400 font-medium">({percent}%)</span>
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

interface PlanCardProps {
  readonly plan: SaasPlan;
  readonly isCurrent: boolean;
  readonly activeRoomsCount: number;
  readonly onSelect: (planId: SaasPlanId) => void;
}

function PlanCard({ plan, isCurrent, activeRoomsCount, onSelect }: PlanCardProps) {
  const validation = validateSubscriptionPlanChange(
    isCurrent ? plan.id : "COMMUNITY_FREE",
    plan.id,
    activeRoomsCount,
  );

  return (
    <div
      className={`relative p-5 rounded-2xl flex flex-col justify-between border transition-all ${
        isCurrent
          ? "border-apple-blue shadow-md bg-white dark:bg-slate-900"
          : "border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 hover:border-slate-300"
      }`}
    >
      {plan.isPopular && (
        <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-apple-blue text-white shadow-xs">
          Recommended
        </span>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-bold text-slate-900 dark:text-white">{plan.name}</h4>
          {isCurrent && <StatusBadge status="ACTIVE" size="sm" />}
        </div>

        <div className="mb-4">
          <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums-lkr">
            {plan.priceLkr === 0 ? "Free" : formatLkr(plan.priceLkr)}
          </span>
          {plan.priceLkr > 0 && <span className="text-xs text-slate-400"> / month</span>}
        </div>

        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 mb-6">
          {plan.features.map((feat) => (
            <li key={feat} className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        disabled={isCurrent || !validation.isAllowed}
        onClick={() => onSelect(plan.id)}
        className={`w-full min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
          isCurrent
            ? "bg-slate-100 dark:bg-white/10 text-slate-400 cursor-default"
            : !validation.isAllowed
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-apple-blue text-white shadow-sm hover:bg-apple-blue/90 active:scale-98"
        }`}
      >
        {isCurrent ? "Current Plan" : `Switch to ${plan.name}`}
      </button>
    </div>
  );
}

// ============================================================================
// Main Component: SaasBillingCard
// ============================================================================

export function SaasBillingCard({
  subscription = DEFAULT_SUBSCRIPTION_DATA,
  onUpgradePlan,
  onUpdatePaymentMethod,
  onToggleAutoRenew,
}: SaasBillingCardProps) {
  const [data, setData] = useState<SaasSubscriptionData>(subscription);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentPlan =
    SAAS_PLANS.find((p) => p.id === data.planId) || SAAS_PLANS[1] || SAAS_PLANS[0];

  const handleSelectPlan = async (newPlanId: SaasPlanId) => {
    setData((prev) => ({ ...prev, planId: newPlanId }));
    setIsPlanModalOpen(false);
    const planName = SAAS_PLANS.find((p) => p.id === newPlanId)?.name ?? newPlanId;
    setToastMessage(`Switched property subscription to ${planName}.`);
    if (onUpgradePlan) {
      await onUpgradePlan(newPlanId);
    }
  };

  const handleToggleAutoRenew = async () => {
    const nextVal = !data.autoRenew;
    setData((prev) => ({ ...prev, autoRenew: nextVal }));
    setToastMessage(nextVal ? "Auto-renew enabled." : "Auto-renew cancelled.");
    if (onToggleAutoRenew) {
      await onToggleAutoRenew(nextVal);
    }
  };

  const handleSimulatePaymentUpdate = async () => {
    setData((prev) => ({ ...prev, cardLast4: "8888", status: "ACTIVE" }));
    setIsPaymentModalOpen(false);
    setToastMessage("WebXPay payment method updated successfully (Visa •••• 8888).");
    if (onUpdatePaymentMethod) {
      await onUpdatePaymentMethod();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-sf-pro">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            SaaS Subscription Plan & WebXPay Billing
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your hotel SaaS tier, WebXPay monthly subscription, and real-time AWS permanent
            free-tier resource meters.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPlanModalOpen(true)}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-apple-blue text-white text-xs sm:text-sm font-semibold shadow-md hover:bg-apple-blue/90 active:scale-98 transition-apple-spring cursor-pointer flex items-center justify-center gap-2"
        >
          Change Subscription Plan
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Overview Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Plan Card */}
        <GlassCard material="regular" radius="xl" className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Current Tier
              </span>
              <StatusBadge status={data.status} size="sm" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {currentPlan?.name}
            </h3>
            <div className="mt-2">
              <span className="text-2xl font-bold text-apple-blue tabular-nums-lkr">
                {currentPlan?.priceLkr === 0 ? "Free" : formatLkr(currentPlan?.priceLkr || 0)}
              </span>
              <span className="text-xs text-slate-400"> / month</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
              Renews on <strong className="tabular-nums-lkr">{data.currentPeriodEnd}</strong> via
              WebXPay tokenized recurring gateway.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Auto-Renew
            </span>
            <button
              type="button"
              onClick={handleToggleAutoRenew}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                data.autoRenew ? "bg-apple-blue" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
                  data.autoRenew ? "left-5.5" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </GlassCard>

        {/* WebXPay Payment Method Card */}
        <GlassCard material="regular" radius="xl" className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                WebXPay Sri Lanka Gateway
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                Tokenized
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1">
              <div className="w-10 h-7 rounded-md bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center tracking-wider">
                VISA
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white block font-mono">
                  •••• {data.cardLast4 || "4242"}
                </span>
                <span className="text-[11px] text-slate-400 block">Expires 12/28</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
              Payments processed in Sri Lankan Rupees via CBSL-compliant WebXPay merchant
              integration.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Update Payment Method
            </button>
          </div>
        </GlassCard>

        {/* Resource Headroom Card */}
        <GlassCard material="regular" radius="xl" className="p-5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-3">
              Monthly Utilization
            </span>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    Room Capacity
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums-lkr">
                    {data.activeRoomsCount} / {currentPlan?.maxRooms} rooms
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-apple-blue rounded-full"
                    style={{
                      width: `${calculateMeterUsagePercent(data.activeRoomsCount, currentPlan?.maxRooms || 35)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    QR Orders Vol
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums-lkr">
                    {data.monthlyOrdersCount} / {currentPlan?.maxOrdersPerMonth} orders
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${calculateMeterUsagePercent(data.monthlyOrdersCount, currentPlan?.maxOrdersPerMonth || 2500)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-400 text-center">
            Zero overage fees. You can scale capacity anytime.
          </div>
        </GlassCard>
      </div>

      {/* AWS Permanent Free-Tier Resource Meters */}
      <GlassCard material="regular" radius="xl" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              AWS Mumbai Free-Tier Resource Meters
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Targeting zero AWS cloud hosting costs by operating inside permanent Free-Tier quotas
              in <code className="font-mono text-apple-blue">ap-south-1</code>.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
            100% Free-Tier Safe
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.meters.map((meter) => (
            <UsageMeterRow key={meter.id} meter={meter} />
          ))}
        </div>
      </GlassCard>

      {/* Plan Selection Modal */}
      <DialogModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title="Select Hotel SaaS Subscription Plan"
        description="Choose the ideal plan for your property. All tiers include full Sri Lankan tax compliance and contactless QR room service."
        size="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {SAAS_PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === data.planId}
              activeRoomsCount={data.activeRoomsCount}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>
      </DialogModal>

      {/* WebXPay Payment Modal */}
      <DialogModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Update WebXPay Payment Card"
        description="Your card details are tokenized securely with WebXPay Sri Lanka. We never store raw card numbers."
        size="md"
      >
        <div className="space-y-4 pt-3 font-sf-pro">
          <div>
            <label
              htmlFor="card-name"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
            >
              Cardholder Name
            </label>
            <input
              id="card-name"
              type="text"
              defaultValue="Amaya Resort Ltd"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs min-h-[40px]"
            />
          </div>

          <div>
            <label
              htmlFor="card-number"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
            >
              Card Number
            </label>
            <input
              id="card-number"
              type="text"
              defaultValue="4111 2222 3333 8888"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs min-h-[40px] font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="card-expiry"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
              >
                Expiry (MM/YY)
              </label>
              <input
                id="card-expiry"
                type="text"
                defaultValue="08/29"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs min-h-[40px] font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="card-cvv"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
              >
                CVV / CVC
              </label>
              <input
                id="card-cvv"
                type="password"
                defaultValue="888"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs min-h-[40px] font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSimulatePaymentUpdate}
              className="min-h-[44px] px-6 rounded-xl bg-apple-blue text-white text-xs font-semibold shadow-md hover:bg-apple-blue/90 active:scale-98 transition-apple-spring cursor-pointer"
            >
              Authorize & Save Token
            </button>
          </div>
        </div>
      </DialogModal>
    </div>
  );
}
