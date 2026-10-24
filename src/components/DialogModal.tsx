import type React from "react";
import { useEffect, useRef } from "react";

export type DialogVariant = "centerModal" | "bottomSheet" | "responsive";
export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";

export interface DialogModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode | undefined;
  description?: React.ReactNode | undefined;
  children?: React.ReactNode | undefined;
  footer?: React.ReactNode | undefined;
  variant?: DialogVariant | undefined;
  size?: DialogSize | undefined;
  closeOnEsc?: boolean | undefined;
  closeOnScrimClick?: boolean | undefined;
  showCloseButton?: boolean | undefined;
  showGrabber?: boolean | undefined;
  ariaLabel?: string | undefined;
  className?: string | undefined;
}

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode | undefined;
}

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | undefined;
  children?: React.ReactNode | undefined;
}

export interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode | undefined;
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode | undefined;
}

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode | undefined;
}

export function getDialogSizeClasses(size: DialogSize = "md"): string {
  switch (size) {
    case "sm":
      return "max-w-sm";
    case "lg":
      return "max-w-2xl";
    case "xl":
      return "max-w-4xl";
    case "full":
      return "max-w-[95vw]";
    default:
      return "max-w-lg";
  }
}

export function getDialogVariantClasses(variant: DialogVariant = "responsive"): string {
  switch (variant) {
    case "bottomSheet":
      return "fixed inset-x-0 bottom-0 m-0 max-h-[88vh] rounded-t-[28px] w-full";
    case "centerModal":
      return "fixed inset-0 m-auto max-h-[90vh] rounded-2xl w-full";
    default:
      return "fixed inset-x-0 bottom-0 m-0 max-h-[88vh] rounded-t-[28px] w-full md:inset-0 md:m-auto md:max-h-[90vh] md:rounded-2xl";
  }
}

export function syncDialogState(dialog: HTMLDialogElement | null, isOpen: boolean): void {
  if (!dialog) return;
  if (isOpen && typeof dialog.showModal === "function" && !dialog.open) {
    dialog.showModal();
  } else if (!isOpen && typeof dialog.close === "function" && dialog.open) {
    dialog.close();
  }
}

export function DialogModalHeader({ className = "", children, ...restProps }: DialogHeaderProps) {
  return (
    <div
      className={`flex items-start justify-between px-6 pt-5 pb-3 border-b border-slate-200/50 ${className}`.trim()}
      {...restProps}
    >
      <div className="flex flex-col space-y-1">{children}</div>
    </div>
  );
}

export function DialogModalTitle({
  as: Heading = "h2",
  className = "",
  children,
  ...restProps
}: DialogTitleProps) {
  return (
    <Heading
      className={`text-lg font-semibold tracking-tight text-slate-900 ${className}`.trim()}
      {...restProps}
    >
      {children}
    </Heading>
  );
}

export function DialogModalDescription({
  className = "",
  children,
  ...restProps
}: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-slate-500 ${className}`.trim()} {...restProps}>
      {children}
    </p>
  );
}

export function DialogModalContent({ className = "", children, ...restProps }: DialogContentProps) {
  return (
    <div className={`p-6 overflow-y-auto max-h-[65vh] ${className}`.trim()} {...restProps}>
      {children}
    </div>
  );
}

export function DialogModalFooter({ className = "", children, ...restProps }: DialogFooterProps) {
  return (
    <div
      className={`flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200/50 bg-slate-50/50 ${className}`.trim()}
      {...restProps}
    >
      {children}
    </div>
  );
}

export function DialogModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "responsive",
  size = "md",
  closeOnEsc = true,
  closeOnScrimClick = true,
  showCloseButton = true,
  showGrabber = true,
  ariaLabel = "Dialog",
  className = "",
}: DialogModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    syncDialogState(dialogRef.current, isOpen);
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (!closeOnScrimClick) return;
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "Escape" && closeOnEsc) {
      e.preventDefault();
      onClose();
    }
  };

  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement, Event>) => {
    e.preventDefault();
    if (closeOnEsc) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const variantClass = getDialogVariantClasses(variant);
  const sizeClass = getDialogSizeClasses(size);

  const dialogClasses = [
    "apple-material-thick shadow-2xl overflow-hidden border border-[#E2E8F0] backdrop:backdrop-blur-md backdrop:bg-black/45 transition-apple-spring",
    variantClass,
    sizeClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const isBottomSheet = variant === "bottomSheet" || variant === "responsive";

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      onCancel={handleCancel}
      className={dialogClasses}
    >
      {showGrabber && isBottomSheet ? (
        <div className="flex justify-center pt-2.5 pb-1 md:hidden" aria-hidden="true">
          <div className="w-9 h-1.5 rounded-full bg-slate-300 " />
        </div>
      ) : null}

      {title ? (
        <div className="flex items-start justify-between px-6 pt-4 pb-3 border-b border-slate-200/50 ">
          <div className="flex flex-col space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 ">{title}</h2>
            {description ? <p className="text-sm text-slate-500 ">{description}</p> : null}
          </div>
          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="apple-touch-target p-1.5 -mr-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span className="text-base font-bold leading-none">x</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="p-6 overflow-y-auto max-h-[65vh]">{children}</div>

      {footer ? (
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200/50 bg-slate-50/50 ">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}

DialogModal.Header = DialogModalHeader;
DialogModal.Title = DialogModalTitle;
DialogModal.Description = DialogModalDescription;
DialogModal.Content = DialogModalContent;
DialogModal.Footer = DialogModalFooter;
