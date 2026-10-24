import { useId, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { MealPlan } from "../../generated/graphql.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type OtaChannelId = "BOOKING_COM" | "AGODA" | "EXPEDIA" | "AIRBNB";

export type ChannelSyncStatus = "CONNECTED" | "SYNCING" | "WARNING" | "ERROR" | "PAUSED";

export type SyncMode = "CHANNEX_API" | "ICAL_FEED";

export type ChannelViewTab = "MAPPINGS" | "ALERTS" | "ICAL_FEEDS" | "SYNC_LOGS";

export interface ChannelConnection {
 readonly id: OtaChannelId;
 readonly name: string;
 readonly code: string;
 readonly syncMode: SyncMode;
 readonly status: ChannelSyncStatus;
 readonly lastSyncTimestamp: string;
 readonly ariLatencyMs: number;
 readonly activeListingsCount: number;
 readonly unmappedAlertsCount: number;
 readonly successRatePercent: number;
 readonly channexPropertyId?: string | undefined;
 readonly icalFeedUrl?: string | undefined;
}

export interface RoomMealMapping {
 readonly id: string;
 readonly localRoomTypeId: string;
 readonly localRoomTypeName: string;
 readonly localRoomTypeCode: string;
 readonly mealPlan: MealPlan;
 readonly channexRoomTypeId: string;
 readonly channexRatePlanId: string;
 readonly icalExportUrl: string;
 readonly icalImportUrl?: string | undefined;
 readonly syncEnabled: boolean;
 readonly hasUnmappedAlert: boolean;
 readonly unmappedReason?: string | undefined;
 readonly lastAriPushAt: string;
}

export interface UnmappedAlert {
 readonly id: string;
 readonly channelId: OtaChannelId;
 readonly channelName: string;
 readonly otaRoomTypeCode: string;
 readonly otaRatePlanCode: string;
 readonly reservationId: string;
 readonly guestName: string;
 readonly checkInDate: string;
 readonly checkOutDate: string;
 readonly detectedAt: string;
 readonly code: "booking_unmapped_room";
 readonly resolutionStatus: "PENDING" | "RESOLVED";
}

export interface SyncLogEntry {
 readonly id: string;
 readonly channelId: OtaChannelId;
 readonly type: "OUTBOUND_ARI_PUSH" | "INBOUND_WEBHOOK_REVISION" | "ICAL_PULL" | "FULL_RESYNC";
 readonly status: "SUCCESS" | "WARNING" | "FAILED";
 readonly summary: string;
 readonly timestamp: string;
 readonly latencyMs: number;
}

export interface ChannelManagerViewProps {
 readonly propertyTitle?: string | undefined;
 readonly channexPropertyId?: string | undefined;
 readonly initialConnections?: ReadonlyArray<ChannelConnection> | undefined;
 readonly initialMappings?: ReadonlyArray<RoomMealMapping> | undefined;
 readonly initialAlerts?: ReadonlyArray<UnmappedAlert> | undefined;
 readonly initialLogs?: ReadonlyArray<SyncLogEntry> | undefined;
 readonly onTriggerFullResync?: (() => Promise<void> | void) | undefined;
 readonly onSaveMapping?: ((mapping: RoomMealMapping) => Promise<void> | void) | undefined;
 readonly onResolveAlert?:
 | ((alertId: string, resolvedMapping: RoomMealMapping) => Promise<void> | void)
 | undefined;
 readonly onActionNotify?:
 | ((title: string, message: string, type?: StatusColor) => void)
 | undefined;
 readonly className?: string | undefined;
}

// ============================================================================
// Default Mock Data (Sri Lankan Heritage Boutique Hotel)
// ============================================================================

export const DEFAULT_CHANNEL_CONNECTIONS: ReadonlyArray<ChannelConnection> = [
 {
 id: "BOOKING_COM",
 name: "Booking.com",
 code: "BKG",
 syncMode: "CHANNEX_API",
 status: "CONNECTED",
 lastSyncTimestamp: "1 min ago",
 ariLatencyMs: 1350,
 activeListingsCount: 8,
 unmappedAlertsCount: 1,
 successRatePercent: 99.8,
 channexPropertyId: "cnx_prop_99214",
 },
 {
 id: "AGODA",
 name: "Agoda",
 code: "AGD",
 syncMode: "CHANNEX_API",
 status: "CONNECTED",
 lastSyncTimestamp: "3 mins ago",
 ariLatencyMs: 1720,
 activeListingsCount: 8,
 unmappedAlertsCount: 0,
 successRatePercent: 100.0,
 channexPropertyId: "cnx_prop_99214",
 },
 {
 id: "EXPEDIA",
 name: "Expedia Partner Central",
 code: "EXP",
 syncMode: "CHANNEX_API",
 status: "CONNECTED",
 lastSyncTimestamp: "5 mins ago",
 ariLatencyMs: 2100,
 activeListingsCount: 6,
 unmappedAlertsCount: 0,
 successRatePercent: 99.4,
 channexPropertyId: "cnx_prop_99214",
 },
 {
 id: "AIRBNB",
 name: "Airbnb",
 code: "ABNB",
 syncMode: "ICAL_FEED",
 status: "CONNECTED",
 lastSyncTimestamp: "12 mins ago",
 ariLatencyMs: 820,
 activeListingsCount: 4,
 unmappedAlertsCount: 1,
 successRatePercent: 98.7,
 icalFeedUrl: "https://www.airbnb.com/calendar/ical/7891234.ics?s=abcdef",
 },
];

export const DEFAULT_ROOM_MAPPINGS: ReadonlyArray<RoomMealMapping> = [
 {
 id: "map-dlx-ro",
 localRoomTypeId: "rt-dlx-ocean",
 localRoomTypeName: "Deluxe Ocean View",
 localRoomTypeCode: "DLX-OCN",
 mealPlan: MealPlan.Ro,
 channexRoomTypeId: "cnx_rt_dlx_ocean_01",
 channexRatePlanId: "cnx_rp_dlx_ro_resident",
 icalExportUrl: "https://api.hms.lk/ical/tenant-galle-fort/rt-dlx-ocean/export.ics",
 icalImportUrl: "https://www.airbnb.com/calendar/ical/7891234.ics?s=dlx",
 syncEnabled: true,
 hasUnmappedAlert: false,
 lastAriPushAt: "Today, 14:32:00 SLST",
 },
 {
 id: "map-dlx-bb",
 localRoomTypeId: "rt-dlx-ocean",
 localRoomTypeName: "Deluxe Ocean View",
 localRoomTypeCode: "DLX-OCN",
 mealPlan: MealPlan.Bb,
 channexRoomTypeId: "cnx_rt_dlx_ocean_01",
 channexRatePlanId: "cnx_rp_dlx_bb_standard",
 icalExportUrl: "https://api.hms.lk/ical/tenant-galle-fort/rt-dlx-ocean-bb/export.ics",
 syncEnabled: true,
 hasUnmappedAlert: false,
 lastAriPushAt: "Today, 14:32:00 SLST",
 },
 {
 id: "map-dlx-hb",
 localRoomTypeId: "rt-dlx-ocean",
 localRoomTypeName: "Deluxe Ocean View",
 localRoomTypeCode: "DLX-OCN",
 mealPlan: MealPlan.Hb,
 channexRoomTypeId: "cnx_rt_dlx_ocean_01",
 channexRatePlanId: "cnx_rp_dlx_hb_standard",
 icalExportUrl: "https://api.hms.lk/ical/tenant-galle-fort/rt-dlx-ocean-hb/export.ics",
 syncEnabled: true,
 hasUnmappedAlert: false,
 lastAriPushAt: "Today, 14:32:00 SLST",
 },
 {
 id: "map-villa-ro",
 localRoomTypeId: "rt-grand-villa",
 localRoomTypeName: "Grand Beach Villa",
 localRoomTypeCode: "VIL-GRD",
 mealPlan: MealPlan.Ro,
 channexRoomTypeId: "cnx_rt_villa_grd_02",
 channexRatePlanId: "cnx_rp_villa_ro_tariff",
 icalExportUrl: "https://api.hms.lk/ical/tenant-galle-fort/rt-grand-villa/export.ics",
 icalImportUrl: "https://www.airbnb.com/calendar/ical/9981241.ics?s=villa",
 syncEnabled: true,
 hasUnmappedAlert: false,
 lastAriPushAt: "Today, 14:30:15 SLST",
 },
 {
 id: "map-cin-fb",
 localRoomTypeId: "rt-cinnamon-ste",
 localRoomTypeName: "Cinnamon Master Suite",
 localRoomTypeCode: "STE-CIN",
 mealPlan: MealPlan.Fb,
 channexRoomTypeId: "",
 channexRatePlanId: "",
 icalExportUrl: "https://api.hms.lk/ical/tenant-galle-fort/rt-cinnamon-ste/export.ics",
 syncEnabled: false,
 hasUnmappedAlert: true,
 unmappedReason: "OTA Room & Rate Plan IDs missing in Channex mapping matrix",
 lastAriPushAt: "Never synced",
 },
];

export const DEFAULT_UNMAPPED_ALERTS: ReadonlyArray<UnmappedAlert> = [
 {
 id: "alert-cnx-001",
 channelId: "BOOKING_COM",
 channelName: "Booking.com",
 otaRoomTypeCode: "BKG-SUITE-PREM",
 otaRatePlanCode: "RATE-FB-SPECIAL",
 reservationId: "BKG-2026-9812",
 guestName: "Lord Arthur Wellesley",
 checkInDate: "2026-11-14",
 checkOutDate: "2026-11-18",
 detectedAt: "Today, 13:45 SLST",
 code: "booking_unmapped_room",
 resolutionStatus: "PENDING",
 },
 {
 id: "alert-abnb-002",
 channelId: "AIRBNB",
 channelName: "Airbnb iCal",
 otaRoomTypeCode: "HM-SUITE-PENTHOUSE",
 otaRatePlanCode: "DEFAULT",
 reservationId: "ABNB-8812-4412",
 guestName: "Sophie Martin",
 checkInDate: "2026-11-20",
 checkOutDate: "2026-11-25",
 detectedAt: "Today, 11:20 SLST",
 code: "booking_unmapped_room",
 resolutionStatus: "PENDING",
 },
];

export const DEFAULT_SYNC_LOGS: ReadonlyArray<SyncLogEntry> = [
 {
 id: "log-001",
 channelId: "BOOKING_COM",
 type: "INBOUND_WEBHOOK_REVISION",
 status: "SUCCESS",
 summary: "Pulled revision for res #BKG-2026-9812, tape chart updated, ack dispatched",
 timestamp: "13:45:12 SLST",
 latencyMs: 1420,
 },
 {
 id: "log-002",
 channelId: "BOOKING_COM",
 type: "INBOUND_WEBHOOK_REVISION",
 status: "WARNING",
 summary: "booking_unmapped_room alert raised: Room BKG-SUITE-PREM not mapped locally",
 timestamp: "13:45:11 SLST",
 latencyMs: 230,
 },
 {
 id: "log-003",
 channelId: "AGODA",
 type: "OUTBOUND_ARI_PUSH",
 status: "SUCCESS",
 summary: "Pushed 365-day availability delta for Deluxe Ocean View (2 rooms remaining)",
 timestamp: "13:30:00 SLST",
 latencyMs: 1680,
 },
 {
 id: "log-004",
 channelId: "AIRBNB",
 type: "ICAL_PULL",
 status: "SUCCESS",
 summary: "Imported 4 external iCal reservations from Airbnb feed",
 timestamp: "13:00:22 SLST",
 latencyMs: 820,
 },
 {
 id: "log-005",
 channelId: "EXPEDIA",
 type: "FULL_RESYNC",
 status: "SUCCESS",
 summary:
 "Full ARI Resync executed: 8 room types & 24 rate plans pushed to Expedia Partner Central",
 timestamp: "09:00:00 SLST",
 latencyMs: 2450,
 },
];

export const CHANNEL_TAB_OPTIONS: ReadonlyArray<SegmentedControlOption<ChannelViewTab>> = [
 { id: "MAPPINGS", label: "Room & Rate Mappings" },
 { id: "ALERTS", label: "Unmapped Room Alerts" },
 { id: "ICAL_FEEDS", label: "iCal Feeds (.ics)" },
 { id: "SYNC_LOGS", label: "Sync Audit Trail" },
];

// ============================================================================
// Helper Utilities & Color Resolvers
// ============================================================================

export function getChannelStatusBadgeColor(status: ChannelSyncStatus): StatusColor {
 switch (status) {
 case "CONNECTED":
 return "green";
 case "SYNCING":
 return "blue";
 case "WARNING":
 return "amber";
 case "ERROR":
 return "red";
 case "PAUSED":
 return "gray";
 }
}

export function formatChannelIdName(channelId: OtaChannelId): string {
 switch (channelId) {
 case "BOOKING_COM":
 return "Booking.com";
 case "AGODA":
 return "Agoda";
 case "EXPEDIA":
 return "Expedia";
 case "AIRBNB":
 return "Airbnb";
 }
}

// ============================================================================
// Sub-Components (Cognitive Complexity <= 12)
// ============================================================================

interface ChannelHeaderProps {
 readonly propertyTitle: string;
 readonly channexPropertyId: string;
 readonly isResyncing: boolean;
 readonly lastResyncTimerText: string;
 readonly onTriggerResync: () => void;
 readonly onTestConnectivity: () => void;
}

function ChannelHeader({
 propertyTitle,
 channexPropertyId,
 isResyncing,
 lastResyncTimerText,
 onTriggerResync,
 onTestConnectivity,
}: ChannelHeaderProps) {
 return (
 <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div>
 <div className="flex items-center gap-2.5">
 <h1 className="text-2xl font-bold tracking-tight text-apple-gray-900 ">
 Channel Manager &amp; 2-Way OTA Sync
 </h1>
 <span className="rounded-full bg-[#0B6E4F]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0B6E4F] ">
 Rung 2 Channex &amp; iCal
 </span>
 </div>
 <p className="mt-1 text-sm text-apple-gray-500 ">
 <span>{propertyTitle}</span>
 <span className="mx-2">•</span>
 <span className="font-mono text-xs text-apple-gray-600 ">
 Channex ID: {channexPropertyId}
 </span>
 <span className="mx-2">•</span>
 <span className="tabular-nums-lkr text-xs text-apple-gray-500">
 Last Full Resync: {lastResyncTimerText}
 </span>
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <button
 type="button"
 onClick={onTestConnectivity}
 className="apple-touch-target inline-flex items-center gap-1.5 rounded-xl border border-apple-gray-300 bg-white/70 px-4 py-2 text-sm font-medium text-apple-gray-700 shadow-sm transition-apple-spring hover:bg-apple-gray-100 active:scale-[0.98] "
 >
 <svg
 className="h-4 w-4 text-[#0B6E4F]"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 role="img"
 aria-label="Test Connectivity Icon"
 >
 <title>Test Connectivity</title>
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M13 10V3L4 14h7v7l9-11h-7z"
 />
 </svg>
 <span>Test Connectivity</span>
 </button>

 <button
 type="button"
 disabled={isResyncing}
 onClick={onTriggerResync}
 className="apple-touch-target inline-flex items-center gap-2 rounded-xl bg-[#0B6E4F] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-apple-spring hover:bg-[#0B6E4F]/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
 >
 {isResyncing ? (
 <>
 <svg
 className="h-4 w-4 animate-spin text-slate-900"
 fill="none"
 viewBox="0 0 24 24"
 role="img"
 aria-label="Resync Spinner"
 >
 <title>Loading</title>
 <circle
 className="opacity-25"
 cx="12"
 cy="12"
 r="10"
 stroke="currentColor"
 strokeWidth="4"
 />
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
 </svg>
 <span className="tabular-nums-lkr">Resyncing ARI...</span>
 </>
 ) : (
 <>
 <svg
 className="h-4 w-4"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 role="img"
 aria-label="Full Resync Icon"
 >
 <title>Sync</title>
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
 />
 </svg>
 <span>Full ARI Resync</span>
 </>
 )}
 </button>
 </div>
 </header>
 );
}

interface UnmappedAlertBannerProps {
 readonly alerts: ReadonlyArray<UnmappedAlert>;
 readonly onOpenAlertsTab: () => void;
}

function UnmappedAlertBanner({ alerts, onOpenAlertsTab }: UnmappedAlertBannerProps) {
 const pendingCount = alerts.filter((a) => a.resolutionStatus === "PENDING").length;
 if (pendingCount === 0) {
 return null;
 }

 return (
 <div className="squircle-lg border border-amber-300/60 bg-amber-50/80 p-4 backdrop-blur-md ">
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div className="flex items-start gap-3">
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 ">
 <svg
 className="h-6 w-6"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 role="img"
 aria-label="Alert Triangle"
 >
 <title>Warning</title>
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
 />
 </svg>
 </div>
 <div>
 <h3 className="font-semibold text-amber-900 ">
 Unmapped Room Alerts Detected (
 <code className="font-mono text-xs">booking_unmapped_room</code>)
 </h3>
 <p className="mt-0.5 text-xs text-amber-700 ">
 {pendingCount} inbound reservation(s) contain OTA room or rate codes not mapped to
 local inventory. Bookings are pending room assignment.
 </p>
 </div>
 </div>

 <button
 type="button"
 onClick={onOpenAlertsTab}
 className="apple-touch-target shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-apple-spring hover:bg-amber-700 active:scale-[0.98]"
 >
 Review &amp; Map Now ({pendingCount})
 </button>
 </div>
 </div>
 );
}

interface ChannelCardProps {
 readonly channel: ChannelConnection;
 readonly onTriggerSync: (channelId: OtaChannelId) => void;
}

function ChannelCard({ channel, onTriggerSync }: ChannelCardProps) {
 const badgeColor = getChannelStatusBadgeColor(channel.status);

 return (
 <GlassCard material="regular" radius="lg" className="p-5">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3">
 <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-apple-gray-100 font-bold text-apple-gray-800 shadow-inner ">
 {channel.code}
 </div>
 <div>
 <h3 className="font-semibold text-apple-gray-900 ">
 {channel.name}
 </h3>
 <div className="mt-0.5 flex items-center gap-1.5 text-xs text-apple-gray-500 ">
 <span className="font-mono">
 {channel.syncMode === "CHANNEX_API" ? "2-Way Channex API" : "RFC 5545 iCal"}
 </span>
 </div>
 </div>
 </div>

 <StatusBadge
 status={channel.status}
 color={badgeColor}
 showDot
 pulse={channel.status === "SYNCING"}
 size="sm"
 />
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3 border-t border-apple-gray-200/50 pt-3 ">
 <div>
 <span className="text-[11px] uppercase tracking-wider text-apple-gray-500 ">
 Latency
 </span>
 <p className="tabular-nums-lkr text-sm font-semibold text-apple-gray-900 ">
 {channel.ariLatencyMs} ms
 </p>
 </div>
 <div>
 <span className="text-[11px] uppercase tracking-wider text-apple-gray-500 ">
 Success Rate
 </span>
 <p className="tabular-nums-lkr text-sm font-semibold text-apple-green ">
 {channel.successRatePercent.toFixed(1)}%
 </p>
 </div>
 <div>
 <span className="text-[11px] uppercase tracking-wider text-apple-gray-500 ">
 Active Listings
 </span>
 <p className="tabular-nums-lkr text-sm font-semibold text-apple-gray-900 ">
 {channel.activeListingsCount} mapped
 </p>
 </div>
 <div>
 <span className="text-[11px] uppercase tracking-wider text-apple-gray-500 ">
 Last Sync
 </span>
 <p className="text-xs font-medium text-apple-gray-700 ">
 {channel.lastSyncTimestamp}
 </p>
 </div>
 </div>

 <div className="mt-4 flex items-center justify-between">
 {channel.unmappedAlertsCount > 0 ? (
 <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 ">
 {channel.unmappedAlertsCount} unmapped alert
 </span>
 ) : (
 <span className="text-xs text-apple-gray-400">Zero sync errors</span>
 )}

 <button
 type="button"
 onClick={() => onTriggerSync(channel.id)}
 className="apple-touch-target rounded-lg px-2.5 py-1 text-xs font-medium text-[#0B6E4F] transition-apple-spring hover:bg-[#0B6E4F]/10 active:scale-[0.98]"
 >
 Push ARI Delta
 </button>
 </div>
 </GlassCard>
 );
}

interface MappingTableRowProps {
 readonly item: RoomMealMapping;
 readonly onEditMapping: (mapping: RoomMealMapping) => void;
 readonly onToggleSync: (mappingId: string) => void;
}

function MappingTableRow({ item, onEditMapping, onToggleSync }: MappingTableRowProps) {
 return (
 <tr className="transition-colors hover:bg-white/40 ">
 <td className="px-4 py-3">
 <div className="font-semibold text-apple-gray-900 ">
 {item.localRoomTypeName}
 </div>
 <div className="font-mono text-xs text-apple-gray-500">{item.localRoomTypeCode}</div>
 </td>

 <td className="px-3 py-3">
 <span className="rounded-md bg-apple-gray-200/60 px-2 py-0.5 font-mono text-xs font-bold text-apple-gray-700 ">
 {item.mealPlan}
 </span>
 </td>

 <td className="px-3 py-3 font-mono text-xs">
 {item.channexRoomTypeId ? (
 <span className="text-apple-gray-700 ">
 {item.channexRoomTypeId}
 </span>
 ) : (
 <span className="font-sans font-medium text-amber-600 ">
 Not Mapped
 </span>
 )}
 </td>

 <td className="px-3 py-3 font-mono text-xs">
 {item.channexRatePlanId ? (
 <span className="text-apple-gray-700 ">
 {item.channexRatePlanId}
 </span>
 ) : (
 <span className="font-sans font-medium text-amber-600 ">
 Not Mapped
 </span>
 )}
 </td>

 <td className="px-3 py-3 text-xs">
 {item.icalImportUrl ? (
 <span className="inline-flex items-center gap-1 font-medium text-apple-green">
 <span>2-Way iCal</span>
 </span>
 ) : (
 <span className="text-apple-gray-500">Export only</span>
 )}
 </td>

 <td className="px-3 py-3">
 {item.hasUnmappedAlert ? (
 <StatusBadge status="UNMAPPED" label="Unmapped Alert" color="amber" size="sm" />
 ) : item.syncEnabled ? (
 <StatusBadge status="ACTIVE" label="Live Sync" color="green" size="sm" showDot />
 ) : (
 <StatusBadge status="PAUSED" label="Disabled" color="gray" size="sm" />
 )}
 </td>

 <td className="px-4 py-3 text-right">
 <div className="flex items-center justify-end gap-2">
 <button
 type="button"
 onClick={() => onToggleSync(item.id)}
 className="apple-touch-target text-xs font-medium text-apple-gray-600 hover:text-[#0B6E4F] "
 >
 {item.syncEnabled ? "Pause" : "Enable"}
 </button>
 <button
 type="button"
 onClick={() => onEditMapping(item)}
 className="apple-touch-target rounded-lg bg-[#0B6E4F]/10 px-3 py-1.5 text-xs font-semibold text-[#0B6E4F] transition-apple-spring hover:bg-[#0B6E4F]/20 active:scale-[0.98]"
 >
 Edit Mapping
 </button>
 </div>
 </td>
 </tr>
 );
}

interface MappingsTableProps {
 readonly mappings: ReadonlyArray<RoomMealMapping>;
 readonly onEditMapping: (mapping: RoomMealMapping) => void;
 readonly onToggleSync: (mappingId: string) => void;
}

function MappingsTable({ mappings, onEditMapping, onToggleSync }: MappingsTableProps) {
 return (
 <GlassCard material="regular" radius="lg" className="overflow-hidden">
 <div className="border-b border-apple-gray-200/60 p-4 ">
 <h2 className="text-base font-semibold text-apple-gray-900 ">
 Local Inventory to Channex Room &amp; Rate Plan Mappings
 </h2>
 <p className="mt-0.5 text-xs text-apple-gray-500 ">
 Maps local RoomType categories and MealPlan tariffs (RO, BB, HB, FB) to Channex IDs for
 Booking.com, Agoda, and Expedia, or exports RFC 5545 iCal streams for Airbnb.
 </p>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm">
 <thead className="bg-apple-gray-100/50 text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500 ">
 <tr>
 <th className="px-4 py-3">Local Room Category</th>
 <th className="px-3 py-3">Meal Plan</th>
 <th className="px-3 py-3">Channex Room Type ID</th>
 <th className="px-3 py-3">Channex Rate Plan ID</th>
 <th className="px-3 py-3">iCal Feed Status</th>
 <th className="px-3 py-3">Sync Status</th>
 <th className="px-4 py-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-apple-gray-200/50 ">
 {mappings.map((item) => (
 <MappingTableRow
 key={item.id}
 item={item}
 onEditMapping={onEditMapping}
 onToggleSync={onToggleSync}
 />
 ))}
 </tbody>
 </table>
 </div>
 </GlassCard>
 );
}

interface UnmappedAlertsListProps {
 readonly alerts: ReadonlyArray<UnmappedAlert>;
 readonly onQuickMap: (alert: UnmappedAlert) => void;
 readonly onDismissAlert: (alertId: string) => void;
}

function UnmappedAlertsList({ alerts, onQuickMap, onDismissAlert }: UnmappedAlertsListProps) {
 if (alerts.length === 0) {
 return (
 <GlassCard material="regular" radius="lg" className="p-8 text-center">
 <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0B6E4F]/10 text-apple-green">
 <svg
 className="h-6 w-6"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 role="img"
 aria-label="Green Checkmark"
 >
 <title>Success Checkmark</title>
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 </div>
 <h3 className="mt-3 text-base font-semibold text-apple-gray-900 ">
 All OTA Room &amp; Rate Plans Successfully Mapped
 </h3>
 <p className="mt-1 text-sm text-apple-gray-500 ">
 Zero unmapped room alerts (
 <code className="font-mono text-xs">booking_unmapped_room</code>
 ). Incoming reservations will be assigned seamlessly to room folios.
 </p>
 </GlassCard>
 );
 }

 return (
 <div className="space-y-4">
 {alerts.map((alert) => (
 <GlassCard
 key={alert.id}
 material="regular"
 radius="lg"
 className="border-l-4 border-l-amber-500 p-5"
 >
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <div className="flex items-center gap-2">
 <span className="rounded bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-600 ">
 {alert.code}
 </span>
 <span className="text-xs text-apple-gray-500">•</span>
 <span className="text-xs font-semibold text-apple-gray-700 ">
 {alert.channelName}
 </span>
 <span className="text-xs text-apple-gray-500">•</span>
 <span className="text-xs text-apple-gray-500">{alert.detectedAt}</span>
 </div>

 <h4 className="mt-2 text-base font-bold text-apple-gray-900 ">
 Reservation #{alert.reservationId} — {alert.guestName}
 </h4>

 <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-apple-gray-600 ">
 <div>
 <span className="text-apple-gray-400">Stay Dates:</span>{" "}
 <span className="font-mono font-medium">
 {alert.checkInDate} → {alert.checkOutDate}
 </span>
 </div>
 <div>
 <span className="text-apple-gray-400">OTA Room Code:</span>{" "}
 <code className="font-mono font-semibold text-amber-700 ">
 {alert.otaRoomTypeCode}
 </code>
 </div>
 <div>
 <span className="text-apple-gray-400">OTA Rate Code:</span>{" "}
 <code className="font-mono font-semibold text-amber-700 ">
 {alert.otaRatePlanCode}
 </code>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => onDismissAlert(alert.id)}
 className="apple-touch-target rounded-xl border border-apple-gray-300 px-3 py-2 text-xs font-medium text-apple-gray-600 hover:bg-apple-gray-100 "
 >
 Dismiss
 </button>
 <button
 type="button"
 onClick={() => onQuickMap(alert)}
 className="apple-touch-target rounded-xl bg-[#0B6E4F] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-apple-spring hover:bg-[#0B6E4F]/90 active:scale-[0.98]"
 >
 Quick Map to Inventory
 </button>
 </div>
 </div>
 </GlassCard>
 ))}
 </div>
 );
}

