import { useEffect } from "react";

export type ToastType = "info" | "success" | "warning" | "error";

export interface DynamicToast {
  readonly id: string;
  readonly title: string;
  readonly description?: string | undefined;
  readonly type?: ToastType | undefined;
  readonly durationMs?: number | undefined;
}

export interface DynamicToastPillProps {
  readonly toast: DynamicToast | null;
  readonly onDismiss: () => void;
}

function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case "success":
      return (
        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </span>
      );
    case "warning":
      return (
        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </span>
      );
    case "error":
      return (
        <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 flex items-center justify-center shrink-0">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </span>
      );
    default:
      return (
        <span className="w-5 h-5 rounded-full bg-[#0B6E4F]/20 text-[#0B6E4F] flex items-center justify-center shrink-0">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </span>
      );
  }
}

export function DynamicToastPill({ toast, onDismiss }: DynamicToastPillProps) {
  useEffect(() => {
    if (!toast) return;
    const duration = toast.durationMs ?? 4000;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const toastType = toast.type ?? "info";

  return (
    <aside
      aria-label="Notification Banner"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] sm:w-auto"
    >
      <div className="apple-liquid-glass rounded-full px-4 py-2.5 shadow-2xl border border-[#E2E8F0] flex items-center gap-3 backdrop-blur-2xl transition-all duration-350 ease-apple-spring">
        <ToastIcon type={toastType} />

        <div className="flex-1 min-w-0 pr-1">
          <p className="text-xs font-semibold text-slate-900 truncate">{toast.title}</p>
          {toast.description && (
            <p className="text-[11px] text-slate-500 truncate">{toast.description}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss Notification"
          className="p-1 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </aside>
  );
}
