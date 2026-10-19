import type React from "react";

export type StatusColor = "green" | "amber" | "red" | "blue" | "indigo" | "gray";
export type StatusBadgeSize = "sm" | "md" | "lg";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  label?: string | undefined;
  color?: StatusColor | undefined;
  size?: StatusBadgeSize | undefined;
  showDot?: boolean | undefined;
  pulse?: boolean | undefined;
  className?: string | undefined;
}

export function getOrderStatusColor(status: string): StatusColor {
  const normalized = status.toUpperCase().trim();
  switch (normalized) {
    case "PAID":
    case "DELIVERED":
    case "SERVED":
      return "green";
    case "READY_FOR_PICKUP":
    case "READY":
      return "blue";
    case "IN_TRANSIT":
    case "CONFIRMED":
      return "indigo";
    case "SUBMITTED":
    case "PENDING":
    case "ACKNOWLEDGED":
    case "IN_PREPARATION":
      return "amber";
    case "CANCELLED":
      return "red";
    default:
      return "gray";
  }
}

export function getHousekeepingStatusColor(status: string): StatusColor {
  const normalized = status.toUpperCase().trim();
  switch (normalized) {
    case "CLEAN":
      return "green";
    case "INSPECTED":
      return "blue";
    case "IN_PROGRESS":
    case "TOUCH_UP":
      return "amber";
    case "DIRTY":
    case "OUT_OF_ORDER":
    case "OUT_OF_SERVICE":
      return "red";
    default:
      return "gray";
  }
}

export function getFolioStatusColor(status: string): StatusColor {
  const normalized = status.toUpperCase().trim();
  switch (normalized) {
    case "SETTLED":
      return "green";
    case "OPEN":
      return "amber";
    case "TRANSFERRED":
      return "indigo";
    case "VOIDED":
    case "VOID":
      return "red";
    default:
      return "gray";
  }
}

export function getSaasPlanTierColor(tier: string): StatusColor {
  const normalized = tier.toUpperCase().trim();
  switch (normalized) {
    case "ENTERPRISE_CHAIN":
    case "ENTERPRISE":
      return "green";
    case "PRO_RESORT":
    case "PROFESSIONAL":
      return "blue";
    case "STARTER_VILLA":
    case "STANDARD":
      return "amber";
    default:
      return "gray";
  }
}

export function resolveStatusColor(status: string): StatusColor {
  const normalized = status.toUpperCase().trim();
  if (
    [
      "CLEAN",
      "DIRTY",
      "INSPECTED",
      "DO_NOT_DISTURB",
      "OUT_OF_ORDER",
      "OUT_OF_SERVICE",
      "TOUCH_UP",
      "IN_PROGRESS",
    ].includes(normalized)
  ) {
    return getHousekeepingStatusColor(normalized);
  }
  if (["OPEN", "SETTLED", "TRANSFERRED", "VOIDED", "VOID", "CLOSED"].includes(normalized)) {
    return getFolioStatusColor(normalized);
  }
  if (
    [
      "STARTER_VILLA",
      "PRO_RESORT",
      "ENTERPRISE_CHAIN",
      "FREE_FOREVER",
      "STANDARD",
      "PROFESSIONAL",
      "ENTERPRISE",
    ].includes(normalized)
  ) {
    return getSaasPlanTierColor(normalized);
  }
  return getOrderStatusColor(normalized);
}

export function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getStatusColorClasses(color: StatusColor): string {
  switch (color) {
    case "green":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30";
    case "blue":
      return "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30";
    case "amber":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";
    case "red":
      return "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30";
    case "indigo":
      return "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/30";
    default:
      return "bg-slate-500/15 text-slate-800 dark:text-slate-300 border-slate-500/30";
  }
}

export function getStatusSizeClasses(size: StatusBadgeSize = "md"): string {
  switch (size) {
    case "sm":
      return "text-[11px] py-0.5 px-2";
    case "lg":
      return "text-sm py-1.5 px-3.5";
    default:
      return "text-xs py-1 px-2.5";
  }
}

export function getStatusBadgeClasses(
  color: StatusColor,
  size: StatusBadgeSize = "md",
  className = "",
): string {
  const baseClasses =
    "inline-flex items-center gap-1.5 font-semibold tracking-wide rounded-full border backdrop-blur-md select-none transition-apple-spring";
  const colorClasses = getStatusColorClasses(color);
  const sizeClasses = getStatusSizeClasses(size);

  return [baseClasses, colorClasses, sizeClasses, className].filter(Boolean).join(" ");
}

export function StatusBadge({
  status,
  label,
  color,
  size = "md",
  showDot = true,
  pulse = false,
  className = "",
  ...restProps
}: StatusBadgeProps) {
  const resolvedColor = color ?? resolveStatusColor(status);
  const displayLabel = label ?? formatStatusLabel(status);
  const badgeClasses = getStatusBadgeClasses(resolvedColor, size, className);

  return (
    <span className={badgeClasses} {...restProps}>
      {showDot ? (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 bg-current opacity-85 ${
            pulse ? "animate-pulse" : ""
          }`}
          aria-hidden="true"
        />
      ) : null}
      <span>{displayLabel}</span>
    </span>
  );
}