interface IcalFeedsTabProps {
 readonly mappings: ReadonlyArray<RoomMealMapping>;
 readonly onCopyUrl: (url: string) => void;
 readonly onRefreshIcal: (mappingId: string) => void;
}

function IcalFeedsTab({ mappings, onCopyUrl, onRefreshIcal }: IcalFeedsTabProps) {
 return (
 <div className="space-y-4">
 <GlassCard material="regular" radius="lg" className="p-5">
 <h3 className="font-semibold text-apple-gray-900 ">
 Zero-Cost RFC 5545 iCal (.ics) Calendar Feeds
 </h3>
 <p className="mt-1 text-xs text-apple-gray-500 ">
 Enables small Sri Lankan boutique villas and homestays to synchronize calendar
 availability with Airbnb, VRBO, and Booking.com at $0.00/month without third-party channel
 manager subscription fees.
 </p>
 </GlassCard>

 <div className="grid grid-cols-1 gap-4">
 {mappings.map((item) => (
 <GlassCard key={item.id} material="regular" radius="lg" className="p-5">
 <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
 <div>
 <h4 className="font-bold text-apple-gray-900 ">
 {item.localRoomTypeName} ({item.mealPlan})
 </h4>
 <p className="text-xs text-apple-gray-500">
 <span>Export URL (Subscribe in Airbnb/VRBO):</span>
 </p>
 <div className="mt-1 flex items-center gap-2">
 <input
 type="text"
 readOnly
 value={item.icalExportUrl}
 className="w-full max-w-lg rounded-lg border border-apple-gray-300 bg-apple-gray-50 px-2.5 py-1 font-mono text-xs text-apple-gray-700 "
 />
 <button
 type="button"
 onClick={() => onCopyUrl(item.icalExportUrl)}
 className="apple-touch-target rounded-lg bg-[#0B6E4F]/10 px-3 py-1 text-xs font-semibold text-[#0B6E4F] hover:bg-[#0B6E4F]/20"
 >
 Copy
 </button>
 </div>

 <div className="mt-3">
 <span className="text-xs text-apple-gray-500">
 Import URL (External Airbnb/OTA Calendar):
 </span>
 <p className="mt-0.5 font-mono text-xs text-apple-gray-700 ">
 {item.icalImportUrl || "None configured (Export only)"}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => onRefreshIcal(item.id)}
 className="apple-touch-target rounded-xl border border-apple-gray-300 bg-white/70 px-4 py-2 text-xs font-semibold text-apple-gray-800 shadow-sm transition-apple-spring hover:bg-apple-gray-100 "
 >
 Pull External iCal Now
 </button>
 </div>
 </div>
 </GlassCard>
 ))}
 </div>
 </div>
 );
}

