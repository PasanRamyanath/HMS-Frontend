import { useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import { StatusBadge } from "../../components/StatusBadge.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type OnboardingStepId = "TAX_CONFIG" | "ROOMS" | "MENU" | "QR_PRINT" | "TEST_ORDER";

export interface OnboardingStep {
  readonly id: OnboardingStepId;
  readonly stepNumber: number;
  readonly title: string;
  readonly shortTitle: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly path: string;
  readonly category: string;
  readonly estimatedMinutes: number;
  readonly isRequired: boolean;
}

export interface PropertyReadinessState {
  readonly isTaxConfigured: boolean;
  readonly hasRoomsConfigured: boolean;
  readonly hasMenuItemsConfigured: boolean;
  readonly hasQrStandsPrinted: boolean;
  readonly hasTestOrderExecuted: boolean;
}

export interface ReadinessProgress {
  readonly completedCount: number;
  readonly totalCount: number;
  readonly percentage: number;
  readonly isAllComplete: boolean;
  readonly nextPendingStep: OnboardingStep | null;
}

export interface OnboardingChecklistProps {
  readonly readiness?: Partial<PropertyReadinessState> | undefined;
  readonly propertyName?: string | undefined;
  readonly autoHideWhenComplete?: boolean | undefined;
  readonly initiallyCollapsed?: boolean | undefined;
  readonly onStepAction?: ((step: OnboardingStep) => void) | undefined;
  readonly onToggleStep?: ((stepId: OnboardingStepId, completed: boolean) => void) | undefined;
  readonly onDismiss?: (() => void) | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Step Definitions
// ============================================================================

export const ONBOARDING_STEPS: ReadonlyArray<OnboardingStep> = [
  {
    id: "TAX_CONFIG",
    stepNumber: 1,
    title: "Sri Lankan Statutory Tax Configuration",
    shortTitle: "Tax Config",
    description:
      "Configure 10% Service Charge, 1% TDL, 2.5% SSCL, and 18% VAT compounding with your SLTDA license and IRD TIN.",
    actionLabel: "Configure Taxes",
    path: "/admin/settings/taxes",
    category: "Statutory & Compliance",
    estimatedMinutes: 3,
    isRequired: true,
  },
  {
    id: "ROOMS",
    stepNumber: 2,
    title: "Room Inventory & Dual-Currency Tariffs",
    shortTitle: "Rooms & Rates",
    description:
      "Create room categories (Deluxe, Suite, Villa), define LKR resident & USD foreign rates, child policy, and driver dorms.",
    actionLabel: "Manage Rooms",
    path: "/admin/rooms",
    category: "Front Office & PMS",
    estimatedMinutes: 5,
    isRequired: true,
  },
  {
    id: "MENU",
    stepNumber: 3,
    title: "F&B Dining & Room Service Menu",
    shortTitle: "Dining Menu",
    description:
      "Add Sri Lankan culinary favorites (Hoppers, Lamprais, Kottu, Ceylon Tea) with kitchen station routing and BOT printing.",
    actionLabel: "Setup Menu",
    path: "/admin/menu",
    category: "Kitchen & POS",
    estimatedMinutes: 4,
    isRequired: true,
  },
  {
    id: "QR_PRINT",
    stepNumber: 4,
    title: "Contactless QR Standees & Table Tents",
    shortTitle: "QR Print",
    description:
      "Generate and print tamper-evident guest room and cabana QR stands with HMAC-SHA256 tokens and LankaQR MPM codes.",
    actionLabel: "Print QR Stands",
    path: "/admin/rooms/qr-print",
    category: "Guest Experience",
    estimatedMinutes: 2,
    isRequired: true,
  },
  {
    id: "TEST_ORDER",
    stepNumber: 5,
    title: "End-to-End Simulation Test Order",
    shortTitle: "Test Order",
    description:
      "Simulate a contactless guest order to test live kitchen KDS routing, folio room posting, and LankaQR digital receipting.",
    actionLabel: "Run Test Order",
    path: "/admin/orders/simulate",
    category: "Live Operations",
    estimatedMinutes: 2,
    isRequired: true,
  },
];

export const DEFAULT_READINESS_STATE: PropertyReadinessState = {
  isTaxConfigured: false,
  hasRoomsConfigured: false,
  hasMenuItemsConfigured: false,
  hasQrStandsPrinted: false,
  hasTestOrderExecuted: false,
};

// ============================================================================
// Pure Helper Functions
// ============================================================================

export function isStepComplete(stepId: OnboardingStepId, state: PropertyReadinessState): boolean {
  switch (stepId) {
    case "TAX_CONFIG":
      return state.isTaxConfigured;
    case "ROOMS":
      return state.hasRoomsConfigured;
    case "MENU":
      return state.hasMenuItemsConfigured;
    case "QR_PRINT":
      return state.hasQrStandsPrinted;
    case "TEST_ORDER":
      return state.hasTestOrderExecuted;
  }
}

export function calculateReadinessProgress(state: PropertyReadinessState): ReadinessProgress {
  let completedCount = 0;
  let nextPendingStep: OnboardingStep | null = null;

  for (const step of ONBOARDING_STEPS) {
    if (isStepComplete(step.id, state)) {
      completedCount += 1;
    } else if (!nextPendingStep) {
      nextPendingStep = step;
    }
  }

  const totalCount = ONBOARDING_STEPS.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    completedCount,
    totalCount,
    percentage,
    isAllComplete: completedCount === totalCount,
    nextPendingStep,
  };
}

export function getStepContainerClass(isDone: boolean, isNext: boolean): string {
  if (isDone) {
    return "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 dark:border-emerald-500/30";
  }
  if (isNext) {
    return "bg-apple-blue/5 dark:bg-apple-blue/10 border-apple-blue/30 dark:border-apple-blue/40 shadow-xs ring-1 ring-apple-blue/20";
  }
  return "bg-white/40 dark:bg-white/5 border-slate-200/60 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20";
}

export function getStepActionButtonClass(isDone: boolean, isNext: boolean): string {
  if (isDone) {
    return "bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-white/20";
  }
  if (isNext) {
    return "bg-apple-blue text-white hover:brightness-110 shadow-xs";
  }
  return "apple-liquid-glass text-slate-800 dark:text-white hover:bg-white/60 dark:hover:bg-white/10";
}

// ============================================================================
// Sub-Components (Cognitive Complexity <= 12)
// ============================================================================

interface ProgressHeaderProps {
  readonly propertyName?: string | undefined;
  readonly progress: ReadinessProgress;
  readonly isCollapsed: boolean;
  readonly onToggleCollapse: () => void;
  readonly onDismiss?: (() => void) | undefined;
}

function ProgressHeader({
  propertyName,
  progress,
  isCollapsed,
  onToggleCollapse,
  onDismiss,
}: ProgressHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-apple-blue/10 dark:bg-apple-blue/20 flex items-center justify-center text-apple-blue shrink-0">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {propertyName ? `${propertyName} — Setup Checklist` : "Property Launch Readiness"}
            </h2>
            <StatusBadge
              status={progress.isAllComplete ? "CLEAN" : "IN_PROGRESS"}
              label={`${progress.completedCount}/${progress.totalCount} Done`}
              size="sm"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Follow the 5 steps below to open your Sri Lankan hotel for online bookings and QR
            ordering.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 self-end sm:self-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="min-h-[44px] min-w-[44px] apple-touch-target p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-apple-spring cursor-pointer flex items-center justify-center"
          aria-label={isCollapsed ? "Expand onboarding checklist" : "Collapse onboarding checklist"}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[44px] min-w-[44px] apple-touch-target p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-apple-spring cursor-pointer flex items-center justify-center"
            aria-label="Dismiss checklist"
          >
            <svg
              className="w-5 h-5"
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
        )}
      </div>
    </div>
  );
}

