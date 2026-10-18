/**
 * URL-Based Lazy Router with Apple Spring View Transitions API support.
 * Supports /qr/:tenantId/:locationId, /book/:tenantId, /staff/:view,
 * /login, /register, and /admin/:module.
 */

import {
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  createElement,
  useSyncExternalStore,
} from "react";

export type RouteKind =
  | "HOME"
  | "QR_STAY"
  | "BOOKING"
  | "STAFF"
  | "LOGIN"
  | "REGISTER"
  | "ADMIN"
  | "NOT_FOUND";

export interface QrStayParams {
  readonly tenantId: string;
  readonly locationId: string;
}

export interface BookingParams {
  readonly tenantId: string;
}

export interface StaffParams {
  readonly view: string;
}

export interface AdminParams {
  readonly module: string;
}

export interface QrStayRoute {
  readonly kind: "QR_STAY";
  readonly path: string;
  readonly params: QrStayParams;
}

export interface BookingRoute {
  readonly kind: "BOOKING";
  readonly path: string;
  readonly params: BookingParams;
}

export interface StaffRoute {
  readonly kind: "STAFF";
  readonly path: string;
  readonly params: StaffParams;
}

export interface AdminRoute {
  readonly kind: "ADMIN";
  readonly path: string;
  readonly params: AdminParams;
}

export interface SimpleRoute {
  readonly kind: "HOME" | "LOGIN" | "REGISTER" | "NOT_FOUND";
  readonly path: string;
  readonly params: Record<string, never>;
}

export type AppRoute = QrStayRoute | BookingRoute | StaffRoute | AdminRoute | SimpleRoute;

export interface NavigateOptions {
  readonly replace?: boolean;
  readonly skipTransition?: boolean;
}

const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeToRoute(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    const handlePopState = () => listener();
    window.addEventListener("popstate", handlePopState);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("popstate", handlePopState);
    };
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentPath(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname + window.location.search + window.location.hash;
}

function matchStaticRoute(normalized: string): AppRoute | null {
  if (normalized === "" || normalized === "/") {
    return { kind: "HOME", path: normalized, params: {} };
  }
  if (normalized === "/login") {
    return { kind: "LOGIN", path: normalized, params: {} };
  }
  if (normalized === "/register") {
    return { kind: "REGISTER", path: normalized, params: {} };
  }
  return null;
}

function matchParameterizedRoute(normalized: string): AppRoute | null {
  const qrMatch = /^\/qr\/([^/]+)\/([^/]+)$/.exec(normalized);
  if (qrMatch?.[1] && qrMatch[2]) {
    return {
      kind: "QR_STAY",
      path: normalized,
      params: {
        tenantId: decodeURIComponent(qrMatch[1]),
        locationId: decodeURIComponent(qrMatch[2]),
      },
    };
  }

  const bookMatch = /^\/book\/([^/]+)$/.exec(normalized);
  if (bookMatch?.[1]) {
    return {
      kind: "BOOKING",
      path: normalized,
      params: { tenantId: decodeURIComponent(bookMatch[1]) },
    };
  }

  const staffMatch = /^\/staff(?:\/([^/]+))?$/.exec(normalized);
  if (staffMatch) {
    return {
      kind: "STAFF",
      path: normalized,
      params: {
        view: staffMatch[1] ? decodeURIComponent(staffMatch[1]) : "dashboard",
      },
    };
  }

  const adminMatch = /^\/admin(?:\/([^/]+))?$/.exec(normalized);
  if (adminMatch) {
    return {
      kind: "ADMIN",
      path: normalized,
      params: {
        module: adminMatch[1] ? decodeURIComponent(adminMatch[1]) : "dashboard",
      },
    };
  }

  return null;
}

/**
 * Pure route parser for client and SSR environments.
 */
export function parseRoute(rawPath: string): AppRoute {
  const urlPath = rawPath.split("?")[0]?.split("#")[0] ?? "/";
  const normalized = urlPath.length > 1 && urlPath.endsWith("/") ? urlPath.slice(0, -1) : urlPath;

  const staticRoute = matchStaticRoute(normalized);
  if (staticRoute) return staticRoute;

  const paramRoute = matchParameterizedRoute(normalized);
  if (paramRoute) return paramRoute;

  return { kind: "NOT_FOUND", path: normalized, params: {} };
}

/**
 * Triggers a View Transition if supported by the browser, falling back to instant DOM update.
 */
export function executeViewTransition(updateFn: () => void): void {
  const doc =
    typeof document !== "undefined"
      ? (document as unknown as {
          startViewTransition?: (cb: () => void) => void;
        })
      : undefined;

  if (doc?.startViewTransition && typeof doc.startViewTransition === "function") {
    doc.startViewTransition(() => {
      updateFn();
    });
  } else {
    updateFn();
  }
}

/**
 * Programmatic client navigation with History API and View Transitions.
 */
export function navigateTo(to: string, options?: NavigateOptions): void {
  if (typeof window === "undefined") return;

  const performUpdate = () => {
    if (options?.replace) {
      window.history.replaceState(null, "", to);
    } else {
      window.history.pushState(null, "", to);
    }
    notifyListeners();
  };

  if (options?.skipTransition) {
    performUpdate();
  } else {
    executeViewTransition(performUpdate);
  }
}

export interface RouteState {
  readonly route: AppRoute;
  readonly path: string;
  readonly searchParams: URLSearchParams;
  readonly navigate: (to: string, options?: NavigateOptions) => void;
}

/**
 * React hook for consuming active route state and triggering navigation.
 */
export function useRoute(): RouteState {
  const currentPath = useSyncExternalStore(subscribeToRoute, getCurrentPath, () => "/");

  const parsed = parseRoute(currentPath);
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  return {
    route: parsed,
    path: currentPath,
    searchParams,
    navigate: navigateTo,
  };
}

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  readonly href: string;
  readonly replace?: boolean;
  readonly skipTransition?: boolean;
  readonly children: ReactNode;
}

/**
 * Apple HIG compliant navigation Link component with ergonomic touch target.
 */
export function Link({
  href,
  replace,
  skipTransition,
  children,
  onClick,
  className,
  ...rest
}: LinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (
      !e.defaultPrevented &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.shiftKey &&
      e.button === 0
    ) {
      e.preventDefault();
      navigateTo(href, {
        ...(replace !== undefined ? { replace } : {}),
        ...(skipTransition !== undefined ? { skipTransition } : {}),
      });
    }
  };

  const combinedClass = [
    "apple-touch-target",
    "inline-flex items-center",
    "transition-apple-spring",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return createElement(
    "a",
    {
      href,
      onClick: handleClick,
      className: combinedClass,
      ...rest,
    },
    children,
  );
}
