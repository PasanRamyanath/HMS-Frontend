import { type ReactNode, useEffect, useState } from "react";
import { DashboardView } from "./admin/DashboardView.js";
import { LoginView } from "./admin/auth/LoginView.js";
import { RegisterStep1, type RegisterStep1Data } from "./admin/auth/RegisterStep1.js";
import { RegisterStep2 } from "./admin/auth/RegisterStep2.js";
import { ResetPasswordView } from "./admin/auth/ResetPasswordView.js";
import { AdminShell, DEFAULT_PROPERTIES } from "./admin/layout/AdminShell.js";
import {
  type DynamicToast,
  DynamicToastPill,
  type ToastType,
} from "./components/DynamicToastPill.js";
import { formatLkr } from "./lib/i18n.js";
import { isOnline, registerServiceWorker, subscribeToOnlineStatus } from "./lib/offlineQueue.js";
import {
  type AppRoute,
  getCurrentPath,
  navigateTo,
  parseRoute,
  subscribeToRoute,
} from "./lib/router.js";
import { DirectBookingEngine } from "./qr/booking/DirectBookingEngine.js";
import { GuestQrApp } from "./qr/index.js";
import { StaffMobileHub } from "./staff/StaffMobileHub.js";

// ============================================================================
// Helper Subcomponents & Pure Route Resolvers
// ============================================================================

function resolveStaffTool(view: string) {
  switch (view) {
    case "pos":
      return "WAITER_POS";
    case "kds":
      return "KITCHEN_KDS";
    case "bar":
      return "BAR_BOT";
    case "runner":
      return "ORDER_RUNNER";
    case "buffet":
      return "BUFFET_HOST";
    case "housekeeping":
      return "HOUSEKEEPING";
    default:
      return "HUB";
  }
}

interface AuthRouteViewProps {
  readonly route: AppRoute;
  readonly onboardingOrgData: RegisterStep1Data | null;
  readonly onSetOnboardingOrgData: (data: RegisterStep1Data | null) => void;
  readonly onShowToast: (title: string, desc?: string, type?: ToastType) => void;
}

function renderAuthRoute({
  route,
  onboardingOrgData,
  onSetOnboardingOrgData,
  onShowToast,
}: AuthRouteViewProps): ReactNode {
  if (route.kind === "LOGIN") {
    return (
      <LoginView
        onSuccess={() => {
          onShowToast("Authenticated", "Welcome to Galle Fort Lighthouse Villa", "success");
          navigateTo("/admin");
        }}
        onNavigateForgotPassword={() => navigateTo("/forgot-password")}
        onNavigateRegister={() => navigateTo("/register")}
      />
    );
  }

  if (route.kind === "REGISTER") {
    return !onboardingOrgData ? (
      <RegisterStep1
        onNext={(data) => {
          onSetOnboardingOrgData(data);
          onShowToast("Identity Verified", "Configure property and tax profile", "success");
        }}
        onNavigateSignIn={() => navigateTo("/login")}
      />
    ) : (
      <RegisterStep2
        initialData={{
          shopName: onboardingOrgData.orgName,
        }}
        onBack={() => onSetOnboardingOrgData(null)}
        onComplete={() => {
          onShowToast("Tenant Registered", "Welcome to Sri Lanka Cloud SaaS HMS", "success");
          navigateTo("/admin");
        }}
      />
    );
  }

  if (route.path === "/forgot-password") {
    return (
      <ResetPasswordView
        onSuccess={() => {
          onShowToast("Password Reset", "Your password was updated successfully", "success");
          navigateTo("/login");
        }}
        onNavigateSignIn={() => navigateTo("/login")}
      />
    );
  }

  return null;
}

// ============================================================================
// Root Application Component
// ============================================================================

