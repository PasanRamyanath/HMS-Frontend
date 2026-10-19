import { useEffect, useState } from "react";
import { DashboardView } from "./admin/DashboardView.js";
import { LoginView } from "./admin/auth/LoginView.js";
import { RegisterStep1, type RegisterStep1Data } from "./admin/auth/RegisterStep1.js";
import { RegisterStep2 } from "./admin/auth/RegisterStep2.js";
import { ResetPasswordView } from "./admin/auth/ResetPasswordView.js";
import { AdminShell } from "./admin/layout/AdminShell.js";
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

// ============================================================================
// Root Application Component
// ============================================================================

export function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => parseRoute(getCurrentPath()));
  const [activeToast, setActiveToast] = useState<DynamicToast | null>(null);
  const [online, setOnline] = useState<boolean>(() => isOnline());
  const [onboardingOrgData, setOnboardingOrgData] = useState<RegisterStep1Data | null>(null);

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
  if (currentRoute.kind === "LOGIN") {
    return (
      <>
        <DynamicToastPill toast={activeToast} onDismiss={() => setActiveToast(null)} />
        <LoginView
          onSuccess={() => {
            showToast("Authenticated", "Welcome to Galle Fort Lighthouse Villa", "success");
            navigateTo("/admin");
          }}
          onNavigateForgotPassword={() => navigateTo("/forgot-password")}
          onNavigateRegister={() => navigateTo("/register")}
        />
      </>
    );
  }

  if (currentRoute.kind === "REGISTER") {
    return (
      <>
        <DynamicToastPill toast={activeToast} onDismiss={() => setActiveToast(null)} />
        {!onboardingOrgData ? (
          <RegisterStep1
            onNext={(data) => {
              setOnboardingOrgData(data);
              showToast("Identity Verified", "Configure property and tax profile", "success");
            }}
            onNavigateSignIn={() => navigateTo("/login")}
          />
        ) : (
          <RegisterStep2
            initialData={{
              shopName: onboardingOrgData.orgName,
            }}
            onBack={() => setOnboardingOrgData(null)}
            onComplete={() => {
              showToast("Tenant Registered", "Welcome to Sri Lanka Cloud SaaS HMS", "success");
              navigateTo("/admin");
            }}
          />
        )}
      </>
    );
  }

  if (currentRoute.path === "/forgot-password") {
    return (
      <>
        <DynamicToastPill toast={activeToast} onDismiss={() => setActiveToast(null)} />
        <ResetPasswordView
          onSuccess={() => {
            showToast("Password Reset", "Your password was updated successfully", "success");
            navigateTo("/login");
          }}
          onNavigateSignIn={() => navigateTo("/login")}
        />
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
        activeTenantName="Galle Fort Lighthouse Villa"
        onOpenSpotlight={handleSpotlight}
        onLogout={() => {
          showToast("Signed Out", "Shift session ended safely", "info");
          navigateTo("/login");
        }}
      >
        <DashboardView
          propertyTitle="Galle Fort Lighthouse Villa"
          isLiveSyncing={online}
          onOrderAction={handleOrderAction}
          onRefresh={() => {
            showToast("Refreshed", "Dashboard metrics re-synced", "info");
          }}
        />
      </AdminShell>
    </>
  );
}
