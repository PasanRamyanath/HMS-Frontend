import type React from "react";

export type GlassMaterial = "ultraThin" | "thin" | "regular" | "thick" | "elevated";
export type GlassRadius = "none" | "sm" | "md" | "lg" | "xl";
export type BentoSpan = 1 | 2 | 3 | 4 | "full";
export type GlassCardElement = "div" | "article" | "section" | "button" | "header" | "footer";

export interface GlassCardClassOptions {
 material?: GlassMaterial | undefined;
 radius?: GlassRadius | undefined;
 interactive?: boolean | undefined;
 colSpan?: BentoSpan | undefined;
 rowSpan?: BentoSpan | undefined;
 tabularNums?: boolean | undefined;
 disabled?: boolean | undefined;
 className?: string | undefined;
}

export interface GlassCardProps extends React.HTMLAttributes<HTMLElement> {
 as?: GlassCardElement | undefined;
 material?: GlassMaterial | undefined;
 radius?: GlassRadius | undefined;
 interactive?: boolean | undefined;
 colSpan?: BentoSpan | undefined;
 rowSpan?: BentoSpan | undefined;
 tabularNums?: boolean | undefined;
 disabled?: boolean | undefined;
 children?: React.ReactNode | undefined;
}

export interface GlassCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
 children?: React.ReactNode | undefined;
}

export interface GlassCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
 as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | undefined;
 children?: React.ReactNode | undefined;
}

export interface GlassCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
 children?: React.ReactNode | undefined;
}

export interface GlassCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
 children?: React.ReactNode | undefined;
}

export interface GlassCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
 children?: React.ReactNode | undefined;
}

export function getMaterialClass(material: GlassMaterial = "regular"): string {
 switch (material) {
 case "ultraThin":
 return "apple-material-ultra-thin";
 case "thin":
 return "apple-material-thin";
 case "regular":
 return "apple-material-regular";
 case "thick":
 return "apple-material-thick";
 case "elevated":
 return "apple-material-elevated";
 }
}

export function getRadiusClass(radius: GlassRadius = "lg"): string {
 switch (radius) {
 case "none":
 return "rounded-none";
 case "sm":
 return "squircle-sm";
 case "md":
 return "squircle-md";
 case "lg":
 return "squircle-lg";
 case "xl":
 return "squircle-xl";
 }
}

export function getColSpanClass(colSpan?: BentoSpan): string {
 if (!colSpan) return "";
 switch (colSpan) {
 case 1:
 return "col-span-1";
 case 2:
 return "col-span-1 md:col-span-2";
 case 3:
 return "col-span-1 md:col-span-3";
 case 4:
 return "col-span-1 md:col-span-4";
 case "full":
 return "col-span-full";
 }
}

export function getRowSpanClass(rowSpan?: BentoSpan): string {
 if (!rowSpan) return "";
 switch (rowSpan) {
 case 1:
 return "row-span-1";
 case 2:
 return "row-span-2";
 case 3:
 return "row-span-3";
 case 4:
 return "row-span-4";
 case "full":
 return "row-span-full";
 }
}

export function getGlassCardClasses(options: GlassCardClassOptions): string {
 const baseClasses = "relative overflow-hidden transition-all duration-300";
 const materialClass = getMaterialClass(options.material ?? "regular");
 const radiusClass = getRadiusClass(options.radius ?? "lg");
 const colSpanClass = getColSpanClass(options.colSpan);
 const rowSpanClass = getRowSpanClass(options.rowSpan);
 const tabularClass = options.tabularNums ? "tabular-nums-lkr" : "";

 const interactiveClass = options.interactive
 ? "cursor-pointer apple-touch-target transition-apple-spring hover:brightness-[1.02] active:scale-[0.985] active:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue focus-visible:ring-offset-2"
 : "";

 const disabledClass = options.disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "";

 return [
 baseClasses,
 materialClass,
 radiusClass,
 colSpanClass,
 rowSpanClass,
 tabularClass,
 interactiveClass,
 disabledClass,
 options.className ?? "",
 ]
 .filter(Boolean)
 .join(" ");
}

export function GlassCard({
 as: Component = "div",
 material = "regular",
 radius = "lg",
 interactive = false,
 colSpan,
 rowSpan,
 tabularNums = false,
 disabled = false,
 className = "",
 children,
 ...restProps
}: GlassCardProps) {
 const computedClasses = getGlassCardClasses({
 material,
 radius,
 interactive,
 colSpan,
 rowSpan,
 tabularNums,
 disabled,
 className,
 });

 return (
 <Component
 className={computedClasses}
 role={interactive && Component !== "button" ? "button" : undefined}
 tabIndex={interactive && Component !== "button" ? 0 : undefined}
 aria-disabled={disabled ? true : undefined}
 {...restProps}
 >
 {children}
 </Component>
 );
}

export function GlassCardHeader({ className = "", children, ...restProps }: GlassCardHeaderProps) {
 return (
 <div className={`flex flex-col space-y-1.5 p-6 ${className}`.trim()} {...restProps}>
 {children}
 </div>
 );
}

export function GlassCardTitle({
 as: Heading = "h3",
 className = "",
 children,
 ...restProps
}: GlassCardTitleProps) {
 return (
 <Heading
 className={`text-lg font-semibold tracking-tight text-slate-900 ${className}`.trim()}
 {...restProps}
 >
 {children}
 </Heading>
 );
}

export function GlassCardDescription({
 className = "",
 children,
 ...restProps
}: GlassCardDescriptionProps) {
 return (
 <p className={`text-sm text-slate-500 ${className}`.trim()} {...restProps}>
 {children}
 </p>
 );
}

export function GlassCardContent({
 className = "",
 children,
 ...restProps
}: GlassCardContentProps) {
 return (
 <div className={`p-6 pt-0 ${className}`.trim()} {...restProps}>
 {children}
 </div>
 );
}

export function GlassCardFooter({ className = "", children, ...restProps }: GlassCardFooterProps) {
 return (
 <div
 className={`flex items-center p-6 pt-0 border-t border-slate-200/40 ${className}`.trim()}
 {...restProps}
 >
 {children}
 </div>
 );
}

GlassCard.Header = GlassCardHeader;
GlassCard.Title = GlassCardTitle;
GlassCard.Description = GlassCardDescription;
GlassCard.Content = GlassCardContent;
GlassCard.Footer = GlassCardFooter;
