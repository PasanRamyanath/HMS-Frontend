import { useState } from "react";
import { GlassCard } from "./components/GlassCard.js";
import { RESIDENCY_TIER_OPTIONS, SegmentedControl } from "./components/SegmentedControl.js";

export function App() {
  const [tier, setTier] = useState<"RESIDENT_LKR" | "FOREIGN_USD">("RESIDENT_LKR");

  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center bg-slate-50">
      <GlassCard material="regular" radius="xl" className="p-8 max-w-lg w-full shadow-lg">
        <GlassCard.Title as="h1" className="text-2xl font-semibold tracking-tight text-slate-900">
          Sri Lanka Cloud SaaS HMS
        </GlassCard.Title>
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
      </GlassCard>
    </main>
  );
}
