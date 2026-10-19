import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import vm from "node:vm";

class MockElement {
  tagName: string;
  id = "";
  className = "";
  textContent = "";
  innerHTML = "";
  href = "";
  target = "";
  rel = "";
  type = "";
  attributes: Record<string, string> = {};
  children: MockElement[] = [];
  listeners: Record<string, (() => void)[]> = {};
  classList = {
    add: (cls: string) => {
      this.className += ` ${cls}`;
    },
  };

  constructor(tagName: string) {
    this.tagName = tagName;
  }

  setAttribute(name: string, val: string) {
    this.attributes[name] = val;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] || null;
  }

  appendChild(child: MockElement): MockElement {
    this.children.push(child);
    return child;
  }

  addEventListener(type: string, fn: () => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type]?.push(fn);
  }
}

describe("Embeddable Direct Booking Widget (booking-widget.js)", () => {
  const widgetPath = path.resolve(process.cwd(), "public/booking-widget.js");
  const widgetCode = fs.readFileSync(widgetPath, "utf-8");

  it("verifies public/booking-widget.js exists and is non-empty", () => {
    assert.ok(fs.existsSync(widgetPath));
    assert.ok(widgetCode.length > 200);
  });

  it("strictly enforces zero console.log, console.error, or debugger noise", () => {
    assert.strictEqual(widgetCode.includes("console.log"), false);
    assert.strictEqual(widgetCode.includes("console.error"), false);
    assert.strictEqual(widgetCode.includes("console.warn"), false);
    assert.strictEqual(widgetCode.includes("debugger"), false);
  });

  it("enforces Apple Human Interface Guidelines Liquid Glass and spring transition styles", () => {
    assert.ok(widgetCode.includes("backdrop-filter: blur(24px) saturate(180%)"));
    assert.ok(widgetCode.includes("prefers-reduced-transparency: reduce"));
    assert.ok(widgetCode.includes("cubic-bezier(0.22, 1, 0.36, 1)"));
    assert.ok(widgetCode.includes("min-height: 44px"));
  });

  it("executes cleanly in a sandboxed DOM environment and mounts widget structure", () => {
    const appendedHeadElements: MockElement[] = [];
    const appendedBodyElements: MockElement[] = [];

    const scriptAttributes: Record<string, string> = {
      "data-tenant": "tenant-mirissa-bay",
      "data-hotel-name": "Mirissa Bay Luxury Surf Villa",
      "data-discount": "20%",
      "data-accent": "#007aff",
      "data-base-url": "https://book.mirissabay.lk",
    };

    const mockScript = {
      getAttribute(attr: string): string | null {
        return scriptAttributes[attr] ?? null;
      },
      src: "https://book.mirissabay.lk/booking-widget.js",
    };

    const mockDocument = {
      currentScript: mockScript,
      readyState: "complete",
      getElementById(id: string) {
        return id === "hms-booking-widget-container" ? null : null;
      },
      querySelector() {
        return mockScript;
      },
      createElement(tag: string) {
        return new MockElement(tag);
      },
      head: {
        appendChild(el: MockElement) {
          appendedHeadElements.push(el);
        },
      },
      body: {
        contains() {
          return false;
        },
        appendChild(el: MockElement) {
          appendedBodyElements.push(el);
        },
      },
      addEventListener() {
        /* No-op event listener */
      },
    };

    const sandbox = {
      document: mockDocument,
      URL: globalThis.URL,
      encodeURIComponent: globalThis.encodeURIComponent,
    };

    vm.createContext(sandbox);
    vm.runInContext(widgetCode, sandbox);

    // Verify style injected
    assert.strictEqual(appendedHeadElements.length, 1);
    assert.strictEqual(appendedHeadElements[0]?.id, "hms-booking-widget-style");

    // Verify container mounted
    assert.strictEqual(appendedBodyElements.length, 1);
    const container = appendedBodyElements[0];
    assert.ok(container);
    assert.strictEqual(container.id, "hms-booking-widget-container");
    assert.strictEqual(container.attributes.role, "complementary");
    assert.strictEqual(container.children.length, 1);

    const bar = container.children[0];
    assert.ok(bar);
    assert.strictEqual(bar.className, "hms-bw-glass-bar");
    assert.strictEqual(bar.children.length, 4);

    // 1. Badge
    const badge = bar.children[0];
    assert.ok(badge);
    assert.strictEqual(badge.textContent, "Save 20%");

    // 2. Text block
    const textBlock = bar.children[1];
    assert.ok(textBlock);
    assert.strictEqual(textBlock.children[0]?.textContent, "Book Direct & Save");
    assert.ok(textBlock.children[1]?.textContent.includes("Mirissa Bay Luxury Surf Villa"));

    // 3. CTA button
    const ctaBtn = bar.children[2];
    assert.ok(ctaBtn);
    assert.strictEqual(ctaBtn.href, "https://book.mirissabay.lk/book/tenant-mirissa-bay");
    assert.strictEqual(ctaBtn.target, "_blank");

    // 4. Close button
    const closeBtn = bar.children[3];
    assert.ok(closeBtn);
    assert.strictEqual(closeBtn.attributes["aria-label"], "Dismiss direct booking bar");

    // Test dismissal
    assert.ok(!container.className.includes("hms-bw-hidden"));
    closeBtn.listeners.click?.[0]?.();
    assert.ok(container.className.includes("hms-bw-hidden"));
  });
});
