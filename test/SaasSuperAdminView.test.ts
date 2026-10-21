/**
 * Unit Test Suite for Step 451: SaasSuperAdminView
 * (`test/SaasSuperAdminView.test.ts`)
 *
 * Implements Step 451 (Phase 19.01) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Build SaaS Super-Admin Multi-Tenant Directory & Health Dashboard (`SaasSuperAdminView.tsx`).
 *
 * Validates:
 * 1. Default Sri Lankan hotel tenant directory and tenant configuration.
 * 2. Super Admin Cognito RBAC authorization guard.
 * 3. Platform executive metrics rollup calculation (Rooms, QR orders, MRR, AWS usage).
 * 4. Multi-criteria tenant directory filtering (Search, Plan, Status, Province).
 * 5. Apple HIG badge color mapping for subscription tiers, health, and statuses.
 * 6. React 19 SSR static markup rendering for authorized Super Admin vs restricted users.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_TENANT_DIRECTORY,
  type HotelTenantDirectoryEntry,
  SaasSuperAdminView,
  calculateSaasPlatformSummary,
  filterTenants,
  getHealthStatusBadgeColor,
  getPlanBadgeColor,
  getTenantStatusBadgeColor,
  isSuperAdminAuthorized,
} from "../src/admin/superadmin/SaasSuperAdminView.js";

describe("Step 451: SaaS Super-Admin Multi-Tenant Directory & Platform Health (SaasSuperAdminView.tsx)", () => {
  describe("1. Default Sri Lankan Hotel SaaS Tenant Directory", () => {
    it("contains exactly 4 registered Sri Lankan hotel tenants covering major provinces", () => {
      assert.equal(DEFAULT_TENANT_DIRECTORY.length, 4);

      const tenantIds = DEFAULT_TENANT_DIRECTORY.map((t) => t.tenantId);
      assert.ok(tenantIds.includes("tenant-galle-fort"));
      assert.ok(tenantIds.includes("tenant-ella-cloud"));
      assert.ok(tenantIds.includes("tenant-kandy-lake"));
      assert.ok(tenantIds.includes("tenant-pelmadulla-gem"));
    });

    it("verifies Galle Fort Boutique configuration and Enterprise plan", () => {
      const galle = DEFAULT_TENANT_DIRECTORY.find((t) => t.tenantId === "tenant-galle-fort");
      assert.ok(galle);
      assert.equal(galle.name, "Galle Fort Boutique");
      assert.equal(galle.city, "Galle");
      assert.equal(galle.province, "Southern Province");
      assert.equal(galle.plan, "ENTERPRISE");
      assert.equal(galle.status, "ACTIVE");
      assert.equal(galle.health, "HEALTHY");
      assert.equal(galle.roomCount, 24);
      assert.equal(galle.monthlyQrOrders, 4850);
      assert.equal(galle.monthlyRevenueLkr, 285000);
      assert.ok(galle.sltdaRegistrationNumber.startsWith("SLTDA/"));
    });

    it("verifies Ella Cloud Resort configuration and Professional plan", () => {
      const ella = DEFAULT_TENANT_DIRECTORY.find((t) => t.tenantId === "tenant-ella-cloud");
      assert.ok(ella);
      assert.equal(ella.name, "Ella Cloud Resort");
      assert.equal(ella.city, "Ella");
      assert.equal(ella.province, "Uva Province");
      assert.equal(ella.plan, "PROFESSIONAL");
      assert.equal(ella.roomCount, 14);
      assert.equal(ella.monthlyQrOrders, 3120);
      assert.equal(ella.monthlyRevenueLkr, 175000);
    });

    it("verifies Kandy Lake Hotel configuration and Enterprise plan", () => {
      const kandy = DEFAULT_TENANT_DIRECTORY.find((t) => t.tenantId === "tenant-kandy-lake");
      assert.ok(kandy);
      assert.equal(kandy.name, "Kandy Lake Hotel");
      assert.equal(kandy.city, "Kandy");
      assert.equal(kandy.province, "Central Province");
      assert.equal(kandy.plan, "ENTERPRISE");
      assert.equal(kandy.roomCount, 38);
      assert.equal(kandy.monthlyQrOrders, 6740);
      assert.equal(kandy.monthlyRevenueLkr, 350000);
    });

    it("verifies Pelmadulla Gem Villa configuration and Starter plan", () => {
      const pelmadulla = DEFAULT_TENANT_DIRECTORY.find(
        (t) => t.tenantId === "tenant-pelmadulla-gem",
      );
      assert.ok(pelmadulla);
      assert.equal(pelmadulla.name, "Pelmadulla Gem Villa");
      assert.equal(pelmadulla.city, "Pelmadulla");
      assert.equal(pelmadulla.province, "Sabaragamuwa Province");
      assert.equal(pelmadulla.plan, "STARTER");
      assert.equal(pelmadulla.roomCount, 8);
      assert.equal(pelmadulla.monthlyQrOrders, 920);
      assert.equal(pelmadulla.monthlyRevenueLkr, 75000);
    });
  });

  describe("2. Cognito RBAC Super-Admin Authorization Guard", () => {
    it("authorizes only SUPER_ADMIN role", () => {
      assert.equal(isSuperAdminAuthorized("SUPER_ADMIN"), true);
      assert.equal(isSuperAdminAuthorized("HOTEL_ADMIN"), false);
      assert.equal(isSuperAdminAuthorized("FRONT_DESK"), false);
      assert.equal(isSuperAdminAuthorized("POS_CASHIER"), false);
      assert.equal(isSuperAdminAuthorized("HOUSEKEEPING"), false);
      assert.equal(isSuperAdminAuthorized("KITCHEN_KDS"), false);
      assert.equal(isSuperAdminAuthorized(undefined), false);
    });
  });

  describe("3. Platform Summary Rollup Calculations", () => {
    it("correctly calculates aggregate rooms, QR orders, MRR, and AWS usage", () => {
      const summary = calculateSaasPlatformSummary(DEFAULT_TENANT_DIRECTORY);

      assert.equal(summary.totalTenants, 4);
      assert.equal(summary.activeTenants, 4);
      assert.equal(summary.totalRooms, 24 + 14 + 38 + 8); // 84
      assert.equal(summary.totalMonthlyQrOrders, 4850 + 3120 + 6740 + 920); // 15630
      assert.equal(summary.totalMonthlyMrrLkr, 285000 + 175000 + 350000 + 75000); // 885000
      assert.equal(summary.healthyTenantsCount, 4);
      assert.equal(summary.warningTenantsCount, 0);
      assert.equal(summary.criticalTenantsCount, 0);
      assert.equal(summary.awsStorageTotalMb, 142 + 86 + 210 + 34); // 472
      assert.equal(summary.appsyncOpsTotal30d, 48500 + 31200 + 67400 + 9200); // 156300
    });

    it("handles an empty tenant directory without errors", () => {
      const summary = calculateSaasPlatformSummary([]);
      assert.equal(summary.totalTenants, 0);
      assert.equal(summary.activeTenants, 0);
      assert.equal(summary.totalRooms, 0);
      assert.equal(summary.totalMonthlyQrOrders, 0);
      assert.equal(summary.totalMonthlyMrrLkr, 0);
      assert.equal(summary.awsStorageTotalMb, 0);
      assert.equal(summary.appsyncOpsTotal30d, 0);
    });

    it("categorizes non-active and warning/critical tenants accurately", () => {
      const customTenants: readonly HotelTenantDirectoryEntry[] = [
        {
          tenantId: "tenant-warning-hotel",
          name: "Unawatuna Coral Reef",
          legalEntityName: "Unawatuna Coral (Pvt) Ltd",
          city: "Unawatuna",
          province: "Southern Province",
          plan: "PROFESSIONAL",
          status: "TRIAL",
          health: "WARNING",
          roomCount: 10,
          monthlyQrOrders: 500,
          monthlyRevenueLkr: 100000,
          ownerEmail: "test@coral.lk",
          ownerPhone: "+94 91 123 4567",
          registeredAt: "2026-01-01T00:00:00.000Z",
          lastActiveAt: "2026-10-20T00:00:00.000Z",
          sltdaRegistrationNumber: "SLTDA/SQA/HOT/99999",
          awsStorageMb: 50,
          appsyncOpsLast30d: 5000,
        },
        {
          tenantId: "tenant-critical-hotel",
          name: "Jaffna Heritage House",
          legalEntityName: "Jaffna Tourism Ltd",
          city: "Jaffna",
          province: "Northern Province",
          plan: "STARTER",
          status: "SUSPENDED",
          health: "CRITICAL",
          roomCount: 6,
          monthlyQrOrders: 0,
          monthlyRevenueLkr: 0,
          ownerEmail: "admin@jaffnaheritage.lk",
          ownerPhone: "+94 21 222 3344",
          registeredAt: "2025-06-01T00:00:00.000Z",
          lastActiveAt: "2026-09-01T00:00:00.000Z",
          sltdaRegistrationNumber: "SLTDA/SQA/GHO/88888",
          awsStorageMb: 20,
          appsyncOpsLast30d: 100,
        },
      ];

      const summary = calculateSaasPlatformSummary(customTenants);
      assert.equal(summary.totalTenants, 2);
      assert.equal(summary.activeTenants, 0);
      assert.equal(summary.warningTenantsCount, 1);
      assert.equal(summary.criticalTenantsCount, 1);
      assert.equal(summary.healthyTenantsCount, 0);
    });
  });

  describe("4. Multi-Criteria Tenant Directory Filtering", () => {
    it("filters tenants by subscription plan", () => {
      const enterpriseTenants = filterTenants(DEFAULT_TENANT_DIRECTORY, {
        searchQuery: "",
        planFilter: "ENTERPRISE",
        statusFilter: "ALL",
        provinceFilter: "ALL",
      });
      assert.equal(enterpriseTenants.length, 2);
      assert.ok(enterpriseTenants.some((t) => t.name === "Galle Fort Boutique"));
      assert.ok(enterpriseTenants.some((t) => t.name === "Kandy Lake Hotel"));

      const starterTenants = filterTenants(DEFAULT_TENANT_DIRECTORY, {
        searchQuery: "",
        planFilter: "STARTER",
        statusFilter: "ALL",
        provinceFilter: "ALL",
      });
      assert.equal(starterTenants.length, 1);
      assert.equal(starterTenants[0]?.name, "Pelmadulla Gem Villa");
    });

    it("filters tenants by province", () => {
      const uvaTenants = filterTenants(DEFAULT_TENANT_DIRECTORY, {
        searchQuery: "",
        planFilter: "ALL",
        statusFilter: "ALL",
        provinceFilter: "Uva Province",
      });
      assert.equal(uvaTenants.length, 1);
      assert.equal(uvaTenants[0]?.name, "Ella Cloud Resort");
    });

    it("searches case-insensitively by hotel name, city, SLTDA number, or tenant ID", () => {
      const searchByName = filterTenants(DEFAULT_TENANT_DIRECTORY, {
        searchQuery: "kandy",
        planFilter: "ALL",
        statusFilter: "ALL",
        provinceFilter: "ALL",
      });
      assert.equal(searchByName.length, 1);
      assert.equal(searchByName[0]?.tenantId, "tenant-kandy-lake");

      const searchBySltda = filterTenants(DEFAULT_TENANT_DIRECTORY, {
        searchQuery: "01492",
        planFilter: "ALL",
        statusFilter: "ALL",
        provinceFilter: "ALL",
      });
      assert.equal(searchBySltda.length, 1);
      assert.equal(searchBySltda[0]?.tenantId, "tenant-galle-fort");

      const searchByTenantId = filterTenants(DEFAULT_TENANT_DIRECTORY, {
        searchQuery: "tenant-pelmadulla",
        planFilter: "ALL",
        statusFilter: "ALL",
        provinceFilter: "ALL",
      });
      assert.equal(searchByTenantId.length, 1);
      assert.equal(searchByTenantId[0]?.name, "Pelmadulla Gem Villa");
    });

    it("returns empty array when search query matches nothing", () => {
      const emptyResult = filterTenants(DEFAULT_TENANT_DIRECTORY, {
        searchQuery: "NonExistentHotelXYZ",
        planFilter: "ALL",
        statusFilter: "ALL",
        provinceFilter: "ALL",
      });
      assert.equal(emptyResult.length, 0);
    });
  });

  describe("5. Apple HIG Status & Badge Colors", () => {
    it("returns correct color tokens for plans", () => {
      assert.equal(getPlanBadgeColor("ENTERPRISE"), "indigo");
      assert.equal(getPlanBadgeColor("PROFESSIONAL"), "blue");
      assert.equal(getPlanBadgeColor("STARTER"), "green");
    });

    it("returns correct color tokens for tenant lifecycle status", () => {
      assert.equal(getTenantStatusBadgeColor("ACTIVE"), "green");
      assert.equal(getTenantStatusBadgeColor("PROVISIONING"), "blue");
      assert.equal(getTenantStatusBadgeColor("TRIAL"), "amber");
      assert.equal(getTenantStatusBadgeColor("SUSPENDED"), "gray");
    });

    it("returns correct color tokens for health status", () => {
      assert.equal(getHealthStatusBadgeColor("HEALTHY"), "green");
      assert.equal(getHealthStatusBadgeColor("WARNING"), "amber");
      assert.equal(getHealthStatusBadgeColor("CRITICAL"), "red");
    });
  });

  describe("6. React 19 SSR Static Markup Rendering", () => {
    it("renders full multi-tenant directory table and KPI cards for SUPER_ADMIN", () => {
      const html = renderToStaticMarkup(
        React.createElement(SaasSuperAdminView, {
          currentUserRole: "SUPER_ADMIN",
          currentUserId: "usr-super-admin-01",
        }),
      );

      assert.ok(html.includes("Multi-Tenant SaaS Directory &amp; Platform Health"));
      assert.ok(html.includes("AWS Mumbai (ap-south-1) SaaS Platform Console"));
      assert.ok(html.includes("All Systems Operational"));
      assert.ok(html.includes("Galle Fort Boutique"));
      assert.ok(html.includes("Ella Cloud Resort"));
      assert.ok(html.includes("Kandy Lake Hotel"));
      assert.ok(html.includes("Pelmadulla Gem Villa"));
      assert.ok(html.includes("Provision New Hotel Tenant"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("renders Apple HIG restricted access alert when non-superadmin accesses view", () => {
      const html = renderToStaticMarkup(
        React.createElement(SaasSuperAdminView, {
          currentUserRole: "HOTEL_ADMIN",
          currentUserId: "usr-hotel-admin-01",
        }),
      );

      assert.ok(html.includes("Restricted Platform Super-Admin Area"));
      assert.ok(html.includes("SUPER_ADMIN"));
      assert.ok(html.includes("HOTEL_ADMIN"));
      assert.ok(!html.includes("Provision New Hotel Tenant"));
      assert.ok(!html.includes("Registered Sri Lankan Hotel Tenants"));
    });
  });
});
