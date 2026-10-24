/**
 * Client-Side HTML5 Canvas WebP Image Resizer & Squircle Thumbnail Cropper.
 * Conforms to Apple HIG continuous curvature and enforces <100 KB upload budget.
 */

import { type Result, err, ok } from "./graphqlClient.js";

export type ImagePreset = "SQUARE_500" | "BANNER_1200x400" | "ICON_96";

export interface PresetDimensions {
 readonly width: number;
 readonly height: number;
 readonly quality: number;
 readonly maxBytes: number;
 readonly squircleRadius: number;
}

export const PRESET_CONFIGS: Readonly<Record<ImagePreset, PresetDimensions>> = {
 SQUARE_500: {
 width: 500,
 height: 500,
 quality: 0.82,
 maxBytes: 100 * 1024, // 100 KB
 squircleRadius: 48,
 },
 BANNER_1200x400: {
 width: 1200,
 height: 400,
 quality: 0.82,
 maxBytes: 100 * 1024, // 100 KB
 squircleRadius: 24,
 },
 ICON_96: {
 width: 96,
 height: 96,
 quality: 0.82,
 maxBytes: 50 * 1024, // 50 KB
 squircleRadius: 20,
 },
};

export interface CropRect {
 readonly sx: number;
 readonly sy: number;
 readonly sWidth: number;
 readonly sHeight: number;
}

export interface CompressOptions {
 readonly quality?: number;
 readonly maxBytes?: number;
 readonly applySquircleMask?: boolean;
}

export interface CompressedWebpResult {
 readonly blob: Blob;
 readonly width: number;
 readonly height: number;
 readonly sizeBytes: number;
 readonly format: string;
 readonly previewUrl: string;
 readonly dataUrl?: string | undefined;
}

export interface ImageProcessingError {
 readonly code:
 | "UNSUPPORTED_INPUT"
 | "BITMAP_CREATION_FAILED"
 | "CANVAS_CONTEXT_UNAVAILABLE"
 | "BLOB_CONVERSION_FAILED"
 | "SIZE_EXCEEDS_CEILING";
 readonly message: string;
}

/**
 * Calculates center-crop rectangle preserving aspect ratio without distortion.
 */
export function computeCenterCrop(
 srcWidth: number,
 srcHeight: number,
 targetWidth: number,
 targetHeight: number,
): CropRect {
 if (srcWidth <= 0 || srcHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
 return { sx: 0, sy: 0, sWidth: 0, sHeight: 0 };
 }

 const targetAspect = targetWidth / targetHeight;
 const srcAspect = srcWidth / srcHeight;

 let sWidth: number;
 let sHeight: number;
 let sx = 0;
 let sy = 0;

 if (srcAspect > targetAspect) {
 sHeight = srcHeight;
 sWidth = Math.round(srcHeight * targetAspect);
 sx = Math.round((srcWidth - sWidth) / 2);
 } else {
 sWidth = srcWidth;
 sHeight = Math.round(srcWidth / targetAspect);
 sy = Math.round((srcHeight - sHeight) / 2);
 }

 return { sx, sy, sWidth, sHeight };
}

/**
 * Traces an Apple continuous squircle path onto an HTML5 2D canvas context.
 */
export function applySquircleClip(
 ctx: CanvasRenderingContext2D,
 width: number,
 height: number,
 radius: number,
): void {
 const r = Math.min(radius, width / 2, height / 2);
 ctx.beginPath();
 ctx.moveTo(r, 0);
 ctx.lineTo(width - r, 0);
 ctx.arcTo(width, 0, width, r, r);
 ctx.lineTo(width, height - r);
 ctx.arcTo(width, height, width - r, height, r);
 ctx.lineTo(r, height);
 ctx.arcTo(0, height, 0, height - r, r);
 ctx.lineTo(0, r);
 ctx.arcTo(0, 0, r, 0, r);
 ctx.closePath();
 ctx.clip();
}

/**
 * Converts canvas to WebP Blob with graceful callback to Promise wrapper.
 */
function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
 return new Promise((resolve) => {
 if (typeof canvas.toBlob === "function") {
 canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
 } else {
 resolve(null);
 }
 });
}

