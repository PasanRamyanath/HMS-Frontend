import { useId, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";

// ============================================================================
// Types & Domain Models (TenantWebhookEndpoint / Item #05)
// ============================================================================

export type WebhookProvider = "CHANNEX" | "PAYHERE" | "SMSGO" | "WEBXPAY" | "NOTIFY_LK";

export type WebhookDeliveryStatus =
  | "DELIVERED_200"
  | "FAILED_500"
  | "SIGNATURE_MISMATCH_401"
  | "TIMEOUT"
  | "RETRY_QUEUED";

export type WebhookPayloadType =
  | "BOOKING_CREATED"
  | "BOOKING_MODIFIED"
  | "BOOKING_CANCELLED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_FAILED"
  | "SMS_DELIVERED"
  | "ARI_UPDATE";

export interface WebhookDeliveryLog {
  readonly id: string;
  readonly tenantId: string;
  readonly provider: WebhookProvider;
  readonly eventType: WebhookPayloadType;
  readonly externalEventId: string;
  readonly endpointUrl: string;
  readonly httpMethod: "POST" | "GET";
  readonly httpStatus: number;
  readonly status: WebhookDeliveryStatus;
  readonly requestHeaders: Readonly<Record<string, string>>;
  readonly requestPayload: string; // JSON string
  readonly responseBody: string;
  readonly executionDurationMs: number;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly createdAtIso: string;
  readonly lastAttemptIso: string;
}

export interface WebhookSummaryStats {
  readonly total: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly successRatePercent: number;
  readonly avgLatencyMs: number;
}

export interface WebhookLogDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly logs?: ReadonlyArray<WebhookDeliveryLog> | undefined;
  readonly onRetryDelivery?: ((logId: string) => Promise<void> | void) | undefined;
  readonly onClearLogs?: (() => void) | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Constants & Mock Sri Lankan Webhook Logs
// ============================================================================

export const DEFAULT_WEBHOOK_LOGS: ReadonlyArray<WebhookDeliveryLog> = [
  {
    id: "wh-log-channex-001",
    tenantId: "tenant-galle-fort",
    provider: "CHANNEX",
    eventType: "BOOKING_CREATED",
    externalEventId: "evt_chnx_994821",
    endpointUrl: "https://api.srilankahms.com/webhooks/channex/tenant-galle-fort",
    httpMethod: "POST",
    httpStatus: 200,
    status: "DELIVERED_200",
    requestHeaders: {
      "content-type": "application/json",
      "x-channex-signature":
        "sha256=d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
      "user-agent": "Channex-Webhook-Worker/2.4",
    },
    requestPayload: JSON.stringify(
      {
        event: "booking_created",
        booking: {
          ota: "Booking.com",
          channel_booking_id: "BKG-CM-88412",
          guest_name: "James Robertson",
          guest_country: "GB",
          check_in: "2026-12-30",
          check_out: "2027-01-02",
          nights: 3,
          currency: "USD",
          total_gross_usd: 850.0,
          room_type_id: "rt-ocean-suite",
        },
      },
      null,
      2,
    ),
    responseBody: JSON.stringify({
      status: "acknowledged",
      reservationId: "res-sl-2026-9041",
      syncTimestamp: "2026-10-19T08:14:02Z",
    }),
    executionDurationMs: 42,
    retryCount: 0,
    maxRetries: 3,
    createdAtIso: "2026-10-19T08:14:01Z",
    lastAttemptIso: "2026-10-19T08:14:02Z",
  },
  {
    id: "wh-log-payhere-002",
    tenantId: "tenant-galle-fort",
    provider: "PAYHERE",
    eventType: "PAYMENT_CONFIRMED",
    externalEventId: "payhere_nt_33091",
    endpointUrl: "https://api.srilankahms.com/webhooks/payhere/tenant-galle-fort",
    httpMethod: "POST",
    httpStatus: 200,
    status: "DELIVERED_200",
    requestHeaders: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "PayHere-IPN-Service/1.0",
    },
    requestPayload: JSON.stringify(
      {
        merchant_id: "1219800",
        order_id: "SL-BKG-2026-89412",
        payment_id: "320091847112",
        payhere_amount: "45000.00",
        payhere_currency: "LKR",
        status_code: "2",
        md5sig: "E99A18C428CB38D5F260853678922E03",
        method: "VISA",
      },
      null,
      2,
    ),
    responseBody: JSON.stringify({
      status: "payment_recorded",
      folioId: "folio-sl-89412",
      balanceRemainingLkr: 105000.0,
    }),
    executionDurationMs: 65,
    retryCount: 0,
    maxRetries: 3,
    createdAtIso: "2026-10-19T08:05:00Z",
    lastAttemptIso: "2026-10-19T08:05:01Z",
  },
  {
    id: "wh-log-smsgo-003",
    tenantId: "tenant-galle-fort",
    provider: "SMSGO",
    eventType: "SMS_DELIVERED",
    externalEventId: "sms_dlr_551029",
    endpointUrl: "https://api.srilankahms.com/webhooks/smsgo/tenant-galle-fort",
    httpMethod: "POST",
    httpStatus: 200,
    status: "DELIVERED_200",
    requestHeaders: {
      "content-type": "application/json",
      "x-notify-signature": "c9284fae101192eab992",
    },
    requestPayload: JSON.stringify(
      {
        message_id: "msg_sl_77189",
        recipient: "94771234567",
        sender_mask: "GALLEFORT",
        status: "DELIVRD",
        delivered_at: "2026-10-19 13:42:10",
        cost_lkr: 0.54,
      },
      null,
      2,
    ),
    responseBody: JSON.stringify({ acknowledged: true }),
    executionDurationMs: 28,
    retryCount: 0,
    maxRetries: 3,
    createdAtIso: "2026-10-19T07:42:11Z",
    lastAttemptIso: "2026-10-19T07:42:11Z",
  },
  {
    id: "wh-log-channex-004",
    tenantId: "tenant-galle-fort",
    provider: "CHANNEX",
    eventType: "ARI_UPDATE",
    externalEventId: "evt_chnx_err_004",
    endpointUrl: "https://api.srilankahms.com/webhooks/channex/tenant-galle-fort",
    httpMethod: "POST",
    httpStatus: 500,
    status: "FAILED_500",
    requestHeaders: {
      "content-type": "application/json",
      "x-channex-signature": "sha256=invalid_hash_signature",
    },
    requestPayload: JSON.stringify(
      {
        event: "ari_push",
        property_id: "prop_sl_001",
        rates: [{ date: "2026-12-31", rate_lkr: 45000 }],
      },
      null,
      2,
    ),
    responseBody: JSON.stringify({
      error: "InternalServerError",
      message: "Database transaction lock conflict while updating rate calendar.",
    }),
    executionDurationMs: 1205,
    retryCount: 2,
    maxRetries: 3,
    createdAtIso: "2026-10-19T06:30:00Z",
    lastAttemptIso: "2026-10-19T06:35:00Z",
  },
  {
    id: "wh-log-webxpay-005",
    tenantId: "tenant-galle-fort",
    provider: "WEBXPAY",
    eventType: "PAYMENT_FAILED",
    externalEventId: "wxp_fail_88912",
    endpointUrl: "https://api.srilankahms.com/webhooks/webxpay/tenant-galle-fort",
    httpMethod: "POST",
    httpStatus: 401,
    status: "SIGNATURE_MISMATCH_401",
    requestHeaders: {
      "content-type": "application/json",
      "x-webxpay-token": "expired_or_corrupt",
    },
    requestPayload: JSON.stringify(
      {
        transaction_id: "WXP-994182",
        status: "FAILED",
        reason: "Card Issuer Declined: Insufficient Funds",
      },
      null,
      2,
    ),
    responseBody: JSON.stringify({
      error: "Unauthorized",
      message: "Invalid WebXPay RSA payload signature. Request rejected.",
    }),
    executionDurationMs: 15,
    retryCount: 3,
    maxRetries: 3,
    createdAtIso: "2026-10-19T05:15:00Z",
    lastAttemptIso: "2026-10-19T05:15:01Z",
  },
];

