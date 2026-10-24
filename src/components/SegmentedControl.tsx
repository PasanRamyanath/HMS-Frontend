import type React from "react";

export interface SegmentedControlOption<T extends string = string> {
 id: T;
 label: string;
 icon?: React.ReactNode | undefined;
 badge?: string | number | undefined;
 disabled?: boolean | undefined;
}

export type SegmentedControlSize = "sm" | "md" | "lg";

export interface SegmentedControlProps<T extends string = string> {
 options: readonly SegmentedControlOption<T>[];
 value: T;
 onChange: (value: T) => void;
 size?: SegmentedControlSize | undefined;
 fullWidth?: boolean | undefined;
 disabled?: boolean | undefined;
 ariaLabel?: string | undefined;
 className?: string | undefined;
}

export const RESIDENCY_TIER_OPTIONS: readonly SegmentedControlOption<
 "RESIDENT_LKR" | "FOREIGN_USD"
>[] = [
 { id: "RESIDENT_LKR", label: "Resident LKR" },
 { id: "FOREIGN_USD", label: "Foreign USD" },
];

export const MEAL_PLAN_OPTIONS: readonly SegmentedControlOption<
 "RO" | "BB" | "HB" | "FB" | "AI"
>[] = [
 { id: "RO", label: "RO" },
 { id: "BB", label: "BB" },
 { id: "HB", label: "HB" },
 { id: "FB", label: "FB" },
 { id: "AI", label: "AI" },
];

export const KDS_VIEW_OPTIONS: readonly SegmentedControlOption<"ALL" | "KITCHEN" | "BAR">[] = [
 { id: "ALL", label: "All Tickets" },
 { id: "KITCHEN", label: "Kitchen (KOT)" },
 { id: "BAR", label: "Bar (BOT)" },
];

export function getSegmentedControlSizeClasses(size: SegmentedControlSize = "md"): {
 container: string;
 item: string;
 text: string;
} {
 switch (size) {
 case "sm":
 return {
 container: "p-0.5 rounded-lg text-xs min-h-[36px]",
 item: "py-1 px-2.5 rounded-md",
 text: "text-xs font-medium",
 };
 case "lg":
 return {
 container: "p-1.5 rounded-2xl text-base min-h-[52px]",
 item: "py-2.5 px-4 rounded-xl",
 text: "text-base font-semibold",
 };
 case "md":
 return {
 container: "p-1 rounded-xl text-sm min-h-[44px]",
 item: "py-2 px-3.5 rounded-lg",
 text: "text-sm font-medium",
 };
 }
}

export function getNextNavigationIndex(
 key: string,
 currentIndex: number,
 totalCount: number,
): number | null {
 if (totalCount <= 0) return null;
 if (key === "ArrowRight" || key === "ArrowDown") {
 return (currentIndex + 1) % totalCount;
 }
 if (key === "ArrowLeft" || key === "ArrowUp") {
 return (currentIndex - 1 + totalCount) % totalCount;
 }
 if (key === "Home") {
 return 0;
 }
 if (key === "End") {
 return totalCount - 1;
 }
 return null;
}

function getSegmentButtonClasses(
 isSelected: boolean,
 isDisabled: boolean,
 fullWidth: boolean,
 itemClass: string,
): string {
 return [
 "relative flex items-center justify-center gap-1.5 z-10 transition-all duration-300 transition-apple-spring",
 itemClass,
 fullWidth ? "flex-1" : "",
 isSelected
 ? "bg-white text-slate-900 shadow-sm border border-black/5 "
 : "text-slate-600 hover:text-slate-900 ",
 isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]",
 ]
 .filter(Boolean)
 .join(" ");
}

interface SegmentButtonProps<T extends string> {
 option: SegmentedControlOption<T>;
 isSelected: boolean;
 isDisabled: boolean;
 fullWidth: boolean;
 itemClass: string;
 textClass: string;
 onSelect: (id: T) => void;
}

function SegmentButton<T extends string>({
 option,
 isSelected,
 isDisabled,
 fullWidth,
 itemClass,
 textClass,
 onSelect,
}: SegmentButtonProps<T>) {
 const buttonClasses = getSegmentButtonClasses(isSelected, isDisabled, fullWidth, itemClass);

 return (
 <button
 type="button"
 role="tab"
 aria-selected={isSelected}
 disabled={isDisabled}
 tabIndex={isSelected ? 0 : -1}
 onClick={() => {
 if (!isDisabled && !isSelected) {
 onSelect(option.id);
 }
 }}
 className={buttonClasses}
 >
 {option.icon ? <span className="shrink-0">{option.icon}</span> : null}
 <span className={textClass}>{option.label}</span>
 {option.badge !== undefined ? (
 <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums-lkr bg-slate-100 text-slate-600 ">
 {option.badge}
 </span>
 ) : null}
 </button>
 );
}

export function SegmentedControl<T extends string = string>({
 options,
 value,
 onChange,
 size = "md",
 fullWidth = false,
 disabled = false,
 ariaLabel = "Segmented Options",
 className = "",
}: SegmentedControlProps<T>) {
 const sizeClasses = getSegmentedControlSizeClasses(size);

 const containerClasses = [
 "relative inline-flex items-center select-none bg-slate-200/70 border border-black/5 backdrop-blur-md transition-apple-spring",
 sizeClasses.container,
 fullWidth ? "w-full" : "",
 disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
 className,
 ]
 .filter(Boolean)
 .join(" ");

 const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
 if (disabled || options.length === 0) return;

 const enabledOptions = options.filter((opt) => !opt.disabled);
 const currentIndex = enabledOptions.findIndex((opt) => opt.id === value);
 if (currentIndex === -1) return;

 const nextIndex = getNextNavigationIndex(e.key, currentIndex, enabledOptions.length);
 if (nextIndex === null) return;

 e.preventDefault();
 const nextOption = enabledOptions[nextIndex];
 if (nextOption && nextOption.id !== value) {
 onChange(nextOption.id);
 }
 };

 return (
 <div
 role="tablist"
 aria-label={ariaLabel}
 aria-disabled={disabled ? true : undefined}
 tabIndex={disabled ? -1 : 0}
 onKeyDown={handleKeyDown}
 className={containerClasses}
 >
 {options.map((option) => (
 <SegmentButton
 key={option.id}
 option={option}
 isSelected={option.id === value}
 isDisabled={disabled || Boolean(option.disabled)}
 fullWidth={fullWidth}
 itemClass={sizeClasses.item}
 textClass={sizeClasses.text}
 onSelect={onChange}
 />
 ))}
 </div>
 );
}
