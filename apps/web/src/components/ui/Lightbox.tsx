import { useState, type ImgHTMLAttributes } from "react";
import { X, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogClose,
} from "@radix-ui/react-dialog";
import { cn } from "@/utils/cn";


export function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string | null;
  alt?: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!src} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-0 z-[100] flex items-center justify-center border-0 bg-transparent p-4 shadow-none outline-none sm:p-8"
        >
          {src && (
            <img
              src={src}
              alt={alt ?? ""}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <DialogClose
            aria-label="Tutup"
            className="fixed right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}


export function ZoomableImage({
  src,
  alt,
  className,
  wrapperClassName,
  showZoomHint = true,
  ...rest
}: {
  src: string;
  alt?: string;
  wrapperClassName?: string;
  showZoomHint?: boolean;
} & ImgHTMLAttributes<HTMLImageElement>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={cn("group relative cursor-zoom-in", wrapperClassName)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        role="button"
        tabIndex={0}
        aria-label={alt ? `Perbesar ${alt}` : "Perbesar foto"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <img src={src} alt={alt ?? ""} className={className} {...rest} />
        {showZoomHint && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[inherit] bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/30 group-hover:opacity-100">
            <ZoomIn className="h-5 w-5 text-white drop-shadow" />
          </div>
        )}
      </div>
      <Lightbox src={open ? src : null} alt={alt} onClose={() => setOpen(false)} />
    </>
  );
}