export const PROVIDER_OPTIONS: ReadonlyArray<SegmentedControlOption<string>> = [
  { id: "ALL", label: "All Providers" },
  { id: "CHANNEX", label: "Channex" },
  { id: "PAYHERE", label: "PayHere" },
  { id: "SMSGO", label: "SMSGo" },
  { id: "WEBXPAY", label: "WebXPay" },
];

export const STATUS_FILTER_OPTIONS: ReadonlyArray<SegmentedControlOption<string>> = [
  { id: "ALL", label: "All Statuses" },
  { id: "SUCCESS", label: "Success (2xx)" },
  { id: "FAILURE", label: "Failed (5xx / 4xx)" },
];

// ============================================================================
// Pure Calculation Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function computeDeliveryStats(logs: ReadonlyArray<WebhookDeliveryLog>): WebhookSummaryStats {
  if (logs.length === 0) {
    return {
      total: 0,
      successCount: 0,
      failureCount: 0,
      successRatePercent: 100,
      avgLatencyMs: 0,
    };
  }

  let successCount = 0;
  let totalLatency = 0;

  for (const log of logs) {
    totalLatency += log.executionDurationMs;
    if (log.httpStatus >= 200 && log.httpStatus < 300) {
      successCount += 1;
    }
  }

  const failureCount = logs.length - successCount;
  const successRatePercent = Math.round((successCount / logs.length) * 100);
  const avgLatencyMs = Math.round(totalLatency / logs.length);

  return {
    total: logs.length,
    successCount,
    failureCount,
    successRatePercent,
    avgLatencyMs,
  };
}

