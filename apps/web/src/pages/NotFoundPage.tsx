import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4 text-center sm:p-6">
     
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-10%] h-96 w-96 rounded-full bg-brand-blue/10 blur-[120px]" />
        <div className="absolute -right-24 bottom-[-10%] h-96 w-96 rounded-full bg-brand-mint/10 blur-[120px]" />
      </div>

      <div className="relative flex flex-col items-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue sm:h-12 sm:w-12">
          <Compass className="h-6 w-6" />
        </span>
        <p className="mt-6 font-display text-7xl font-bold tracking-tight text-gradient sm:text-8xl">
          404
        </p>
        <h1 className="mt-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          Alamat yang Anda tuju tidak ada. Periksa kembali tautan, atau kembali
          menelusuri dana publik.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="font-medium">
            <Link to="/">Beranda</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="font-medium">
            <Link to="/programs">Jelajahi Program</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
