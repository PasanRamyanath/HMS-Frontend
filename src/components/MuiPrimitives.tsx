/**
 * MUI v6 / Material Design 3 Enterprise Layout Primitives (`src/components/MuiPrimitives.tsx`).
 * Reusable, accessible enterprise SaaS cards, KPI strips, underline tabs, and status chips.
 */

import type { FC, ReactNode } from "react";

export interface MuiSurfaceCardProps {
  readonly children: ReactNode;
  readonly className?: string | undefined;
  readonly padding?: "none" | "sm" | "md" | "lg" | undefined;
}

export const MuiSurfaceCard: FC<MuiSurfaceCardProps> = ({
  children,
  className = "",
  padding = "md",
}) => {
  const padClass =
    padding === "none"
      ? ""
      : padding === "sm"
        ? "p-4"
        : padding === "lg"
          ? "p-6 sm:p-8"
          : "p-5 sm:p-6";
  return (
    <div
      className={`rounded-xl bg-white border border-[#E2E8F0] shadow-xs ${padClass} ${className}`}
    >
      {children}
    </div>
  );
};

export interface MuiKpiCardProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly subtitle?: ReactNode | undefined;
  readonly badgeText?: string | undefined;
  readonly badgeTone?: "emerald" | "amber" | "rose" | "blue" | "slate" | undefined;
  readonly className?: string | undefined;
}

export const MuiKpiCard: FC<MuiKpiCardProps> = ({
  label,
  value,
  subtitle,
  badgeText,
  badgeTone = "emerald",
  className = "",
}) => {
  const toneMap = {
    emerald: "bg-[#ECFDF5] text-[#0B6E4F] border-[#A7F3D0]",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    blue: "bg-sky-50 text-sky-800 border-sky-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  } as const;

  return (
    <div
      className={`rounded-xl bg-white border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        {badgeText && (
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${toneMap[badgeTone]}`}
          >
            {badgeText}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums-lkr">
        {value}
      </div>
      {subtitle && <div className="mt-1 text-xs text-slate-500">{subtitle}</div>}
    </div>
  );
};

export interface MuiChipProps {
  readonly label: string;
  readonly tone?: "emerald" | "amber" | "rose" | "blue" | "slate" | undefined;
  readonly className?: string | undefined;
}

export const MuiChip: FC<MuiChipProps> = ({ label, tone = "slate", className = "" }) => {
  const toneMap = {
    emerald: "bg-[#ECFDF5] text-[#0B6E4F] border-[#A7F3D0]",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    blue: "bg-sky-50 text-sky-800 border-sky-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  } as const;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${toneMap[tone]} ${className}`}
    >
      {label}
    </span>
  );
};

export interface MuiPageHeaderProps {
  readonly eyebrow?: string | undefined;
  readonly title: string;
  readonly subtitle?: ReactNode | undefined;
  readonly actions?: ReactNode | undefined;
}

export const MuiPageHeader: FC<MuiPageHeaderProps> = ({ eyebrow, title, subtitle, actions }) => (
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
    <div>
      {eyebrow && (
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B6E4F] block mb-1">
          {eyebrow}
        </span>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
  </div>
);

export interface MuiUnderlineTabItem<T extends string = string> {
  readonly id: T;
  readonly label: string;
  readonly badge?: string | number | undefined;
}

export interface MuiUnderlineTabsProps<T extends string = string> {
  readonly tabs: readonly MuiUnderlineTabItem<T>[];
  readonly activeTab: T;
  readonly onSelect: (id: T) => void;
}

export const MuiUnderlineTabs = <T extends string>({
  tabs,
  activeTab,
  onSelect,
}: MuiUnderlineTabsProps<T>) => (
  <div className="flex items-center gap-2 overflow-x-auto border-b border-[#E2E8F0] pb-px">
    {tabs.map((tab) => {
      const isActive = tab.id === activeTab;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={`min-h-[42px] px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            isActive
              ? "border-[#0B6E4F] text-[#0B6E4F] bg-[#ECFDF5]/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>{tab.label}</span>
          {tab.badge !== undefined && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isActive ? "bg-[#0B6E4F] text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {tab.badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
