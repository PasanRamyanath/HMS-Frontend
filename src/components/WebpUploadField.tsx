import type React from "react";
import { useId, useRef, useState } from "react";
import {
  type CompressedWebpResult,
  type ImagePreset,
  PRESET_CONFIGS,
  compressAndCropToWebp,
} from "../lib/imageWebp.js";

export interface PresignedUploadDetails {
  uploadUrl: string;
  finalUrl: string;
}

export interface WebpUploadResult {
  url: string;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
  savingsPercent: number;
}

export interface WebpUploadFieldProps {
  preset?: ImagePreset | undefined;
  label?: string | undefined;
  description?: string | undefined;
  currentImageUrl?: string | undefined;
  getPresignedUploadUrl?:
    | ((fileName: string, contentType: string) => Promise<PresignedUploadDetails>)
    | undefined;
  onUploadSuccess?: ((result: WebpUploadResult) => void) | undefined;
  onUploadError?: ((errorMessage: string) => void) | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function calculateSavingsPercent(originalBytes: number, compressedBytes: number): number {
  if (originalBytes <= 0) return 0;
  const savings = Math.max(0, originalBytes - compressedBytes);
  return Math.round((savings / originalBytes) * 100);
}

export async function uploadToPresignedUrl(
  uploadUrl: string,
  blob: Blob,
  contentType = "image/webp",
): Promise<boolean> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  return response.ok;
}

export function getAspectGuideClasses(preset: ImagePreset): {
  wrapper: string;
  guideText: string;
} {
  switch (preset) {
    case "BANNER_1200x400":
      return {
        wrapper: "aspect-[3/1] max-w-xl",
        guideText: "3:1 Property Banner (1200×400)",
      };
    case "ICON_96":
      return {
        wrapper: "aspect-square max-w-[120px]",
        guideText: "1:1 App Icon (96×96)",
      };
    default:
      return {
        wrapper: "aspect-square max-w-[280px]",
        guideText: "1:1 Thumbnail (500×500)",
      };
  }
}

export async function processAndUploadWebp(
  file: File,
  preset: ImagePreset,
  getPresignedUploadUrl?: (
    fileName: string,
    contentType: string,
  ) => Promise<PresignedUploadDetails>,
): Promise<{ success: true; result: WebpUploadResult } | { success: false; error: string }> {
  const compressionResult = await compressAndCropToWebp(file, preset);
  if (!compressionResult.ok) {
    return { success: false, error: `Compression error: ${compressionResult.error.code}` };
  }

  const compressed: CompressedWebpResult = compressionResult.value;
  let finalUrl = compressed.dataUrl || compressed.previewUrl;

  if (getPresignedUploadUrl) {
    try {
      const presigned = await getPresignedUploadUrl(file.name, "image/webp");
      const uploadSuccess = await uploadToPresignedUrl(presigned.uploadUrl, compressed.blob);
      if (!uploadSuccess) {
        return { success: false, error: "Failed to upload to destination storage" };
      }
      finalUrl = presigned.finalUrl;
    } catch (_err) {
      return { success: false, error: "Network error during upload authorization" };
    }
  }

  const savings = calculateSavingsPercent(file.size, compressed.sizeBytes);
  return {
    success: true,
    result: {
      url: finalUrl,
      originalBytes: file.size,
      compressedBytes: compressed.sizeBytes,
      width: compressed.width,
      height: compressed.height,
      savingsPercent: savings,
    },
  };
}

export function WebpUploadField({
  preset = "SQUARE_500",
  label = "Upload Image",
  description = "Drag and drop or browse to compress and upload WebP",
  currentImageUrl,
  getPresignedUploadUrl,
  onUploadSuccess,
  onUploadError,
  disabled = false,
  className = "",
}: WebpUploadFieldProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl ?? null);
  const [telemetry, setTelemetry] = useState<WebpUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const aspectGuide = getAspectGuideClasses(preset);
  const targetConfig = PRESET_CONFIGS[preset];

  const handleFile = async (file: File) => {
    if (disabled || isProcessing) return;

    if (!file.type.startsWith("image/")) {
      onUploadError?.("Invalid file type. Please select an image (JPEG, PNG, WebP).");
      return;
    }

    setIsProcessing(true);
    const outcome = await processAndUploadWebp(file, preset, getPresignedUploadUrl);
    setIsProcessing(false);

    if (outcome.success) {
      setPreviewUrl(outcome.result.url);
      setTelemetry(outcome.result);
      onUploadSuccess?.(outcome.result);
    } else {
      onUploadError?.(outcome.error);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      void handleFile(droppedFile);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      void handleFile(selectedFile);
    }
  };

  return (
    <div className={`flex flex-col space-y-2 font-sf-pro ${className}`.trim()}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-sm font-semibold text-slate-800 ">
          {label}
        </label>
        <span className="text-xs text-slate-500 ">
          {aspectGuide.guideText} • max {formatFileSize(targetConfig.maxBytes)}
        </span>
      </div>

      <button
        type="button"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !isProcessing) fileInputRef.current?.click();
        }}
        disabled={disabled || isProcessing}
        aria-disabled={disabled ? true : undefined}
        aria-label={label}
        className={`relative overflow-hidden w-full ${aspectGuide.wrapper} squircle-lg border-2 border-dashed transition-apple-spring cursor-pointer flex flex-col items-center justify-center p-4 text-center ${
          isDragging
            ? "border-apple-blue bg-[#0B6E4F]/10 "
            : "border-slate-300 bg-slate-50/70 hover:bg-slate-100/80 "
        } ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
      >
        <input
          id={inputId}
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={handleInputChange}
          disabled={disabled || isProcessing}
          tabIndex={-1}
          className="hidden"
        />

        {previewUrl ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={previewUrl}
              alt="Uploaded preview"
              className="w-full h-full object-cover squircle-md shadow-sm"
            />
            {isProcessing ? (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center text-white text-xs font-semibold squircle-md">
                Compressing WebP...
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-1.5 text-slate-500 ">
            <p className="text-xs font-medium">{description}</p>
            <p className="text-[11px] opacity-75">Click or drop image file</p>
          </div>
        )}
      </button>

      {telemetry ? (
        <div className="flex items-center gap-2 pt-1 text-xs tabular-nums-lkr text-slate-600 ">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
            WebP -{telemetry.savingsPercent}%
          </span>
          <span>
            {formatFileSize(telemetry.originalBytes)} → {formatFileSize(telemetry.compressedBytes)}
          </span>
          <span className="text-slate-400 ">
            ({telemetry.width}×{telemetry.height})
          </span>
        </div>
      ) : null}
    </div>
  );
}
