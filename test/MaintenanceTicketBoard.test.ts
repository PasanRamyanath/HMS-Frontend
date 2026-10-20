import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_MAINTENANCE_TICKETS,
  MaintenanceTicketBoard,
  type MaintenanceTicketRecord,
  calculateMaintenanceMetrics,
  formatMaintenanceLkr,
  getMaintenanceText,
  getNextMaintenanceStatus,
  isTicketMatchingSearch,
  isTicketMatchingTab,
  resolveCategoryDetails,
  resolveSeverityStyle,
} from "../src/admin/housekeeping/MaintenanceTicketBoard.js";

const noop = () => undefined;

describe("Step 310: Engineering & Preventive Maintenance Ticket System (MaintenanceTicketBoard.tsx)", () => {
  describe("1. Pure Domain Metrics & Workflow State Resolvers", () => {
    it("calculates aggregated maintenance metrics across ticket records", () => {
      const tickets: readonly MaintenanceTicketRecord[] = [
        {
          ticketId: "tk-1",
          ticketNumber: "MNT-001",
          roomNumber: "101",
          category: "AC_LEAK",
          severity: "CRITICAL",
          status: "IN_PROGRESS",
          title: "AC drip",
          description: "Water leaking",
          reportedBy: "Staff",
          createdAtIso: "2026-10-20T00:00:00Z",
          placeOutOfOrder: true,
          tapeChartBlocked: true,
          channexBlocked: true,
          estimatedRepairCostLkr: 10000,
        },
        {
          ticketId: "tk-2",
          ticketNumber: "MNT-002",
          roomNumber: "102",
          category: "PLUMBING",
          severity: "HIGH",
          status: "REPORTED",
          title: "Shower low pressure",
          description: "Valve problem",
          reportedBy: "Staff",
          createdAtIso: "2026-10-20T01:00:00Z",
          placeOutOfOrder: false,
          tapeChartBlocked: false,
          channexBlocked: false,
          estimatedRepairCostLkr: 5000,
        },
        {
          ticketId: "tk-3",
          ticketNumber: "MNT-003",
          roomNumber: "103",
          category: "WIFI_AP",
          severity: "LOW",
          status: "RESOLVED",
          title: "AP reboot",
          description: "Rebooted AP",
          reportedBy: "Staff",
          createdAtIso: "2026-10-20T02:00:00Z",
          placeOutOfOrder: false,
          tapeChartBlocked: false,
          channexBlocked: false,
          estimatedRepairCostLkr: 2000,
        },
      ];

      const metrics = calculateMaintenanceMetrics(tickets);
      assert.equal(metrics.totalOpen, 2); // tk-1 & tk-2
      assert.equal(metrics.totalCriticalOoo, 1); // tk-1
      assert.equal(metrics.totalInProgress, 1); // tk-1
      assert.equal(metrics.totalResolved, 1); // tk-3
      assert.equal(metrics.totalEstCostLkr, 15000); // 10000 + 5000 (open only)
    });

    it("advances sequentially through the 5 ticket lifecycle statuses", () => {
      assert.equal(getNextMaintenanceStatus("REPORTED"), "ASSIGNED");
      assert.equal(getNextMaintenanceStatus("ASSIGNED"), "IN_PROGRESS");
      assert.equal(getNextMaintenanceStatus("IN_PROGRESS"), "RESOLVED");
      assert.equal(getNextMaintenanceStatus("RESOLVED"), "CLOSED");
      assert.equal(getNextMaintenanceStatus("CLOSED"), "CLOSED");
    });

    it("formats LKR currency strings cleanly with commas and two decimals", () => {
      assert.equal(formatMaintenanceLkr(8500), "LKR 8,500.00");
      assert.equal(formatMaintenanceLkr(14500.5), "LKR 14,500.50");
    });

    it("resolves Apple HIG styling tokens for severity levels", () => {
      assert.ok(resolveSeverityStyle("CRITICAL").style.includes("rose"));
      assert.ok(resolveSeverityStyle("HIGH").style.includes("amber"));
      assert.ok(resolveSeverityStyle("MEDIUM").style.includes("blue"));
      assert.ok(resolveSeverityStyle("LOW").style.includes("slate"));
    });

    it("resolves descriptive names and icons for equipment categories", () => {
      assert.equal(resolveCategoryDetails("AC_LEAK").name, "AC & Climate");
      assert.equal(resolveCategoryDetails("SOLAR_GEYSER").name, "Solar Hot Water");
      assert.equal(resolveCategoryDetails("PLUMBING").name, "Plumbing");
      assert.equal(resolveCategoryDetails("WIFI_AP").name, "Wi-Fi & Network");
      assert.equal(resolveCategoryDetails("ELECTRICAL").name, "Electrical & Power");
      assert.equal(resolveCategoryDetails("CARPENTRY_LOCK").name, "Locks & Carpentry");
    });
  });

  describe("2. Filtering & Search Matching Helpers", () => {
    it("filters tickets accurately by status and Out-of-Order block criteria", () => {
      const oooTicket = DEFAULT_MAINTENANCE_TICKETS[0]; // AC_LEAK, placeOutOfOrder = true, IN_PROGRESS
      assert.ok(oooTicket);

      assert.equal(isTicketMatchingTab(oooTicket, "ALL"), true);
      assert.equal(isTicketMatchingTab(oooTicket, "OPEN"), true);
      assert.equal(isTicketMatchingTab(oooTicket, "OUT_OF_ORDER"), true);
      assert.equal(isTicketMatchingTab(oooTicket, "IN_PROGRESS"), true);
      assert.equal(isTicketMatchingTab(oooTicket, "RESOLVED"), false);

      const resolvedTicket = DEFAULT_MAINTENANCE_TICKETS[4]; // CARPENTRY_LOCK, RESOLVED
      assert.ok(resolvedTicket);
      assert.equal(isTicketMatchingTab(resolvedTicket, "RESOLVED"), true);
      assert.equal(isTicketMatchingTab(resolvedTicket, "OPEN"), false);
    });

    it("matches search query against room number, ticket number, title, category, and engineer", () => {
      const ticket = DEFAULT_MAINTENANCE_TICKETS[0];
      assert.ok(ticket);

      assert.equal(isTicketMatchingSearch(ticket, "102"), true);
      assert.equal(isTicketMatchingSearch(ticket, "MNT-2026-081"), true);
      assert.equal(isTicketMatchingSearch(ticket, "Inverter AC"), true);
      assert.equal(isTicketMatchingSearch(ticket, "Roshan"), true);
      assert.equal(isTicketMatchingSearch(ticket, "AC_LEAK"), true);
      assert.equal(isTicketMatchingSearch(ticket, "NonExistentRoom"), false);
      assert.equal(isTicketMatchingSearch(ticket, ""), true);
    });
  });

  describe("3. React Static Markup & Apple HIG Design Standards", () => {
    it("renders board header, action buttons, and KPI metrics cards", () => {
      const html = renderToStaticMarkup(
        React.createElement(MaintenanceTicketBoard, {
          propertyName: "Cinnamon Wild Yala",
          onStatusChange: noop,
          onToggleOoo: noop,
          onCreateTicket: noop,
        }),
      );

      assert.ok(html.includes("Cinnamon Wild Yala"));
      assert.ok(html.includes("Engineering &amp; Preventive Maintenance Board"));
      assert.ok(html.includes("+ New Ticket"));
      assert.ok(html.includes("Open Tickets"));
      assert.ok(html.includes("Out of Order Rooms"));
      assert.ok(html.includes("Under Repair"));
      assert.ok(html.includes("Est. Repair Expense"));
      assert.ok(html.includes("All Tickets"));
      assert.ok(html.includes("Out of Order"));
    });

    it("renders ticket cards with severity badges, room details, and >= 44x44pt buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(MaintenanceTicketBoard, {
          initialTickets: DEFAULT_MAINTENANCE_TICKETS,
        }),
      );

      assert.ok(html.includes("Room #102"));
      assert.ok(html.includes("MNT-2026-081"));
      assert.ok(html.includes("Critical"));
      assert.ok(html.includes("AC &amp; Climate"));
      assert.ok(html.includes("Room Blocked: Tape Chart &amp; Channex OTA blocked"));
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("apple-liquid-glass"));
    });

    it("renders trilingual localized text in Sinhala and Tamil", () => {
      const textSi = getMaintenanceText("si");
      assert.equal(textSi.title, "ඉංජිනේරු සහ නඩත්තු සේවා කළමනාකරණය");
      assert.equal(textSi.createTicketAction, "+ නව ඇණවුමක්");
      assert.equal(textSi.resolveAction, "විසඳූ බව සටහන් කරන්න");

      const textTa = getMaintenanceText("ta");
      assert.equal(textTa.title, "பொறியியல் & தடுப்பு பராமரிப்பு பலகை");
      assert.equal(textTa.createTicketAction, "+ புதிய டிக்கெட்");
      assert.equal(textTa.resolveAction, "முடிந்தது என குறி");

      const htmlSi = renderToStaticMarkup(
        React.createElement(MaintenanceTicketBoard, {
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes("ඉංජිනේරු සහ නඩත්තු සේවා කළමනාකරණය"));
      assert.ok(htmlSi.includes("+ නව ඇණවුමක්"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(MaintenanceTicketBoard, {
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("பொறியியல் &amp; தடுப்பு பராமரிப்பு பலகை"));
      assert.ok(htmlTa.includes("+ புதிய டிக்கெட்"));
    });
  });
});
