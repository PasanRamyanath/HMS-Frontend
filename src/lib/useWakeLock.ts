/**
 * Screen Wake Lock API Helper & React Hook for Kitchen KDS & Bar Display Devices.
 * Keeps kitchen display screens, bar displays, and waiter tablets awake on duty without third-party plugins.
 * Supports automatic re-acquisition on document visibility restoration (tab switch / app resume).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { type Result, err, ok } from "./graphqlClient.js";

export type WakeLockStatus = "unsupported" | "idle" | "active" | "released" | "error";

export type WakeLockErrorCode =
  | "UNSUPPORTED"
  | "PERMISSION_DENIED"
  | "NOT_ACTIVE"
  | "ACQUISITION_FAILED"
  | "RELEASE_FAILED";

export interface WakeLockError {
  readonly code: WakeLockErrorCode;
  readonly message: string;
}

export interface WakeLockState {
  readonly isSupported: boolean;
  readonly isActive: boolean;
  readonly status: WakeLockStatus;
  readonly error: WakeLockError | null;
}

export interface UseWakeLockOptions {
  /**
   * If true, automatically attempts to acquire the wake lock on mount.
   * Default: false.
   */
  readonly autoAcquire?: boolean;
  /**
   * If true, re-acquires the wake lock when the document becomes visible again.
   * Default: true.
   */
  readonly reacquireOnVisibilityChange?: boolean;
  /**
   * Optional callback invoked when the wake lock is released.
   */
  readonly onRelease?: () => void;
  /**
   * Optional callback invoked when an error occurs during acquire or release.
   */
  readonly onError?: (error: WakeLockError) => void;
}

export interface UseWakeLockResult extends WakeLockState {
  readonly request: () => Promise<Result<void, WakeLockError>>;
  readonly release: () => Promise<Result<void, WakeLockError>>;
  readonly toggle: () => Promise<Result<boolean, WakeLockError>>;
}

/**
 * Checks whether the browser runtime supports the Screen Wake Lock API.
 */
export function isWakeLockSupported(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return "wakeLock" in navigator && typeof navigator.wakeLock?.request === "function";
}

/**
 * Low-level pure helper to request a screen wake lock sentinel.
 */
export async function acquireScreenWakeLock(): Promise<Result<WakeLockSentinel, WakeLockError>> {
  if (!isWakeLockSupported()) {
    return err({
      code: "UNSUPPORTED",
      message: "The Screen Wake Lock API is not supported by this browser or device environment.",
    });
  }

  try {
    const sentinel = await navigator.wakeLock.request("screen");
    return ok(sentinel);
  } catch (error) {
    const isDenied =
      error instanceof Error &&
      (error.name === "NotAllowedError" || error.name === "SecurityError");
    return err({
      code: isDenied ? "PERMISSION_DENIED" : "ACQUISITION_FAILED",
      message:
        error instanceof Error
          ? error.message
          : "Failed to acquire screen wake lock on this device.",
    });
  }
}

/**
 * Low-level pure helper to release an active wake lock sentinel.
 */
export async function releaseScreenWakeLock(
  sentinel: WakeLockSentinel,
): Promise<Result<void, WakeLockError>> {
  if (!sentinel) {
    return err({
      code: "NOT_ACTIVE",
      message: "No active wake lock sentinel provided to release.",
    });
  }

  try {
    await sentinel.release();
    return ok(undefined);
  } catch (error) {
    return err({
      code: "RELEASE_FAILED",
      message:
        error instanceof Error ? error.message : "Failed to release active screen wake lock.",
    });
  }
}

const STATUS_LABELS: Readonly<
  Record<WakeLockStatus, Readonly<Record<"en" | "si" | "ta", string>>>
> = {
  active: {
    en: "Display Kept Awake (Sleep Prevented)",
    si: "තිරය සක්රීයයි (නිද්රාව වළක්වා ඇත)",
    ta: "திரை விழித்திருக்கிறது (தூக்கம் தடுக்கப்பட்டது)",
  },
  released: {
    en: "Display Sleep Allowed",
    si: "තිර නිද්රාව සක්රීයයි",
    ta: "திரை தூங்க அனுமதிக்கப்பட்டது",
  },
  unsupported: {
    en: "Wake-Lock Unavailable",
    si: "තිර සක්රියක සහාය නැත",
    ta: "வேக்-லாக் ஆதரிக்கப்படவில்லை",
  },
  error: {
    en: "Wake-Lock Error",
    si: "තිර සක්රිය දෝෂයකි",
    ta: "வேக்-லாக் பிழை",
  },
  idle: {
    en: "Standby (Inactive)",
    si: "ස්ථාවර (අක්රියයි)",
    ta: "காத்திருப்பு (செயலற்றது)",
  },
};

/**
 * Trilingual status descriptions for kitchen & bar personnel.
 */
