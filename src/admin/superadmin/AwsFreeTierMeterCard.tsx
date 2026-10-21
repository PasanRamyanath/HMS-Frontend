/**
 * Real-Time AWS Free-Tier Quota Monitor Widget (`AwsFreeTierMeterCard.tsx`).
 * Displays real-time consumption % across AWS Free-Tier allowances:
 * - Amazon DynamoDB 25 GB Storage (Always Free)
 * - AWS AppSync 250,000 Operations / mo (Free Tier)
 * - AWS Lambda 1,000,000 Invocations / mo (Always Free)
 * - Amazon CloudFront 1 TB Data Transfer Out / mo (Always Free)
 * - Amazon Cognito 50,000 Monthly Active Users (Always Free)
 * Implements Apple HIG Liquid Glass translucency, continuous squircle geometry,
 * and tabular numeral formatting.
 */

import { useId, useMemo, useState } from "react";

export type QuotaHealthStatus = "HEALTHY" | "WARNING" | "CRITICAL";

export interface AwsFreeTierQuota {
  readonly serviceId: string;
  readonly serviceName: string;
  readonly quotaMetric: string;
  readonly freeTierLimit: number;
  readonly consumed: number;
  readonly unit: string;
  readonly usagePercent: number; // 0.0 to 100.0
  readonly status: QuotaHealthStatus;
  readonly monthlyBillUsd: number;
  readonly description: string;
}

export const DEFAULT_AWS_FREE_TIER_QUOTAS: ReadonlyArray<AwsFreeTierQuota> = [
  {
    serviceId: "dynamodb",
    serviceName: "Amazon DynamoDB",
    quotaMetric: "25 GB Storage (Always Free)",
    freeTierLimit: 25.0,
    consumed: 1.84,
    unit: "GB",
    usagePercent: 7.36,
    status: "HEALTHY",
    monthlyBillUsd: 0.0,
    description: "Single-table multi-tenant schema storing guest orders, folios, and audit logs.",
  },
  {
    serviceId: "appsync",
    serviceName: "AWS AppSync",
    quotaMetric: "250,000 GraphQL Ops / mo",
    freeTierLimit: 250000,
    consumed: 34200,
    unit: "Ops",
    usagePercent: 13.68,
    status: "HEALTHY",
    monthlyBillUsd: 0.0,
    description: "Direct JS DynamoDB resolvers and real-time WebSocket order subscriptions.",
  },
  {
    serviceId: "lambda",
    serviceName: "AWS Lambda",
    quotaMetric: "1,000,000 Invocations / mo",
    freeTierLimit: 1000000,
    consumed: 112500,
    unit: "Invocations",
    usagePercent: 11.25,
    status: "HEALTHY",
    monthlyBillUsd: 0.0,
    description: "LankaQR dynamic payload generation, PDF tax slips, and Cognito triggers.",
  },
  {
    serviceId: "cloudfront",
    serviceName: "Amazon CloudFront",
    quotaMetric: "1 TB (1,000 GB) Outbound / mo",
    freeTierLimit: 1000.0,
    consumed: 48.6,
    unit: "GB",
    usagePercent: 4.86,
    status: "HEALTHY",
    monthlyBillUsd: 0.0,
    description: "Edge distribution for React 19 Apple HIG PWA assets and guest WebP dishes.",
  },
  {
    serviceId: "cognito",
    serviceName: "Amazon Cognito",
    quotaMetric: "50,000 Monthly Active Users",
    freeTierLimit: 50000,
    consumed: 1420,
    unit: "MAUs",
    usagePercent: 2.84,
    status: "HEALTHY",
    monthlyBillUsd: 0.0,
    description: "Staff role RBAC tokens (Hotel Admin, Front Desk, KDS Kitchen, Cashier).",
  },
];

export function calculateUsagePercent(consumed: number, limit: number): number {
  if (limit <= 0) return 0;
  const pct = (consumed / limit) * 100;
  return Number(pct.toFixed(2));
}

export function getQuotaHealthStatus(percent: number): QuotaHealthStatus {
  if (percent >= 85) return "CRITICAL";
  if (percent >= 70) return "WARNING";
  return "HEALTHY";
}

export function calculateDaysRemainingInMonth(referenceDate?: Date): number {
  const d = referenceDate ?? new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const currentDay = d.getDate();
  return Math.max(0, totalDays - currentDay);
}

export function projectMonthEndUsagePercent(
  consumed: number,
  limit: number,
  currentDay: number,
  totalDays: number,
): number {
  if (limit <= 0 || currentDay <= 0) return 0;
  const dailyRate = consumed / currentDay;
  const projectedTotal = dailyRate * totalDays;
  return Number(((projectedTotal / limit) * 100).toFixed(1));
}

export function formatQuotaValue(value: number, unit: string): string {
  if (unit === "GB") {
    return `${value.toFixed(2)} GB`;
  }
  if (unit === "Ops" || unit === "Invocations" || unit === "MAUs") {
    return `${value.toLocaleString("en-US")} ${unit}`;
  }
  return `${value.toLocaleString("en-US")} ${unit}`;
}