interface ProgressBarProps {
  readonly percentage: number;
  readonly completedCount: number;
  readonly totalCount: number;
}

function ProgressBar({ percentage, completedCount, totalCount }: ProgressBarProps) {
  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-slate-600 dark:text-slate-300">
          Progress: <span className="tabular-nums-lkr font-semibold">{percentage}%</span>
        </span>
        <span className="text-slate-500 dark:text-slate-400 tabular-nums-lkr">
          {completedCount} of {totalCount} readiness milestones completed
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200/60 dark:bg-white/10 overflow-hidden">
        <div
          role="progressbar"
          tabIndex={0}
          aria-label="Property setup completion progress"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ width: `${percentage}%` }}
          className="h-full rounded-full bg-gradient-to-r from-apple-blue to-emerald-500 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        />
      </div>
    </div>
  );
}

interface StepStatusButtonProps {
  readonly stepNumber: number;
  readonly title: string;
  readonly isDone: boolean;
  readonly isNext: boolean;
  readonly onToggle: () => void;
}

function StepStatusButton({ stepNumber, title, isDone, isNext, onToggle }: StepStatusButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Mark step ${stepNumber} ${title} as ${isDone ? "incomplete" : "complete"}`}
      className={`min-w-[44px] min-h-[44px] apple-touch-target rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-apple-spring ${
        isDone
          ? "bg-emerald-500 text-white shadow-xs"
          : isNext
            ? "bg-apple-blue text-white shadow-xs"
            : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300"
      }`}
    >
      {isDone ? (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <span className="text-sm font-bold tabular-nums-lkr">{stepNumber}</span>
      )}
    </button>
  );
}

interface StepRowProps {
  readonly step: OnboardingStep;
  readonly isDone: boolean;
  readonly isNext: boolean;
  readonly onAction: (step: OnboardingStep) => void;
  readonly onToggle?: ((stepId: OnboardingStepId, completed: boolean) => void) | undefined;
}

function StepRow({ step, isDone, isNext, onAction, onToggle }: StepRowProps) {
  const containerClass = getStepContainerClass(isDone, isNext);
  const actionButtonClass = getStepActionButtonClass(isDone, isNext);

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-xl border transition-apple-spring flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${containerClass}`}
    >
      <div className="flex items-start gap-3">
        <StepStatusButton
          stepNumber={step.stepNumber}
          title={step.title}
          isDone={isDone}
          isNext={isNext}
          onToggle={() => onToggle?.(step.id, !isDone)}
        />

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`text-sm font-semibold ${
                isDone
                  ? "text-slate-700 dark:text-slate-300 line-through decoration-emerald-500/50"
                  : "text-slate-900 dark:text-white"
              }`}
            >
              {step.title}
            </h3>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300">
              {step.category}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums-lkr">
              ⏱ ~{step.estimatedMinutes}m
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>

      <div className="sm:self-center shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onAction(step)}
          className={`min-h-[44px] apple-touch-target px-4 py-2 rounded-xl text-xs font-semibold transition-apple-spring cursor-pointer flex items-center justify-center gap-1.5 ${actionButtonClass}`}
        >
          <span>{isDone ? "Review Settings" : step.actionLabel}</span>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function OnboardingChecklist({
  readiness,
  propertyName,
  autoHideWhenComplete = true,
  initiallyCollapsed = false,
  onStepAction,
  onToggleStep,
  onDismiss,
  className = "",
}: OnboardingChecklistProps) {
  const [internalReadiness, setInternalReadiness] = useState<PropertyReadinessState>(() => ({
    ...DEFAULT_READINESS_STATE,
    ...readiness,
  }));
  const [isCollapsed, setIsCollapsed] = useState<boolean>(initiallyCollapsed);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const activeReadiness: PropertyReadinessState = {
    isTaxConfigured: readiness?.isTaxConfigured ?? internalReadiness.isTaxConfigured,
    hasRoomsConfigured: readiness?.hasRoomsConfigured ?? internalReadiness.hasRoomsConfigured,
    hasMenuItemsConfigured:
      readiness?.hasMenuItemsConfigured ?? internalReadiness.hasMenuItemsConfigured,
    hasQrStandsPrinted: readiness?.hasQrStandsPrinted ?? internalReadiness.hasQrStandsPrinted,
    hasTestOrderExecuted: readiness?.hasTestOrderExecuted ?? internalReadiness.hasTestOrderExecuted,
  };

  const progress = calculateReadinessProgress(activeReadiness);

  if (autoHideWhenComplete && progress.isAllComplete) {
    return null;
  }

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleToggleStep = (stepId: OnboardingStepId, completed: boolean) => {
    setInternalReadiness((prev) => {
      switch (stepId) {
        case "TAX_CONFIG":
          return { ...prev, isTaxConfigured: completed };
        case "ROOMS":
          return { ...prev, hasRoomsConfigured: completed };
        case "MENU":
          return { ...prev, hasMenuItemsConfigured: completed };
        case "QR_PRINT":
          return { ...prev, hasQrStandsPrinted: completed };
        case "TEST_ORDER":
          return { ...prev, hasTestOrderExecuted: completed };
      }
    });
    onToggleStep?.(stepId, completed);
  };

  const handleStepAction = (step: OnboardingStep) => {
    onStepAction?.(step);
  };

  return (
    <GlassCard
      material="regular"
      radius="xl"
      className={`p-4 sm:p-5 transition-apple-spring border border-white/20 dark:border-white/10 ${className}`}
    >
      <div className="space-y-4">
        <ProgressHeader
          propertyName={propertyName}
          progress={progress}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          onDismiss={handleDismiss}
        />

        <ProgressBar
          percentage={progress.percentage}
          completedCount={progress.completedCount}
          totalCount={progress.totalCount}
        />

        {!isCollapsed && (
          <div className="space-y-2.5 pt-2">
            {ONBOARDING_STEPS.map((step) => {
              const isDone = isStepComplete(step.id, activeReadiness);
              const isNext = progress.nextPendingStep?.id === step.id;
              return (
                <StepRow
                  key={step.id}
                  step={step}
                  isDone={isDone}
                  isNext={isNext}
                  onAction={handleStepAction}
                  onToggle={handleToggleStep}
                />
              );
            })}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
