import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type CompressOptions,
  type CompressedWebpResult,
  type CropRect,
  type ImagePreset,
  type ImageProcessingError,
  PRESET_CONFIGS,
  type PresetDimensions,
  applySquircleClip,
  compressAndCropToWebp,
  computeCenterCrop,
} from "../src/lib/imageWebp.js";

describe("HTML5 Canvas WebP Resizer & Squircle Cropper (imageWebp.ts)", () => {
  describe("Preset Configurations", () => {
    it("enforces strict dimensions and <100 KB budget across presets", () => {
      const square = PRESET_CONFIGS.SQUARE_500;
      assert.strictEqual(square.width, 500);
      assert.strictEqual(square.height, 500);
      assert.strictEqual(square.quality, 0.82);
      assert.strictEqual(square.maxBytes, 102400);

      const banner = PRESET_CONFIGS.BANNER_1200x400;
      assert.strictEqual(banner.width, 1200);
      assert.strictEqual(banner.height, 400);
      assert.strictEqual(banner.quality, 0.82);
      assert.strictEqual(banner.maxBytes, 102400);

      const icon = PRESET_CONFIGS.ICON_96;
      assert.strictEqual(icon.width, 96);
      assert.strictEqual(icon.height, 96);
      assert.strictEqual(icon.quality, 0.82);
      assert.strictEqual(icon.maxBytes, 51200);
    });
  });

  describe("Center-Crop Aspect Ratio Math (computeCenterCrop)", () => {
    it("crops width horizontally for wide landscape source into 1:1 square", () => {
      const crop = computeCenterCrop(1920, 1080, 500, 500);
      assert.strictEqual(crop.sHeight, 1080);
      assert.strictEqual(crop.sWidth, 1080);
      assert.strictEqual(crop.sx, 420);
      assert.strictEqual(crop.sy, 0);
    });

    it("crops height vertically for tall portrait source into 1:1 square", () => {
      const crop = computeCenterCrop(1080, 1920, 500, 500);
      assert.strictEqual(crop.sWidth, 1080);
      assert.strictEqual(crop.sHeight, 1080);
      assert.strictEqual(crop.sx, 0);
      assert.strictEqual(crop.sy, 420);
    });

    it("centers source perfectly for 3:1 banner aspect ratio", () => {
      const crop = computeCenterCrop(1200, 800, 1200, 400);
      assert.strictEqual(crop.sWidth, 1200);
      assert.strictEqual(crop.sHeight, 400);
      assert.strictEqual(crop.sx, 0);
      assert.strictEqual(crop.sy, 200);
    });

    it("handles degenerate or zero dimensions safely", () => {
      const crop = computeCenterCrop(0, 0, 500, 500);
      assert.deepStrictEqual(crop, { sx: 0, sy: 0, sWidth: 0, sHeight: 0 });
    });
  });

  describe("Squircle Path Tracing (applySquircleClip)", () => {
    it("traces continuous squircle path and calls clip", () => {
      const recordedCalls: string[] = [];
      const mockCtx = {
        beginPath: () => {
          recordedCalls.push("beginPath");
        },
        moveTo: () => {
          recordedCalls.push("moveTo");
        },
        lineTo: () => {
          recordedCalls.push("lineTo");
        },
        arcTo: () => {
          recordedCalls.push("arcTo");
        },
        closePath: () => {
          recordedCalls.push("closePath");
        },
        clip: () => {
          recordedCalls.push("clip");
        },
      } as unknown as CanvasRenderingContext2D;

      applySquircleClip(mockCtx, 500, 500, 48);

      assert.ok(recordedCalls.includes("beginPath"));
      assert.ok(recordedCalls.includes("clip"));
      assert.ok(recordedCalls.includes("closePath"));
    });
  });

  describe("Image Compression & Error Handling (compressAndCropToWebp)", () => {
    it("rejects invalid or non-blob inputs", async () => {
      const res = await compressAndCropToWebp(null as unknown as Blob, "SQUARE_500");
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error.code, "UNSUPPORTED_INPUT");
      }
    });

    it("handles missing createImageBitmap runtime gracefully", async () => {
      const dummyBlob = new Blob(["test-image-content"], { type: "image/png" });
      const res = await compressAndCropToWebp(dummyBlob, "SQUARE_500");
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error.code, "BITMAP_CREATION_FAILED");
      }
    });

    it("successfully creates WebP blob when canvas and createImageBitmap are mocked", async () => {
      const mockBlob = new Blob(["mock-webp-bytes"], { type: "image/webp" });

      const originalCreateBitmap = (globalThis as unknown as { createImageBitmap?: unknown })
        .createImageBitmap;
      const originalDoc = (globalThis as unknown as { document?: unknown }).document;

      (globalThis as unknown as { createImageBitmap: unknown }).createImageBitmap = async () => ({
        width: 1000,
        height: 1000,
        close: () => {
          /* no-op */
        },
      });

      const mockCanvas = {
        width: 500,
        height: 500,
        getContext: () => ({
          beginPath: () => {
            /* no-op */
          },
          moveTo: () => {
            /* no-op */
          },
          lineTo: () => {
            /* no-op */
          },
          arcTo: () => {
            /* no-op */
          },
          closePath: () => {
            /* no-op */
          },
          clip: () => {
            /* no-op */
          },
          drawImage: () => {
            /* no-op */
          },
          imageSmoothingEnabled: true,
          imageSmoothingQuality: "high",
        }),
        toBlob: (cb: (blob: Blob | null) => void) => {
          cb(mockBlob);
        },
      };

      (globalThis as unknown as { document: unknown }).document = {
        createElement: (tag: string) => {
          if (tag === "canvas") return mockCanvas;
          return {};
        },
      };

      const sourceBlob = new Blob(["source-bytes"], { type: "image/jpeg" });
      const result = await compressAndCropToWebp(sourceBlob, "SQUARE_500", {
        applySquircleMask: true,
      });

      assert.strictEqual(result.ok, true);
      if (result.ok) {
        assert.strictEqual(result.value.width, 500);
        assert.strictEqual(result.value.height, 500);
        assert.strictEqual(result.value.format, "image/webp");
      }

      (globalThis as unknown as { createImageBitmap?: unknown }).createImageBitmap =
        originalCreateBitmap;
      (globalThis as unknown as { document?: unknown }).document = originalDoc;
    });
  });

  describe("Type Definitions & Verification", () => {
    it("verifies all exported interfaces and types are properly defined", () => {
      const crop: CropRect = { sx: 10, sy: 20, sWidth: 100, sHeight: 200 };
      const options: CompressOptions = { quality: 0.8, maxBytes: 50000, applySquircleMask: true };
      const preset: ImagePreset = "ICON_96";
      const error: ImageProcessingError = { code: "UNSUPPORTED_INPUT", message: "Error" };
      const dimensions: PresetDimensions = PRESET_CONFIGS.ICON_96;

      const dummyBlob = new Blob(["data"]);
      const resVal: CompressedWebpResult = {
        blob: dummyBlob,
        width: 96,
        height: 96,
        sizeBytes: 1000,
        format: "image/webp",
        previewUrl: "blob:http://localhost/test",
      };

      assert.strictEqual(preset, "ICON_96");
      assert.ok(crop);
      assert.ok(options);
      assert.ok(error);
      assert.ok(dimensions);
      assert.ok(resVal);
    });
  });
});
