import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  type AlertSoundType,
  type SoundError,
  type SoundSettings,
  type UseSoundAlertResult,
  getSoundSettings,
  playOrderBell,
  setMuted,
  setVolume,
  subscribeSoundSettings,
  useSoundAlert,
} from "../src/lib/soundAlert.js";

describe("Web Audio API Harmonic Chime Synthesizer (soundAlert.ts)", () => {
  beforeEach(() => {
    setMuted(false);
    setVolume(0.7);
  });

  afterEach(() => {
    setMuted(false);
    setVolume(0.7);
  });

  describe("Settings & State Store", () => {
    it("updates volume within [0, 1] clamped range", () => {
      setVolume(0.5);
      assert.strictEqual(getSoundSettings().volume, 0.5);

      setVolume(1.5);
      assert.strictEqual(getSoundSettings().volume, 1.0);

      setVolume(-0.2);
      assert.strictEqual(getSoundSettings().volume, 0.0);
    });

    it("toggles muted status and notifies subscribers", () => {
      let notified = 0;
      const unsubscribe = subscribeSoundSettings(() => {
        notified++;
      });

      setMuted(true);
      assert.strictEqual(getSoundSettings().isMuted, true);
      assert.strictEqual(notified, 1);

      setMuted(false);
      assert.strictEqual(getSoundSettings().isMuted, false);
      assert.strictEqual(notified, 2);

      unsubscribe();
      setMuted(true);
      assert.strictEqual(notified, 2);
    });
  });

  describe("Audio Playback (playOrderBell)", () => {
    it("returns error early if alerts are muted", async () => {
      setMuted(true);
      const res = await playOrderBell("NEW_ORDER");
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error.code, "MUTED");
      }
    });

    it("returns AUDIO_CONTEXT_UNAVAILABLE when AudioContext is absent", async () => {
      const res = await playOrderBell("NEW_ORDER");
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error.code, "AUDIO_CONTEXT_UNAVAILABLE");
      }
    });

    it("synthesizes NEW_ORDER chime when AudioContext is mocked", async () => {
      const createdNodes: string[] = [];

      class MockOscillator {
        type = "sine";
        frequency = {
          setValueAtTime: (_val: number, _time: number) => {
            /* mock */
          },
        };
        connect(_dest: unknown) {
          /* mock */
        }
        start(_time: number) {
          createdNodes.push("osc_start");
        }
        stop(_time: number) {
          createdNodes.push("osc_stop");
        }
      }

      class MockGain {
        gain = {
          setValueAtTime: (_val: number, _time: number) => {
            /* mock */
          },
          exponentialRampToValueAtTime: (_val: number, _time: number) => {
            /* mock */
          },
        };
        connect(_dest: unknown) {
          createdNodes.push("gain_connect");
        }
      }

      class MockAudioContext {
        state = "running";
        currentTime = 10.0;
        destination = {};
        createOscillator() {
          return new MockOscillator();
        }
        createGain() {
          return new MockGain();
        }
        resume = async () => {
          /* mock */
        };
      }

      (globalThis as unknown as { window: unknown }).window = {
        AudioContext: MockAudioContext,
      };

      const res = await playOrderBell("NEW_ORDER");
      assert.strictEqual(res.ok, true);
      assert.ok(createdNodes.includes("osc_start"));
      assert.ok(createdNodes.includes("gain_connect"));

      const urgentRes = await playOrderBell("URGENT");
      assert.strictEqual(urgentRes.ok, true);

      const paymentRes = await playOrderBell("PAYMENT_CONFIRMED");
      assert.strictEqual(paymentRes.ok, true);

      (globalThis as unknown as { window?: unknown }).window = undefined;
    });
  });

  describe("React Hook & Types Verification", () => {
    it("exposes useSoundAlert hook and valid types", () => {
      assert.strictEqual(typeof useSoundAlert, "function");

      const soundType: AlertSoundType = "NEW_ORDER";
      assert.strictEqual(soundType, "NEW_ORDER");

      const errVal: SoundError = {
        code: "MUTED",
        message: "Muted",
      };
      assert.strictEqual(errVal.code, "MUTED");

      const settings: SoundSettings = {
        isMuted: false,
        volume: 0.8,
      };
      assert.strictEqual(settings.volume, 0.8);

      const hookRes: UseSoundAlertResult = {
        isMuted: false,
        volume: 0.7,
        setMuted: () => {
          /* mock */
        },
        setVolume: () => {
          /* mock */
        },
        playBell: playOrderBell,
      };
      assert.ok(hookRes);
    });
  });
});