export function formatWakeLockStatusLabel(
  status: WakeLockStatus,
  lang: "en" | "si" | "ta" = "en",
): string {
  const row = STATUS_LABELS[status] ?? STATUS_LABELS.idle;
  return row[lang] ?? row.en;
}

const BADGE_COLORS: Readonly<Record<WakeLockStatus, string>> = {
  active: "bg-[#34C759]/15 text-[#34C759] border-[#34C759]/30",
  error: "bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/30",
  unsupported: "bg-[#8E8E93]/15 text-[#8E8E93] border-[#8E8E93]/30",
  released: "bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30",
  idle: "bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30",
};

/**
 * Apple HIG badge color styling for KDS wake-lock indicator pills.
 */
export function getWakeLockBadgeColor(status: WakeLockStatus): string {
  return BADGE_COLORS[status] ?? BADGE_COLORS.idle;
}

/**
 * React 19 hook for managing Screen Wake Lock on KDS / BOT / POS screens.
 */
export function useWakeLock(options: UseWakeLockOptions = {}): UseWakeLockResult {
  const { autoAcquire = false, reacquireOnVisibilityChange = true, onRelease, onError } = options;

  const supported = isWakeLockSupported();

  const [state, setState] = useState<WakeLockState>(() => ({
    isSupported: supported,
    isActive: false,
    status: supported ? "idle" : "unsupported",
    error: null,
  }));

  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const desiredActiveRef = useRef<boolean>(autoAcquire);
  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const handleReleaseEvent = useCallback(() => {
    sentinelRef.current = null;
    setState((prev) => ({
      ...prev,
      isActive: false,
      status: "released",
    }));
    onReleaseRef.current?.();
  }, []);

  const request = useCallback(async (): Promise<Result<void, WakeLockError>> => {
    desiredActiveRef.current = true;

    if (!isWakeLockSupported()) {
      const unsupportedErr: WakeLockError = {
        code: "UNSUPPORTED",
        message: "The Screen Wake Lock API is not supported in this environment.",
      };
      setState({
        isSupported: false,
        isActive: false,
        status: "unsupported",
        error: unsupportedErr,
      });
      onErrorRef.current?.(unsupportedErr);
      return err(unsupportedErr);
    }

    if (sentinelRef.current && !sentinelRef.current.released) {
      return ok(undefined);
    }

    const acquireRes = await acquireScreenWakeLock();
    if (!acquireRes.ok) {
      setState((prev) => ({
        ...prev,
        isActive: false,
        status: "error",
        error: acquireRes.error,
      }));
      onErrorRef.current?.(acquireRes.error);
      return err(acquireRes.error);
    }

    const sentinel = acquireRes.value;
    sentinelRef.current = sentinel;

    sentinel.addEventListener("release", handleReleaseEvent, { once: true });

    setState({
      isSupported: true,
      isActive: true,
      status: "active",
      error: null,
    });

    return ok(undefined);
  }, [handleReleaseEvent]);

  const release = useCallback(async (): Promise<Result<void, WakeLockError>> => {
    desiredActiveRef.current = false;

    const sentinel = sentinelRef.current;
    if (!sentinel) {
      setState((prev) => ({
        ...prev,
        isActive: false,
        status: prev.isSupported ? "released" : "unsupported",
      }));
      return ok(undefined);
    }

    const releaseRes = await releaseScreenWakeLock(sentinel);
    sentinelRef.current = null;

    if (!releaseRes.ok) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: releaseRes.error,
      }));
      onErrorRef.current?.(releaseRes.error);
      return err(releaseRes.error);
    }

    setState((prev) => ({
      ...prev,
      isActive: false,
      status: "released",
      error: null,
    }));

    return ok(undefined);
  }, []);

  const toggle = useCallback(async (): Promise<Result<boolean, WakeLockError>> => {
    if (state.isActive) {
      const relRes = await release();
      if (!relRes.ok) {
        return err(relRes.error);
      }
      return ok(false);
    }

    const reqRes = await request();
    if (!reqRes.ok) {
      return err(reqRes.error);
    }
    return ok(true);
  }, [state.isActive, release, request]);

  // Handle visibility changes (re-acquire when returning to visible tab)
  useEffect(() => {
    if (!reacquireOnVisibilityChange || typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && desiredActiveRef.current) {
        if (!sentinelRef.current || sentinelRef.current.released) {
          await request();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [reacquireOnVisibilityChange, request]);

  // Handle auto-acquire on mount and cleanup on unmount
  useEffect(() => {
    if (autoAcquire) {
      void request();
    }

    return () => {
      if (sentinelRef.current && !sentinelRef.current.released) {
        void sentinelRef.current.release();
      }
    };
  }, [autoAcquire, request]);

  return {
    isSupported: state.isSupported,
    isActive: state.isActive,
    status: state.status,
    error: state.error,
    request,
    release,
    toggle,
  };
}
