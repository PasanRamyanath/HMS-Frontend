export function App() {
  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center bg-slate-50">
      <div className="apple-liquid-glass rounded-2xl p-8 max-w-lg w-full shadow-lg">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Sri Lanka Cloud SaaS HMS
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Apple HIG Liquid Glass & Contactless QR Hospitality Platform
        </p>
        <div className="mt-6 flex items-baseline justify-between border-t border-slate-200/60 pt-4">
          <span className="text-xs uppercase tracking-wider text-slate-500">Sample LKR Rate</span>
          <span className="text-lg font-medium tabular-nums-lkr text-slate-900">LKR 45,000.00</span>
        </div>
      </div>
    </main>
  );
}
