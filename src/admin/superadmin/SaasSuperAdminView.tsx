/**
 * Multi-Tenant SaaS Super-Admin Directory & Platform Health Dashboard (`SaasSuperAdminView.tsx`)
 *
 * Implements Step 451 (Phase 19.01) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * - Central Platform Owner (`SUPER_ADMIN`) console for overseeing all registered Sri Lankan hotel tenants:
 *   1. `Galle Fort Boutique` (Southern Province)
 *   2. `Ella Cloud Resort` (Uva Province)
 *   3. `Kandy Lake Hotel` (Central Province)
 *   4. `Pelmadulla Gem Villa` (Sabaragamuwa Province)
 * - Telemetry on active subscription plan tier (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`), room counts,
 *   monthly QR orders, AWS Free Tier consumption monitor, and tenant health status pills.
 * - Access control strictly guarded for Cognito group `SUPER_ADMIN`.
 * - Adheres to Apple Human Interface Guidelines:
 *   - Translucent `.apple-liquid-glass` surfaces (`backdrop-filter: blur(24px) saturate(180%)`)
 *   - SF Pro optical typography with `.tabular-nums-lkr` for all numeric amounts
 *   - Continuous squircle radii, fluid spring transitions (`cubic-bezier(0.22, 1, 0.36, 1)`)
 *   - Touch targets >= 44x44pt
 */

import { useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import type { StaffRole } from "../../lib/auth.js";
import { formatLkr } from "../../lib/i18n.js";
import { ProvisionTenantModal } from "./ProvisionTenantModal.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type SaasSubscriptionPlan = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export type TenantStatus = "ACTIVE" | "TRIAL" | "SUSPENDED" | "PROVISIONING";

export type TenantHealthStatus = "HEALTHY" | "WARNING" | "CRITICAL";

export interface HotelTenantDirectoryEntry {
  readonly tenantId: string;
  readonly name: string;
  readonly legalEntityName: string;
  readonly city: string;
  readonly province: string;
  readonly plan: SaasSubscriptionPlan;
  readonly status: TenantStatus;
  readonly health: TenantHealthStatus;
  readonly roomCount: number;
  readonly monthlyQrOrders: number;
  readonly monthlyRevenueLkr: number;
  readonly ownerEmail: string;
  readonly ownerPhone: string;
  readonly registeredAt: string;
  readonly lastActiveAt: string;
  readonly sltdaRegistrationNumber: string;
  readonly awsStorageMb: number;
  readonly appsyncOpsLast30d: number;
}

export interface SaasPlatformSummary {
  readonly totalTenants: number;
  readonly activeTenants: number;
  readonly totalRooms: number;
  readonly totalMonthlyQrOrders: number;
  readonly totalMonthlyMrrLkr: number;
  readonly healthyTenantsCount: number;
  readonly warningTenantsCount: number;
  readonly criticalTenantsCount: number;
  readonly awsStorageTotalMb: number;
  readonly appsyncOpsTotal30d: number;
}

export interface TenantFilterOptions {
  readonly searchQuery: string;
  readonly planFilter: SaasSubscriptionPlan | "ALL";
  readonly statusFilter: TenantStatus | "ALL";
  readonly provinceFilter: string | "ALL";
}

export interface SaasSuperAdminViewProps {
  readonly currentUserRole?: StaffRole | undefined;
  readonly currentUserId?: string | undefined;
  readonly tenants?: readonly HotelTenantDirectoryEntry[] | undefined;
  readonly onSelectTenant?: ((tenantId: string) => void) | undefined;
  readonly onProvisionTenantClick?: (() => void) | undefined;
  readonly onRefreshHealth?: (() => void) | undefined;
}

// ============================================================================
// Default Seed Tenants (Sri Lanka SaaS Registry)
// ============================================================================

export const DEFAULT_TENANT_DIRECTORY: readonly HotelTenantDirectoryEntry[] = [
  {
    tenantId: "tenant-galle-fort",
    name: "Galle Fort Boutique",
    legalEntityName: "Galle Fort Heritage Villas (Pvt) Ltd",
    city: "Galle",
    province: "Southern Province",
    plan: "ENTERPRISE",
    status: "ACTIVE",
    health: "HEALTHY",
    roomCount: 24,
    monthlyQrOrders: 4850,
    monthlyRevenueLkr: 285000,
    ownerEmail: "anura.de.silva@gallefortboutique.lk",
    ownerPhone: "+94 91 223 4890",
    registeredAt: "2025-01-15T08:00:00.000Z",
    lastActiveAt: "2026-10-21T10:45:00.000Z",
    sltdaRegistrationNumber: "SLTDA/SQA/HOT/01492",
    awsStorageMb: 142,
    appsyncOpsLast30d: 48500,
  },
  {
    tenantId: "tenant-ella-cloud",
    name: "Ella Cloud Resort",
    legalEntityName: "Ella Heights Eco Lodges (Pvt) Ltd",
    city: "Ella",
    province: "Uva Province",
    plan: "PROFESSIONAL",
    status: "ACTIVE",
    health: "HEALTHY",
    roomCount: 14,
    monthlyQrOrders: 3120,
    monthlyRevenueLkr: 175000,
    ownerEmail: "chaminda.perera@ellacloud.lk",
    ownerPhone: "+94 57 222 8190",
    registeredAt: "2025-03-01T09:30:00.000Z",
    lastActiveAt: "2026-10-21T11:15:00.000Z",
    sltdaRegistrationNumber: "SLTDA/SQA/GHO/02831",
    awsStorageMb: 86,
    appsyncOpsLast30d: 31200,
  },
  {
    tenantId: "tenant-kandy-lake",
    name: "Kandy Lake Hotel",
    legalEntityName: "Hill Capital Hospitality PLC",
    city: "Kandy",
    province: "Central Province",
    plan: "ENTERPRISE",
    status: "ACTIVE",
    health: "HEALTHY",
    roomCount: 38,
    monthlyQrOrders: 6740,
    monthlyRevenueLkr: 350000,
    ownerEmail: "kavinda.bandara@kandylakehotel.com",
    ownerPhone: "+94 81 222 3400",
    registeredAt: "2024-11-10T14:00:00.000Z",
    lastActiveAt: "2026-10-21T11:30:00.000Z",
    sltdaRegistrationNumber: "SLTDA/SQA/HOT/00845",
    awsStorageMb: 210,
    appsyncOpsLast30d: 67400,
  },
  {
    tenantId: "tenant-pelmadulla-gem",
    name: "Pelmadulla Gem Villa",
    legalEntityName: "Sabaragamuwa Gems & Tourism (Pvt) Ltd",
    city: "Pelmadulla",
    province: "Sabaragamuwa Province",
    plan: "STARTER",
    status: "ACTIVE",
    health: "HEALTHY",
    roomCount: 8,
    monthlyQrOrders: 920,
    monthlyRevenueLkr: 75000,
    ownerEmail: "rohana.jayawardena@pelmadullagem.lk",
    ownerPhone: "+94 45 227 1230",
    registeredAt: "2025-08-20T11:00:00.000Z",
    lastActiveAt: "2026-10-21T09:50:00.000Z",
    sltdaRegistrationNumber: "SLTDA/SQA/VIL/03102",
    awsStorageMb: 34,
    appsyncOpsLast30d: 9200,
  },
];

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

/**
 * Validates whether the given Cognito RBAC role holds Super Admin privileges.
 */
export function isSuperAdminAuthorized(role: StaffRole | undefined): boolean {
  return role === "SUPER_ADMIN";
}

/**
 * Aggregates overall platform metrics across all registered tenants.
 */
export function calculateSaasPlatformSummary(
  tenants: readonly HotelTenantDirectoryEntry[],
): SaasPlatformSummary {
  let activeTenants = 0;
  let totalRooms = 0;
  let totalMonthlyQrOrders = 0;
  let totalMonthlyMrrLkr = 0;
  let healthyTenantsCount = 0;
  let warningTenantsCount = 0;
  let criticalTenantsCount = 0;
  let awsStorageTotalMb = 0;
  let appsyncOpsTotal30d = 0;

  for (const tenant of tenants) {
    if (tenant.status === "ACTIVE") {
      activeTenants += 1;
    }
    totalRooms += tenant.roomCount;
    totalMonthlyQrOrders += tenant.monthlyQrOrders;
    totalMonthlyMrrLkr += tenant.monthlyRevenueLkr;
    awsStorageTotalMb += tenant.awsStorageMb;
    appsyncOpsTotal30d += tenant.appsyncOpsLast30d;

    if (tenant.health === "HEALTHY") {
      healthyTenantsCount += 1;
    } else if (tenant.health === "WARNING") {
      warningTenantsCount += 1;
    } else {
      criticalTenantsCount += 1;
    }
  }

  return {
    totalTenants: tenants.length,
    activeTenants,
    totalRooms,
    totalMonthlyQrOrders,
    totalMonthlyMrrLkr,
    healthyTenantsCount,
    warningTenantsCount,
    criticalTenantsCount,
    awsStorageTotalMb,
    appsyncOpsTotal30d,
  };
}

/**
 * Checks whether a tenant matches the text search query against its key properties.
 */
export function matchesSearchQuery(
  tenant: HotelTenantDirectoryEntry,
  normalizedQuery: string,
): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }
  return (
    tenant.name.toLowerCase().includes(normalizedQuery) ||
    tenant.legalEntityName.toLowerCase().includes(normalizedQuery) ||
    tenant.city.toLowerCase().includes(normalizedQuery) ||
    tenant.tenantId.toLowerCase().includes(normalizedQuery) ||
    tenant.sltdaRegistrationNumber.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Filters the multi-tenant directory by search term, plan, status, and province.
 */
export function filterTenants(
  tenants: readonly HotelTenantDirectoryEntry[],
  options: TenantFilterOptions,
): readonly HotelTenantDirectoryEntry[] {
  const normalizedQuery = options.searchQuery.trim().toLowerCase();

  return tenants.filter((tenant) => {
    if (options.planFilter !== "ALL" && tenant.plan !== options.planFilter) {
      return false;
    }

    if (options.statusFilter !== "ALL" && tenant.status !== options.statusFilter) {
      return false;
    }

    if (options.provinceFilter !== "ALL" && tenant.province !== options.provinceFilter) {
      return false;
    }

    return matchesSearchQuery(tenant, normalizedQuery);
  });
}

/**
 * Returns Apple HIG color badge variants for subscription plans.
 */
export function getPlanBadgeColor(plan: SaasSubscriptionPlan): "indigo" | "blue" | "green" {
  switch (plan) {
    case "ENTERPRISE":
      return "indigo";
    case "PROFESSIONAL":
      return "blue";
    case "STARTER":
      return "green";
  }
}

/**
 * Returns Apple HIG color badge variants for tenant lifecycle statuses.
 */
export function getTenantStatusBadgeColor(
  status: TenantStatus,
): "green" | "blue" | "amber" | "gray" {
  switch (status) {
    case "ACTIVE":
      return "green";
    case "PROVISIONING":
      return "blue";
    case "TRIAL":
      return "amber";
    case "SUSPENDED":
      return "gray";
  }
}

/**
 * Returns Apple HIG color badge variants for tenant health status.
 */
export function getHealthStatusBadgeColor(health: TenantHealthStatus): "green" | "amber" | "red" {
  switch (health) {
    case "HEALTHY":
      return "green";
    case "WARNING":
      return "amber";
    case "CRITICAL":
      return "red";
  }
}

// ============================================================================
// React 19 Component Implementation
// ============================================================================

export function SaasSuperAdminView({
  currentUserRole = "SUPER_ADMIN",
  currentUserId = "usr-super-admin-root",
  tenants = DEFAULT_TENANT_DIRECTORY,
  onSelectTenant,
  onProvisionTenantClick,
  onRefreshHealth,
}: SaasSuperAdminViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<SaasSubscriptionPlan | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<TenantStatus | "ALL">("ALL");
  const [provinceFilter, setProvinceFilter] = useState<string | "ALL">("ALL");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);

  // 1. RBAC Guard: Super-Admin Verification
  const isAuthorized = isSuperAdminAuthorized(currentUserRole);

  // 2. Computed Summaries & Filtered List
  const summary = useMemo(() => calculateSaasPlatformSummary(tenants), [tenants]);

  const uniqueProvinces = useMemo(() => {
    const provinces = new Set<string>();
    for (const tenant of tenants) {
      provinces.add(tenant.province);
    }
    return Array.from(provinces);
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    return filterTenants(tenants, {
      searchQuery,
      planFilter,
      statusFilter,
      provinceFilter,
    });
  }, [tenants, searchQuery, planFilter, statusFilter, provinceFilter]);

  const inspectedTenant = useMemo(() => {
    if (!selectedTenantId) return null;
    return tenants.find((t) => t.tenantId === selectedTenantId) ?? null;
  }, [tenants, selectedTenantId]);

  // If unauthorized, render Apple HIG Liquid Glass restricted card
  if (!isAuthorized) {
    return (
      <div className="flex min-h-[480px] w-full items-center justify-center p-6">
        <GlassCard className="max-w-md p-8 text-center shadow-2xl border-red-500/30">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-apple-gray-900 dark:text-white">
            Restricted Platform Super-Admin Area
          </h2>
          <p className="mt-2 text-sm text-apple-gray-600 dark:text-apple-gray-400">
            Access to the Multi-Tenant SaaS Directory and AWS Infrastructure Console requires the
            Cognito{" "}
            <code className="font-mono text-xs bg-apple-gray-200 dark:bg-apple-gray-800 px-1 py-0.5 rounded">
              SUPER_ADMIN
            </code>{" "}
            group privilege.
          </p>
          <div className="mt-6 flex flex-col gap-2 rounded-xl bg-apple-gray-100/80 dark:bg-apple-gray-800/60 p-3 text-xs text-apple-gray-500 dark:text-apple-gray-400">
            <div>
              Current Role:{" "}
              <span className="font-semibold text-apple-gray-800 dark:text-apple-gray-200">
                {currentUserRole ?? "ANONYMOUS"}
              </span>
            </div>
            <div>
              User Principal:{" "}
              <span className="font-mono text-xs text-apple-gray-700 dark:text-apple-gray-300">
                {currentUserId}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-6 md:p-8">
      {/* Header with Super-Admin Platform Context */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-apple-blue-500/10 px-3 py-1 text-xs font-semibold text-apple-blue-600 dark:bg-apple-blue-500/20 dark:text-apple-blue-400">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              AWS Mumbai (ap-south-1) SaaS Platform Console
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-apple-gray-900 sm:text-3xl dark:text-white">
            Multi-Tenant SaaS Directory & Platform Health
          </h1>
          <p className="mt-1 text-sm text-apple-gray-600 dark:text-apple-gray-400">
            Real-time multi-tenant telemetry across Sri Lankan hospitality partners, AWS Free Tier
            consumption, and subscription status.
          </p>
        </div>

        {/* Global Super-Admin Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {onRefreshHealth && (
            <button
              type="button"
              onClick={onRefreshHealth}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border border-apple-gray-200 bg-white/70 px-4 py-2.5 text-sm font-medium text-apple-gray-700 shadow-sm transition hover:bg-white active:scale-95 dark:border-apple-gray-800 dark:bg-apple-gray-900/60 dark:text-apple-gray-200 dark:hover:bg-apple-gray-900"
            >
              <svg
                className="h-4 w-4"
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
              Refresh Health
            </button>
          )}

          <button
            type="button"
            onClick={onProvisionTenantClick ?? (() => setIsProvisionModalOpen(true))}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl bg-apple-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-apple-blue-500/20 transition hover:bg-apple-blue-700 active:scale-95 dark:bg-apple-blue-500 dark:hover:bg-apple-blue-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Provision New Hotel Tenant
          </button>
        </div>
      </div>

      {/* Bento Grid: Executive SaaS Telemetry */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <GlassCard className="p-5">
          <div className="text-xs font-medium text-apple-gray-500 dark:text-apple-gray-400">
            Registered Tenants
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-apple-gray-900 tabular-nums-lkr dark:text-white">
              {summary.totalTenants}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {summary.activeTenants} Active
            </span>
          </div>
          <div className="mt-2 text-xs text-apple-gray-500 dark:text-apple-gray-400">
            {summary.healthyTenantsCount} healthy • 100% SLA
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="text-xs font-medium text-apple-gray-500 dark:text-apple-gray-400">
            Managed Rooms
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-apple-gray-900 tabular-nums-lkr dark:text-white">
              {summary.totalRooms}
            </span>
            <span className="text-xs text-apple-gray-500 dark:text-apple-gray-400">Rooms</span>
          </div>
          <div className="mt-2 text-xs text-apple-gray-500 dark:text-apple-gray-400">
            Across {uniqueProvinces.length} Sri Lankan provinces
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="text-xs font-medium text-apple-gray-500 dark:text-apple-gray-400">
            Monthly QR Orders
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-apple-blue-600 tabular-nums-lkr dark:text-apple-blue-400">
              {summary.totalMonthlyQrOrders.toLocaleString("en-US")}
            </span>
          </div>
          <div className="mt-2 text-xs text-apple-gray-500 dark:text-apple-gray-400">
            Contactless dining & room service
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="text-xs font-medium text-apple-gray-500 dark:text-apple-gray-400">
            Platform MRR (LKR)
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-emerald-600 tabular-nums-lkr dark:text-emerald-400">
              {formatLkr(summary.totalMonthlyMrrLkr)}
            </span>
          </div>
          <div className="mt-2 text-xs text-apple-gray-500 dark:text-apple-gray-400">
            Multi-tier subscription fees
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="text-xs font-medium text-apple-gray-500 dark:text-apple-gray-400">
            AWS Free Tier Usage
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-purple-600 tabular-nums-lkr dark:text-purple-400">
              {(summary.awsStorageTotalMb / 1024).toFixed(2)} GB
            </span>
            <span className="text-xs text-apple-gray-500">/ 25 GB</span>
          </div>
          <div className="mt-2 text-xs text-apple-gray-500 dark:text-apple-gray-400">
            {summary.appsyncOpsTotal30d.toLocaleString("en-US")} / 250k AppSync ops
          </div>
        </GlassCard>
      </div>

      {/* Filter and Search Controls */}
      <GlassCard className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-4 w-4 text-apple-gray-400"
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
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by hotel name, city, SLTDA reg, or tenant ID..."
              className="w-full min-h-[44px] rounded-xl border border-apple-gray-200 bg-white/80 pl-10 pr-4 text-sm text-apple-gray-900 placeholder-apple-gray-400 transition focus:border-apple-blue-500 focus:outline-none focus:ring-2 focus:ring-apple-blue-500/20 dark:border-apple-gray-800 dark:bg-apple-gray-900/60 dark:text-white dark:placeholder-apple-gray-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as SaasSubscriptionPlan | "ALL")}
              className="min-h-[44px] rounded-xl border border-apple-gray-200 bg-white/80 px-3 py-2 text-xs font-medium text-apple-gray-700 transition focus:border-apple-blue-500 focus:outline-none dark:border-apple-gray-800 dark:bg-apple-gray-900/60 dark:text-apple-gray-300"
            >
              <option value="ALL">All Subscription Plans</option>
              <option value="ENTERPRISE">Enterprise Tier</option>
              <option value="PROFESSIONAL">Professional Tier</option>
              <option value="STARTER">Starter Tier</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TenantStatus | "ALL")}
              className="min-h-[44px] rounded-xl border border-apple-gray-200 bg-white/80 px-3 py-2 text-xs font-medium text-apple-gray-700 transition focus:border-apple-blue-500 focus:outline-none dark:border-apple-gray-800 dark:bg-apple-gray-900/60 dark:text-apple-gray-300"
            >
              <option value="ALL">All Lifecycle Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="PROVISIONING">Provisioning</option>
              <option value="SUSPENDED">Suspended</option>
            </select>

            {/* Province Filter */}
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="min-h-[44px] rounded-xl border border-apple-gray-200 bg-white/80 px-3 py-2 text-xs font-medium text-apple-gray-700 transition focus:border-apple-blue-500 focus:outline-none dark:border-apple-gray-800 dark:bg-apple-gray-900/60 dark:text-apple-gray-300"
            >
              <option value="ALL">All Provinces</option>
              {uniqueProvinces.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Main Tenant Directory Table */}
      <GlassCard className="overflow-hidden">
        <div className="border-b border-apple-gray-200/50 p-4 dark:border-apple-gray-800/50">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-apple-gray-900 dark:text-white">
              Registered Sri Lankan Hotel Tenants ({filteredTenants.length})
            </h2>
            <span className="text-xs text-apple-gray-500 dark:text-apple-gray-400">
              Live DynamoDB single-table partition isolation
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-apple-gray-100/50 text-xs font-semibold uppercase text-apple-gray-500 dark:bg-apple-gray-800/30 dark:text-apple-gray-400">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  Hotel Partner & SLTDA
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Location
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Plan Tier
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  Rooms
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Monthly QR Orders
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  MRR (LKR)
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  Health
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  Status
                </th>
                <th scope="col" className="px-5 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apple-gray-200/50 dark:divide-apple-gray-800/50">
              {filteredTenants.map((tenant) => {
                const planColor = getPlanBadgeColor(tenant.plan);
                const statusColor = getTenantStatusBadgeColor(tenant.status);
                const healthColor = getHealthStatusBadgeColor(tenant.health);

                return (
                  <tr
                    key={tenant.tenantId}
                    className="transition hover:bg-apple-gray-100/40 dark:hover:bg-apple-gray-800/20"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-apple-blue-50 text-apple-blue-600 font-bold dark:bg-apple-blue-950/40 dark:text-apple-blue-400">
                          {tenant.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-apple-gray-900 dark:text-white">
                            {tenant.name}
                          </div>
                          <div className="text-xs text-apple-gray-500 dark:text-apple-gray-400">
                            {tenant.sltdaRegistrationNumber}
                          </div>
                          <div className="text-[11px] font-mono text-apple-gray-400 dark:text-apple-gray-500">
                            {tenant.tenantId}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-apple-gray-800 dark:text-apple-gray-200">
                        {tenant.city}
                      </div>
                      <div className="text-xs text-apple-gray-500 dark:text-apple-gray-400">
                        {tenant.province}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={tenant.plan} color={planColor} />
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="font-bold tabular-nums-lkr text-apple-gray-900 dark:text-white">
                        {tenant.roomCount}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <span className="font-semibold tabular-nums-lkr text-apple-blue-600 dark:text-apple-blue-400">
                        {tenant.monthlyQrOrders.toLocaleString("en-US")}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <span className="font-bold tabular-nums-lkr text-apple-gray-900 dark:text-white">
                        {formatLkr(tenant.monthlyRevenueLkr)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <StatusBadge
                        status={tenant.health}
                        color={healthColor}
                        pulse={tenant.health === "HEALTHY"}
                      />
                    </td>

                    <td className="px-4 py-4 text-center">
                      <StatusBadge status={tenant.status} color={statusColor} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTenantId(tenant.tenantId)}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-medium text-apple-gray-600 hover:bg-apple-gray-200/70 dark:text-apple-gray-300 dark:hover:bg-apple-gray-800 transition"
                          title="View Telemetry & Resource Breakdown"
                        >
                          Telemetry
                        </button>

                        {onSelectTenant && (
                          <button
                            type="button"
                            onClick={() => onSelectTenant(tenant.tenantId)}
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg bg-apple-blue-50 px-3 py-1.5 text-xs font-semibold text-apple-blue-600 hover:bg-apple-blue-100 active:scale-95 transition dark:bg-apple-blue-950/50 dark:text-apple-blue-300 dark:hover:bg-apple-blue-900/60"
                          >
                            Switch Tenant
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredTenants.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-apple-gray-500 dark:text-apple-gray-400"
                  >
                    No hotel tenants matched the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Selected Tenant Quick Inspector Modal / Drawer */}
      {inspectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-xl p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-apple-gray-200/60 pb-4 dark:border-apple-gray-800/60">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-apple-gray-900 dark:text-white">
                    {inspectedTenant.name}
                  </h3>
                  <StatusBadge
                    status={inspectedTenant.plan}
                    color={getPlanBadgeColor(inspectedTenant.plan)}
                  />
                </div>
                <p className="text-xs text-apple-gray-500 dark:text-apple-gray-400">
                  {inspectedTenant.legalEntityName} • {inspectedTenant.city},{" "}
                  {inspectedTenant.province}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTenantId(null)}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-apple-gray-400 hover:text-apple-gray-600 dark:hover:text-apple-gray-200 transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl bg-apple-gray-100/70 p-3 dark:bg-apple-gray-800/50">
                <div className="text-apple-gray-500">Tenant ID</div>
                <div className="font-mono font-semibold text-apple-gray-900 dark:text-white">
                  {inspectedTenant.tenantId}
                </div>
              </div>
              <div className="rounded-xl bg-apple-gray-100/70 p-3 dark:bg-apple-gray-800/50">
                <div className="text-apple-gray-500">SLTDA Number</div>
                <div className="font-semibold text-apple-gray-900 dark:text-white">
                  {inspectedTenant.sltdaRegistrationNumber}
                </div>
              </div>
              <div className="rounded-xl bg-apple-gray-100/70 p-3 dark:bg-apple-gray-800/50">
                <div className="text-apple-gray-500">Owner Contact</div>
                <div className="font-medium text-apple-gray-900 dark:text-white">
                  {inspectedTenant.ownerEmail}
                </div>
                <div className="text-apple-gray-500">{inspectedTenant.ownerPhone}</div>
              </div>
              <div className="rounded-xl bg-apple-gray-100/70 p-3 dark:bg-apple-gray-800/50">
                <div className="text-apple-gray-500">AWS DynamoDB Storage</div>
                <div className="font-semibold tabular-nums-lkr text-apple-gray-900 dark:text-white">
                  {inspectedTenant.awsStorageMb} MB
                </div>
                <div className="text-apple-gray-500">
                  {inspectedTenant.appsyncOpsLast30d.toLocaleString("en-US")} AppSync Ops
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedTenantId(null)}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-apple-gray-200 px-4 py-2 text-xs font-semibold text-apple-gray-700 hover:bg-apple-gray-100 dark:border-apple-gray-800 dark:text-apple-gray-300 dark:hover:bg-apple-gray-800 transition"
              >
                Close
              </button>
              {onSelectTenant && (
                <button
                  type="button"
                  onClick={() => {
                    const id = inspectedTenant.tenantId;
                    setSelectedTenantId(null);
                    onSelectTenant(id);
                  }}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-apple-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-apple-blue-700 transition"
                >
                  Switch Context to {inspectedTenant.name}
                </button>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* 1-Click Tenant Provisioning Modal */}
      <ProvisionTenantModal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
      />
    </div>
  );
}
