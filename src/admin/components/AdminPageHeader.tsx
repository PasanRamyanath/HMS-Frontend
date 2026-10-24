import type React from "react";

interface AdminPageHeaderStatusBadge {
  readonly label: string;
  readonly variant?: "success" | "info" | "warning" | "danger" | "neutral" | undefined;
  readonly pulse?: boolean | undefined;
}

interface AdminPageHeaderProps {
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly propertyTitle?: string | undefined;
  readonly statusBadge?: AdminPageHeaderStatusBadge | undefined;
  readonly actions?: React.ReactNode | undefined;
  readonly className?: string | undefined;
}

function getBadgeVariantStyles(
  variant: "success" | "info" | "warning" | "danger" | "neutral" = "success",
) {
  switch (variant) {
    case "success":
      return "bg-[#ECFDF5] text-[#0B6E4F] border-[#A7F3D0]";
    case "info":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "warning":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "danger":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "neutral":
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function AdminPageHeader({
  title,
  subtitle,
  propertyTitle,
  statusBadge,
  actions,
  className = "",
}: AdminPageHeaderProps): React.JSX.Element {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h1>

          {propertyTitle && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#0B6E4F] border border-[#A7F3D0]">
              {propertyTitle}
            </span>
          )}

          {statusBadge && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getBadgeVariantStyles(
                statusBadge.variant,
              )}`}
            >
              {statusBadge.pulse && (
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              )}
              <span>{statusBadge.label}</span>
            </span>
          )}
        </div>

        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