export function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => parseRoute(getCurrentPath()));
  const [activeToast, setActiveToast] = useState<DynamicToast | null>(null);
  const [online, setOnline] = useState<boolean>(() => isOnline());
  const [onboardingOrgData, setOnboardingOrgData] = useState<RegisterStep1Data | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("tenant-galle-fort");

  const activeProperty =
    DEFAULT_PROPERTIES.find((p) => p.id === selectedPropertyId) ?? DEFAULT_PROPERTIES[0];
  const activeTenantName = activeProperty?.name ?? "Galle Fort Lighthouse Villa";

  // Subscribe to URL router state changes
  useEffect(() => {
    const unsubscribe = subscribeToRoute(() => {
      setCurrentRoute(parseRoute(getCurrentPath()));
    });
    return unsubscribe;
  }, []);

  // Subscribe to online/offline network transitions & register PWA Service Worker
  useEffect(() => {
    registerServiceWorker();

    const unsubscribe = subscribeToOnlineStatus((isNetOnline) => {
      setOnline(isNetOnline);
      if (!isNetOnline) {
        showToast(
          "Offline Mode Active",
          "Mutations queued locally in IndexedDB during network cut",
          "warning",
        );
      } else {
        showToast("Network Restored", "Reconnected to AppSync cloud backend", "success");
      }
    });

    return unsubscribe;
  }, []);

  const showToast = (title: string, description?: string, type: ToastType = "info") => {
    setActiveToast({
      id: `toast-${Date.now()}`,
      title,
      description,
      type,
    });
  };

  const handleOrderAction = (orderId: string, action: string) => {
    showToast(
      `Order ${orderId} Updated`,
      `Action '${action}' dispatched to kitchen KDS ticket queue`,
      "success",
    );
  };

  const handleSpotlight = () => {
    showToast("Spotlight Quick Search", "Press ⌘K to search folios, rooms, and guests", "info");
  };

  // Render Auth views
  const authElement = renderAuthRoute({
    route: currentRoute,
    onboardingOrgData,
    onSetOnboardingOrgData: setOnboardingOrgData,
    onShowToast: showToast,
  });

  if (authElement) {
    return (
      <>
        <DynamicToastPill toast={activeToast} onDismiss={() => setActiveToast(null)} />
        {authElement}
      </>
    );
  }

  if (currentRoute.kind === "BOOKING") {
    return (
      <>
        <DynamicToastPill toast={activeToast} onDismiss={() => setActiveToast(null)} />
        <main className="min-h-screen bg-apple-gray-50 p-4 sm:p-6 md:p-8 dark:bg-apple-gray-900">
          <DirectBookingEngine
            tenantId={currentRoute.params.tenantId}
            onProceedToCheckout={(_selection, tax) => {
              showToast(
                "Room Selected",
                `Proceeding to Add-Ons: Total ${formatLkr(tax.grandTotalLkr)}`,
                "success",
              );
            }}
          />
        </main>
      </>
    );
  }

  if (currentRoute.kind === "QR_STAY") {
    return (
      <>
        <DynamicToastPill toast={activeToast} onDismiss={() => setActiveToast(null)} />
        <GuestQrApp
          tenantId={currentRoute.params.tenantId}
          locationId={currentRoute.params.locationId}
        />
      </>
    );
  }

  if (currentRoute.kind === "STAFF") {
    const initialView = resolveStaffTool(currentRoute.params.view);

    return (
      <>
        <DynamicToastPill toast={activeToast} onDismiss={() => setActiveToast(null)} />
        <StaffMobileHub
          hotelName={activeTenantName}
          initialView={initialView}
          onLogout={() => {
            showToast("Signed Out", "Shift session ended safely", "info");
            navigateTo("/login");
          }}
        />
      </>
    );
  }

  // Admin PMS / Operations Portal
  const activeModule = currentRoute.kind === "ADMIN" ? currentRoute.params.module : "dashboard";

  return (
    <>
      {/* Apple Dynamic Island Top Notification Toast Pill */}
      <DynamicToastPill toast={activeToast} onDismiss={() => setActiveToast(null)} />

      <AdminShell
        currentModule={activeModule}
        userRole="HOTEL_ADMIN"
        staffName="Kasun Perera"
        activeTenantName={activeTenantName}
        renderLazyModules={true}
        isLiveSyncing={online}
        onOrderAction={handleOrderAction}
        onSaveSuccess={(section) => {
          showToast("Settings Saved", `${section} configuration updated successfully`, "success");
        }}
        onPropertyChange={(propId) => {
          setSelectedPropertyId(propId);
          const prop = DEFAULT_PROPERTIES.find((p) => p.id === propId);
          showToast("Property Switched", `Now managing ${prop?.name ?? propId}`, "info");
        }}
        onOpenSpotlight={handleSpotlight}
        onLogout={() => {
          showToast("Signed Out", "Shift session ended safely", "info");
          navigateTo("/login");
        }}
      >
        {activeModule === "dashboard" ? (
          <DashboardView
            propertyTitle={activeTenantName}
            isLiveSyncing={online}
            onOrderAction={handleOrderAction}
            onRefresh={() => {
              showToast("Refreshed", "Dashboard metrics re-synced", "info");
            }}
          />
        ) : null}
      </AdminShell>
    </>
  );
}
