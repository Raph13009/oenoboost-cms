"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";

const labelClass = "block text-[11px] text-slate-500 mb-0.5";

type CropMetrics = {
  renderedWidth: number;
  renderedHeight: number;
  displayScale: number;
  maxOffsetX: number;
  maxOffsetY: number;
};

function getCropMetrics(
  naturalWidth: number,
  naturalHeight: number,
  containerWidth: number,
  containerHeight: number,
  zoom: number
): CropMetrics {
  const baseScale = Math.max(containerWidth / naturalWidth, containerHeight / naturalHeight);
  const displayScale = baseScale * zoom;
  const renderedWidth = naturalWidth * displayScale;
  const renderedHeight = naturalHeight * displayScale;

  return {
    renderedWidth,
    renderedHeight,
    displayScale,
    maxOffsetX: Math.max(0, (renderedWidth - containerWidth) / 2),
    maxOffsetY: Math.max(0, (renderedHeight - containerHeight) / 2),
  };
}

function clampCropOffset(
  offset: { x: number; y: number },
  naturalWidth: number,
  naturalHeight: number,
  containerWidth: number,
  containerHeight: number,
  zoom: number
) {
  const { maxOffsetX, maxOffsetY } = getCropMetrics(
    naturalWidth,
    naturalHeight,
    containerWidth,
    containerHeight,
    zoom
  );

  return {
    x: Math.min(maxOffsetX, Math.max(-maxOffsetX, offset.x)),
    y: Math.min(maxOffsetY, Math.max(-maxOffsetY, offset.y)),
  };
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de charger l'image."));
    image.src = src;
  });
}

export type CmsPhotoUploadResult = {
  url?: string;
  path?: string;
  error?: string;
};

