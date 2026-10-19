import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

describe("Apple HIG & Sri Lankan Statutory @media print Stylesheets (apple-hig-theme.css)", () => {
  const cssPath = path.resolve(process.cwd(), "src/styles/apple-hig-theme.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  it("defines @media print block with glass stripping", () => {
    assert.ok(cssContent.includes("@media print"), "Must define @media print block");
    assert.ok(
      cssContent.includes("backdrop-filter: none !important"),
      "Must strip backdrop-filter blur on print",
    );
    assert.ok(
      cssContent.includes("background-color: transparent !important") ||
        cssContent.includes("background-color: #ffffff !important"),
      "Must strip vibrant backgrounds on print",
    );
  });

  it("defines .no-print utility to suppress interactive elements", () => {
    assert.ok(cssContent.includes(".no-print"), "Must define .no-print class");
    assert.ok(cssContent.includes("display: none !important"), "Must hide .no-print on print");
  });

  it("defines .print-80mm-receipt utility for thermal KDS and POS slips", () => {
    assert.ok(cssContent.includes(".print-80mm-receipt"), "Must define .print-80mm-receipt class");
    assert.ok(
      cssContent.includes("72mm") || cssContent.includes("80mm"),
      "Must specify thermal receipt width",
    );
    assert.ok(cssContent.includes(".print-80mm-divider"), "Must define receipt dashed divider");
  });

  it("defines .print-a4-invoice utility for SLTDA and IRD RAMIS tax folios", () => {
    assert.ok(cssContent.includes(".print-a4-invoice"), "Must define .print-a4-invoice class");
    assert.ok(
      cssContent.includes("page-break-inside: avoid") || cssContent.includes("break-inside: avoid"),
      "Must manage page breaks for table rows and invoice blocks",
    );
    assert.ok(
      cssContent.includes(".print-a4-invoice-totals"),
      "Must define invoice totals section",
    );
  });
});
