import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Move, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface ImageCropperProps {
  file: File | null;
  aspect: number; 
  title?: string;
  outputWidth?: number;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (result: { blob: Blob; file: File }) => void;
}

const BOX_MAX_W = 420;

export function ImageCropper({
  file,
  aspect,
  title = "Sesuaikan Foto",
  outputWidth = 800,
  isSaving = false,
  onCancel,
  onSave,
}: ImageCropperProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [boxW, setBoxW] = useState(BOX_MAX_W);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const boxH = boxW / aspect;

  useLayoutEffect(() => {
    if (!file) return;
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => setBoxW(Math.min(BOX_MAX_W, el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [file]);

  useEffect(() => {
    if (!file) {
      setImgUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

 
  const baseScale = useMemo(() => {
    if (!naturalSize.w || !naturalSize.h) return 1;
    return Math.max(boxW / naturalSize.w, boxH / naturalSize.h);
  }, [naturalSize, boxW, boxH]);

  const scale = baseScale * zoom;
  const displayW = naturalSize.w * scale;
  const displayH = naturalSize.h * scale;

  const clampOffset = (x: number, y: number) => {
    const maxX = Math.max(0, (displayW - boxW) / 2);
    const maxY = Math.max(0, (displayH - boxH) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset(dragRef.current.origX + dx, dragRef.current.origY + dy));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleSave = () => {
    if (!imgUrl) return;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const outH = Math.round(outputWidth / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

    
      const outScale = outputWidth / boxW;
      const srcScale = scale;
      ctx.save();
      ctx.translate(outputWidth / 2 + offset.x * outScale, outH / 2 + offset.y * outScale);
      ctx.scale(srcScale * outScale, srcScale * outScale);
      ctx.drawImage(image, -naturalSize.w / 2, -naturalSize.h / 2);
      ctx.restore();

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const outFile = new File([blob], file?.name ?? "cropped.jpg", {
            type: "image/jpeg",
          });
          onSave({ blob, file: outFile });
        },
        "image/jpeg",
        0.92,
      );
    };
    image.src = imgUrl;
  };

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-xl gap-4 rounded-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">
            {title}
          </DialogTitle>
        </DialogHeader>

        {imgUrl && (
          <div className="flex flex-col gap-4">
            <div ref={wrapperRef} className="mx-auto w-full">
              <div
                className="relative mx-auto touch-none select-none overflow-hidden rounded-lg border border-black/10 bg-muted/40"
                style={{ width: boxW, height: boxH }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              >
                <img
                  src={imgUrl}
                  alt="preview"
                  draggable={false}
                  onLoad={(e) => {
                    const t = e.currentTarget;
                    setNaturalSize({ w: t.naturalWidth, h: t.naturalHeight });
                  }}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                  style={{
                    width: displayW || undefined,
                    height: displayH || undefined,
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                  }}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 text-[11px] font-medium text-white/70 opacity-0 transition-opacity hover:opacity-100">
                  <Move className="h-3.5 w-3.5" /> Geser untuk atur posisi
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => {
                  const z = Number(e.target.value);
                  setZoom(z);
                  setOffset((o) => clampOffset(o.x, o.y));
                }}
                className="w-full accent-brand-blue"
              />
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Geser foto lalu atur zoom supaya pas dengan bingkai{" "}
              {aspect === 1 ? "avatar (1:1)" : `banner (${aspect}:1)`}.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Spinner size={16} className="text-current" />}
                Simpan &amp; Unggah
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
