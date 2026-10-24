import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Dynamic Platform Theme Color & Palette Selector.
 * Allows hot-swapping the entire platform's primary branding color to any hex color
 * or choosing from curated Ceylon hospitality luxury palettes.
 */

import { type FormEvent, useEffect, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
 DEFAULT_THEME_COLOR,
 PRESET_THEME_PALETTES,
 type ThemePalettePreset,
 applyThemeColor,
 getStoredThemeColor,
 isValidHexColor,
 resetThemeColor,
 subscribeToThemeColor,
} from "../../lib/themeColor.js";

export function ThemeColorPicker() {
 const [activeColor, setActiveColor] = useState<string>(getStoredThemeColor);
 const [customInput, setCustomInput] = useState<string>(activeColor);
 const [customError, setCustomError] = useState<string | null>(null);
 const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

 useEffect(() => {
 return subscribeToThemeColor((color) => {
 setActiveColor(color);
 setCustomInput(color);
 });
 }, []);

 const handleSelectPreset = (preset: ThemePalettePreset) => {
 applyThemeColor(preset.hex);
 setActiveColor(preset.hex);
 setCustomInput(preset.hex);
 setCustomError(null);
 setFeedbackMessage(`Theme updated to ${preset.name} (${preset.hex})`);
 setTimeout(() => setFeedbackMessage(null), 3000);
 };

 const handleCustomSubmit = (event: FormEvent<HTMLFormElement>) => {
 event.preventDefault();
 if (!isValidHexColor(customInput)) {
 setCustomError("Please enter a valid 3 or 6-digit hex code (e.g. #0D7450).");
 return;
 }
 setCustomError(null);
 applyThemeColor(customInput);
 setActiveColor(customInput);
 setFeedbackMessage(`Custom theme applied: ${customInput.toUpperCase()}`);
 setTimeout(() => setFeedbackMessage(null), 3000);
 };

 const handleReset = () => {
 resetThemeColor();
 setActiveColor(DEFAULT_THEME_COLOR);
 setCustomInput(DEFAULT_THEME_COLOR);
 setCustomError(null);
 setFeedbackMessage("Reset to Ceylon Botanical Emerald default.");
 setTimeout(() => setFeedbackMessage(null), 3000);
 };

 return (
 <GlassCard material="regular" className="p-5 sm:p-6 space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
 <div>
 <div className="flex items-center gap-2.5">
 <div
 className="w-4 h-4 rounded-full shadow-inner border border-white/60 "
 style={{ backgroundColor: activeColor }}
 />
 <h3 className="text-base font-bold text-slate-900 tracking-tight">
 Platform Theme & Brand Palette
 </h3>
 <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 ">
 {activeColor.toUpperCase()}
 </span>
 </div>
 <p className="text-xs text-slate-500 mt-1">
 Choose a curated Ceylon hospitality luxury palette or set any custom brand color.
 Changes take effect platform-wide immediately.
 </p>
 </div>

 <button
 type="button"
 onClick={handleReset}
 className="self-start sm:self-auto text-xs px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors font-medium min-h-[36px] cursor-pointer flex items-center gap-1.5"
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
 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
 />
 </svg>
 Reset Default
 </button>
 </div>

 {feedbackMessage && (
 <output
 aria-live="polite"
 className="p-3 rounded-xl border text-xs font-medium flex items-center gap-2 animate-fadeIn block"
 style={{
 backgroundColor: "var(--brand-surface)",
 borderColor: "var(--brand-border)",
 color: "var(--brand-text)",
 }}
 >
 <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeColor }} />
 <span>{feedbackMessage}</span>
 </output>
 )}

 {/* Preset Palettes Grid */}
 <div>
 <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
 Curated Ceylon Luxury Palettes
 </span>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
 {PRESET_THEME_PALETTES.map((preset) => {
 const isSelected = activeColor.toLowerCase() === preset.hex.toLowerCase();
 return (
 <button
 key={preset.id}
 type="button"
 onClick={() => handleSelectPreset(preset)}
 className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between min-h-[96px] ${
 isSelected
 ? "border-slate-900 shadow-md bg-white ring-2"
 : "border-slate-200/80 bg-white/60 hover:border-slate-300 hover:bg-white "
 }`}
 style={{
 outlineColor: isSelected ? preset.hex : undefined,
 }}
 >
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-2">
 <span
 className="w-5 h-5 rounded-full flex items-center justify-center text-slate-900 text-[10px] shadow-sm shrink-0 font-bold border border-white/50"
 style={{ backgroundColor: preset.hex }}
 >
 {isSelected ? "OK" : ""}
 </span>
 <span className="text-sm font-bold text-slate-900 leading-tight">
 <DynamicTokenIcon token={preset.emoji} /> {preset.name}
 </span>
 </div>
 <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 ">
 {preset.hex}
 </span>
 </div>
 <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
 {preset.subtitle}
 </p>
 </button>
 );
 })}
 </div>
 </div>

 {/* Custom Color Selector & Live Preview */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-slate-200/60 ">
 {/* Custom Hex Picker Form */}
 <div>
 <label
 htmlFor="custom-hex-code"
 className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
 >
 Custom Hex Code
 </label>
 <form onSubmit={handleCustomSubmit} className="space-y-3">
 <div className="flex items-center gap-2.5">
 <div className="relative">
 <input
 type="color"
 aria-label="Color Picker"
 value={isValidHexColor(customInput) ? customInput : activeColor}
 onChange={(e) => {
 setCustomInput(e.target.value);
 setCustomError(null);
 }}
 className="w-11 h-11 rounded-xl cursor-pointer border border-slate-300 p-1 bg-transparent"
 title="Pick a custom color"
 />
 </div>

 <input
 id="custom-hex-code"
 type="text"
 value={customInput}
 onChange={(e) => {
 setCustomInput(e.target.value);
 setCustomError(null);
 }}
 placeholder="#0D7450"
 maxLength={9}
 className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/70 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 min-h-[44px]"
 style={{ outlineColor: activeColor }}
 />

 <button
 type="submit"
 className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-900 shadow-sm transition-all cursor-pointer min-h-[44px]"
 style={{ backgroundColor: activeColor }}
 >
 Apply
 </button>
 </div>

 {customError && (
 <p className="text-xs text-rose-500 font-medium">{customError}</p>
 )}

 <p className="text-[11px] text-slate-500 ">
 Any valid RGB hex format (e.g. <span className="font-mono">#0D7450</span>,{" "}
 <span className="font-mono">#1E293B</span>, <span className="font-mono">#0284C7</span>
 ) is supported. Contrast ratios and light/dark surface tints are calculated
 automatically.
 </p>
 </form>
 </div>

 {/* Live Interactive UI Preview */}
 <div>
 <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
 Live Preview Across Components
 </span>
 <div className="p-4 rounded-2xl border border-slate-200 bg-white/70 space-y-3.5">
 <div className="flex flex-wrap items-center gap-2">
 <button
 type="button"
 className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-900 shadow-sm transition-all"
 style={{ backgroundColor: activeColor }}
 >
 Primary Button
 </button>

 <button
 type="button"
 className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all"
 style={{
 borderColor: "var(--brand-border)",
 color: "var(--brand-text)",
 backgroundColor: "var(--brand-surface)",
 }}
 >
 Secondary Surface
 </button>

 <span
 className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
 style={{
 backgroundColor: "var(--brand-surface)",
 color: "var(--brand-text)",
 border: "1px solid var(--brand-border)",
 }}
 >
 Active Badge
 </span>
 </div>

 {/* Simulated Active Nav Item */}
 <div
 className="rounded-xl p-2.5 text-xs font-semibold text-slate-900 flex items-center justify-between shadow-sm"
 style={{ backgroundColor: activeColor }}
 >
 <div className="flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
 <span>Simulated Active Navigation Item</span>
 </div>
 <span className="text-[10px] bg-slate-50 px-2 py-0.5 rounded-md">Live</span>
 </div>
 </div>
 </div>
 </div>
 </GlassCard>
 );
}
