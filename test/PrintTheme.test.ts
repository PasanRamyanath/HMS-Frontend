import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

describe("Apple HIG & Sri Lankan Statutory @media print Stylesheets (apple-hig-theme.css & styles.css)", () => {
  const themeCssPath = path.resolve(process.cwd(), "src/styles/apple-hig-theme.css");
  const stylesCssPath = path.resolve(process.cwd(), "src/styles.css");
  const themeContent = fs.readFileSync(themeCssPath, "utf-8");
  const stylesContent = fs.readFileSync(stylesCssPath, "utf-8");

  const targets: Array<[string, string]> = [
    ["apple-hig-theme.css", themeContent],
    ["styles.css", stylesContent],
  ];

  it("defines @media print block with glass stripping in both files", () => {
    for (const [name, content] of targets) {
      assert.ok(content.includes("@media print"), `${name} must define @media print block`);
      assert.ok(
        content.includes("backdrop-filter: none !important"),
        `${name} must strip backdrop-filter blur on print`,
      );
      assert.ok(
        content.includes("background-color: transparent !important") ||
          content.includes("background-color: #ffffff !important"),
        `${name} must strip vibrant backgrounds on print`,
      );
    }
  });

  it("defines .no-print and suppresses navigation chrome", () => {
    for (const [name, content] of targets) {
      assert.ok(content.includes(".no-print"), `${name} must define .no-print class`);
      assert.ok(
        content.includes("display: none !important"),
        `${name} must hide .no-print on print`,
      );
      assert.ok(content.includes("button,"), `${name} must hide interactive buttons on print`);
      assert.ok(content.includes("nav,"), `${name} must hide navigation on print`);
    }
  });

  it("defines .print-80mm-receipt utility for thermal KDS and POS slips", () => {
    for (const [name, content] of targets) {
      assert.ok(
        content.includes(".print-80mm-receipt"),
        `${name} must define .print-80mm-receipt class`,
      );
      assert.ok(
        content.includes("72mm") || content.includes("80mm"),
        `${name} must specify thermal receipt width`,
      );
      assert.ok(
        content.includes(".print-80mm-divider"),
        `${name} must define receipt dashed divider`,
      );
    }
  });

  it("defines .print-a4-invoice utility for SLTDA and IRD RAMIS tax folios", () => {
    for (const [name, content] of targets) {
      assert.ok(
        content.includes(".print-a4-invoice"),
        `${name} must define .print-a4-invoice class`,
      );
      assert.ok(
        content.includes("page-break-inside: avoid") || content.includes("break-inside: avoid"),
        `${name} must manage page breaks for table rows and invoice blocks`,
      );
      assert.ok(
        content.includes(".print-a4-invoice-totals"),
        `${name} must define invoice totals section`,
      );
    }
  });
});
