import { useState } from "react";
import { DialogModal } from "./components/DialogModal.js";
import { GlassCard } from "./components/GlassCard.js";
import { RESIDENCY_TIER_OPTIONS, SegmentedControl } from "./components/SegmentedControl.js";
import { StatusBadge } from "./components/StatusBadge.js";

export function App() {
  const [tier, setTier] = useState<"RESIDENT_LKR" | "FOREIGN_USD">("RESIDENT_LKR");
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center bg-slate-50">
      <GlassCard material="regular" radius="xl" className="p-8 max-w-lg w-full shadow-lg">
        <div className="flex items-center justify-between">
          <GlassCard.Title as="h1" className="text-2xl font-semibold tracking-tight text-slate-900">
            Sri Lanka Cloud SaaS HMS
          </GlassCard.Title>
          <StatusBadge status="CLEAN" size="sm" pulse />
        </div>
        <GlassCard.Description className="mt-2 text-sm text-slate-600">
          Apple HIG Liquid Glass & Contactless QR Hospitality Platform
        </GlassCard.Description>

        <div className="mt-6">
          <SegmentedControl
            options={RESIDENCY_TIER_OPTIONS}
            value={tier}
            onChange={setTier}
            fullWidth
            ariaLabel="Residency Tier"
          />
        </div>

        <div className="mt-6 flex items-baseline justify-between border-t border-slate-200/60 pt-4">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            {tier === "RESIDENT_LKR" ? "Sample Resident Rate" : "Sample Foreign Rate"}
          </span>
          <span className="text-lg font-medium tabular-nums-lkr text-slate-900">
            {tier === "RESIDENT_LKR" ? "LKR 45,000.00" : "USD 150.00"}
          </span>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full apple-touch-target py-2 px-4 rounded-xl bg-apple-blue text-white font-medium shadow-sm hover:brightness-105 active:scale-[0.98] transition-apple-spring cursor-pointer"
          >
            Open Booking Sheet
          </button>
        </div>
      </GlassCard>

      <DialogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Direct Reservation Folio"
        description="Select room category and Sri Lankan residency rate"
        footer={
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="apple-touch-target px-4 py-2 rounded-xl bg-apple-blue text-white font-medium hover:brightness-105 transition-apple-spring"
          >
            Confirm
          </button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Room 301 Housekeeping
            </span>
            <StatusBadge status="CLEAN" size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Kitchen KOT Order
            </span>
            <StatusBadge status="IN_PREPARATION" size="sm" pulse />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 pt-2">
            Automated multi-currency billing with LankaQR instant settlement.
          </p>
        </div>
      </DialogModal>
    </main>
  );
}
