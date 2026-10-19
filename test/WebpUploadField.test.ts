import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type PresignedUploadDetails,
  WebpUploadField,
  type WebpUploadFieldProps,
  type WebpUploadResult,
  calculateSavingsPercent,
  formatFileSize,
  getAspectGuideClasses,
  processAndUploadWebp,
  uploadToPresignedUrl,
} from "../src/components/WebpUploadField.js";

describe("Apple HIG Drag-and-Drop WebP Image Uploader (WebpUploadField.tsx)", () => {
  describe("Telemetry & Formatting Utilities", () => {
    it("formats file sizes cleanly across B, KB, and MB scales", () => {
      assert.strictEqual(formatFileSize(512), "512 B");
      assert.strictEqual(formatFileSize(1024), "1.0 KB");
      assert.strictEqual(formatFileSize(1024 * 64), "64.0 KB");
      assert.strictEqual(formatFileSize(1024 * 1024 * 2.5), "2.5 MB");
    });

    it("calculates compression savings percentage correctly", () => {
      assert.strictEqual(calculateSavingsPercent(1000, 200), 80);
      assert.strictEqual(calculateSavingsPercent(500000, 50000), 90);
      assert.strictEqual(calculateSavingsPercent(100, 150), 0);
      assert.strictEqual(calculateSavingsPercent(0, 100), 0);
    });

    it("returns correct aspect ratio guides for presets", () => {
      const banner = getAspectGuideClasses("BANNER_1200x400");
      assert.ok(banner.wrapper.includes("aspect-[3/1]"));
      assert.ok(banner.guideText.includes("3:1"));

      const square = getAspectGuideClasses("SQUARE_500");
      assert.ok(square.wrapper.includes("aspect-square"));
      assert.ok(square.guideText.includes("1:1"));

      const icon = getAspectGuideClasses("ICON_96");
      assert.ok(icon.wrapper.includes("aspect-square"));
      assert.ok(icon.guideText.includes("96×96"));
    });
  });

  describe("Presigned S3 PUT Upload (uploadToPresignedUrl)", () => {
    it("executes fetch PUT and returns success status", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
          assert.strictEqual(init?.method, "PUT");
          return new Response(null, { status: 200 });
        }) as typeof fetch;

        const fakeBlob = new Blob(["mock-image-data"], { type: "image/webp" });
        const success = await uploadToPresignedUrl(
          "https://s3.ap-south-1.amazonaws.com/test",
          fakeBlob,
        );
        assert.ok(success);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("handles HTTP failure from S3 presigned endpoint", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = (async () => {
          return new Response("Access Denied", { status: 403 });
        }) as typeof fetch;

        const fakeBlob = new Blob(["mock-image-data"], { type: "image/webp" });
        const success = await uploadToPresignedUrl(
          "https://s3.ap-south-1.amazonaws.com/test",
          fakeBlob,
        );
        assert.strictEqual(success, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("handles non-image files gracefully in processAndUploadWebp", async () => {
      const textFile = new File(["not an image"], "test.txt", { type: "text/plain" });
      const res = await processAndUploadWebp(textFile, "SQUARE_500");
      assert.strictEqual(res.success, false);
      assert.ok(res.error.includes("Compression error"));
    });
  });

  describe("Static HTML Markup Rendering", () => {
    it("renders default upload dropzone placeholder with squircle styles", () => {
      const markup = renderToStaticMarkup(
        React.createElement(WebpUploadField, {
          label: "Room Hero Image",
          description: "Upload 500x500 squircle photo",
          preset: "SQUARE_500",
        }),
      );

      assert.ok(markup.includes("Room Hero Image"));
      assert.ok(markup.includes("1:1 Thumbnail (500×500)"));
      assert.ok(markup.includes("squircle-lg"));
      assert.ok(markup.includes('type="file"'));
      assert.ok(markup.includes('accept="image/jpeg,image/png,image/webp,image/avif"'));
    });

    it("renders preview image when currentImageUrl is provided", () => {
      const markup = renderToStaticMarkup(
        React.createElement(WebpUploadField, {
          label: "Property Banner",
          preset: "BANNER_1200x400",
          currentImageUrl: "https://cdn.hms.lk/banner.webp",
        }),
      );

      assert.ok(markup.includes("<img"));
      assert.ok(markup.includes('src="https://cdn.hms.lk/banner.webp"'));
      assert.ok(markup.includes("aspect-[3/1]"));
    });

    it("renders disabled state on upload field", () => {
      const markup = renderToStaticMarkup(
        React.createElement(WebpUploadField, {
          label: "Disabled Field",
          disabled: true,
        }),
      );

      assert.ok(markup.includes("pointer-events-none"));
      assert.ok(markup.includes('aria-disabled="true"'));
    });
  });

  describe("Type Definitions & Verification", () => {
    it("validates all exported interfaces and types are constructible", () => {
      const _presigned: PresignedUploadDetails = {
        uploadUrl: "https://upload.url",
        finalUrl: "https://final.url",
      };

      const _result: WebpUploadResult = {
        url: "https://final.url",
        originalBytes: 1024 * 500,
        compressedBytes: 1024 * 50,
        width: 500,
        height: 500,
        savingsPercent: 90,
      };

      const _props: WebpUploadFieldProps = {
        preset: "SQUARE_500",
        label: "Photo",
        description: "Upload photo",
        currentImageUrl: "https://img.url",
        getPresignedUploadUrl: async () => _presigned,
        onUploadSuccess: () => undefined,
        onUploadError: () => undefined,
        disabled: false,
        className: "custom-upload",
      };

      assert.strictEqual(_presigned.uploadUrl, "https://upload.url");
      assert.strictEqual(_result.savingsPercent, 90);
      assert.strictEqual(_props.preset, "SQUARE_500");
    });
  });
});
