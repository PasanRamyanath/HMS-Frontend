/**
 * Web Audio API Harmonic Chime Synthesizer for Kitchen KDS & Housekeeping Alerts.
 * Generates subtle Apple glass/marimba acoustic chimes without external audio file dependencies.
 */

import { useSyncExternalStore } from "react";
import { type Result, err, ok } from "./graphqlClient.js";

export type AlertSoundType = "NEW_ORDER" | "URGENT" | "PAYMENT_CONFIRMED";

export interface SoundError {
 readonly code: "AUDIO_CONTEXT_UNAVAILABLE" | "AUTOPLAY_BLOCKED" | "MUTED";
 readonly message: string;
}

export interface SoundSettings {
 readonly isMuted: boolean;
 readonly volume: number; // 0.0 to 1.0
}

interface HarmonicTone {
 readonly freq: number;
 readonly delaySec: number;
 readonly durationSec: number;
 readonly gain: number;
 readonly type?: OscillatorType;
}

const SOUND_PRESETS: Readonly<Record<AlertSoundType, ReadonlyArray<HarmonicTone>>> = {
 // Dual-harmonic glass chime (D5 + F#5 + subtle A5 shimmer)
 NEW_ORDER: [
 { freq: 587.33, delaySec: 0.0, durationSec: 0.8, gain: 0.45, type: "sine" },
 { freq: 739.99, delaySec: 0.04, durationSec: 0.7, gain: 0.35, type: "sine" },
 { freq: 1760.0, delaySec: 0.0, durationSec: 0.3, gain: 0.08, type: "triangle" },
 ],
 // Urgent alert: Crisp attention chime (A5 strike followed by D6 accent)
 URGENT: [
 { freq: 880.0, delaySec: 0.0, durationSec: 0.35, gain: 0.5, type: "sine" },
 { freq: 1174.66, delaySec: 0.12, durationSec: 0.65, gain: 0.55, type: "sine" },
 { freq: 2349.32, delaySec: 0.12, durationSec: 0.25, gain: 0.1, type: "triangle" },
 ],
 // Payment confirmed: Ascending 3-tone harmonic glass chime (C5 -> E5 -> G5)
 PAYMENT_CONFIRMED: [
 { freq: 523.25, delaySec: 0.0, durationSec: 0.5, gain: 0.35, type: "sine" },
 { freq: 659.25, delaySec: 0.1, durationSec: 0.5, gain: 0.38, type: "sine" },
 { freq: 783.99, delaySec: 0.2, durationSec: 0.9, gain: 0.45, type: "sine" },
 { freq: 1567.98, delaySec: 0.2, durationSec: 0.4, gain: 0.08, type: "triangle" },
 ],
};

let activeAudioCtx: AudioContext | null = null;
let currentSettings: SoundSettings = { isMuted: false, volume: 0.7 };
const listeners = new Set<() => void>();

function notifySettingsListeners(): void {
 for (const listener of listeners) {
 listener();
 }
}

export function getSoundSettings(): SoundSettings {
 return currentSettings;
}

export function setMuted(muted: boolean): void {
 currentSettings = { ...currentSettings, isMuted: muted };
 notifySettingsListeners();
}

export function setVolume(volume: number): void {
 const clamped = Math.max(0, Math.min(1, volume));
 currentSettings = { ...currentSettings, volume: clamped };
 notifySettingsListeners();
}

export function subscribeSoundSettings(listener: () => void): () => void {
 listeners.add(listener);
 return () => {
 listeners.delete(listener);
 };
}

function resolveAudioContext(): AudioContext | null {
 if (typeof window === "undefined") return null;

 if (!activeAudioCtx) {
 const AudioContextClass =
 window.AudioContext ||
 (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
 if (AudioContextClass) {
 activeAudioCtx = new AudioContextClass();
 }
 }

 return activeAudioCtx;
}

function playSingleTone(
 ctx: AudioContext,
 tone: HarmonicTone,
 masterGainVal: number,
 startTime: number,
): void {
 const osc = ctx.createOscillator();
 const gainNode = ctx.createGain();

 osc.type = tone.type ?? "sine";
 osc.frequency.setValueAtTime(tone.freq, startTime);

 const toneStart = startTime + tone.delaySec;
 const toneEnd = toneStart + tone.durationSec;
 const peakGain = tone.gain * masterGainVal;

 gainNode.gain.setValueAtTime(0.0001, toneStart);
 gainNode.gain.exponentialRampToValueAtTime(peakGain, toneStart + 0.02);
 gainNode.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

 osc.connect(gainNode);
 gainNode.connect(ctx.destination);

 osc.start(toneStart);
 osc.stop(toneEnd);
}

/**
 * Synthesizes Apple glass acoustic alert chimes using native Web Audio API.
 */
export async function playOrderBell(type: AlertSoundType): Promise<Result<void, SoundError>> {
 if (currentSettings.isMuted) {
 return err({ code: "MUTED", message: "Audio alert is currently muted" });
 }

 const ctx = resolveAudioContext();
 if (!ctx) {
 return err({
 code: "AUDIO_CONTEXT_UNAVAILABLE",
 message: "Web Audio API is not supported in current environment",
 });
 }

 if (ctx.state === "suspended") {
 try {
 await ctx.resume();
 } catch {
 return err({
 code: "AUTOPLAY_BLOCKED",
 message: "Audio context resume was blocked by browser policy",
 });
 }
 }

 const tones = SOUND_PRESETS[type];
 const now = ctx.currentTime;
 const masterGain = currentSettings.volume;

 for (const tone of tones) {
 playSingleTone(ctx, tone, masterGain, now);
 }

 return ok(undefined);
}

export interface UseSoundAlertResult {
 readonly isMuted: boolean;
 readonly volume: number;
 readonly setMuted: (muted: boolean) => void;
 readonly setVolume: (volume: number) => void;
 readonly playBell: (type: AlertSoundType) => Promise<Result<void, SoundError>>;
}

/**
 * React hook for managing sound alert state and triggering harmonic chime playback.
 */
export function useSoundAlert(): UseSoundAlertResult {
 const settings = useSyncExternalStore(subscribeSoundSettings, getSoundSettings, () => ({
 isMuted: false,
 volume: 0.7,
 }));

 return {
 isMuted: settings.isMuted,
 volume: settings.volume,
 setMuted,
 setVolume,
 playBell: playOrderBell,
 };
}