export function formatHttpStatusBadge(httpStatus: number): {
  readonly color: StatusColor;
  readonly label: string;
} {
  if (httpStatus >= 200 && httpStatus < 300) {
    return { color: "green", label: `${httpStatus} OK` };
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return { color: "amber", label: `${httpStatus} Auth Fail` };
  }
  if (httpStatus >= 500) {
    return { color: "red", label: `${httpStatus} Server Err` };
  }
  return { color: "gray", label: `${httpStatus}` };
}

export function generateCurlCommand(log: WebhookDeliveryLog): string {
  const headerArgs = Object.entries(log.requestHeaders)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(" ");

  const cleanBody = log.requestPayload.replace(/"/g, '\\"').replace(/\n/g, "");
  return `curl -X ${log.httpMethod} "${log.endpointUrl}" ${headerArgs} -d "${cleanBody}"`;
}

export function validateRetryEligibility(log: WebhookDeliveryLog): {
  readonly canRetry: boolean;
  readonly reason?: string | undefined;
} {
  if (log.status === "DELIVERED_200") {
    return { canRetry: false, reason: "Webhook already acknowledged with 200 OK." };
  }
  if (log.retryCount >= log.maxRetries) {
    return {
      canRetry: true,
      reason: `Max retries reached (${log.maxRetries}). Force manual retry?`,
    };
  }
  return { canRetry: true };
}

function matchesProvider(log: WebhookDeliveryLog, filter: string): boolean {
  return filter === "ALL" || log.provider === filter;
}

function matchesStatus(log: WebhookDeliveryLog, filter: string): boolean {
  if (filter === "ALL") return true;
  if (filter === "SUCCESS") return log.httpStatus >= 200 && log.httpStatus < 300;
  if (filter === "FAILURE") return log.httpStatus >= 400 || log.status === "TIMEOUT";
  return true;
}

function matchesSearch(log: WebhookDeliveryLog, term: string): boolean {
  if (!term) return true;
  const q = term.toLowerCase();
  return (
    log.id.toLowerCase().includes(q) ||
    log.externalEventId.toLowerCase().includes(q) ||
    log.eventType.toLowerCase().includes(q) ||
    log.endpointUrl.toLowerCase().includes(q) ||
    log.requestPayload.toLowerCase().includes(q)
  );
}

export function filterWebhookLogs(
  logs: ReadonlyArray<WebhookDeliveryLog>,
  providerFilter: string,
  statusFilter: string,
  searchTerm: string,
): ReadonlyArray<WebhookDeliveryLog> {
  return logs.filter(
    (l) =>
      matchesProvider(l, providerFilter) &&
      matchesStatus(l, statusFilter) &&
      matchesSearch(l, searchTerm),
  );
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

function StatsBanner({ stats }: { readonly stats: WebhookSummaryStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 ">
        <span className="block text-[11px] text-slate-500 font-medium">Total Received</span>
        <span className="text-base font-bold tabular-nums-lkr text-slate-900 ">{stats.total}</span>
      </div>

      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
        <span className="block text-[11px] text-emerald-700 font-medium">Success Rate</span>
        <span className="text-base font-bold tabular-nums-lkr text-emerald-800 ">
          {stats.successRatePercent}%
        </span>
      </div>

      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
        <span className="block text-[11px] text-rose-700 font-medium">Failures / Timeouts</span>
        <span className="text-base font-bold tabular-nums-lkr text-rose-800 ">
          {stats.failureCount}
        </span>
      </div>

      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 ">
        <span className="block text-[11px] text-slate-500 font-medium">Avg Latency</span>
        <span className="text-base font-bold tabular-nums-lkr text-slate-900 ">
          {stats.avgLatencyMs} ms
        </span>
      </div>
    </div>
  );
}

function LogItemRow({
  log,
  isSelected,
  onSelect,
}: {
  readonly log: WebhookDeliveryLog;
  readonly isSelected: boolean;
  readonly onSelect: (log: WebhookDeliveryLog) => void;
}) {
  const badge = formatHttpStatusBadge(log.httpStatus);

  const selectedClass = isSelected
    ? "bg-blue-50/80 border-blue-500 ring-1 ring-blue-500"
    : "bg-white/60 border-slate-200/60 hover:bg-slate-50 ";

  return (
    <button
      type="button"
      onClick={() => onSelect(log)}
      className={`w-full p-3.5 rounded-2xl border text-left transition-all ${selectedClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 ">
            {log.provider}
          </span>
          <StatusBadge status={badge.label} label={badge.label} color={badge.color} size="sm" />
        </div>
        <span className="text-[11px] text-slate-400 font-mono tabular-nums-lkr">
          {log.executionDurationMs}ms
        </span>
      </div>

      <div className="font-bold text-xs text-slate-900 mt-1.5 truncate">{log.eventType}</div>

      <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-slate-500 font-mono">
        <span className="truncate">{log.externalEventId}</span>
        <span className="tabular-nums-lkr shrink-0">{log.createdAtIso.slice(11, 19)}</span>
      </div>
    </button>
  );
}

function PayloadInspector({
  log,
  onRetry,
}: {
  readonly log: WebhookDeliveryLog;
  readonly onRetry?: ((logId: string) => void) | undefined;
}) {
  const [copied, setCopied] = useState<boolean>(false);
  const eligibility = validateRetryEligibility(log);

  const handleCopyCurl = () => {
    const cmd = generateCurlCommand(log);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 ">
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Event Inspector
          </span>
          <h4 className="text-sm font-bold text-slate-900 ">
            {log.eventType} • {log.externalEventId}
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCurl}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors min-h-[36px]"
          >
            {copied ? "Copied cURL!" : "Copy cURL"}
          </button>

          {eligibility.canRetry && (
            <button
              type="button"
              onClick={() => onRetry?.(log.id)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all min-h-[36px]"
            >
              Retry Webhook
            </button>
          )}
        </div>
      </div>

      {/* Meta tags */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <div>
          <span className="block text-[10px] text-slate-400">Endpoint URL</span>
          <span className="font-mono text-[11px] text-slate-700 break-all">{log.endpointUrl}</span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-400">Retries</span>
          <span className="font-semibold tabular-nums-lkr text-slate-700 ">
            {log.retryCount} / {log.maxRetries}
          </span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-400">Timestamp</span>
          <span className="font-mono text-[11px] text-slate-700 tabular-nums-lkr">
            {log.createdAtIso}
          </span>
        </div>
      </div>

      {/* Request Headers */}
      <div>
        <span className="block text-xs font-semibold text-slate-700 mb-1">
          HTTP Request Headers
        </span>
        <pre className="p-3 rounded-xl bg-white text-slate-800 font-mono text-[11px] overflow-x-auto max-h-36">
          {JSON.stringify(log.requestHeaders, null, 2)}
        </pre>
      </div>

      {/* Request Payload */}
      <div>
        <span className="block text-xs font-semibold text-slate-700 mb-1">Payload (JSON)</span>
        <pre className="p-3 rounded-xl bg-white text-[#0B6E4F] font-mono text-[11px] overflow-x-auto max-h-52">
          {log.requestPayload}
        </pre>
      </div>

      {/* Response Body */}
      <div>
        <span className="block text-xs font-semibold text-slate-700 mb-1">
          Receiver Response Body
        </span>
        <pre className="p-3 rounded-xl bg-white text-sky-800 font-mono text-[11px] overflow-x-auto max-h-40">
          {log.responseBody}
        </pre>
      </div>
    </div>
  );
}

// ============================================================================
// Main WebhookLogDrawer Component (Cognitive Complexity <= 12)
// ============================================================================

export function WebhookLogDrawer({
  isOpen,
  onClose,
  logs = DEFAULT_WEBHOOK_LOGS,
  onRetryDelivery,
  onClearLogs,
  className = "",
}: WebhookLogDrawerProps) {
  const searchId = useId();
  const [providerFilter, setProviderFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(logs[0]?.id ?? null);

  const stats = computeDeliveryStats(logs);
  const filtered = filterWebhookLogs(logs, providerFilter, statusFilter, search);

  const activeLog = logs.find((l) => l.id === selectedLogId) ?? filtered[0] ?? null;

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title="Webhook Delivery Log &amp; Retry Inspector"
      description="Inspect real-time inbound payloads and status codes from Channex, PayHere, WebXPay, and SMSGo."
      size="xl"
      className={className}
    >
      <div className="space-y-4 pt-2">
        {/* Summary Stats */}
        <StatsBanner stats={stats} />

        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              options={PROVIDER_OPTIONS}
              value={providerFilter}
              onChange={(p) => setProviderFilter(p)}
              size="sm"
            />
            <SegmentedControl
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(s) => setStatusFilter(s)}
              size="sm"
            />
          </div>

          <div className="relative min-w-[200px]">
            <input
              id={searchId}
              type="text"
              placeholder="Search event ID or payload..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white/70 text-xs focus:ring-2 focus:ring-blue-500 transition-all min-h-[36px]"
            />
          </div>
        </div>

        {/* Two-Column Split Pane */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-1">
          {/* Left Column: Delivery Event List */}
          <div className="lg:col-span-5 space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 ">
                <p className="text-xs text-slate-400">No webhook delivery logs match criteria.</p>
              </div>
            ) : (
              filtered.map((log) => (
                <LogItemRow
                  key={log.id}
                  log={log}
                  isSelected={activeLog?.id === log.id}
                  onSelect={(l) => setSelectedLogId(l.id)}
                />
              ))
            )}
          </div>

          {/* Right Column: Payload & Headers Inspector */}
          <div className="lg:col-span-7">
            {activeLog ? (
              <PayloadInspector log={activeLog} onRetry={(id) => onRetryDelivery?.(id)} />
            ) : (
              <div className="p-12 text-center rounded-2xl bg-slate-50 border border-slate-200 ">
                <p className="text-xs text-slate-400">
                  Select an event from the left list to inspect details.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 text-xs">
          <div>
            {onClearLogs && (
              <button
                type="button"
                onClick={onClearLogs}
                className="text-slate-400 hover:text-rose-600 transition-colors"
              >
                Clear History
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors min-h-[40px]"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </DialogModal>
  );
}