export function CmsPhotoCropField({
  value,
  onChange,
  entityId,
  entityIdFormKey,
  slug,
  slugFallback = "media",
  disabled,
  onError,
  upload,
  label = "Photo",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  entityId: string | null;
  entityIdFormKey: string;
  slug: string;
  slugFallback?: string;
  disabled: boolean;
  onError: (message: string | null) => void;
  upload: (formData: FormData) => Promise<CmsPhotoUploadResult>;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cropFrameRef = useRef<HTMLDivElement>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragOriginRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);

  const previewUrl = localPreviewUrl ?? value;

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
    };
  }, [cropSourceUrl, localPreviewUrl]);

  useEffect(() => {
    if (!cropSourceUrl) {
      setNaturalSize({ width: 0, height: 0 });
      return;
    }

    let active = true;
    loadImageElement(cropSourceUrl)
      .then((image) => {
        if (!active) return;
        setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      })
      .catch((error: unknown) => {
        if (!active) return;
        onError(error instanceof Error ? error.message : "Impossible de preparer l'image.");
        setCropSourceUrl(null);
        setModalOpen(false);
      });

    return () => {
      active = false;
    };
  }, [cropSourceUrl, onError]);

  const openFilePicker = useCallback(() => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  }, [disabled, uploading]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    dragPointerIdRef.current = null;

    if (cropSourceUrl) {
      URL.revokeObjectURL(cropSourceUrl);
      setCropSourceUrl(null);
    }

    if (inputRef.current) inputRef.current.value = "";
  }, [cropSourceUrl]);

  const handleFileSelection = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      onError(null);

      if (!file.type.startsWith("image/")) {
        onError("Le fichier doit etre une image.");
        event.target.value = "";
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setCropSourceUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return objectUrl;
      });
      setModalOpen(true);
    },
    [onError]
  );

  const handleZoomChange = useCallback(
    (nextZoom: number) => {
      setZoom(nextZoom);
      setOffset((current) => {
        const frame = cropFrameRef.current;
        if (!frame) return current;

        return clampCropOffset(
          current,
          naturalSize.width,
          naturalSize.height,
          frame.clientWidth,
          frame.clientHeight,
          nextZoom
        );
      });
    },
    [naturalSize.height, naturalSize.width]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!naturalSize.width || !naturalSize.height) return;

      dragPointerIdRef.current = event.pointerId;
      dragOriginRef.current = {
        x: event.clientX,
        y: event.clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [naturalSize.height, naturalSize.width, offset.x, offset.y]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (dragPointerIdRef.current !== event.pointerId) return;
      const frame = cropFrameRef.current;
      if (!frame) return;

      const nextOffset = clampCropOffset(
        {
          x: dragOriginRef.current.offsetX + (event.clientX - dragOriginRef.current.x),
          y: dragOriginRef.current.offsetY + (event.clientY - dragOriginRef.current.y),
        },
        naturalSize.width,
        naturalSize.height,
        frame.clientWidth,
        frame.clientHeight,
        zoom
      );

      setOffset(nextOffset);
    },
    [naturalSize.height, naturalSize.width, zoom]
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    dragPointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleRemove = useCallback(() => {
    onError(null);
    setLocalPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    onChange(null);
  }, [onChange, onError]);

  const handleCropAndUpload = useCallback(async () => {
    if (!cropSourceUrl) return;

    const frame = cropFrameRef.current;
    if (!frame || !naturalSize.width || !naturalSize.height) {
      onError("Le cadre de recadrage n'est pas pret.");
      return;
    }

    onError(null);
    setUploading(true);

    try {
      const image = await loadImageElement(cropSourceUrl);
      const containerWidth = frame.clientWidth;
      const containerHeight = frame.clientHeight;
      const { renderedWidth, renderedHeight, displayScale } = getCropMetrics(
        naturalSize.width,
        naturalSize.height,
        containerWidth,
        containerHeight,
        zoom
      );

      const imageLeft = (containerWidth - renderedWidth) / 2 + offset.x;
      const imageTop = (containerHeight - renderedHeight) / 2 + offset.y;

      const sourceWidth = Math.min(naturalSize.width, containerWidth / displayScale);
      const sourceHeight = Math.min(naturalSize.height, containerHeight / displayScale);
      const sourceX = Math.min(
        naturalSize.width - sourceWidth,
        Math.max(0, -imageLeft / displayScale)
      );
      const sourceY = Math.min(
        naturalSize.height - sourceHeight,
        Math.max(0, -imageTop / displayScale)
      );

      const outputWidth = 1600;
      const outputHeight = 900;
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas indisponible.");

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputWidth,
        outputHeight
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (!result) {
            reject(new Error("Impossible de generer l'image recadree."));
            return;
          }
          resolve(result);
        }, "image/jpeg", 0.9);
      });

      const base = slug?.trim() || slugFallback;
      const uploadedFile = new File([blob], `${base}.jpg`, { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("file", uploadedFile);
      if (entityId) formData.append(entityIdFormKey, entityId);
      if (slug?.trim()) formData.append("slug", slug);

      const result = await upload(formData);

      if (result.error || !result.url) {
        throw new Error(result.error || "Upload impossible.");
      }

      const nextPreviewUrl = URL.createObjectURL(blob);
      setLocalPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextPreviewUrl;
      });
      onChange(result.url);
      closeModal();
    } catch (error: unknown) {
      onError(error instanceof Error ? error.message : "Erreur pendant l'upload.");
    } finally {
      setUploading(false);
    }
  }, [
    closeModal,
    cropSourceUrl,
    entityId,
    entityIdFormKey,
    naturalSize.height,
    naturalSize.width,
    offset.x,
    offset.y,
    onChange,
    onError,
    slug,
    slugFallback,
    upload,
    zoom,
  ]);

  const cropPreviewStyle = useMemo(() => {
    if (!naturalSize.width || !naturalSize.height) return undefined;

    const frame = cropFrameRef.current;
    const containerWidth = frame?.clientWidth ?? 0;
    const containerHeight = frame?.clientHeight ?? 0;

    if (!containerWidth || !containerHeight) return undefined;

    const { renderedWidth, renderedHeight } = getCropMetrics(
      naturalSize.width,
      naturalSize.height,
      containerWidth,
      containerHeight,
      zoom
    );

    return {
      width: renderedWidth,
      height: renderedHeight,
      transform: `translate(${offset.x}px, ${offset.y}px)`,
    };
  }, [naturalSize.height, naturalSize.width, offset.x, offset.y, zoom]);

  return (
    <div className="space-y-2.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelection}
      />

      <label className={labelClass}>{label}</label>

      <div className="max-w-[240px] space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="relative aspect-[16/9] w-full bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)]">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Aucun visuel
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openFilePicker}
            disabled={disabled || uploading}
            className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {previewUrl ? "Remplacer l'image" : "Upload an image"}
          </button>

          {previewUrl ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="inline-flex items-center gap-2 rounded border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Retirer
            </button>
          ) : null}
        </div>
      </div>

      {modalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4">
            <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl shadow-slate-950/30">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Recadrer la photo</h3>
                  <p className="text-sm text-slate-500">Glissez l'image et ajustez le zoom. Export final en 16:9.</p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={uploading}
                  className="rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Fermer
                </button>
              </div>

              <div className="space-y-4 px-5 py-5">
                <div className="rounded-2xl bg-slate-950 p-4">
                  <div
                    ref={cropFrameRef}
                    className="relative mx-auto aspect-[16/9] w-full max-w-4xl touch-none overflow-hidden rounded-xl bg-slate-900"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    {cropSourceUrl && cropPreviewStyle ? (
                      <img
                        src={cropSourceUrl}
                        alt=""
                        draggable={false}
                        className="absolute left-1/2 top-1/2 max-w-none select-none"
                        style={{
                          ...cropPreviewStyle,
                          marginLeft: `-${cropPreviewStyle.width / 2}px`,
                          marginTop: `-${cropPreviewStyle.height / 2}px`,
                        }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Preparation de l'image...
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 border border-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]" />
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <label className="flex items-center gap-3 text-sm text-slate-700">
                    <span className="w-12 shrink-0">Zoom</span>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.01"
                      value={zoom}
                      onChange={(event) => handleZoomChange(Number(event.target.value))}
                      className="w-64"
                      disabled={uploading || !naturalSize.width}
                    />
                    <span className="w-12 text-right text-slate-500">{zoom.toFixed(2)}x</span>
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={uploading}
                      className="rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCropAndUpload()}
                      disabled={uploading || !naturalSize.width}
                      className="inline-flex items-center gap-2 rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      {uploading ? "Upload..." : "Crop & upload"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