interface SyncLogsTabProps {
 readonly logs: ReadonlyArray<SyncLogEntry>;
}

function SyncLogsTab({ logs }: SyncLogsTabProps) {
 return (
 <GlassCard material="regular" radius="lg" className="overflow-hidden">
 <div className="border-b border-apple-gray-200/60 p-4 ">
 <h3 className="font-semibold text-apple-gray-900 ">
 Real-Time Sync Audit Trail &amp; Webhook Events
 </h3>
 <p className="mt-0.5 text-xs text-apple-gray-500 ">
 Chronological record of inbound webhook bookings, outbound ARI inventory pushes, and iCal
 feed syncs.
 </p>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm">
 <thead className="bg-apple-gray-100/50 text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500 ">
 <tr>
 <th className="px-4 py-3">Timestamp</th>
 <th className="px-3 py-3">Channel</th>
 <th className="px-3 py-3">Operation Type</th>
 <th className="px-3 py-3">Latency</th>
 <th className="px-3 py-3">Status</th>
 <th className="px-4 py-3">Event Summary</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-apple-gray-200/50 ">
 {logs.map((log) => (
 <tr
 key={log.id}
 className="text-xs hover:bg-white/40 "
 >
 <td className="px-4 py-3 font-mono text-apple-gray-600 ">
 {log.timestamp}
 </td>
 <td className="px-3 py-3 font-semibold text-apple-gray-900 ">
 {formatChannelIdName(log.channelId)}
 </td>
 <td className="px-3 py-3 font-mono text-apple-gray-700 ">
 {log.type}
 </td>
 <td className="tabular-nums-lkr px-3 py-3 text-apple-gray-600 ">
 {log.latencyMs} ms
 </td>
 <td className="px-3 py-3">
 <StatusBadge
 status={log.status}
 color={
 log.status === "SUCCESS"
 ? "green"
 : log.status === "WARNING"
 ? "amber"
 : "red"
 }
 size="sm"
 />
 </td>
 <td className="px-4 py-3 text-apple-gray-700 ">
 {log.summary}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </GlassCard>
 );
}

// ============================================================================
// Modals for Editing and Resolving Mappings
// ============================================================================

interface EditMappingModalProps {
 readonly isOpen: boolean;
 readonly mapping: RoomMealMapping | null;
 readonly onClose: () => void;
 readonly onSave: (updated: RoomMealMapping) => void;
}

function EditMappingModal({ isOpen, mapping, onClose, onSave }: EditMappingModalProps) {
 const channexRoomInputId = useId();
 const channexRateInputId = useId();
 const icalImportInputId = useId();

 const [channexRoomTypeId, setChannexRoomTypeId] = useState(
 () => mapping?.channexRoomTypeId || "",
 );
 const [channexRatePlanId, setChannexRatePlanId] = useState(
 () => mapping?.channexRatePlanId || "",
 );
 const [icalImportUrl, setIcalImportUrl] = useState(() => mapping?.icalImportUrl || "");

 if (!isOpen || !mapping) {
 return null;
 }

 const handleSave = () => {
 onSave({
 ...mapping,
 channexRoomTypeId: channexRoomTypeId.trim(),
 channexRatePlanId: channexRatePlanId.trim(),
 icalImportUrl: icalImportUrl.trim() || undefined,
 hasUnmappedAlert: false,
 unmappedReason: undefined,
 });
 onClose();
 };

 return (
 <DialogModal
 isOpen={isOpen}
 onClose={onClose}
 title={`Edit Mapping: ${mapping.localRoomTypeName}`}
 description={`Map local inventory tariff (${mapping.mealPlan}) to Channex and external iCal feeds.`}
 size="md"
 >
 <div className="space-y-4 pt-2">
 <div>
 <label
 htmlFor={channexRoomInputId}
 className="block text-xs font-semibold text-apple-gray-700 "
 >
 Channex Room Type ID
 </label>
 <input
 id={channexRoomInputId}
 type="text"
 value={channexRoomTypeId}
 onChange={(e) => setChannexRoomTypeId(e.target.value)}
 placeholder="e.g. cnx_rt_dlx_ocean_01"
 className="mt-1 w-full rounded-xl border border-apple-gray-300 bg-white px-3 py-2 font-mono text-sm "
 />
 </div>

 <div>
 <label
 htmlFor={channexRateInputId}
 className="block text-xs font-semibold text-apple-gray-700 "
 >
 Channex Rate Plan ID
 </label>
 <input
 id={channexRateInputId}
 type="text"
 value={channexRatePlanId}
 onChange={(e) => setChannexRatePlanId(e.target.value)}
 placeholder="e.g. cnx_rp_dlx_bb_standard"
 className="mt-1 w-full rounded-xl border border-apple-gray-300 bg-white px-3 py-2 font-mono text-sm "
 />
 </div>

 <div>
 <label
 htmlFor={icalImportInputId}
 className="block text-xs font-semibold text-apple-gray-700 "
 >
 External iCal Import URL (Airbnb/VRBO)
 </label>
 <input
 id={icalImportInputId}
 type="url"
 value={icalImportUrl}
 onChange={(e) => setIcalImportUrl(e.target.value)}
 placeholder="https://www.airbnb.com/calendar/ical/...ics"
 className="mt-1 w-full rounded-xl border border-apple-gray-300 bg-white px-3 py-2 font-mono text-sm "
 />
 </div>

 <div className="flex justify-end gap-2 pt-4">
 <button
 type="button"
 onClick={onClose}
 className="apple-touch-target rounded-xl border border-apple-gray-300 px-4 py-2 text-sm font-medium hover:bg-apple-gray-100 "
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleSave}
 className="apple-touch-target rounded-xl bg-[#0B6E4F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0B6E4F]/90"
 >
 Save Mapping
 </button>
 </div>
 </div>
 </DialogModal>
 );
}

// ============================================================================
// Master Screen Component
// ============================================================================

export function ChannelManagerView({
 propertyTitle = "Galle Fort Lighthouse Villa",
 channexPropertyId = "cnx_prop_99214",
 initialConnections = DEFAULT_CHANNEL_CONNECTIONS,
 initialMappings = DEFAULT_ROOM_MAPPINGS,
 initialAlerts = DEFAULT_UNMAPPED_ALERTS,
 initialLogs = DEFAULT_SYNC_LOGS,
 onTriggerFullResync,
 onSaveMapping,
 onResolveAlert,
 onActionNotify,
 className = "",
}: ChannelManagerViewProps) {
 const [activeTab, setActiveTab] = useState<ChannelViewTab>("MAPPINGS");
 const [connections, setConnections] =
 useState<ReadonlyArray<ChannelConnection>>(initialConnections);
 const [mappings, setMappings] = useState<ReadonlyArray<RoomMealMapping>>(initialMappings);
 const [alerts, setAlerts] = useState<ReadonlyArray<UnmappedAlert>>(initialAlerts);
 const [logs, setLogs] = useState<ReadonlyArray<SyncLogEntry>>(initialLogs);
 const [isResyncing, setIsResyncing] = useState(false);
 const [lastResyncTimerText, setLastResyncTimerText] = useState("Today, 09:00 SLST");
 const [editingMapping, setEditingMapping] = useState<RoomMealMapping | null>(null);
 const [pendingAlertForMapping, setPendingAlertForMapping] = useState<UnmappedAlert | null>(null);

 // Handle Full ARI Resync action
 const handleFullAriResync = async () => {
 setIsResyncing(true);
 onActionNotify?.(
 "Full ARI Resync Initiated",
 "Broadcasting 365 days of Availability, Rates, and Inventory across all OTAs",
 "blue",
 );

 try {
 if (onTriggerFullResync) {
 await onTriggerFullResync();
 }
 setLastResyncTimerText("Just now");
 const newLog: SyncLogEntry = {
 id: `log-resync-${Date.now()}`,
 channelId: "BOOKING_COM",
 type: "FULL_RESYNC",
 status: "SUCCESS",
 summary: "Full ARI Resync completed across Booking.com, Agoda, Expedia and Airbnb iCal",
 timestamp: "Just now",
 latencyMs: 1850,
 };
 setLogs((prev) => [newLog, ...prev]);
 onActionNotify?.(
 "Full ARI Resync Successful",
 "All 4 channels updated in 1.85 seconds",
 "green",
 );
 } finally {
 setIsResyncing(false);
 }
 };

 // Handle test connectivity
 const handleTestConnectivity = () => {
 onActionNotify?.(
 "OTA API Connectivity Healthy",
 "Channex webhooks endpoint 200 OK • iCal export URLs reachable",
 "green",
 );
 };

 // Trigger manual delta push for a single channel
 const handleTriggerChannelSync = (channelId: OtaChannelId) => {
 setConnections((prev) =>
 prev.map((c) =>
 c.id === channelId
 ? { ...c, status: "SYNCING" as const, lastSyncTimestamp: "Syncing..." }
 : c,
 ),
 );

 setTimeout(() => {
 setConnections((prev) =>
 prev.map((c) =>
 c.id === channelId
 ? { ...c, status: "CONNECTED" as const, lastSyncTimestamp: "Just now" }
 : c,
 ),
 );
 onActionNotify?.(
 `${formatChannelIdName(channelId)} Synced`,
 "Availability delta confirmed and acknowledged",
 "green",
 );
 }, 400);
 };

 // Toggle sync active state
 const handleToggleSync = (mappingId: string) => {
 setMappings((prev) =>
 prev.map((m) => (m.id === mappingId ? { ...m, syncEnabled: !m.syncEnabled } : m)),
 );
 };

 // Save mapping edit
 const handleSaveMapping = async (updated: RoomMealMapping) => {
 setMappings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
 if (onSaveMapping) {
 await onSaveMapping(updated);
 }
 if (pendingAlertForMapping) {
 setAlerts((prev) => prev.filter((a) => a.id !== pendingAlertForMapping.id));
 if (onResolveAlert) {
 await onResolveAlert(pendingAlertForMapping.id, updated);
 }
 setPendingAlertForMapping(null);
 }
 onActionNotify?.(
 "Mapping Updated",
 `Saved ${updated.localRoomTypeName} mapping for Channex & iCal`,
 "green",
 );
 };

 // Quick map from an alert
 const handleQuickMapFromAlert = (alert: UnmappedAlert) => {
 setPendingAlertForMapping(alert);
 const unmappedItem = mappings.find((m) => m.hasUnmappedAlert) || mappings[0];
 if (unmappedItem) {
 setEditingMapping(unmappedItem);
 }
 };

 // Dismiss alert
 const handleDismissAlert = (alertId: string) => {
 setAlerts((prev) => prev.filter((a) => a.id !== alertId));
 onActionNotify?.("Alert Dismissed", "Unmapped room warning cleared", "gray");
 };

 // Copy iCal URL to clipboard
 const handleCopyIcalUrl = (url: string) => {
 if (typeof navigator !== "undefined" && navigator.clipboard) {
 navigator.clipboard.writeText(url);
 }
 onActionNotify?.("iCal URL Copied", "Link copied to clipboard for Airbnb/VRBO", "green");
 };

 // Trigger manual external iCal pull
 const handleRefreshIcal = (mappingId: string) => {
 const target = mappings.find((m) => m.id === mappingId);
 const label = target ? target.localRoomTypeName : mappingId;
 onActionNotify?.(
 "iCal Refresh Dispatched",
 `Importing external .ics calendar blocks for ${label}`,
 "blue",
 );
 };

 return (
 <div className={`space-y-6 ${className}`}>
 {/* 1. Header with Full Resync CTA */}
 <ChannelHeader
 propertyTitle={propertyTitle}
 channexPropertyId={channexPropertyId}
 isResyncing={isResyncing}
 lastResyncTimerText={lastResyncTimerText}
 onTriggerResync={handleFullAriResync}
 onTestConnectivity={handleTestConnectivity}
 />

 {/* 2. Unmapped Room Warning Banner */}
 <UnmappedAlertBanner alerts={alerts} onOpenAlertsTab={() => setActiveTab("ALERTS")} />

 {/* 3. 4-Channel Live Status Bento Grid */}
 <section>
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {connections.map((channel) => (
 <ChannelCard
 key={channel.id}
 channel={channel}
 onTriggerSync={handleTriggerChannelSync}
 />
 ))}
 </div>
 </section>

 {/* 4. Tab Navigation */}
 <div className="flex items-center justify-between">
 <SegmentedControl
 options={CHANNEL_TAB_OPTIONS}
 value={activeTab}
 onChange={setActiveTab}
 size="md"
 />
 </div>

 {/* 5. Tab Content Views */}
 <main>
 {activeTab === "MAPPINGS" && (
 <MappingsTable
 mappings={mappings}
 onEditMapping={setEditingMapping}
 onToggleSync={handleToggleSync}
 />
 )}

 {activeTab === "ALERTS" && (
 <UnmappedAlertsList
 alerts={alerts}
 onQuickMap={handleQuickMapFromAlert}
 onDismissAlert={handleDismissAlert}
 />
 )}

 {activeTab === "ICAL_FEEDS" && (
 <IcalFeedsTab
 mappings={mappings}
 onCopyUrl={handleCopyIcalUrl}
 onRefreshIcal={handleRefreshIcal}
 />
 )}

 {activeTab === "SYNC_LOGS" && <SyncLogsTab logs={logs} />}
 </main>

 {/* 6. Edit Mapping Modal */}
 <EditMappingModal
 isOpen={editingMapping !== null}
 mapping={editingMapping}
 onClose={() => {
 setEditingMapping(null);
 setPendingAlertForMapping(null);
 }}
 onSave={handleSaveMapping}
 />
 </div>
 );
}
