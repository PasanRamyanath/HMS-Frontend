import type React from "react";

type AdminKpiBadgeVariant = "success" | "danger" | "warning" | "info" | "neutral";

interface AdminKpiBadge {
  readonly text: string;
  readonly variant?: AdminKpiBadgeVariant | undefined;
}

type AdminKpiSize = "sm" | "md" | "lg";

interface AdminKpiCardProps {
  readonly title: string;
  readonly value: React.ReactNode;
  readonly subtitle?: React.ReactNode | undefined;
  readonly badge?: AdminKpiBadge | undefined;
  readonly icon?: React.ReactNode | undefined;
  readonly size?: AdminKpiSize | undefined;
  readonly onClick?: (() => void) | undefined;
  readonly className?: string | undefined;
  readonly testId?: string | undefined;
}

function getKpiBadgeStyles(variant: AdminKpiBadgeVariant = "neutral") {
  switch (variant) {
    case "success":
      return "bg-[#ECFDF5] text-[#0B6E4F] border-[#A7F3D0]";
    case "danger":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "warning":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "info":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "neutral":
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function AdminKpiCard({
  title,
  value,
  subtitle,
  badge,
  icon,
  size = "md",
  onClick,
  className = "",
  testId,
}: AdminKpiCardProps): React.JSX.Element {
  const valueSizeClass =
    size === "sm"
      ? "text-xl sm:text-2xl font-bold"
      : size === "lg"
        ? "text-3xl sm:text-4xl font-extrabold"
        : "text-2xl sm:text-3xl font-extrabold";

  const paddingClass = size === "sm" ? "p-3.5 sm:p-4" : size === "lg" ? "p-5 sm:p-6" : "p-4 sm:p-5";

  const cardContent = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
          <span className="text-xs font-medium text-slate-500 truncate">{title}</span>
        </div>
        {badge && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${getKpiBadgeStyles(
              badge.variant,
            )}`}
          >
            {badge.text}
          </span>
        )}
      </div>

      <div
        className={`${valueSizeClass} tracking-tight text-slate-900 tabular-nums-lkr mt-1.5 block truncate`}
      >
        {value}
      </div>

      {subtitle && <div className="text-xs text-slate-400 mt-1 truncate">{subtitle}</div>}
    </>
  );

  const baseClasses = `${paddingClass} rounded-2xl bg-white border border-slate-200/90 shadow-xs apple-liquid-glass flex flex-col justify-between transition-all`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-testid={testId}
        className={`${baseClasses} text-left cursor-pointer hover:border-slate-300 hover:shadow-sm active:scale-[0.99] ${className}`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <div data-testid={testId} className={`${baseClasses} ${className}`}>
      {cardContent}
    </div>
  );
}