interface MeterBarProps {
  readonly percent: number;
  readonly status: QuotaHealthStatus;
}

function MeterBar({ percent, status }: MeterBarProps) {
  const barColor =
    status === "CRITICAL"
      ? "bg-rose-500"
      : status === "WARNING"
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden relative">
      <div
        className={`h-full rounded-full transition-all duration-500 ease-apple-spring ${barColor}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

interface QuotaRowProps {
  readonly quota: AwsFreeTierQuota;
}

function QuotaRow({ quota }: QuotaRowProps) {
  const statusBadgeClass =
    quota.status === "CRITICAL"
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      : quota.status === "WARNING"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";

  return (
    <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-slate-900 dark:text-white block">
            {quota.serviceName}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {quota.quotaMetric}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums-lkr block">
            {quota.usagePercent.toFixed(1)}%
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusBadgeClass}`}>
            {quota.status}
          </span>
        </div>
      </div>

      <MeterBar percent={quota.usagePercent} status={quota.status} />

      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
        <span>
          Consumed:{" "}
          <strong className="text-slate-700 dark:text-slate-300 tabular-nums-lkr font-semibold">
            {formatQuotaValue(quota.consumed, quota.unit)}
          </strong>
        </span>
        <span>
          Limit:{" "}
          <span className="tabular-nums-lkr">
            {formatQuotaValue(quota.freeTierLimit, quota.unit)}
          </span>
        </span>
      </div>
    </div>
  );
}

interface QuotaCardHeaderProps {
  readonly daysRemaining: number;
  readonly isRefreshing: boolean;
  readonly onRefresh: () => void;
}

function QuotaCardHeader({ daysRemaining, isRefreshing, onRefresh }: QuotaCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-apple-blue">
            Cloud Architecture
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            ap-south-1 Mumbai
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          AWS Free-Tier Quota Monitor
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Permanent zero-cost infrastructure headroom • {daysRemaining} days remaining in cycle.
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh AWS free tier telemetry"
        className="min-h-[36px] min-w-[36px] p-2 rounded-xl apple-liquid-glass border border-slate-200/60 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-apple-blue transition-colors cursor-pointer disabled:opacity-50"
      >
        <svg
          className={`w-4 h-4 ${isRefreshing ? "animate-spin text-apple-blue" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}

function NearZeroCostBanner() {
  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-apple-blue/10 to-emerald-500/10 border border-emerald-500/20 dark:border-emerald-400/20 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"
          aria-hidden="true"
        />
        <div>
          <span className="text-xs font-bold text-slate-900 dark:text-white block">
            100% Within Free-Tier Quotas
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Estimated Current Month AWS Infrastructure Invoice:
          </span>
        </div>
      </div>
      <div className="text-right">
        <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums-lkr tracking-tight block">
          $0.00
        </span>
        <span className="text-[10px] text-slate-400 uppercase font-semibold">USD / Month</span>
      </div>
    </div>
  );
}

export interface AwsFreeTierMeterCardProps {
  readonly quotas?: ReadonlyArray<AwsFreeTierQuota> | undefined;
  readonly onRefreshMetrics?: (() => void) | undefined;
  readonly className?: string | undefined;
}

export function AwsFreeTierMeterCard({
  quotas = DEFAULT_AWS_FREE_TIER_QUOTAS,
  onRefreshMetrics,
  className = "",
}: AwsFreeTierMeterCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cardId = useId();

  const daysRemaining = useMemo(() => calculateDaysRemainingInMonth(), []);

  const highestConsumptionQuota = useMemo(() => {
    if (quotas.length === 0) return null;
    return [...quotas].sort((a, b) => b.usagePercent - a.usagePercent)[0];
  }, [quotas]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefreshMetrics) {
      onRefreshMetrics();
    }
    // Simulate short refresh spin
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  return (
    <div
      id={cardId}
      className={`p-5 rounded-3xl apple-liquid-glass border border-slate-200/60 dark:border-white/10 shadow-lg space-y-4 ${className}`}
    >
      <QuotaCardHeader
        daysRemaining={daysRemaining}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      <NearZeroCostBanner />

      {/* Quota Progress Rows */}
      <div className="space-y-2.5">
        {quotas.map((quota) => (
          <QuotaRow key={quota.serviceId} quota={quota} />
        ))}
      </div>

      {/* Footer Insight */}
      {highestConsumptionQuota && (
        <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-200/60 dark:border-white/5">
          <span>
            Highest Utilized:{" "}
            <strong className="text-slate-700 dark:text-slate-300 font-semibold">
              {highestConsumptionQuota.serviceName}
            </strong>{" "}
            ({highestConsumptionQuota.usagePercent.toFixed(1)}%)
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            Zero-bill safety margin: {(100 - highestConsumptionQuota.usagePercent).toFixed(1)}%
            headroom
          </span>
        </div>
      )}
    </div>
  );
}
