/**
 * Shared Store Voucher Line-Item Table Editor Component
 * (`StoreLineItemTable.tsx`)
 *
 * Implements Step 400 (Phase 16.25) / Rung 7 of the Sri Lanka HMS Master Architecture Plan:
 * Consolidates PR, PO, GRN, and GIN line-item table rendering into a shared, Apple HIG
 * compliant table editor component.
 *
 * Apple HIG & UI/UX Standards:
 * - Translucent surface with .apple-liquid-glass styling
 * - Tabular numbers with .tabular-nums-lkr for integer-cent LKR precision
 * - Continuous squircle radii (rounded-xl, rounded-lg)
 * - Minimum >= 44x44pt touch targets on interactive buttons
 * - Zero console.log/console.error/debugger statements or dead code
 */

import type React from "react";
import type { ReactNode } from "react";

export interface StoreTableColumn {
 readonly id: string;
 readonly label: string;
 readonly align?: "left" | "center" | "right" | undefined;
 readonly width?: string | undefined;
}

export interface StoreLineItemTableProps<T> {
 readonly columns: readonly StoreTableColumn[];
 readonly items: readonly T[];
 readonly renderRow: (item: T, index: number) => ReactNode;
 readonly emptyLabel?: string | undefined;
 readonly minWidth?: string | undefined;
 readonly className?: string | undefined;
}

export function StoreLineItemTable<T>({
 columns,
 items,
 renderRow,
 emptyLabel = "No items added yet",
 minWidth = "640px",
 className = "",
}: StoreLineItemTableProps<T>): React.JSX.Element {
 if (items.length === 0) {
 return (
 <div className="py-8 text-center text-xs text-gray-500 italic rounded-xl border border-dashed border-gray-300/80 apple-liquid-glass">
 {emptyLabel}
 </div>
 );
 }

 return (
 <div
 className={`overflow-x-auto rounded-xl border border-gray-200/80 apple-liquid-glass shadow-xs ${className}`}
 >
 <table className="w-full text-left text-xs border-collapse" style={{ minWidth }}>
 <thead className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200/80 ">
 <tr>
 {columns.map((col) => {
 const alignClass =
 col.align === "right"
 ? "text-right"
 : col.align === "center"
 ? "text-center"
 : "text-left";
 return (
 <th
 key={col.id}
 style={col.width ? { width: col.width } : undefined}
 className={`py-2.5 px-3 ${alignClass} text-[11px] font-semibold tracking-wider`}
 >
 {col.label}
 </th>
 );
 })}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200/70 bg-white/60 backdrop-blur-md">
 {items.map((item, idx) => renderRow(item, idx))}
 </tbody>
 </table>
 </div>
 );
}

export interface StoreLineItemInputProps {
 readonly value: number | string;
 readonly onChange: (val: string) => void;
 readonly min?: number | string | undefined;
 readonly step?: number | string | undefined;
 readonly widthClass?: string | undefined;
 readonly ariaLabel?: string | undefined;
 readonly disabled?: boolean | undefined;
}

export function StoreLineItemInput({
 value,
 onChange,
 min = 0,
 step = "any",
 widthClass = "w-20",
 ariaLabel,
 disabled = false,
}: StoreLineItemInputProps): React.JSX.Element {
 return (
 <input
 type="number"
 min={min}
 step={step}
 value={value}
 aria-label={ariaLabel}
 disabled={disabled}
 onChange={(e) => onChange(e.target.value)}
 className={`${widthClass} min-h-[36px] px-2 py-1 text-xs text-right rounded-lg border border-gray-300 bg-white text-gray-900 tabular-nums-lkr focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 transition-all`}
 />
 );
}

export interface StoreLineItemDeleteButtonProps {
 readonly onClick: () => void;
 readonly ariaLabel?: string | undefined;
 readonly title?: string | undefined;
}

export function StoreLineItemDeleteButton({
 onClick,
 ariaLabel = "Delete item",
 title = "Delete Item",
}: StoreLineItemDeleteButtonProps): React.JSX.Element {
 return (
 <button
 type="button"
 onClick={onClick}
 aria-label={ariaLabel}
 title={title}
 className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
 >
 <span className="text-sm font-semibold leading-none">x</span>
 </button>
 );
}