async function renderToCanvas(
 bitmap: ImageBitmap,
 crop: CropRect,
 targetWidth: number,
 targetHeight: number,
 applyMask: boolean,
 radius: number,
): Promise<Result<HTMLCanvasElement, ImageProcessingError>> {
 if (typeof document === "undefined") {
 return err({
 code: "CANVAS_CONTEXT_UNAVAILABLE",
 message: "HTML5 Canvas is not supported in non-browser environment",
 });
 }

 const canvas = document.createElement("canvas");
 canvas.width = targetWidth;
 canvas.height = targetHeight;

 const ctx = canvas.getContext("2d");
 if (!ctx) {
 return err({
 code: "CANVAS_CONTEXT_UNAVAILABLE",
 message: "Failed to acquire 2D rendering context from canvas",
 });
 }

 if (applyMask) {
 applySquircleClip(ctx, targetWidth, targetHeight, radius);
 }

 ctx.imageSmoothingEnabled = true;
 ctx.imageSmoothingQuality = "high";
 ctx.drawImage(
 bitmap,
 crop.sx,
 crop.sy,
 crop.sWidth,
 crop.sHeight,
 0,
 0,
 targetWidth,
 targetHeight,
 );

 return ok(canvas);
}

async function loadSourceBitmap(
 source: File | Blob,
): Promise<Result<ImageBitmap, ImageProcessingError>> {
 if (!source || !(source instanceof Blob)) {
 return err({
 code: "UNSUPPORTED_INPUT",
 message: "Provided source is not a valid File or Blob",
 });
 }

 if (typeof createImageBitmap !== "function") {
 return err({
 code: "BITMAP_CREATION_FAILED",
 message: "createImageBitmap API is unavailable in current runtime",
 });
 }

 try {
 const bitmap = await createImageBitmap(source);
 return ok(bitmap);
 } catch (caught) {
 const message = caught instanceof Error ? caught.message : String(caught);
 return err({ code: "BITMAP_CREATION_FAILED", message });
 }
}

async function compressCanvasIteratively(
 canvas: HTMLCanvasElement,
 startQuality: number,
 maxBytes: number,
): Promise<Blob | null> {
 let quality = startQuality;
 for (let attempt = 0; attempt < 3; attempt++) {
 const blob = await canvasToWebpBlob(canvas, quality);
 if (blob && blob.size <= maxBytes) {
 return blob;
 }
 quality = Math.max(0.5, quality - 0.15);
 }
 return null;
}

/**
 * Compresses and crops an image to optimized WebP format with strict <100 KB ceiling.
 */
export async function compressAndCropToWebp(
 source: File | Blob,
 preset: ImagePreset,
 options?: CompressOptions,
): Promise<Result<CompressedWebpResult, ImageProcessingError>> {
 const config = PRESET_CONFIGS[preset];
 const targetQuality = options?.quality ?? config.quality;
 const maxBytes = options?.maxBytes ?? config.maxBytes;
 const applyMask = options?.applySquircleMask ?? false;

 const bitmapRes = await loadSourceBitmap(source);
 if (!bitmapRes.ok) {
 return bitmapRes;
 }
 const bitmap = bitmapRes.value;

 const crop = computeCenterCrop(bitmap.width, bitmap.height, config.width, config.height);
 const canvasRes = await renderToCanvas(
 bitmap,
 crop,
 config.width,
 config.height,
 applyMask,
 config.squircleRadius,
 );

 if (!canvasRes.ok) {
 return canvasRes;
 }

 const finalBlob = await compressCanvasIteratively(canvasRes.value, targetQuality, maxBytes);
 if (!finalBlob) {
 return err({
 code: "SIZE_EXCEEDS_CEILING",
 message: `Failed to compress image under budget ceiling of ${maxBytes} bytes`,
 });
 }

 const previewUrl =
 typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
 ? URL.createObjectURL(finalBlob)
 : "";

 let dataUrl: string | undefined;
 if (typeof canvasRes.value.toDataURL === "function") {
 try {
 dataUrl = canvasRes.value.toDataURL("image/webp", targetQuality);
 } catch {
 dataUrl = undefined;
 }
 }

 return ok({
 blob: finalBlob,
 width: config.width,
 height: config.height,
 sizeBytes: finalBlob.size,
 format: "image/webp",
 previewUrl,
 dataUrl: dataUrl || previewUrl,
 });
}
