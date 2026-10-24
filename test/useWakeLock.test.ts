/**
 * Unit Tests for Step 297: Screen Wake-Lock Helper & Hook (useWakeLock.ts)
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type UseWakeLockOptions,
  type UseWakeLockResult,
  type WakeLockError,
  type WakeLockErrorCode,
  type WakeLockState,
  type WakeLockStatus,
  acquireScreenWakeLock,
  formatWakeLockStatusLabel,
  getWakeLockBadgeColor,
  isWakeLockSupported,
  releaseScreenWakeLock,
  useWakeLock,
} from "../src/lib/useWakeLock.js";

// Minimal mock event target for Sentinel
class MockWakeLockSentinel {
  released = false;
  readonly type = "screen";
  private listeners: Record<string, Array<() => void>> = {};

  addEventListener(type: string, listener: () => void, _opts?: { once?: boolean }): void {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type]?.push(listener);
  }

  removeEventListener(type: string, listener: () => void): void {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type]?.filter((l) => l !== listener) ?? [];
    }
  }

  async release(): Promise<void> {
    this.released = true;
    const releaseListeners = this.listeners.release ?? [];
    for (const listener of releaseListeners) {
      listener();
    }
  }
}

describe("Step 297: Screen Wake-Lock Helper (useWakeLock.ts)", () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    // Restore global navigator
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  // --------------------------------------------------------------------------
  // 1. Feature Detection
  // --------------------------------------------------------------------------
  describe("1. Feature Detection (isWakeLockSupported)", () => {
    it("returns false when navigator.wakeLock is undefined", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: {},
        configurable: true,
        writable: true,
      });
      assert.strictEqual(isWakeLockSupported(), false);
    });

    it("returns true when navigator.wakeLock.request is a valid function", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: {
          wakeLock: {
            request: async () => new MockWakeLockSentinel(),
          },
        },
        configurable: true,
        writable: true,
      });
      assert.strictEqual(isWakeLockSupported(), true);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Pure Helper: acquireScreenWakeLock
  // --------------------------------------------------------------------------
  describe("2. Low-Level Sentinel Acquisition", () => {
    it("returns UNSUPPORTED error when wakeLock API is missing", async () => {
      Object.defineProperty(globalThis, "navigator", {
        value: {},
        configurable: true,
        writable: true,
      });

      const res = await acquireScreenWakeLock();
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error.code, "UNSUPPORTED");
      }
    });

    it("acquires sentinel successfully when supported", async () => {
      const mockSentinel = new MockWakeLockSentinel();
      Object.defineProperty(globalThis, "navigator", {
        value: {
          wakeLock: {
            request: async (_type: string) => mockSentinel,
          },
        },
        configurable: true,
        writable: true,
      });

      const res = await acquireScreenWakeLock();
      assert.strictEqual(res.ok, true);
      if (res.ok) {
        assert.strictEqual(res.value.released, false);
      }
    });

    it("maps NotAllowedError to PERMISSION_DENIED", async () => {
      const notAllowed = new Error("Wake lock permission denied by user or OS battery saver");
      notAllowed.name = "NotAllowedError";

      Object.defineProperty(globalThis, "navigator", {
        value: {
          wakeLock: {
            request: async () => {
              throw notAllowed;
            },
          },
        },
        configurable: true,
        writable: true,
      });

      const res = await acquireScreenWakeLock();
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error.code, "PERMISSION_DENIED");
      }
    });

    it("maps other runtime exceptions to ACQUISITION_FAILED", async () => {
      Object.defineProperty(globalThis, "navigator", {
        value: {
          wakeLock: {
            request: async () => {
              throw new Error("Screen wake lock request failed");
            },
          },
        },
        configurable: true,
        writable: true,
      });

      const res = await acquireScreenWakeLock();
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error.code, "ACQUISITION_FAILED");
      }
    });
  });

  // --------------------------------------------------------------------------
  // 3. Pure Helper: releaseScreenWakeLock
  // --------------------------------------------------------------------------
  describe("3. Low-Level Sentinel Release", () => {
    it("returns NOT_ACTIVE error if sentinel is null or undefined", async () => {
      const res = await releaseScreenWakeLock(null as unknown as WakeLockSentinel);
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error.code, "NOT_ACTIVE");
      }
    });

    it("releases sentinel and returns ok(undefined)", async () => {
      const sentinel = new MockWakeLockSentinel();
      const res = await releaseScreenWakeLock(sentinel as unknown as WakeLockSentinel);

      assert.strictEqual(res.ok, true);
      assert.strictEqual(sentinel.released, true);
    });

    it("handles release exceptions gracefully with RELEASE_FAILED", async () => {
      const faultySentinel = {
        release: async () => {
          throw new Error("Device driver communication error");
        },
      };

      const res = await releaseScreenWakeLock(faultySentinel as unknown as WakeLockSentinel);
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error.code, "RELEASE_FAILED");
      }
    });
  });

  // --------------------------------------------------------------------------
  // 4. Trilingual Status Labels & Apple HIG Styling
  // --------------------------------------------------------------------------
  describe("4. Trilingual Status Labels & Apple HIG Styling", () => {
    it("formats trilingual status labels accurately across en, si, and ta", () => {
      assert.strictEqual(
        formatWakeLockStatusLabel("active", "en"),
        "Display Kept Awake (Sleep Prevented)",
      );
      assert.strictEqual(formatWakeLockStatusLabel("active", "si"), "තිරය සක්රීයයි (නිද්රාව වළක්වා ඇත)");
      assert.strictEqual(
        formatWakeLockStatusLabel("active", "ta"),
        "திரை விழித்திருக்கிறது (தூக்கம் தடுக்கப்பட்டது)",
      );

      assert.strictEqual(formatWakeLockStatusLabel("released", "en"), "Display Sleep Allowed");
      assert.strictEqual(formatWakeLockStatusLabel("released", "si"), "තිර නිද්රාව සක්රීයයි");
      assert.strictEqual(formatWakeLockStatusLabel("released", "ta"), "திரை தூங்க அனுமதிக்கப்பட்டது");

      assert.strictEqual(formatWakeLockStatusLabel("unsupported", "en"), "Wake-Lock Unavailable");
      assert.strictEqual(formatWakeLockStatusLabel("error", "en"), "Wake-Lock Error");
      assert.strictEqual(formatWakeLockStatusLabel("idle", "en"), "Standby (Inactive)");
    });

    it("assigns Apple HIG dynamic colors to status pills", () => {
      assert.strictEqual(
        getWakeLockBadgeColor("active"),
        "bg-[#34C759]/15 text-[#34C759] border-[#34C759]/30",
      );
      assert.strictEqual(
        getWakeLockBadgeColor("error"),
        "bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/30",
      );
      assert.strictEqual(
        getWakeLockBadgeColor("unsupported"),
        "bg-[#8E8E93]/15 text-[#8E8E93] border-[#8E8E93]/30",
      );
      assert.strictEqual(
        getWakeLockBadgeColor("idle"),
        "bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30",
      );
      assert.strictEqual(
        getWakeLockBadgeColor("released"),
        "bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30",
      );
    });
  });

  // --------------------------------------------------------------------------
  // 5. React 19 Hook (useWakeLock) Server / Component Rendering
  // --------------------------------------------------------------------------
  describe("5. React 19 Hook (useWakeLock) Component Rendering", () => {
    it("renders component consuming useWakeLock without crashing", () => {
      function TestWakeLockComponent() {
        const { isSupported, status } = useWakeLock();
        return React.createElement(
          "div",
          { className: "wake-lock-pill" },
          `Supported: ${isSupported}, Status: ${status}`,
        );
      }

      const markup = renderToStaticMarkup(React.createElement(TestWakeLockComponent));
      assert.ok(markup.includes("wake-lock-pill"));
      assert.ok(markup.includes("Supported:"));
    });

    it("conforms to TypeScript type contracts for options and state", () => {
      const options: UseWakeLockOptions = {
        autoAcquire: false,
        reacquireOnVisibilityChange: true,
        onRelease: () => undefined,
        onError: (_err: WakeLockError) => undefined,
      };
      assert.strictEqual(options.autoAcquire, false);

      const status: WakeLockStatus = "active";
      const errCode: WakeLockErrorCode = "UNSUPPORTED";
      const error: WakeLockError = { code: errCode, message: "Test error" };
      const state: WakeLockState = {
        isSupported: true,
        isActive: true,
        status,
        error,
      };
      assert.strictEqual(state.isActive, true);

      function ConsumerComponent() {
        const result: UseWakeLockResult = useWakeLock(options);
        return React.createElement("span", null, result.status);
      }
      const markup = renderToStaticMarkup(React.createElement(ConsumerComponent));
      assert.ok(markup.includes("span"));
    });
  });
});
